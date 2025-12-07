@echo off
REM Rebuild and test Docker image with latest changes

echo Stopping any running containers on port 8080...
for /f "tokens=*" %%i in ('docker ps -q --filter "publish=8080"') do docker stop %%i

echo.
echo Building Docker image...
docker build -t postia-backend-test .

if %ERRORLEVEL% NEQ 0 (
    echo Build failed!
    exit /b 1
)

echo.
echo Build successful! Now testing container...
echo.
docker run -p 8080:8080 ^
  -e NODE_ENV=production ^
  -e DATABASE_URL=postgresql://neondb_owner:npg_XFeJdL6HZE8w@ep-royal-shape-ah84ex7x-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require ^
  -e DB_SSL=true ^
  -e JWT_SECRET=postia_dev_secret_key_2024_change_in_production_abc123xyz ^
  -e JWT_EXPIRES_IN=7d ^
  -e INSTAGRAM_APP_ID=817509034480208 ^
  -e INSTAGRAM_APP_SECRET=714e0b6cc26c669fb12a9604bca37eec ^
  -e CORS_ORIGIN=* ^
  -e GCS_BUCKET_NAME=postia-media-bucket ^
  -e GCP_PROJECT_ID=postia-480418 ^
  postia-backend-test
