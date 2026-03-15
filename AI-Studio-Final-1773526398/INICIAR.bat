@echo off
title Local Multi-Agent Studio - Produção
echo ===========================================
echo    INICIANDO AMBIENTE DE PRODUÇÃO
echo ===========================================
set NODE_ENV=production
"engine.exe" "app.cjs"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERRO FATAL] O servidor parou.
    pause
)
