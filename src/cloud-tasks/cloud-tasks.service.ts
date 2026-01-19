import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CloudTasksClient, protos } from '@google-cloud/tasks';

@Injectable()
export class CloudTasksService {
  private readonly logger = new Logger(CloudTasksService.name);
  private client: CloudTasksClient;
  private projectId: string;
  private location: string;
  private queueName: string;
  private serviceUrl: string;

  constructor(private configService: ConfigService) {
    // Only initialize Cloud Tasks client in production
    if (process.env.NODE_ENV === 'production') {
      this.client = new CloudTasksClient();
      this.projectId = this.configService.get<string>('GCP_PROJECT_ID');
      this.location = this.configService.get<string>('CLOUD_TASKS_LOCATION', 'us-central1');
      this.queueName = this.configService.get<string>('CLOUD_TASKS_QUEUE', 'post-publishing-queue');
      this.serviceUrl = this.configService.get<string>('CLOUD_RUN_SERVICE_URL');

      this.logger.log(`☁️ Cloud Tasks initialized: ${this.getQueuePath()}`);
    } else {
      this.logger.log('🔧 Cloud Tasks disabled in development mode');
    }
  }

  /**
   * Get the full queue path for Cloud Tasks
   */
  private getQueuePath(): string {
    return this.client?.queuePath(this.projectId, this.location, this.queueName) || '';
  }

  /**
   * Schedule a task to publish a specific post at a given time
   * @param postId The ID of the post to publish
   * @param scheduledAt The time to publish the post
   * @returns The Cloud Task name/ID for tracking
   */
  async schedulePostPublication(postId: string, scheduledAt: Date): Promise<string | null> {
    // In development, skip Cloud Tasks (local scheduler will handle it)
    if (process.env.NODE_ENV !== 'production') {
      this.logger.log(`🔧 [DEV] Would schedule task for post ${postId} at ${scheduledAt.toISOString()}`);
      return `dev-task-${postId}`;
    }

    try {
      const scheduleTime = Math.floor(scheduledAt.getTime() / 1000);
      const now = Math.floor(Date.now() / 1000);

      // If scheduled time is in the past, schedule for immediate execution
      const targetTime = scheduleTime > now ? scheduleTime : now + 10;

      const task: protos.google.cloud.tasks.v2.ITask = {
        httpRequest: {
          httpMethod: 'POST',
          url: `${this.serviceUrl}/scheduler/publish-post/${postId}`,
          headers: {
            'Content-Type': 'application/json',
          },
          // Cloud Tasks will add OIDC token automatically for authentication
          oidcToken: {
            serviceAccountEmail: `postia-backend-sa@${this.projectId}.iam.gserviceaccount.com`,
          },
        },
        scheduleTime: {
          seconds: targetTime,
        },
        // Use postId as part of task name to enable deduplication and easy lookup
        name: `${this.getQueuePath()}/tasks/publish-post-${postId}`,
      };

      const [response] = await this.client.createTask({
        parent: this.getQueuePath(),
        task,
      });

      this.logger.log(`✅ Scheduled task for post ${postId} at ${new Date(targetTime * 1000).toISOString()}`);
      this.logger.log(`   Task name: ${response.name}`);

      return response.name;
    } catch (error) {
      // If task already exists, delete and recreate
      if (error.code === 6) { // ALREADY_EXISTS
        this.logger.log(`⚠️ Task already exists for post ${postId}, recreating...`);
        await this.cancelScheduledTask(postId);
        return this.schedulePostPublication(postId, scheduledAt);
      }

      this.logger.error(`❌ Failed to schedule task for post ${postId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cancel a scheduled task for a post (used when post is deleted or rescheduled)
   * @param postId The ID of the post whose task should be cancelled
   */
  async cancelScheduledTask(postId: string): Promise<boolean> {
    // In development, skip Cloud Tasks
    if (process.env.NODE_ENV !== 'production') {
      this.logger.log(`🔧 [DEV] Would cancel task for post ${postId}`);
      return true;
    }

    try {
      const taskName = `${this.getQueuePath()}/tasks/publish-post-${postId}`;

      await this.client.deleteTask({ name: taskName });
      this.logger.log(`🗑️ Cancelled scheduled task for post ${postId}`);

      return true;
    } catch (error) {
      // If task doesn't exist, that's fine
      if (error.code === 5) { // NOT_FOUND
        this.logger.log(`ℹ️ No task found for post ${postId} (may have already executed)`);
        return true;
      }

      this.logger.error(`❌ Failed to cancel task for post ${postId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Reschedule a post publication (cancel old task and create new one)
   * @param postId The ID of the post
   * @param newScheduledAt The new scheduled time
   */
  async reschedulePostPublication(postId: string, newScheduledAt: Date): Promise<string | null> {
    this.logger.log(`🔄 Rescheduling post ${postId} to ${newScheduledAt.toISOString()}`);

    // Cancel existing task
    await this.cancelScheduledTask(postId);

    // Schedule new task
    return this.schedulePostPublication(postId, newScheduledAt);
  }

  /**
   * Get task status (useful for debugging)
   * @param postId The ID of the post
   */
  async getTaskStatus(postId: string): Promise<any> {
    if (process.env.NODE_ENV !== 'production') {
      return { status: 'development-mode', postId };
    }

    try {
      const taskName = `${this.getQueuePath()}/tasks/publish-post-${postId}`;
      const [task] = await this.client.getTask({ name: taskName });

      return {
        name: task.name,
        scheduleTime: task.scheduleTime,
        createTime: task.createTime,
        dispatchCount: task.dispatchCount,
        responseCount: task.responseCount,
        lastAttempt: task.lastAttempt,
      };
    } catch (error) {
      if (error.code === 5) { // NOT_FOUND
        return { status: 'not-found', postId };
      }
      throw error;
    }
  }
}
