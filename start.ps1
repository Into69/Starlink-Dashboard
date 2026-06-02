#Requires -Version 5.1
<#
.SYNOPSIS
    Starlink Monitor — Windows startup script

.DESCRIPTION
    Development mode : FastAPI backend on :8000 and Vite dev server on :5173,
                       both running in this terminal window with colour-coded
                       output.  Press Ctrl+C to stop everything.

    Production mode  : React app pre-built, everything served by a single
                       FastAPI process on :8000.  No Node needed after build.

.PARAMETER Prod
    Run in production mode.

.PARAMETER Help
    Show this help text.

.EXAMPLE
    .\start.ps1
    .\start.ps1 -Prod
    .\start.ps1 --prod

.NOTES
    If you see "running scripts is disabled on this system", run once in an
    elevated PowerShell window:

        Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned

    Or bypass per-invocation:

        pwsh -ExecutionPolicy Bypass -File .\start.ps1
#>
param(
    [switch]$Prod,
    [switch]$Help
)

# Accept bash-style flags for muscle-memory compatibility
if ($args -contains '--prod')                          { $Prod = $true }
if ($args -contains '--help' -or $args -contains '-h') { $Help = $true }

if ($Help) {
    Get-Help $MyInvocation.MyCommand.Path -Detailed
    exit 0
}

$ErrorActionPreference = 'Stop'

# ── paths ─────────────────────────────────────────────────────────────────────
$SCRIPT_DIR   = Split-Path -Parent (Resolve-Path $MyInvocation.MyCommand.Path)
$VENV_DIR     = Join-Path $SCRIPT_DIR 'backend\.venv'
$VENV_PYTHON  = Join-Path $VENV_DIR   'Scripts\python.exe'
$BACKEND_DIR  = Join-Path $SCRIPT_DIR 'backend'
$FRONTEND_DIR = Join-Path $SCRIPT_DIR 'frontend'

# ── env overrides ─────────────────────────────────────────────────────────────
$BACKEND_PORT  = if ($env:BACKEND_PORT)  { $env:BACKEND_PORT  } else { '8000' }
$FRONTEND_PORT = if ($env:FRONTEND_PORT) { $env:FRONTEND_PORT } else { '5173' }
$DISH_ADDRESS  = if ($env:DISH_ADDRESS)  { $env:DISH_ADDRESS  } else { '192.168.100.1:9200' }

# ── colour helpers ─────────────────────────────────────────────────────────────
function Red    { param($m) Write-Host "  $m" -ForegroundColor Red    }
function Green  { param($m) Write-Host "  $m" -ForegroundColor Green  }
function Yellow { param($m) Write-Host "  $m" -ForegroundColor Yellow }
function Bold   { param($m) Write-Host $m     -ForegroundColor White  }

# ── detect Python 3.11+ ───────────────────────────────────────────────────────
$PYTHON = $null
foreach ($cmd in @('python', 'py', 'python3')) {
    try {
        $ver = & $cmd -c 'import sys; print(sys.version_info >= (3,11))' 2>$null
        if ($LASTEXITCODE -eq 0 -and $ver -eq 'True') { $PYTHON = $cmd; break }
    } catch {}
}
if (-not $PYTHON) {
    Red 'ERROR: Python 3.11+ not found.'
    Red '  Download: https://python.org/downloads'
    Red '  During installation check "Add Python to PATH".'
    exit 1
}

# ── detect npm ────────────────────────────────────────────────────────────────
$NPM = $null
foreach ($cmd in @('npm', 'npm.cmd')) {
    try {
        $null = & $cmd --version 2>$null
        if ($LASTEXITCODE -eq 0) { $NPM = $cmd; break }
    } catch {}
}
if (-not $NPM) {
    if ($Prod -and (Test-Path (Join-Path $FRONTEND_DIR 'dist'))) {
        Yellow 'npm not found but frontend\dist\ already exists — skipping build.'
    } else {
        Red 'ERROR: npm not found.'
        Red '  Download Node.js 18+ from https://nodejs.org/en/download'
        Red '  After installing, close and reopen this terminal.'
        exit 1
    }
}

# ── banner ────────────────────────────────────────────────────────────────────
$modeLabel = if ($Prod) { 'Production (single process)' } else { 'Development (multiplexed)' }
$nodeStr   = if ($NPM)  { "$(node --version) / npm $( & $NPM --version )" } else { 'n/a' }
Write-Host ''
Bold '+-- Starlink Monitor -----------------------------------------------+'
Bold "|   Mode   : $modeLabel"
Bold "|   Python : $( & $PYTHON --version )"
Bold "|   Node   : $nodeStr"
Bold "|   Dish   : $DISH_ADDRESS"
Bold '+-------------------------------------------------------------------+'
Write-Host ''

