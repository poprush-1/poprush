@echo off
setlocal enabledelayedexpansion

echo [1/4] Pulling latest changes from GitHub...
git pull origin main --allow-unrelated-histories
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Pull failed. Please check for conflicts.
    pause
    exit /b %errorlevel%
)

echo.
echo [2/4] Staging all changes...
git add .

echo.
set /p commit_msg="[3/4] Enter commit message (or press Enter for 'Auto-update'): "
if "!commit_msg!"=="" set commit_msg=Auto-update: %date% %time%

:: We use || echo to prevent the script from stopping if there are no changes
git commit -m "!commit_msg!" || echo [INFO] No new changes to commit, proceeding to push...

echo.
echo [4/4] Pushing to GitHub...
git push origin main
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Push failed.
    pause
    exit /b %errorlevel%
)

echo.
echo [SUCCESS] Site updated and pushed to GitHub!
pause
