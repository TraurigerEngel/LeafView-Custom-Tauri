# LeafView Custom Tauri - per-user file association registration for Windows 11.
# Supports Windows PowerShell 5.1, no elevation required.
[CmdletBinding()]
param(
    [ValidateSet('Register','Unregister','Status')]
    [string]$Action = 'Register',
    [switch]$NoSettings
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2.0

$AppName = 'LeafView Custom Tauri'
$AppKey = 'Software\LeafViewCustomTauri'
$CapabilityKey = "$AppKey\Capabilities"
$RegisteredKey = 'Software\RegisteredApplications'
$ProgId = 'LeafViewCustomTauri.Image'
$ProgKey = "Software\Classes\$ProgId"
$ApplicationKey = 'Software\Classes\Applications\LeafView Custom Tauri.exe'
$Extensions = @('.bmp', '.gif', '.ico', '.jpeg', '.jpg', '.png', '.svg', '.webp')
$ProjectRoot = Split-Path -Parent $PSScriptRoot
# Portable releases keep the EXE beside REGISTER-LEAFVIEW.cmd.
# Development builds use the original src-tauri\target\release location.
$PortableExePath = Join-Path $ProjectRoot 'LeafView Custom Tauri.exe'
$BuildExePath = Join-Path $ProjectRoot 'src-tauri\target\release\LeafView Custom Tauri.exe'
$ExePath = if (Test-Path -LiteralPath $PortableExePath -PathType Leaf) { $PortableExePath } else { $BuildExePath }
$ExpectedCapabilities = 'Software\LeafViewCustomTauri\Capabilities'
$Hive = [Microsoft.Win32.Registry]::CurrentUser

function Get-RegValue([string]$SubKey, [string]$ValueName) {
    $key = $Hive.OpenSubKey($SubKey, $false)
    if ($null -eq $key) { return $null }
    try { return $key.GetValue($ValueName, $null) } finally { $key.Close() }
}
function Set-RegValue([string]$SubKey, [string]$ValueName, [string]$Value) {
    $key = $Hive.CreateSubKey($SubKey)
    if ($null -eq $key) { throw "Cannot create registry key: $SubKey" }
    try { $key.SetValue($ValueName, $Value, [Microsoft.Win32.RegistryValueKind]::String) }
    finally { $key.Close() }
}
function Notify-Associations {
    try {
        if (-not ('LeafViewShellChange' -as [type])) {
            Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class LeafViewShellChange {
    [DllImport("shell32.dll")]
    public static extern void SHChangeNotify(uint eventId, uint flags, IntPtr item1, IntPtr item2);
}
'@
        }
        [LeafViewShellChange]::SHChangeNotify(0x08000000, 0, [IntPtr]::Zero, [IntPtr]::Zero)
    } catch {
        Write-Warning 'Windows Shell could not be notified. Reopen Explorer or sign out and in if needed.'
    }
}
function Open-DefaultApps {
    if ($NoSettings) { return }
    $name = [Uri]::EscapeDataString($AppName)
    try { Start-Process "ms-settings:defaultapps?registeredAppUser=$name" -ErrorAction Stop }
    catch {
        Write-Warning 'Could not open the app-specific Default Apps page. Trying general settings.'
        try { Start-Process 'ms-settings:defaultapps' -ErrorAction Stop }
        catch { Write-Warning 'Open Windows Settings > Apps > Default apps manually.' }
    }
}
function Test-Owner {
    (Get-RegValue $AppKey 'RegistrationOwner') -eq 'LeafViewCustomTauri-HF4'
}

if ($Action -eq 'Register') {
    if (-not (Test-Path -LiteralPath $ExePath -PathType Leaf)) {
        throw "Release EXE not found: $ExePath. Build LeafView via BUILD-PORTABLE-ONLY.cmd first."
    }
    $ExePath = [System.IO.Path]::GetFullPath($ExePath)
    $reg = Get-RegValue $RegisteredKey $AppName
    if ($null -ne $reg -and $reg -ne $ExpectedCapabilities) {
        throw "Conflicting registration exists for '$AppName'. No changes made."
    }
    $existingProg = Get-RegValue "$ProgKey\shell\open\command" ''
    if ($null -ne $existingProg -and -not (Test-Owner)) {
        throw "The ProgID is already used by an unknown registration. No changes made."
    }
    $existingApplication = Get-RegValue "$ApplicationKey\shell\open\command" ''
    if ($null -ne $existingApplication -and -not (Test-Owner)) {
        throw 'The application registry entry is already used by an unknown registration.'
    }

    $Command = '"' + $ExePath + '" "%1"'
    Set-RegValue $AppKey 'RegistrationOwner' 'LeafViewCustomTauri-HF4'
    Set-RegValue $AppKey 'ExecutablePath' $ExePath
    Set-RegValue $CapabilityKey 'ApplicationName' $AppName
    Set-RegValue $CapabilityKey 'ApplicationDescription' 'LeafView Custom Tauri - image viewer for Windows'
    foreach ($ext in $Extensions) {
        Set-RegValue "$CapabilityKey\FileAssociations" $ext $ProgId
        Set-RegValue "$ApplicationKey\SupportedTypes" $ext ''
    }
    Set-RegValue $ProgKey '' 'LeafView Custom image'
    Set-RegValue "$ProgKey\DefaultIcon" '' ('"' + $ExePath + '",0')
    Set-RegValue "$ProgKey\shell\open\command" '' $Command
    Set-RegValue $ApplicationKey 'FriendlyAppName' $AppName
    Set-RegValue "$ApplicationKey\shell\open\command" '' $Command
    Set-RegValue $RegisteredKey $AppName $ExpectedCapabilities

    Notify-Associations
    Write-Host "REGISTERED: $AppName" -ForegroundColor Green
    Write-Host "EXE: $ExePath"
    Write-Host ('Formats: ' + ($Extensions -join ', '))
    Write-Host 'Next, choose LeafView for the desired formats in Windows Default Apps.'
    Open-DefaultApps
    exit 0
}
if ($Action -eq 'Status') {
    $reg = Get-RegValue $RegisteredKey $AppName
    if ($reg -eq $ExpectedCapabilities -and (Test-Owner)) {
        Write-Host 'LeafView is registered as an available image viewer.' -ForegroundColor Green
        Write-Host ('Executable: ' + (Get-RegValue $AppKey 'ExecutablePath'))
        Write-Host 'Registration does not imply LeafView is the current default for every format.'
        exit 0
    }
    Write-Host 'LeafView is not registered using this helper.' -ForegroundColor Yellow
    exit 1
}
if ($Action -eq 'Unregister') {
    if (-not (Test-Owner)) {
        $reg = Get-RegValue $RegisteredKey $AppName
        if ($null -ne $reg) { throw 'Found an unknown LeafView registration. Will not remove it.' }
        Write-Host 'Nothing to remove. No system file associations were changed.'
        exit 0
    }
    $reg = Get-RegValue $RegisteredKey $AppName
    if ($null -ne $reg -and $reg -ne $ExpectedCapabilities) {
        throw 'RegisteredApplications entry differs. Refusing to remove another application registration.'
    }
    $entry = $Hive.OpenSubKey($RegisteredKey, $true)
    if ($null -ne $entry) {
        try { if ($null -ne $reg) { $entry.DeleteValue($AppName, $false) } }
        finally { $entry.Close() }
    }
    foreach ($path in @($ProgKey, $ApplicationKey, $AppKey)) {
        $Hive.DeleteSubKeyTree($path, $false)
    }
    Notify-Associations
    Write-Host 'REMOVED: LeafView registration for the current Windows user.' -ForegroundColor Green
    Write-Host 'Existing Windows default selections are NOT modified by this helper.'
    Write-Host 'If LeafView was your default, select another viewer in Windows Settings.'
    Open-DefaultApps
    exit 0
}
