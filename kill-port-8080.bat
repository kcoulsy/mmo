@echo off
echo Killing all processes on port 8080...

REM Find all process IDs using port 8080
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8080') do (
    echo Found process with PID: %%a
    taskkill /PID %%a /F
)

echo Killing all processes on port 3000...

REM Find all process IDs using port 3000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    echo Found process with PID: %%a
    taskkill /PID %%a /F
)

echo No processes found on port 8080 or 3000
echo Done.
