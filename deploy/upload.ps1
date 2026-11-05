# Uploads the app to your Oracle server and starts (or updates) it. Run from PowerShell on your PC:
#   .\deploy\upload.ps1 -Server ubuntu@YOUR.SERVER.IP -Key C:\path\to\your-ssh-key.key
# deploy/.env on the server is kept between uploads.
param(
  [Parameter(Mandatory = $true)][string]$Server,
  [Parameter(Mandatory = $true)][string]$Key
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$archive = Join-Path $env:TEMP 'chibidink.tgz'

Write-Host '==> Packing the app (without node_modules, build output or secrets)'
Push-Location $root
try {
  tar -czf $archive --exclude=node_modules --exclude=bin --exclude=obj --exclude=.vs --exclude=dist --exclude=*.user --exclude=deploy/.env Dockerfile .dockerignore server web deploy
} finally { Pop-Location }

Write-Host '==> Uploading'
scp -i $Key $archive "${Server}:~/chibidink.tgz"

Write-Host '==> Unpacking and starting on the server'
ssh -i $Key $Server 'mkdir -p ~/chibidink && tar -xzf ~/chibidink.tgz -C ~/chibidink && cd ~/chibidink/deploy && bash setup.sh'