# ── create / reuse virtual environment ───────────────────────────────────────
if (-not (Test-Path $VENV_PYTHON)) {
    Yellow '-> Creating Python virtual environment at backend\.venv ...'
    try {
        & $PYTHON -m venv $VENV_DIR
        if ($LASTEXITCODE -ne 0) { throw }
    } catch {
        Red 'ERROR: could not create venv.'
        exit 1
    }
    Green 'Virtual environment created.'
} else {
    Green 'Reusing existing virtual environment.'
}

# ── install backend dependencies ──────────────────────────────────────────────
Yellow '-> Installing / updating backend dependencies ...'
& $VENV_PYTHON -m pip install --upgrade pip -q
& $VENV_PYTHON -m pip install -r (Join-Path $BACKEND_DIR 'requirements.txt') -q
if ($LASTEXITCODE -ne 0) { Red 'ERROR: pip install failed.'; exit 1 }
Green 'Backend dependencies ready.'

# ── production: build frontend ────────────────────────────────────────────────
if ($Prod -and $NPM) {
    Yellow '-> Installing frontend dependencies ...'
    Push-Location $FRONTEND_DIR
    & $NPM ci -q
    Yellow '-> Building React app ...'
    & $NPM run build
    Pop-Location
    if ($LASTEXITCODE -ne 0) { Red 'ERROR: frontend build failed.'; exit 1 }
    Green 'Frontend built — will be served by FastAPI.'
} elseif ($Prod) {
    Yellow '   Skipping frontend build (using existing dist\).'
}

# ── uvicorn argument list ─────────────────────────────────────────────────────
$uvicornArgs = @('-m','uvicorn','main:app','--host','0.0.0.0','--port',$BACKEND_PORT,'--app-dir',$BACKEND_DIR)

# ── production: single foreground process ─────────────────────────────────────
if ($Prod) {
    $env:DISH_ADDRESS = $DISH_ADDRESS
    $env:SERVE_STATIC = '1'
    Write-Host ''
    Green 'Starlink Monitor is running'
    Green "  Dashboard : http://localhost:$BACKEND_PORT"
    Write-Host ''
    Yellow '  Press Ctrl+C to stop.'
    Write-Host ''
    & $VENV_PYTHON @uvicornArgs
    exit $LASTEXITCODE
}

# ── development: install frontend deps, then multiplex both processes ──────────

Yellow '-> Installing frontend dependencies ...'
Push-Location $FRONTEND_DIR
& $NPM ci -q
Pop-Location
Green 'Frontend dependencies ready.'

# ---------------------------------------------------------------------------
# Multiplexed output
#
# Each process runs inside a dedicated PowerShell runspace.  The runspace
# starts the child via System.Diagnostics.Process (so we can redirect its
# stdout/stderr), registers async DataReceived handlers that enqueue lines
# into a thread-safe ConcurrentQueue, then blocks on WaitForExit().
#
# The main thread drains the queue at ~20 fps and prints lines with
# colour-coded [backend] / [vite] prefixes.
#
# npm.cmd is a batch script and cannot be launched directly without
# UseShellExecute; we invoke it via cmd.exe /c instead.
# ---------------------------------------------------------------------------

$queue    = [System.Collections.Concurrent.ConcurrentQueue[string]]::new()
$done     = [System.Threading.CountdownEvent]::new(2)   # signals when both exit
$childIds = [System.Collections.Concurrent.ConcurrentBag[int]]::new()

