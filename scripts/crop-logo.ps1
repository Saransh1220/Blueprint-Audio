Add-Type -AssemblyName System.Drawing

$base = 'C:\Users\saran\OneDrive\Desktop\projects\red-wave-app\public'
$srcPath = "$base\logo-dark.png"
$outPath = "$base\logo-dark-cropped.png"

$src = [System.Drawing.Bitmap]::FromFile($srcPath)
$w = $src.Width
$h = $src.Height
Write-Host "Source: ${w}x${h}"

# Find content bounds — any non-transparent pixel (the dark logo has transparent bg)
$minX = $w; $minY = $h; $maxX = 0; $maxY = 0

for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
        $px = $src.GetPixel($x, $y)
        if ($px.A -gt 10) {
            if ($x -lt $minX) { $minX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}

$contentW = $maxX - $minX
$contentH = $maxY - $minY
Write-Host "Content: ($minX,$minY) to ($maxX,$maxY) = ${contentW}x${contentH}"

# Match the light logo canvas exactly: 840x560
$targetW = 840
$targetH = 560

# Calculate padding to center the content in the target canvas
$padX = [int](($targetW - $contentW) / 2)
$padY = [int](($targetH - $contentH) / 2)

$cropX = [Math]::Max(0, $minX - $padX)
$cropY = [Math]::Max(0, $minY - $padY)
$cropW = [Math]::Min($w - $cropX, $contentW + 2*$padX)
$cropH = [Math]::Min($h - $cropY, $contentH + 2*$padY)

Write-Host "Crop: ($cropX,$cropY) ${cropW}x${cropH}"

# Create output with TRANSPARENT background (PixelFormat32bppARGB)
$final = New-Object System.Drawing.Bitmap($targetW, $targetH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gf = [System.Drawing.Graphics]::FromImage($final)

# Clear to fully transparent
$gf.Clear([System.Drawing.Color]::Transparent)
$gf.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
$gf.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gf.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$gf.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

# Draw the cropped region scaled to fill the target canvas
$srcRect = New-Object System.Drawing.Rectangle($cropX, $cropY, $cropW, $cropH)
$dstRect = New-Object System.Drawing.Rectangle(0, 0, $targetW, $targetH)
$gf.DrawImage($src, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
$gf.Dispose()
$src.Dispose()

# Save as PNG to preserve transparency
$final.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$final.Dispose()

$sz = (Get-Item $outPath).Length
Write-Host "Saved: $outPath (${targetW}x${targetH}, $sz bytes, transparent bg)"
Write-Host "Done"
