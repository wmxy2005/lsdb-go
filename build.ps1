param(
    [string]$OutputDir = "build",
    [switch]$All,
    [switch]$Frontend,
    [switch]$Backend,
    [switch]$Desktop
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

function Show-BuildMenu {
    Write-Host ""
    Write-Host "请选择构建目标:"
    Write-Host "  1) 全部 (Frontend + Backend + Desktop)"
    Write-Host "  2) Frontend"
    Write-Host "  3) Backend"
    Write-Host "  4) Desktop"
    Write-Host "  0) 取消"
}

function Read-BuildChoice {
    $maxAttempts = 3
    for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
        Show-BuildMenu
        $choice = Read-Host "请输入选项 [0-4]"

        switch ($choice) {
            "0" { return $null }
            "" { return $null }
            "1" {
                return @{
                    Frontend = $true
                    Backend  = $true
                    Desktop  = $true
                }
            }
            "2" {
                return @{
                    Frontend = $true
                    Backend  = $false
                    Desktop  = $false
                }
            }
            "3" {
                return @{
                    Frontend = $false
                    Backend  = $true
                    Desktop  = $false
                }
            }
            "4" {
                return @{
                    Frontend = $false
                    Backend  = $false
                    Desktop  = $true
                }
            }
            default {
                Write-Host "无效选项，请重新输入。" -ForegroundColor Yellow
            }
        }
    }

    throw "无效输入次数过多，已退出。"
}

function Build-Frontend {
    param(
        [string]$FrontendDir,
        [string]$FrontendDistPath
    )

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
}

function Build-Backend {
    param(
        [string]$BackendDir,
        [string]$ServerExePath,
        [string]$OutputEnvPath
    )

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
    $filteredLines += "LSDB_FRONTEND_DIST=./dist"
    Set-Content -Path $OutputEnvPath -Value $filteredLines -Encoding utf8
}

function Build-Desktop {
    param(
        [string]$DesktopDir,
        [string]$OutputPath,
        [string]$DesktopTargetReleasePath,
        [string]$DesktopBundlePath,
        [string]$DesktopBundleOutputPath
    )

    if (-not (Test-Path $DesktopDir)) {
        Write-Warning "Desktop project not found, skipping: $DesktopDir"
        return $null
    }

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

    return $desktopExe
}

$hasExplicitTarget = $All -or $Frontend -or $Backend -or $Desktop

if (-not $hasExplicitTarget) {
    $selection = Read-BuildChoice
    if (-not $selection) {
        Write-Host "已取消构建。"
        exit 0
    }

    $doFrontend = $selection.Frontend
    $doBackend = $selection.Backend
    $doDesktop = $selection.Desktop
}
else {
    $doFrontend = $All -or $Frontend
    $doBackend = $All -or $Backend
    $doDesktop = $All -or $Desktop
}

if (-not (Test-Path $OutputPath)) {
    New-Item -ItemType Directory -Path $OutputPath | Out-Null
}

# Preserve runtime data such as build/data/lsdb.db across rebuilds.
if ($doFrontend -and (Test-Path $FrontendDistPath)) {
    Remove-Item -Recurse -Force $FrontendDistPath
}
if ($doDesktop -and (Test-Path $DesktopBundleOutputPath)) {
    Remove-Item -Recurse -Force $DesktopBundleOutputPath
}

$desktopExe = $null

if ($doFrontend) {
    Build-Frontend -FrontendDir $FrontendDir -FrontendDistPath $FrontendDistPath
}

if ($doBackend) {
    Build-Backend -BackendDir $BackendDir -ServerExePath $ServerExePath -OutputEnvPath $OutputEnvPath
}

if ($doDesktop) {
    $desktopExe = Build-Desktop `
        -DesktopDir $DesktopDir `
        -OutputPath $OutputPath `
        -DesktopTargetReleasePath $DesktopTargetReleasePath `
        -DesktopBundlePath $DesktopBundlePath `
        -DesktopBundleOutputPath $DesktopBundleOutputPath
}

Write-Host "Build output ready:"
if ($doBackend) {
    Write-Host "  $ServerExePath"
    Write-Host "  $OutputEnvPath"
}
if ($doFrontend) {
    Write-Host "  $FrontendDistPath"
}
if ($doDesktop -and $desktopExe) {
    Write-Host "  $(Join-Path $OutputPath $desktopExe.Name)"
}
if ($doDesktop -and (Test-Path $DesktopBundleOutputPath)) {
    Write-Host "  $DesktopBundleOutputPath"
}
