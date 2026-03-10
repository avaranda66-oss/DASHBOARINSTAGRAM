###############################################################################
# crop-story-9x16.ps1 — Recorta e redimensiona qualquer imagem para 9:16
# Uso: powershell -File scripts\crop-story-9x16.ps1 "caminho\da\imagem.png"
# Saída: mesma pasta, sufixo _9x16.png
###############################################################################
param(
    [Parameter(Mandatory = $true)]
    [string]$InputPath
)

Add-Type -AssemblyName System.Drawing

if (-not (Test-Path $InputPath)) {
    Write-Error "Arquivo nao encontrado: $InputPath"
    exit 1
}

$targetW = 1080
$targetH = 1920
$targetRatio = $targetH / $targetW  # 1.7778

$dir = [System.IO.Path]::GetDirectoryName($InputPath)
$name = [System.IO.Path]::GetFileNameWithoutExtension($InputPath)
$outputPath = Join-Path $dir "${name}_9x16.png"

$src = [System.Drawing.Image]::FromFile((Resolve-Path $InputPath).Path)
Write-Host "Input: $($src.Width) x $($src.Height)"

$srcRatio = $src.Height / $src.Width

if ($srcRatio -ge $targetRatio) {
    $cropW = $src.Width
    $cropH = [int]($src.Width * $targetRatio)
    $cropX = 0
    $cropY = [int](($src.Height - $cropH) / 2)
}
else {
    $cropH = $src.Height
    $cropW = [int]($src.Height / $targetRatio)
    $cropX = [int](($src.Width - $cropW) / 2)
    $cropY = 0
}

Write-Host "Crop: x=$cropX y=$cropY w=$cropW h=$cropH"

$cropRect = New-Object System.Drawing.Rectangle($cropX, $cropY, $cropW, $cropH)
$cropped = ([System.Drawing.Bitmap]$src).Clone($cropRect, $src.PixelFormat)
$src.Dispose()

$final = New-Object System.Drawing.Bitmap($targetW, $targetH)
$g = [System.Drawing.Graphics]::FromImage($final)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.DrawImage($cropped, 0, 0, $targetW, $targetH)
$g.Dispose()
$cropped.Dispose()

$final.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$final.Dispose()

Write-Host "Output: ${targetW}x${targetH} -> $outputPath"
