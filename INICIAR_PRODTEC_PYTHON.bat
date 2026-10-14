@echo off
setlocal EnableDelayedExpansion
title PRODTEC Packinghouse - Versao Python Local

echo ======================================================================
echo          PRODTEC Packinghouse - Inicializador (Versao Python)
echo          MG Consultoria e Automacao
echo ======================================================================
echo.

REM 1. Localizar executavel do Python
set "PYCMD="

python --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set "PYCMD=python"
    goto :PYTHON_OK
)

py -3 --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set "PYCMD=py -3"
    goto :PYTHON_OK
)

python3 --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set "PYCMD=python3"
    goto :PYTHON_OK
)

if exist "C:\Python314\python.exe" (
    set "PYCMD=C:\Python314\python.exe"
    goto :PYTHON_OK
)
if exist "C:\Python313\python.exe" (
    set "PYCMD=C:\Python313\python.exe"
    goto :PYTHON_OK
)
if exist "C:\Python312\python.exe" (
    set "PYCMD=C:\Python312\python.exe"
    goto :PYTHON_OK
)
if exist "C:\Python311\python.exe" (
    set "PYCMD=C:\Python311\python.exe"
    goto :PYTHON_OK
)
if exist "%LOCALAPPDATA%\Programs\Python\Python314\python.exe" (
    set "PYCMD=%LOCALAPPDATA%\Programs\Python\Python314\python.exe"
    goto :PYTHON_OK
)
if exist "%LOCALAPPDATA%\Programs\Python\Python313\python.exe" (
    set "PYCMD=%LOCALAPPDATA%\Programs\Python\Python313\python.exe"
    goto :PYTHON_OK
)
if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" (
    set "PYCMD=%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
    goto :PYTHON_OK
)
if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" (
    set "PYCMD=%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
    goto :PYTHON_OK
)

echo [ERRO] Python nao foi localizado neste computador.
echo Por favor, instale o Python marcando a opcao "Add python.exe to PATH".
echo.
pause
exit /b 1

:PYTHON_OK
echo [OK] Python encontrado: %PYCMD%
echo.

REM 2. Variaveis de ambiente para alto desempenho e aceleracao fluida no QWebEngine (GPU, 60fps, zero-copy)
set "QTWEBENGINE_CHROMIUM_FLAGS=--no-sandbox --enable-features=NetworkServiceInProcess --ignore-gpu-blocklist --enable-gpu-rasterization --enable-zero-copy --disable-background-timer-throttling --disable-renderer-backgrounding --disable-smooth-scrolling --num-raster-threads=4"

REM 3. Verificar dependencias (instala apenas na primeira vez ou se faltar algum modulo)
"%PYCMD%" -c "import PyQt6, PyQt6.QtWebEngineWidgets, flask, requests, cv2, numpy" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [1/2] Primeira execucao: instalando dependencias necessarias (PyQt6, Flask, OpenCV)...
    "%PYCMD%" -m pip install PyQt6 PyQt6-WebEngine requests opencv-python-headless numpy flask flask-cors pytesseract
) else (
    echo [1/2] Dependencias verificadas com sucesso!
)

echo.
echo [2/2] Abrindo PRODTEC Packinghouse (App Desktop Python)...
cd /d "%~dp0packinghouse-app"
"%PYCMD%" python_app\app.py

echo.
echo Sistema encerrado.
pause
