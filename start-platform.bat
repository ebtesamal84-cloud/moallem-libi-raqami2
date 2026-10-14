@echo off
rem ============================================================
rem  المعلم الليبي الرقمي — تشغيل المنصة بنقرة واحدة
rem  يشغّل الخادم المحلي ويفتح المتصفح تلقائيًا (بلا إنترنت).
rem  ضعي اختصاره على سطح المكتب إن أردتِ: انقرتي بيمين
rem  على هذا الملف ← Send to ← Desktop (create shortcut).
rem ============================================================
start "" powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Minimized -File "%~dp0serve-moallem.ps1" -Root "%~dp0." -Port 8793
timeout /t 2 >nul
start "" "http://localhost:8793/"