function Start-Streamed {
    param(
        [string]   $Label,
        [string]   $File,
        [string[]] $ArgList,
        [string]   $WorkDir,
        [hashtable]$EnvOverrides
    )

    $rs = [System.Management.Automation.Runspaces.RunspaceFactory]::CreateRunspace()
    $rs.Open()
    $rs.SessionStateProxy.SetVariable('_lbl',  $Label)
    $rs.SessionStateProxy.SetVariable('_file', $File)
    $rs.SessionStateProxy.SetVariable('_args', $ArgList)
    $rs.SessionStateProxy.SetVariable('_dir',  $WorkDir)
    $rs.SessionStateProxy.SetVariable('_env',  $EnvOverrides)
    $rs.SessionStateProxy.SetVariable('_q',    $queue)
    $rs.SessionStateProxy.SetVariable('_done', $done)
    $rs.SessionStateProxy.SetVariable('_ids',  $childIds)

    $ps = [System.Management.Automation.PowerShell]::Create()
    $ps.Runspace = $rs
    [void]$ps.AddScript({
        # Build ProcessStartInfo
        $psi = [System.Diagnostics.ProcessStartInfo]::new()
        $psi.FileName               = $_file
        $psi.UseShellExecute        = $false
        $psi.RedirectStandardOutput = $true
        $psi.RedirectStandardError  = $true
        $psi.CreateNoWindow         = $true
        if ($_dir) { $psi.WorkingDirectory = $_dir }

        # Inherit the current process environment, then apply overrides
        foreach ($kv in [System.Environment]::GetEnvironmentVariables('Process').GetEnumerator()) {
            if ($null -ne $kv.Key -and $null -ne $kv.Value) {
                try { $psi.EnvironmentVariables[$kv.Key] = $kv.Value } catch {}
            }
        }
        foreach ($k in $_env.Keys) { $psi.EnvironmentVariables[$k] = $_env[$k] }

        foreach ($a in $_args) { $psi.ArgumentList.Add($a) }

        $proc = [System.Diagnostics.Process]::new()
        $proc.StartInfo           = $psi
        $proc.EnableRaisingEvents = $true

        # Capture refs for the event handlers — ConcurrentQueue + string are thread-safe
        $q2 = $_q; $l2 = $_lbl
        $handler = [System.Diagnostics.DataReceivedEventHandler]{
            param($s, $e)
            if ($null -ne $e.Data) { [void]$q2.Enqueue("[$l2] $($e.Data)") }
        }
        $proc.add_OutputDataReceived($handler)
        $proc.add_ErrorDataReceived($handler)

        [void]$proc.Start()
        [void]$_ids.Add($proc.Id)
        $proc.BeginOutputReadLine()
        $proc.BeginErrorReadLine()
        $proc.WaitForExit()
        [void]$_done.Signal()
    })

    return $ps, $ps.BeginInvoke()
}

# Backend — python.exe is a real executable, no wrapper needed
Yellow '-> Starting backend ...'
$bPS, $bH = Start-Streamed `
    -Label       'backend' `
    -File        $VENV_PYTHON `
    -ArgList     $uvicornArgs `
    -WorkDir     $BACKEND_DIR `
    -EnvOverrides @{ DISH_ADDRESS = $DISH_ADDRESS; SERVE_STATIC = '0' }

# Give uvicorn a moment to bind before Vite's proxy connects
Start-Sleep -Seconds 2

# Vite — npm is a .cmd batch file, must be wrapped in cmd.exe /c
Yellow '-> Starting Vite dev server ...'
$vPS, $vH = Start-Streamed `
    -Label       'vite' `
    -File        'cmd.exe' `
    -ArgList     @('/c', 'npm', 'run', 'dev', '--', '--port', $FRONTEND_PORT) `
    -WorkDir     $FRONTEND_DIR `
    -EnvOverrides @{}

Write-Host ''
Green 'Starlink Monitor is running'
Green "  Dashboard : http://localhost:$FRONTEND_PORT"
Green "  API docs  : http://localhost:$BACKEND_PORT/docs"
Write-Host ''
Yellow '  [backend] lines = FastAPI / uvicorn      (cyan)'
Yellow '  [vite]    lines = Vite dev server        (yellow)'
Write-Host ''
Yellow '  Press Ctrl+C to stop everything.'
Write-Host ''

# ── drain the output queue until both processes exit ─────────────────────────
$line = $null
try {
    while (-not $done.IsSet) {
        while ($queue.TryDequeue([ref]$line)) {
            if      ($line -like '[backend]*') { Write-Host $line -ForegroundColor Cyan   }
            elseif  ($line -like '[vite]*')    { Write-Host $line -ForegroundColor Yellow }
            else                               { Write-Host $line }
        }
        Start-Sleep -Milliseconds 50
    }
    # Drain any lines buffered after the last process exited
    while ($queue.TryDequeue([ref]$line)) {
        if      ($line -like '[backend]*') { Write-Host $line -ForegroundColor Cyan   }
        elseif  ($line -like '[vite]*')    { Write-Host $line -ForegroundColor Yellow }
        else                               { Write-Host $line }
    }
} finally {
    Write-Host ''
    Yellow 'Shutting down...'
    foreach ($childPid in $childIds) {
        try { Stop-Process -Id $childPid -Force -ErrorAction SilentlyContinue } catch {}
    }
    try { $bPS.Stop(); $bPS.Dispose() } catch {}
    try { $vPS.Stop(); $vPS.Dispose() } catch {}
    Green 'Stopped.'
}
