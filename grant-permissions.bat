@echo off
REM Grant all required permissions to postia-backend-sa service account
set PROJECT_ID=postia-480418

echo ====================================
echo Granting permissions to postia-backend-sa
echo ====================================
echo.

echo Make sure you're authenticated:
echo   gcloud auth login
echo.

gcloud config set project %PROJECT_ID%

echo.
echo Granting Cloud Run Admin role...
gcloud projects add-iam-policy-binding %PROJECT_ID% --member="serviceAccount:postia-backend-sa@%PROJECT_ID%.iam.gserviceaccount.com" --role="roles/run.admin"

echo.
echo Granting Cloud Build Service Account role...
gcloud projects add-iam-policy-binding %PROJECT_ID% --member="serviceAccount:postia-backend-sa@%PROJECT_ID%.iam.gserviceaccount.com" --role="roles/cloudbuild.builds.builder"

echo.
echo Granting Artifact Registry Admin role...
gcloud projects add-iam-policy-binding %PROJECT_ID% --member="serviceAccount:postia-backend-sa@%PROJECT_ID%.iam.gserviceaccount.com" --role="roles/artifactregistry.admin"

echo.
echo Granting Storage Admin role...
gcloud projects add-iam-policy-binding %PROJECT_ID% --member="serviceAccount:postia-backend-sa@%PROJECT_ID%.iam.gserviceaccount.com" --role="roles/storage.admin"

echo.
echo Granting Service Account User role...
gcloud projects add-iam-policy-binding %PROJECT_ID% --member="serviceAccount:postia-backend-sa@%PROJECT_ID%.iam.gserviceaccount.com" --role="roles/iam.serviceAccountUser"

echo.
echo ====================================
echo ✅ All permissions granted!
echo ====================================
echo.
echo Try pushing to GitHub again.
