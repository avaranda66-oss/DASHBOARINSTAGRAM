###############################################################################
# fit-story-9x16.ps1 — Encaixa imagem em 9:16 com padding (sem cortar nada)
# A imagem original é redimensionada para caber na largura (1080px),
# e barras escuras são adicionadas acima e abaixo para completar 1920px.
# Uso: powershell -File scripts\fit-story-9x16.ps1 "caminho\da\imagem.png"
###############################################################################
param(
    [Parameter(Mandatory = $true)]
    [string]$InputPath,

    [string]$OutputPath = ""
)

Add-Type -AssemblyName System.Drawing

if (-not (Test-Path $InputPath)) {
    Write-Error "Arquivo nao encontrado: $InputPath"
    exit 1
}

$targetW = 1080
$targetH = 1920

if ($OutputPath -eq "") {
    $dir = [System.IO.Path]::GetDirectoryName($InputPath)
    $name = [System.IO.Path]::GetFileNameWithoutExtension($InputPath)
    $OutputPath = Join-Path $dir "${name}_9x16.png"
}

$src = [System.Drawing.Image]::FromFile((Resolve-Path $InputPath).Path)
Write-Host "Input: $($src.Width) x $($src.Height)"

# Calcular escala para caber na largura
$scale = $targetW / $src.Width
$drawW = $targetW
$drawH = [int]($src.Height * $scale)

# Se a imagem escalada for mais alta que o target, escalar pela altura
if ($drawH -gt $targetH) {
    $scale = $targetH / $src.Height
    $drawH = $targetH
    $drawW = [int]($src.Width * $scale)
}

# Centralizar verticalmente
$offsetX = [int](($targetW - $drawW) / 2)
$offsetY = [int](($targetH - $drawH) / 2)

Write-Host "Scale: $([math]::Round($scale, 2))x, Draw: ${drawW}x${drawH}, Offset: x=$offsetX y=$offsetY"

# Criar imagem final com fundo escuro
$final = New-Object System.Drawing.Bitmap($targetW, $targetH)
$g = [System.Drawing.Graphics]::FromImage($final)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

# Fundo escuro (matching the image's dark tones)
$g.Clear([System.Drawing.Color]::FromArgb(20, 15, 12))

# Desenhar a imagem centralizada
$g.DrawImage($src, $offsetX, $offsetY, $drawW, $drawH)
$g.Dispose()
$src.Dispose()

$final.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$final.Dispose()

Write-Host "Output: ${targetW}x${targetH} -> $OutputPath"
