@echo off
rem مُشغّل وسيط الذكاء المحلي — انقرتي نقرًا مزدوجًا عند الحاجة
start "" powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Minimized -File "%~dp0serve-ai.ps1"
timeout /t 2 >nul
start "" "http://localhost:8794/"
