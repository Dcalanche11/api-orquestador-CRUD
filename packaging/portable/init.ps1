$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if (Test-Path '.env') {
    Write-Host 'Se conserva el archivo .env existente.'
    exit 0
}
$generated = Get-Content -Raw 'init-env.py' | docker run --rm -i --pull=never --platform linux/@ARCH@ --entrypoint python pdge-api:@VERSION@-@ARCH@ -
if ($LASTEXITCODE -ne 0) {
    throw 'No se pudo generar la configuración. Cargue primero images.tar.gz con docker load.'
}
$bytes = [System.Text.Encoding]::UTF8.GetBytes(($generated -join "`n") + "`n")
$stream = [System.IO.File]::Open((Join-Path $PSScriptRoot '.env'), [System.IO.FileMode]::CreateNew)
try { $stream.Write($bytes, 0, $bytes.Length) } finally { $stream.Dispose() }
Write-Host 'Configuración nueva creada en .env.'
