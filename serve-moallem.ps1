# serve.ps1 — خادم ملفات ثابتة بسيط للاختبار المحلي فقط (بدون صلاحيات إدارية)
# الاستخدام: powershell -NoProfile -ExecutionPolicy Bypass -File serve.ps1 -Root "C:\path\to\project" -Port 8765
param(
  [Parameter(Mandatory=$true)][string]$Root,
  [int]$Port = 8765
)

$ErrorActionPreference = 'Stop'
$rootFull = [IO.Path]::GetFullPath($Root)

$mime = @{
  '.html'        = 'text/html; charset=utf-8'
  '.css'         = 'text/css; charset=utf-8'
  '.js'          = 'application/javascript; charset=utf-8'
  '.svg'         = 'image/svg+xml'
  '.json'        = 'application/json; charset=utf-8'
  '.webmanifest' = 'application/manifest+json'
  '.png'         = 'image/png'
  '.ico'         = 'image/x-icon'
  '.txt'         = 'text/plain; charset=utf-8'
  '.pdf'         = 'application/pdf'
}

$listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $Port)
$listener.Start()
Write-Output ("SERVING " + $rootFull + " @ http://localhost:" + $Port + "/")

function Send-Response($stream, [int]$status, [string]$reason, [string]$ctype, $bytes) {
  $head = "HTTP/1.1 $status $reason`r`n" +
          "Content-Type: $ctype`r`n" +
          "Content-Length: " + $bytes.Length + "`r`n" +
          "Connection: close`r`n" +
          "Cache-Control: no-store`r`n`r`n"
  $hb = [Text.Encoding]::ASCII.GetBytes($head)
  $stream.Write($hb, 0, $hb.Length)
  if ($bytes.Length -gt 0) { $stream.Write($bytes, 0, $bytes.Length) }
  $stream.Flush()
}

while ($listener.Pending() -eq $false -and $true) {
  # لا شيء
  Start-Sleep -Milliseconds 20
  break
}

while ($true) {
  try {
    $client = $listener.AcceptTcpClient()
    $stream = $client.GetStream()
    $stream.ReadTimeout = 5000

    $buf = New-Object byte[] 16384
    $n = $stream.Read($buf, 0, $buf.Length)
    if ($n -le 0) { $client.Close(); continue }

    $req = [Text.Encoding]::ASCII.GetString($buf, 0, $n)
    $first = ($req -split "`r?`n")[0]
    $parts = $first -split ' '
    $method = if ($parts.Length -gt 0) { $parts[0] } else { 'GET' }
    $rawPath = if ($parts.Length -gt 1) { $parts[1] } else { '/' }

    if ($method -ne 'GET' -and $method -ne 'HEAD') {
      Send-Response $stream 405 'Method Not Allowed' 'text/plain; charset=utf-8' ([Text.Encoding]::UTF8.GetBytes('405'))
      $client.Close(); continue
    }

    $rel = [Uri]::UnescapeDataString($rawPath)
    $q = $rel.IndexOf('?')
    if ($q -ge 0) { $rel = $rel.Substring(0, $q) }
    $rel = $rel.TrimStart('/')
    if ([string]::IsNullOrWhiteSpace($rel)) { $rel = 'index.html' }

    $full = [IO.Path]::GetFullPath((Join-Path $rootFull $rel))
    if ($full.StartsWith($rootFull, [StringComparison]::OrdinalIgnoreCase) -and
        (Test-Path -LiteralPath $full -PathType Leaf)) {

      $ext = [IO.Path]::GetExtension($full).ToLower()
      $ct = $mime[$ext]
      if (-not $ct) { $ct = 'application/octet-stream' }
      $bytes = [IO.File]::ReadAllBytes($full)
      if ($method -eq 'HEAD') { $bytes = New-Object byte[] 0 }
      Send-Response $stream 200 'OK' $ct $bytes
    } else {
      Send-Response $stream 404 'Not Found' 'text/plain; charset=utf-8' ([Text.Encoding]::UTF8.GetBytes('404 not found'))
    }
    $client.Close()
  } catch {
    try { $client.Close() } catch { }
  }
}
