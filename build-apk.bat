@echo off
echo ============================================
echo  Cricket Scorer — Build APK
echo  Created by Aakash Thakur
echo ============================================
echo.

:: Step 1: Copy web files to www
echo [1/4] Copying web files to www directory...
if not exist www mkdir www
if not exist www\icons mkdir www\icons
copy /Y index.html www\ >nul
copy /Y sw.js www\ >nul
copy /Y manifest.json www\ >nul
xcopy /Y /E icons www\icons\ >nul
echo       Done.

:: Step 2: Sync with Capacitor
echo [2/4] Syncing with Capacitor...
call npx cap sync android
echo       Done.

:: Step 3: Build debug APK
echo [3/4] Building debug APK with Gradle...
cd android
call gradlew.bat assembleDebug
cd ..

:: Step 4: Copy APK to output
echo [4/4] Copying APK to output directory...
if not exist output mkdir output
copy /Y android\app\build\outputs\apk\debug\app-debug.apk output\CricketScorer.apk >nul 2>nul
if exist output\CricketScorer.apk (
    echo.
    echo ============================================
    echo  SUCCESS! APK created at:
    echo  output\CricketScorer.apk
    echo ============================================
) else (
    echo.
    echo  APK build may have failed.
    echo  Make sure Android SDK is installed.
    echo  You can also build manually:
    echo    cd android
    echo    gradlew.bat assembleDebug
    echo ============================================
)
pause
