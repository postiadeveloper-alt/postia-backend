@echo off
REM Enable required GCP services for Cloud Run deployment
REM IMPORTANT: Run this with YOUR account (not the service account)

set PROJECT_ID=postia-480418

echo ====================================
echo Enabling GCP APIs for project: %PROJECT_ID%
echo ====================================
echo.

echo Make sure you're authenticated with your own account:
echo   gcloud auth login
echo.
echo Setting project...
gcloud config set project %PROJECT_ID%

echo.
echo Enabling Cloud Build API...
gcloud services enable cloudbuild.googleapis.com --project=%PROJECT_ID%

echo.
echo Enabling Artifact Registry API...
gcloud services enable artifactregistry.googleapis.com --project=%PROJECT_ID%

echo.
echo Enabling Cloud Run API...
gcloud services enable run.googleapis.com --project=%PROJECT_ID%

echo.
echo ====================================
echo ✅ All services enabled!
echo ====================================
echo.
echo Now granting permissions to service account...
echo.

gcloud projects add-iam-policy-binding %PROJECT_ID% --member="serviceAccount:postia-backend-sa@%PROJECT_ID%.iam.gserviceaccount.com" --role="roles/cloudbuild.builds.builder"

gcloud projects add-iam-policy-binding %PROJECT_ID% --member="serviceAccount:postia-backend-sa@%PROJECT_ID%.iam.gserviceaccount.com" --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding %PROJECT_ID% --member="serviceAccount:postia-backend-sa@%PROJECT_ID%.iam.gserviceaccount.com" --role="roles/storage.admin"

echo.
echo ====================================
echo ✅ All permissions granted!
echo ====================================
echo.
echo You can now push to GitHub and the deployment should work.
