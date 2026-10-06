@echo off
title PRODTEC Packinghouse — Versao Python Local
chcp 65001 >nul

echo ======================================================================
echo          PRODTEC Packinghouse — Inicializador (Versao Python)
echo          MG Consultoria e Automacao
echo ======================================================================
echo.

:: 1. Localizar executável do Python
set "PYCMD="

py -3 --version >nul 2>&1
if not errorlevel 1 (
    set "PYCMD=py -3"
    goto :PYTHON_OK
)

python --version >nul 2>&1
if not errorlevel 1 (
    set "PYCMD=python"
    goto :PYTHON_OK
)

python3 --version >nul 2>&1
if not errorlevel 1 (
    set "PYCMD=python3"
    goto :PYTHON_OK
)

for %%V in (314 313 312 311 310) do (
    if exist "%LOCALAPPDATA%\Programs\Python\Python%%V\python.exe" (
        set "PYCMD="%LOCALAPPDATA%\Programs\Python\Python%%V\python.exe""
        goto :PYTHON_OK
    )
    if exist "C:\Python%%V\python.exe" (
        set "PYCMD=C:\Python%%V\python.exe"
        goto :PYTHON_OK
    )
    if exist "C:\Program Files\Python%%V\python.exe" (
        set "PYCMD="C:\Program Files\Python%%V\python.exe""
        goto :PYTHON_OK
    )
)

echo [ERRO] Python nao foi localizado neste computador.
echo Por favor, instale o Python (3.10, 3.11, 3.12, 3.13 ou 3.14) marcando a opcao "Add python.exe to PATH".
echo.
pause
exit /b 1

:PYTHON_OK
echo [OK] Python encontrado: %PYCMD%
echo.

:: 2. Variáveis de ambiente para evitar tela preta em placas de vídeo genéricas / Intel HD
set "QTWEBENGINE_CHROMIUM_FLAGS=--disable-gpu --disable-software-rasterizer --no-sandbox --disable-gpu-compositing --enable-features=NetworkServiceInProcess --ignore-gpu-blocklist"

:: 3. Instalar / verificar dependências básicas caso necessário
echo [1/2] Verificando dependencias necessarias (PyQt6, PyQt6-WebEngine, Flask, OpenCV, etc.)...
%PYCMD% -m pip install PyQt6 PyQt6-WebEngine requests opencv-python-headless numpy flask flask-cors pytesseract

echo.
echo [2/2] Abrindo PRODTEC Packinghouse (App Desktop Python)...
cd /d "%~dp0packinghouse-app"
%PYCMD% python_app\app.py

echo.
echo Sistema encerrado.
pause
