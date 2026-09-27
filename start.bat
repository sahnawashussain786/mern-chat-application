@echo off
setlocal EnableExtensions EnableDelayedExpansion
title ChatFlow Launcher

rem ============================================================
rem  ChatFlow - one-click launcher (Windows)
rem  Usage:  start.bat        normal start
rem          start.bat check  run checks only, start nothing
rem ============================================================

echo.
echo  ============================================
echo    ChatFlow Launcher
echo    MERN + Socket.IO + Tailwind + Clerk
echo  ============================================
echo.

rem ---------- 1. Node.js ----------
where node >nul 2>nul
if errorlevel 1 (
    echo  [ERROR] Node.js is not installed or not in PATH.
    echo          Install it from https://nodejs.org - v18 or newer.
    echo.
    pause
    exit /b 1
)
for /f "delims=" %%v in ('node --version') do set "NODE_VER=%%v"
echo  [OK] Node.js !NODE_VER! found.

rem ---------- 2. Env files ----------
set "NEEDS_KEYS=0"

if not exist "server\.env" (
    copy "server\.env.example" "server\.env" >nul
    echo  [WARN] Created server\.env from template - add your keys.
    set "NEEDS_KEYS=1"
) else (
    echo  [OK] server\.env found.
)

if not exist "client\.env.local" (
    copy "client\.env.example" "client\.env.local" >nul
    echo  [WARN] Created client\.env.local from template - add your Clerk key.
    set "NEEDS_KEYS=1"
) else (
    echo  [OK] client\.env.local found.
)

rem Flag if keys are still the placeholder values from the templates
findstr /C:"pk_test_xxxxxxxx" "client\.env.local" >nul 2>nul && set "NEEDS_KEYS=1"
findstr /C:"sk_test_xxxxxxxx" "server\.env" >nul 2>nul && set "NEEDS_KEYS=1"

rem ---------- 3. MongoDB ----------
set "MONGO_OK=0"
netstat -an | findstr /C:":27017" | findstr /C:"LISTENING" >nul 2>nul && set "MONGO_OK=1"

if "!MONGO_OK!"=="1" (
    echo  [OK] MongoDB is running on port 27017.
) else (
    echo  [WARN] No local MongoDB detected on port 27017.
    echo         Using MongoDB Atlas instead? That is fine - just make
    echo         sure MONGODB_URI in server\.env points to your cluster.
)

rem ---------- Check mode ----------
if /I "%~1"=="check" (
    echo.
    echo  ---- Summary ---------------------------------
    if "!NEEDS_KEYS!"=="1" (
        echo   Clerk keys : MISSING ^(still placeholders^)
    ) else (
        echo   Clerk keys : OK
    )
    if "!MONGO_OK!"=="1" (
        echo   MongoDB    : running
    ) else (
        echo   MongoDB    : not detected
    )
    echo  ----------------------------------------------
    echo.
    echo  Check complete - nothing was started.
    exit /b 0
)

rem ---------- 4. Dependencies ----------
if not exist "server\node_modules" (
    echo  [..] Installing server dependencies - first run only...
    pushd server
    call npm install
    if errorlevel 1 (
        echo  [ERROR] npm install failed for server.
        popd
        pause
        exit /b 1
    )
    popd
) else (
    echo  [OK] Server dependencies installed.
)

if not exist "client\node_modules" (
    echo  [..] Installing client dependencies - first run only...
    pushd client
    call npm install
    if errorlevel 1 (
        echo  [ERROR] npm install failed for client.
        popd
        pause
        exit /b 1
    )
    popd
) else (
    echo  [OK] Client dependencies installed.
)

rem ---------- 5. Try to start MongoDB if installed ----------
if "!MONGO_OK!"=="0" (
    where mongod >nul 2>nul
    if not errorlevel 1 (
        echo  [..] Starting local MongoDB in a minimized window...
        if not exist "%USERPROFILE%\chatflow-db" md "%USERPROFILE%\chatflow-db" >nul 2>nul
        start "MongoDB" /min mongod --dbpath "%USERPROFILE%\chatflow-db"
        timeout /t 3 /nobreak >nul
        netstat -an | findstr /C:":27017" | findstr /C:"LISTENING" >nul 2>nul && set "MONGO_OK=1"
        if "!MONGO_OK!"=="1" (
            echo  [OK] MongoDB started on port 27017.
        ) else (
            echo  [WARN] MongoDB did not come up yet - continuing anyway.
        )
    )
)

rem ---------- 6. Keys warning ----------
if "!NEEDS_KEYS!"=="1" (
    echo.
    echo  ------------------------------------------------------------
    echo   ACTION NEEDED - your Clerk keys are still placeholders.
    echo.
    echo   1. Go to https://dashboard.clerk.com and open API Keys
    echo   2. Paste the Publishable key into client\.env.local
    echo        VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
    echo   3. Paste the Secret key into server\.env
    echo        CLERK_SECRET_KEY=sk_test_...
    echo   4. Close both app windows and run start.bat again.
    echo.
    echo   The app will still try to start, but sign-in will not
    echo   work until the real keys are added.
    echo  ------------------------------------------------------------
)

rem ---------- 7. Launch ----------
echo.
echo  [..] Starting API + Socket.IO server  (window: ChatFlow Server)...
pushd "%~dp0server"
start "ChatFlow Server" cmd /k "npm run dev"
popd

echo  [..] Starting Vite client             (window: ChatFlow Client)...
pushd "%~dp0client"
start "ChatFlow Client" cmd /k "npm run dev"
popd

echo  [..] Waiting for the dev servers to boot...
timeout /t 5 /nobreak >nul
start "" http://localhost:5173

echo.
echo  ============================================
echo    ChatFlow is starting up.
echo.
echo    Chat app : http://localhost:5173
echo    API      : http://localhost:5000/api/health
echo.
echo    To stop: close the ChatFlow Server and
echo    ChatFlow Client windows (or Ctrl+C in them).
echo  ============================================
echo.
timeout /t 8 /nobreak >nul
exit /b 0
