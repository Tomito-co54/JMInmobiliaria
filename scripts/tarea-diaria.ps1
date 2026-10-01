# tarea-diaria.ps1 - what has to run from Tomy's PC every day, in one place.
#
# Two things cannot run from GitHub's runners, for the same reason - the
# source answers a home connection and not a datacenter:
#   1. The partners whose site does not answer GitHub (lib/colegas, runner
#      "pc"): today Villa del Dique. Found on 1-oct-2026, after six daily runs
#      of the workflow ended green without reading it.
#   2. The market pipeline: Zonaprop blocks datacenter IPs. It ran by hand
#      since 1-sep-2026, which meant it ran when somebody remembered.
#
# Windows Task Scheduler runs this ("JM Inmobiliaria - tarea diaria"), with
# the PC on and the user logged in; a run missed because the PC was off
# starts as soon as it can. No Claude involved: both steps are fixed commands.
#
# Each step logs to .logs/ (git-ignored) and a failure in one does not skip
# the other: the partner sync and the market pipeline have nothing to do with
# each other. The exit code is the number of steps that failed, so the task's
# "last result" in Windows is 0 only when both worked. /arranque reads
# .logs/ultima-corrida.txt and says so when it did not.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\tarea-diaria.ps1

$ErrorActionPreference = "Continue"
$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo

$logs = Join-Path $repo ".logs"
if (-not (Test-Path $logs)) { New-Item -ItemType Directory -Force $logs | Out-Null }
$stamp = Get-Date -Format "yyyy-MM-dd"
$log = Join-Path $logs "tarea-diaria-$stamp.log"

function Step([string]$name, [string]$command) {
    $start = Get-Date
    Add-Content -Path $log -Encoding utf8 -Value "`n===== $name - $($start.ToString('yyyy-MM-dd HH:mm:ss')) ====="
    # Through cmd so stdout and stderr land in the file as the tool wrote
    # them: Windows PowerShell 5.1 wraps a native command's stderr in error
    # records and would mark a clean run as failed.
    cmd /c "$command >> `"$log`" 2>&1"
    $code = $LASTEXITCODE
    $secs = [int]((Get-Date) - $start).TotalSeconds
    Add-Content -Path $log -Encoding utf8 -Value "===== $name - salida $code - $secs s ====="
    return [pscustomobject]@{ name = $name; code = $code; seconds = $secs }
}

$results = @(
    (Step "colegas (runner pc)" "npm run sincronizar-colegas -- --runner pc --aplicar"),
    (Step "pipeline de mercado" "npm run pipeline")
)

$failed = @($results | Where-Object { $_.code -ne 0 })
$summary = @(
    "fecha: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
    "resultado: $(if ($failed.Count -eq 0) { 'ok' } else { 'con errores' })"
) + ($results | ForEach-Object { "$($_.name): $(if ($_.code -eq 0) { 'ok' } else { "ERROR (salida $($_.code))" }) - $($_.seconds) s" }) + @("log: $log")
Set-Content -Path (Join-Path $logs "ultima-corrida.txt") -Encoding utf8 -Value $summary

# Thirty days of logs are plenty to see when something started failing.
Get-ChildItem $logs -Filter "tarea-diaria-*.log" |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } |
    Remove-Item -Force -Confirm:$false

exit $failed.Count
