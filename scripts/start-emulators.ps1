# Ensures Java is on PATH for the Firestore emulator (required even if the terminal was opened before JDK install).
$jdkCandidates = @(
  'C:\Program Files\Microsoft\jdk-21.0.11.10-hotspot',
  'C:\Program Files\Microsoft\jdk-21.0.11-hotspot',
  'C:\Program Files\Eclipse Adoptium\jdk-21*',
  'C:\Program Files\Java\jdk-21*'
)

function Stop-StaleFirestoreEmulators {
  # Leftover java processes from a previous `firebase emulators:start` block Firestore ports.
  foreach ($port in @(8080, 8081)) {
    $matches = netstat -ano | Select-String "127\.0\.0\.1:$port\s+.*LISTENING\s+(\d+)"
    foreach ($line in $matches) {
      if ($line -match 'LISTENING\s+(\d+)') {
        $procId = [int]$Matches[1]
        $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
        if ($proc -and $proc.ProcessName -eq 'java') {
          Write-Host "Stopping stale Firestore emulator (PID $procId on port $port)..."
          Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
          Start-Sleep -Milliseconds 500
        }
      }
    }
  }
}

$javaHome = $env:JAVA_HOME
if (-not $javaHome -or -not (Test-Path "$javaHome\bin\java.exe")) {
  foreach ($candidate in $jdkCandidates) {
    $resolved = Get-Item $candidate -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($resolved -and (Test-Path "$($resolved.FullName)\bin\java.exe")) {
      $javaHome = $resolved.FullName
      break
    }
  }
}

if (-not $javaHome) {
  Write-Error @"
Java JDK not found. The Firestore emulator requires Java 11+.

Install with: winget install Microsoft.OpenJDK.21

Then close ALL terminals and run: npm run emulators
"@
  exit 1
}

$env:JAVA_HOME = $javaHome
$env:Path = "$javaHome\bin;" + [System.Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path', 'User')

Write-Host "Using JAVA_HOME=$javaHome"
& "$javaHome\bin\java.exe" -version

Stop-StaleFirestoreEmulators

Set-Location $PSScriptRoot\..
firebase emulators:start @args
