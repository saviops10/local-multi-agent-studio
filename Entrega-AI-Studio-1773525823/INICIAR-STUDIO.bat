@echo off
title Local Multi-Agent Studio
echo ==========================================
echo    INICIANDO LOCAL MULTI-AGENT STUDIO
echo ==========================================
set NODE_ENV=production
"engine.exe" "app.js"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERRO] O servidor parou. Verifique as mensagens acima.
    pause
)
