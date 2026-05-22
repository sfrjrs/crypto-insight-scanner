# Seeds the running Firestore emulator (start emulators first: npm run emulators)
$firestorePort = 8081
$listening = netstat -ano | Select-String "127\.0\.0\.1:$firestorePort\s+.*LISTENING"
if (-not $listening) {
  Write-Error @"
Firestore emulator is not running on port $firestorePort.

In another terminal, start emulators first:
  npm run emulators

Then run:
  npm run emulators:seed
"@
  exit 1
}

$env:FIRESTORE_EMULATOR_HOST = "127.0.0.1:$firestorePort"
Set-Location $PSScriptRoot\..
node scripts/seed-emulator.mjs
