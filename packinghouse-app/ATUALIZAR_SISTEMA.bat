@echo off
setlocal EnableDelayedExpansion
title PRODTEC - Atualizador Automatico do Sistema

cd /d "%~dp0\.."
if exist "ATUALIZAR_SISTEMA.bat" (
    call "ATUALIZAR_SISTEMA.bat"
) else (
    git pull origin main
    pause
)
exit /b 0
