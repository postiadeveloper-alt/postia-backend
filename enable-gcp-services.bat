@echo off
REM Enable required GCP services for Cloud Run deployment
echo Enabling Cloud Build API...
gcloud services enable cloudbuild.googleapis.com

echo Enabling Artifact Registry API...
gcloud services enable artifactregistry.googleapis.com

echo Enabling Cloud Run API...
gcloud services enable run.googleapis.com

echo.
echo ✅ All services enabled!
echo.
echo Now granting permissions to service account...
echo Please replace YOUR_PROJECT_ID with your actual project ID
echo.
echo gcloud projects add-iam-policy-binding YOUR_PROJECT_ID --member="serviceAccount:postia-backend-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" --role="roles/cloudbuild.builds.builder"
echo.
echo gcloud projects add-iam-policy-binding YOUR_PROJECT_ID --member="serviceAccount:postia-backend-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" --role="roles/artifactregistry.writer"
