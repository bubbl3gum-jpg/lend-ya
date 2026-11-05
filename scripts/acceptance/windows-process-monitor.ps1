param(
  [Parameter(Mandatory=$true)][string]$EvidenceDirectory,
  [Parameter(Mandatory=$true)][string]$NodeExecutable,
  [ValidateRange(1,30)][int]$IntervalSeconds = 5,
  [ValidateRange(1,720)][int]$MaximumSamples = 600
)
$ErrorActionPreference = 'Stop'
$workspace = (Resolve-Path -LiteralPath '.').Path
$evidence = (Resolve-Path -LiteralPath $EvidenceDirectory).Path
$artifactRoot = Join-Path $workspace '.test-artifacts'
if (-not $evidence.StartsWith($artifactRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Evidence must be inside this worktree test artifacts' }
for ($item = Get-Item -LiteralPath $evidence; $item -and $item.FullName.Length -ge $artifactRoot.Length; $item = $item.Parent) {
  if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Linked evidence paths are unsupported' }
}
$nodePath = (Resolve-Path -LiteralPath $NodeExecutable).Path
if (-not $nodePath.StartsWith($artifactRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase) -or [IO.Path]::GetFileName($nodePath) -ne 'node.exe') { throw 'Use the verified worktree-local Node executable' }
$log = Join-Path $evidence 'process-snapshots.ndjson'
$stream = [IO.File]::Open($log, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::ReadWrite)
$writer = [IO.StreamWriter]::new($stream, [Text.UTF8Encoding]::new($false))
$writer.AutoFlush = $true
try {
  for ($sample = 0; $sample -lt $MaximumSamples; $sample++) {
    if (Test-Path -LiteralPath (Join-Path $evidence 'stop-process-monitor')) { break }
    $started = (Get-Date).ToUniversalTime().ToString('o')
    $phasePath = Join-Path $evidence 'monitor-phase.txt'
    $phase = if (Test-Path -LiteralPath $phasePath) { (Get-Content -LiteralPath $phasePath -Raw).Trim() } else { 'unlabelled' }
    try {
      $nodes = @(Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.ExecutablePath -eq $nodePath })
      $ids = @($nodes | ForEach-Object { [int]$_.ProcessId })
      $listeners = if ($ids.Count) { @(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.OwningProcess -in $ids } | ForEach-Object { @{pid=[int]$_.OwningProcess;address=$_.LocalAddress;port=[int]$_.LocalPort} }) } else { @() }
      $processes = @($nodes | ForEach-Object {
        $kind = if ($_.CommandLine -match 'next[\\/]dist[\\/]bin[\\/]next') { 'next-cli' } elseif ($_.CommandLine -match 'next[\\/]dist[\\/]server[\\/]lib[\\/]start-server') { 'next-worker' } else { 'node-tool' }
        @{pid=[int]$_.ProcessId;parent=[int]$_.ParentProcessId;createdUtc=$_.CreationDate.ToUniversalTime().ToString('o');kind=$kind}
      })
      $record = @{sample=$sample;startedUtc=$started;completedUtc=(Get-Date).ToUniversalTime().ToString('o');phase=$phase;processes=$processes;listeners=@($listeners)}
    } catch {
      $record = @{sample=$sample;startedUtc=$started;completedUtc=(Get-Date).ToUniversalTime().ToString('o');phase=$phase;errorType=$_.Exception.GetType().FullName}
    }
    $writer.WriteLine(($record | ConvertTo-Json -Compress -Depth 6))
    Start-Sleep -Seconds $IntervalSeconds
  }
} finally { $writer.Dispose() }
