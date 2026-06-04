param(
    [string]$OutputDir = "build"
)

$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$FrontendDir = Join-Path $RootDir "frontend"
$BackendDir = Join-Path $RootDir "backend"
$DesktopDir = Join-Path $RootDir "desktop"
$OutputPath = Join-Path $RootDir $OutputDir
$FrontendDistPath = Join-Path $OutputPath "dist"
$ServerExePath = Join-Path $OutputPath "server.exe"
$OutputEnvPath = Join-Path $OutputPath ".env"
$DesktopTargetReleasePath = Join-Path $DesktopDir "src-tauri\target\release"
$DesktopBundlePath = Join-Path $DesktopTargetReleasePath "bundle"
$DesktopBundleOutputPath = Join-Path $OutputPath "desktop-bundle"

if (-not (Test-Path $OutputPath)) {
    New-Item -ItemType Directory -Path $OutputPath | Out-Null
}

# Preserve runtime data such as build/data/lsdb.db across rebuilds.
foreach ($generatedDir in @($FrontendDistPath, $DesktopBundleOutputPath)) {
    if (Test-Path $generatedDir) {
        Remove-Item -Recurse -Force $generatedDir
    }
}

Write-Host "Building frontend..."
Push-Location $FrontendDir
try {
    npm run build
}
finally {
    Pop-Location
}

Write-Host "Copying frontend dist to build/dist..."
Copy-Item -Recurse -Force (Join-Path $FrontendDir "dist") $FrontendDistPath

Write-Host "Building backend binary..."
Push-Location $BackendDir
try {
    go build -o $ServerExePath ./cmd/server
}
finally {
    Pop-Location
}

Write-Host "Preparing build/.env..."
$sourceEnv = Join-Path $BackendDir ".env"
if (-not (Test-Path $sourceEnv)) {
    $sourceEnv = Join-Path $BackendDir ".env.example"
}

$lines = Get-Content -Path $sourceEnv
$filteredLines = @()
foreach ($line in $lines) {
    if ($line -notmatch '^\s*LSDB_FRONTEND_DIST\s*=') {
        $filteredLines += $line
    }
}
$filteredLines += "FRONTEND_DIST=./dist"
Set-Content -Path $OutputEnvPath -Value $filteredLines -Encoding utf8

if (Test-Path $DesktopDir) {
    Write-Host "Building desktop (Tauri)..."
    Push-Location $DesktopDir
    try {
        npm run tauri build
    }
    finally {
        Pop-Location
    }

    $desktopExe = Get-ChildItem -Path $DesktopTargetReleasePath -Filter "*.exe" -File -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -notlike "*setup*" } |
        Select-Object -First 1

    if ($desktopExe) {
        Copy-Item -Force $desktopExe.FullName (Join-Path $OutputPath $desktopExe.Name)
    }
    else {
        Write-Warning "Desktop executable not found under: $DesktopTargetReleasePath"
    }

    if (Test-Path $DesktopBundlePath) {
        Copy-Item -Recurse -Force $DesktopBundlePath $DesktopBundleOutputPath
    }
    else {
        Write-Warning "Desktop bundle directory not found: $DesktopBundlePath"
    }
}
else {
    Write-Warning "Desktop project not found, skipping: $DesktopDir"
}

Write-Host "Build output ready:"
Write-Host "  $ServerExePath"
Write-Host "  $FrontendDistPath"
Write-Host "  $OutputEnvPath"
if ($desktopExe) {
    Write-Host "  $(Join-Path $OutputPath $desktopExe.Name)"
}
if (Test-Path $DesktopBundleOutputPath) {
    Write-Host "  $DesktopBundleOutputPath"
}
