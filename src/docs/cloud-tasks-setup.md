# Cloud Tasks Setup for Scheduled Post Publishing

This document explains how to set up Google Cloud Tasks for a more cost-effective scheduled post publishing system.

## Why Cloud Tasks Instead of Cloud Scheduler?

**Before (Cloud Scheduler - Expensive)**:
- Cloud Scheduler runs every minute (1,440 calls/day)
- Each call wakes up Cloud Run even when there are no posts to publish
- Cost adds up quickly for an MVP with few scheduled posts

**After (Cloud Tasks - Cheap)**:
- Only runs when there's actually a post scheduled
- One Cloud Task per scheduled post, executing at the exact scheduled time
- If you have 2 posts scheduled per day, Cloud Run only wakes up 2 times per day

## Architecture

```
User schedules post → Backend saves to DB → Cloud Task created for exact time
                                                     ↓
                                          Cloud Task triggers at scheduled time
                                                     ↓
                                          POST /scheduler/publish-post/:postId
                                                     ↓
                                          Post published to Instagram
```

## GCP Setup Instructions

### 1. Enable Cloud Tasks API

```bash
gcloud services enable cloudtasks.googleapis.com
```

### 2. Create Cloud Tasks Queue

```bash
gcloud tasks queues create post-publishing-queue \
  --location=us-central1 \
  --max-attempts=3 \
  --max-retry-duration=86400s \
  --min-backoff=60s \
  --max-backoff=3600s
```

### 3. Grant Service Account Permissions

The service account needs permissions to:
- Create/delete Cloud Tasks
- Invoke the Cloud Run service

```bash
# Grant Cloud Tasks Admin role
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:postia-backend-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudtasks.admin"

# Grant Cloud Run Invoker role (for OIDC token authentication)
gcloud run services add-iam-policy-binding postia-backend \
  --region=us-central1 \
  --member="serviceAccount:postia-backend-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.invoker"
```

### 4. Environment Variables

Add these to your Cloud Run service (already added in deploy.yml):

| Variable | Description | Example |
|----------|-------------|---------|
| `CLOUD_TASKS_LOCATION` | GCP region for Cloud Tasks | `us-central1` |
| `CLOUD_TASKS_QUEUE` | Queue name | `post-publishing-queue` |
| `CLOUD_RUN_SERVICE_URL` | Your Cloud Run service URL | `https://postia-backend-xxx.a.run.app` |

### 5. Update Cloud Run Service URL

After deploying, get your actual Cloud Run URL:

```bash
gcloud run services describe postia-backend \
  --platform managed \
  --region=us-central1 \
  --format 'value(status.url)'
```

Update the `CLOUD_RUN_SERVICE_URL` environment variable with this URL.

## Database Migration

A new column `cloudTaskId` has been added to the `posts` table. Run the migration:

```sql
ALTER TABLE posts ADD COLUMN IF NOT EXISTS "cloudTaskId" varchar;
```

Or let TypeORM sync it automatically in development mode.

## Disable Cloud Scheduler

Once Cloud Tasks is working, you can disable or delete the old Cloud Scheduler job:

```bash
# Pause the scheduler (keep it for backup)
gcloud scheduler jobs pause publish-scheduled-posts --location=us-central1

# Or delete it completely
gcloud scheduler jobs delete publish-scheduled-posts --location=us-central1
```

## How It Works

### When a post is created with status "scheduled":
1. Post is saved to database
2. Cloud Task is created with `scheduleTime` set to the post's `scheduledAt` time
3. Task name includes post ID for easy tracking: `publish-post-{postId}`

### When a post's schedule is updated:
1. Old Cloud Task is cancelled
2. New Cloud Task is created with the new time

### When a post is deleted:
1. Cloud Task is cancelled (if exists)
2. Post is removed from database

### When Cloud Task triggers:
1. Cloud Tasks sends POST request to `/scheduler/publish-post/{postId}`
2. Backend publishes the post to Instagram
3. Post status updated to "published" or "failed"

## Cost Comparison

| Scenario | Cloud Scheduler | Cloud Tasks |
|----------|----------------|-------------|
| 0 posts/day | 1,440 invocations | 0 invocations |
| 5 posts/day | 1,440 invocations | 5 invocations |
| 30 posts/day | 1,440 invocations | 30 invocations |

**Savings**: For an MVP with ~5 posts/day, you reduce invocations by **99.65%**!

## Local Development

In development mode (`NODE_ENV !== 'production'`):
- Cloud Tasks client is not initialized
- The local scheduler simulation still runs every 60 seconds
- Cloud Task scheduling returns mock task IDs

## Monitoring

Check task status via API:
```bash
curl https://your-service.run.app/scheduler/status
```

View tasks in GCP Console:
```
https://console.cloud.google.com/cloudtasks?project=YOUR_PROJECT_ID
```

## Troubleshooting

### Task not executing
1. Check queue is not paused: `gcloud tasks queues describe post-publishing-queue --location=us-central1`
2. Verify service account has run.invoker role
3. Check Cloud Run logs for errors

### Authentication errors
1. Ensure OIDC token is configured correctly
2. Verify service account email is correct
3. Check IAM bindings

### Task already exists error
The service automatically handles this by deleting and recreating the task.
