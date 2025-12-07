@echo off
REM Create Artifact Registry repository for Cloud Run source deployments
set PROJECT_ID=postia-480418
set REGION=us-central1

echo ====================================
echo Creating Artifact Registry repository
echo ====================================
echo.

gcloud config set project %PROJECT_ID%

echo.
echo Creating cloud-run-source-deploy repository...
gcloud artifacts repositories create cloud-run-source-deploy ^
  --repository-format=docker ^
  --location=%REGION% ^
  --description="Docker repository for Cloud Run source deployments" ^
  --project=%PROJECT_ID%

echo.
echo ====================================
echo ✅ Repository created (or already exists)!
echo ====================================
echo.
echo You can now deploy to Cloud Run from source.
