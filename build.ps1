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

$BuildMenuOptions = @(
    @{ Label = "全部 (Frontend + Backend + Desktop)"; Frontend = $true;  Backend = $true;  Desktop = $true;  Cancel = $false }
    @{ Label = "Frontend";                          Frontend = $true;  Backend = $false; Desktop = $false; Cancel = $false }
    @{ Label = "Backend";                           Frontend = $false; Backend = $true;  Desktop = $false; Cancel = $false }
    @{ Label = "Desktop";                           Frontend = $false; Backend = $false; Desktop = $true;  Cancel = $false }
    @{ Label = "取消";                              Frontend = $false; Backend = $false; Desktop = $false; Cancel = $true  }
)

function Render-BuildMenu {
    param(
        [int]$SelectedIndex,
        [int]$StartLine
    )

    $clearWidth = [Math]::Max([Console]::WindowWidth, 80)

    [Console]::SetCursorPosition(0, $StartLine)
    Write-Host ("请选择构建目标 (↑↓ 移动, Enter 确认, Esc 取消):".PadRight($clearWidth))

    for ($i = 0; $i -lt $BuildMenuOptions.Count; $i++) {
        [Console]::SetCursorPosition(0, $StartLine + 1 + $i)
        $prefix = if ($i -eq $SelectedIndex) { "  > " } else { "    " }
        $text = "$prefix$($BuildMenuOptions[$i].Label)".PadRight($clearWidth)
        if ($i -eq $SelectedIndex) {
            Write-Host $text -ForegroundColor Black -BackgroundColor Cyan
        }
        else {
            Write-Host $text
        }
    }
}

function Select-BuildTarget {
    if ([Console]::IsInputRedirected -or $Host.Name -ne 'ConsoleHost') {
        Write-Host "非交互终端无法显示菜单，请使用参数指定构建目标，例如:" -ForegroundColor Yellow
        Write-Host "  .\build.ps1 -All"
        Write-Host "  .\build.ps1 -Frontend"
        Write-Host "  .\build.ps1 -Backend"
        Write-Host "  .\build.ps1 -Desktop"
        exit 1
    }

    $selectedIndex = 0
    Clear-Host
    $startLine = 0

    while ($true) {
        Render-BuildMenu -SelectedIndex $selectedIndex -StartLine $startLine

        $key = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')

        switch ($key.VirtualKeyCode) {
            38 {
                if ($selectedIndex -gt 0) {
                    $selectedIndex--
                }
            }
            40 {
                if ($selectedIndex -lt ($BuildMenuOptions.Count - 1)) {
                    $selectedIndex++
                }
            }
            13 {
                $choice = $BuildMenuOptions[$selectedIndex]
                if ($choice.Cancel) {
                    return $null
                }
                return @{
                    Frontend = $choice.Frontend
                    Backend  = $choice.Backend
                    Desktop  = $choice.Desktop
                }
            }
            27 { return $null }
        }
    }
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
        } else {
			$filteredLines += "LSDB_FRONTEND_DIST=./dist"
		}
    }
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
    $selection = Select-BuildTarget
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
