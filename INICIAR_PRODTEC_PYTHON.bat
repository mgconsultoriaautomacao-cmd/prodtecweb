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

if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" (
    set "PYCMD="%LOCALAPPDATA%\Programs\Python\Python311\python.exe""
    goto :PYTHON_OK
)

if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" (
    set "PYCMD="%LOCALAPPDATA%\Programs\Python\Python312\python.exe""
    goto :PYTHON_OK
)

if exist "C:\Python311\python.exe" (
    set "PYCMD=C:\Python311\python.exe"
    goto :PYTHON_OK
)

if exist "C:\Python312\python.exe" (
    set "PYCMD=C:\Python312\python.exe"
    goto :PYTHON_OK
)

echo [ERRO] Python nao foi localizado neste computador.
echo Por favor, instale o Python 3.10, 3.11 ou 3.12 (marcando "Add to PATH").
echo.
pause
exit /b 1

:PYTHON_OK
echo [OK] Python encontrado: %PYCMD%
echo.

:: 2. Instalar / verificar dependências básicas caso necessário
echo [1/3] Verificando dependencias necessarias (PyQt6, PyQt6-WebEngine, etc.)...
%PYCMD% -m pip install --quiet --upgrade pip
%PYCMD% -m pip install --quiet PyQt6 PyQt6-WebEngine requests opencv-python-headless numpy flask flask-cors pytesseract

echo.
echo [2/3] Iniciando servico de Visao Computacional (em segundo plano)...
start "PRODTEC CV Service" /B %PYCMD% packinghouse-app\cv_service.py

timeout /t 2 /nobreak >nul

echo.
echo [3/3] Abrindo PRODTEC Packinghouse (App Desktop Python)...
cd /d "%~dp0packinghouse-app"
%PYCMD% python_app\app.py

echo.
echo Sistema encerrado.
pause
