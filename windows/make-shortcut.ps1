# Creates a "Savannah Pharmacy" shortcut on the Desktop (and optionally in Startup).
$root    = Split-Path -Parent $PSScriptRoot
$target  = Join-Path $root 'Start Savannah.bat'
$icon    = Join-Path $PSScriptRoot 'savannah.ico'
$shell   = New-Object -ComObject WScript.Shell

function New-SavannahShortcut($folder, $style) {
  $link = $shell.CreateShortcut((Join-Path $folder 'Savannah Pharmacy.lnk'))
  $link.TargetPath       = $target
  $link.WorkingDirectory = $root
  $link.IconLocation     = "$icon,0"
  $link.WindowStyle      = $style   # 1 = normal window, 7 = minimised
  $link.Description      = 'Start Savannah Pharmacy'
  $link.Save()
}

# GetFolderPath finds the real Desktop, even when it is inside OneDrive.
$desktop = [Environment]::GetFolderPath('Desktop')
New-SavannahShortcut $desktop 1
Write-Host ''
Write-Host "  Done! A 'Savannah Pharmacy' icon is now on your Desktop." -ForegroundColor Green
Write-Host '  Double-click it to start the app.'
Write-Host ''

$answer = Read-Host '  Start Savannah Pharmacy automatically when this PC is switched on? (Y/N)'
$startup = [Environment]::GetFolderPath('Startup')
if ($answer -match '^[Yy]') {
  New-SavannahShortcut $startup 7   # minimised: only the browser shows at start-up
  Write-Host '  OK - it will start by itself when you log in to Windows.' -ForegroundColor Green
} else {
  $existing = Join-Path $startup 'Savannah Pharmacy.lnk'
  if (Test-Path $existing) { Remove-Item $existing; Write-Host '  Automatic start turned off.' }
  else { Write-Host '  OK - start it from the Desktop icon when you need it.' }
}
Write-Host ''
