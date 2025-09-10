# NUCLEAR JAVA WORKSPACE CLEANUP SCRIPT
Write-Host "Starting AGGRESSIVE Java workspace cleanup..." -ForegroundColor Red

# 1. KILL ALL JAVA PROCESSES
Write-Host "Killing all Java processes..." -ForegroundColor Yellow
Get-Process -Name "java*" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process -Name "gradle*" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# 2. CLEAN VS CODE JAVA CACHES
Write-Host "Cleaning VS Code Java caches..." -ForegroundColor Yellow
$vscodeJavaPath = "$env:APPDATA\Code\User\globalStorage\redhat.java"
if (Test-Path $vscodeJavaPath) {
    Remove-Item -Recurse -Force $vscodeJavaPath -ErrorAction SilentlyContinue
    Write-Host "Removed VS Code Java global storage" -ForegroundColor Green
}

$workspaceStorage = "$env:APPDATA\Code\User\workspaceStorage"
if (Test-Path $workspaceStorage) {
    Get-ChildItem -Path $workspaceStorage -Directory | Where-Object { 
        (Get-ChildItem -Path $_.FullName -Filter "*redhat.java*" -ErrorAction SilentlyContinue).Count -gt 0 
    } | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "Cleaned workspace Java storage" -ForegroundColor Green
}

# 3. CLEAN GRADLE CACHES
Write-Host "Cleaning Gradle caches..." -ForegroundColor Yellow
$gradlePath = "$env:USERPROFILE\.gradle"
if (Test-Path $gradlePath) {
    Remove-Item -Recurse -Force "$gradlePath\caches" -ErrorAction SilentlyContinue
    Remove-Item -Recurse -Force "$gradlePath\daemon" -ErrorAction SilentlyContinue
    Remove-Item -Recurse -Force "$gradlePath\wrapper" -ErrorAction SilentlyContinue
    Write-Host "Cleaned Gradle caches" -ForegroundColor Green
}

# 4. CLEAN PROJECT BUILD FOLDERS
Write-Host "Cleaning project build folders..." -ForegroundColor Yellow
if (Test-Path "android\build") { Remove-Item -Recurse -Force "android\build" -ErrorAction SilentlyContinue }
if (Test-Path "android\app\build") { Remove-Item -Recurse -Force "android\app\build" -ErrorAction SilentlyContinue }
if (Test-Path "android\.gradle") { Remove-Item -Recurse -Force "android\.gradle" -ErrorAction SilentlyContinue }

# 5. CLEAN NODE_MODULES GRADLE FILES (NUCLEAR)
Write-Host "Cleaning problematic node_modules build files..." -ForegroundColor Yellow
Get-ChildItem -Path "node_modules" -Recurse -Directory -Name "build" -ErrorAction SilentlyContinue | 
    ForEach-Object { Remove-Item -Recurse -Force "node_modules\$_" -ErrorAction SilentlyContinue }

# 6. RESET GRADLE WRAPPER
Write-Host "Resetting Gradle wrapper..." -ForegroundColor Yellow
if (Test-Path "android\gradlew") {
    Set-Location android
    .\gradlew wrapper --gradle-version=7.6 --distribution-type=bin
    Set-Location ..
}

Write-Host "CLEANUP COMPLETE - VS Code Java workspace has been NUKED" -ForegroundColor Red
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Close VS Code completely" -ForegroundColor White
Write-Host "2. Restart VS Code" -ForegroundColor White
Write-Host "3. Java Language Server will be DISABLED per settings" -ForegroundColor White
