# =========================================================
# serve-ai.ps1 — وسيط مركز الذكاء المحلي (المعلم الليبي الرقمي)
# يعمل على جهازكِ وحده: يستقبل طلبات المنصة ويحوّلها إلى
# Google Gemini بمفتاحكِ — بلا أي وسيط خارجي وبلا حسابات.
#
# التشغيل: انقرتي نقرًا مزدوجًا على start-ai-proxy.bat
# المفتاح: ضعي مفتاح Gemini في ملف KEY.txt (سطر واحد)
#          بجانب هذا الملف — ولا ترسليه لأحد.
# الإيقاف: أغلقي نافذة PowerShell المصغّرة.
# =========================================================
$ErrorActionPreference = 'Stop'
$Port = 8794
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$keyFile = Join-Path $dir 'KEY.txt'
$logFile = Join-Path $dir 'ai-log.txt'

function Log($msg) {
  try { Add-Content -Path $logFile -Value ((Get-Date).ToString('yyyy-MM-dd HH:mm:ss') + ' ' + $msg) -Encoding UTF8 } catch {}
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
try {
  $listener.Start()
} catch {
  Write-Host "تعذّر تشغيل الوسيط على المنفذ $Port — قد يستخدمه برنامج آخر."
  Write-Host "غيّري الرقم 8794 في أعلى هذا الملف إلى 8795 ثم أعيدي التشغيل."
  Read-Host 'اضغطي Enter للإغلاق'
  exit 1
}
try { $Host.UI.RawUI.WindowTitle = 'وسيط الذكاء — يعمل (أغلقي هذه النافذة للإيقاف)' } catch {}
Log "started on port $Port"
Write-Host "سيط الذكاء يعمل الآن على: http://localhost:$Port/ai"
Write-Host "  إن لم يكون المفتاح مضبوطًا: ضعيه في ملف KEY.txt بجانب هذا الملف."
Write-Host "  للإيقاف: أغلقي هذه النافذة."

function Send-Json($res, $status, $obj) {
  $bytes = [Text.Encoding]::UTF8.GetBytes((ConvertTo-Json $obj -Compress -Depth 6))
  $res.StatusCode = $status
  $res.ContentType = 'application/json; charset=utf-8'
  $res.ContentEncoding = [Text.Encoding]::UTF8
  $res.OutputStream.Write($bytes, 0, $bytes.Length)
  $res.OutputStream.Close()
}
function Send-Text($res, $status, $text) {
  $bytes = [Text.Encoding]::UTF8.GetBytes($text)
  $res.StatusCode = $status
  $res.ContentType = 'text/plain; charset=utf-8'
  $res.ContentEncoding = [Text.Encoding]::UTF8
  $res.OutputStream.Write($bytes, 0, $bytes.Length)
  $res.OutputStream.Close()
}
function Add-Cors($res) {
  $res.Headers.Add('Access-Control-Allow-Origin', '*')
  $res.Headers.Add('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  $res.Headers.Add('Access-Control-Allow-Headers', 'Content-Type, Accept')
}

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $req = $ctx.Request
  $res = $ctx.Response
  try {
    Add-Cors $res
    if ($req.HttpMethod -eq 'OPTIONS') { $res.StatusCode = 204; $res.OutputStream.Close(); continue }
    if ($req.HttpMethod -eq 'GET') { Send-Json $res 200 @{ ok = $true; service = 'moallem-local-proxy'; port = $Port }; continue }
    if ($req.HttpMethod -ne 'POST') { Send-Text $res 405 'يُقبل POST فقط.'; continue }

    # قراءة الطلب القادم من المنصة
    $reader = New-Object IO.StreamReader($req.InputStream, [Text.Encoding]::UTF8)
    $bodyText = $reader.ReadToEnd()
    $reader.Close()
    try { $j = $bodyText | ConvertFrom-Json }
    catch { Send-Text $res 400 'تعذّرت قراءة الطلب — تأكدي من إرساله بصيغة JSON.'; continue }
    $prompt = "$($j.prompt)"
    if ([String]::IsNullOrWhiteSpace($prompt) -or $prompt.Length -gt 20000) {
      Send-Text $res 400 'طلب غير صالح: لا يوجد نص أو النص أطول من الحد (20000 حرف).'
      continue
    }
    $model = "$($j.model)"
    if ($model -notmatch '^[A-Za-z0-9.\-]{1,60}$') { $model = 'gemini-3.5-flash-lite' }

    # المفتاح من KEY.txt
    $key = ''
    if (Test-Path $keyFile) { $key = ((Get-Content $keyFile -Encoding UTF8 | Select-Object -First 1) + '').Trim() }
    if (-not $key) {
      Log 'POST rejected: KEY.txt missing or empty'
      Send-Text $res 503 'ضعي مفتاح Gemini في ملف KEY.txt بجانب سكربت الوسيط (سطر واحد فقط)، ثم أعيدي المحاولة.'
      continue
    }

    # الإرسال إلى Google Gemini
    $gbody = @{
      systemInstruction = @{ parts = @(@{ text = 'أنتِ مساعِدة تربوية داخل منصة «المعلم الليبي الرقمي». أجيبي بالعربية الفصحى المبسطة وبإيجاز، دون مقدمات، وبلا اختراع معلومات غير مؤكدة؛ إن لم تتأكدي قولي ذلك صراحة.' }) }
      contents          = @(@{ role = 'user'; parts = @(@{ text = $prompt }) })
      generationConfig  = @{ maxOutputTokens = 2048; temperature = 0.6 }
    } | ConvertTo-Json -Depth 8
    $gbytes = [Text.Encoding]::UTF8.GetBytes($gbody)
    $uri = 'https://generativelanguage.googleapis.com/v1beta/models/' +
      [Uri]::EscapeDataString($model) + ':generateContent?key=' + [Uri]::EscapeDataString($key)
    try {
      $resp = Invoke-RestMethod -Uri $uri -Method Post -ContentType 'application/json; charset=utf-8' -Body $gbytes -TimeoutSec 55
    } catch {
      $detail = ''
      if ($_.ErrorDetails -and $_.ErrorDetails.Message) { $detail = $_.ErrorDetails.Message } else { $detail = "$($_.Exception.Message)" }
      Log ('gemini error: ' + $detail)
      Send-Text $res 502 ('من الوسيط: تعذّر الاتصال بخدمة Google — ' + $detail.Substring(0, [Math]::Min(300, $detail.Length)))
      continue
    }
    $text = ''
    if ($resp.candidates -and @($resp.candidates).Count -gt 0 -and $resp.candidates[0].content -and $resp.candidates[0].content.parts) {
      $text = (@($resp.candidates[0].content.parts) | ForEach-Object { "$($_.text)" }) -join ''
    }
    if (-not $text) {
      $why = ''
      if ($resp.promptFeedback -and $resp.promptFeedback.blockReason) { $why = "$($resp.promptFeedback.blockReason)" }
      Log ('gemini empty reply; feedback=' + $why)
      $tail = '.'
      if ($why) { $tail = ' — السبب: ' + $why }
      Send-Text $res 502 ('من الوسيط: لم تُرجع الخدمة محتوى' + $tail)
      continue
    }
    Log ('ok model=' + $model + ' chars=' + $text.Length)
    Send-Json $res 200 @{ output = $text; model = $model }
  } catch {
    Log ('handler error: ' + "$($_.Exception.Message)")
    try { Send-Text $res 500 'خطأ داخلي في الوسيط — انظري ملف ai-log.txt' } catch {}
  }
}
