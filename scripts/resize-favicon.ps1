Add-Type -AssemblyName System.Drawing
$base = 'C:\Users\saran\OneDrive\Desktop\projects\red-wave-app\public'
$favPath = Join-Path $base 'favicon.png'

$favSrc = [System.Drawing.Bitmap]::FromFile($favPath)
$origW = $favSrc.Width
$origH = $favSrc.Height
Write-Host "Original favicon size: $origW x $origH"

$favNew = New-Object System.Drawing.Bitmap(128, 128)
$gf = [System.Drawing.Graphics]::FromImage($favNew)
$gf.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gf.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$gf.DrawImage($favSrc, 0, 0, 128, 128)
$gf.Dispose()
$favSrc.Dispose()

$favTemp = Join-Path $base 'favicon_temp.png'
$favNew.Save($favTemp, [System.Drawing.Imaging.ImageFormat]::Png)
$favNew.Dispose()

Copy-Item -Force $favTemp $favPath
Remove-Item $favTemp

$newSize = (Get-Item $favPath).Length
Write-Host "favicon.png saved as 128x128, size: $newSize bytes"
Write-Host "Done"
