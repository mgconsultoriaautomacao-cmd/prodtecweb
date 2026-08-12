@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

title PRODTEC Packinghouse - Instalador Completo de Visao Computacional

echo.
echo ╔══════════════════════════════════════════════════════════════════════╗
echo ║         PRODTEC Packinghouse — Instalador Completo v1.0             ║
echo ║         MG Consultoria e Automação                                  ║
echo ╚══════════════════════════════════════════════════════════════════════╝
echo.

:: ── Passo 1: Localizar ou Instalar Python ─────────────────────────────
echo [PASSO 1/3] Verificando instalacao do Python...

set "PYTHON_CMD="

py -3 --version >nul 2>&1 && set "PYTHON_CMD=py -3"
if "%PYTHON_CMD%"=="" (
    python --version >nul 2>&1 && set "PYTHON_CMD=python"
)
if "%PYTHON_CMD%"=="" (
    python3 --version >nul 2>&1 && set "PYTHON_CMD=python3"
)
if "%PYTHON_CMD%"=="" (
    if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" set "PYTHON_CMD="%LOCALAPPDATA%\Programs\Python\Python311\python.exe""
    if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" set "PYTHON_CMD="%LOCALAPPDATA%\Programs\Python\Python312\python.exe""
    if exist "%LOCALAPPDATA%\Programs\Python\Python310\python.exe" set "PYTHON_CMD="%LOCALAPPDATA%\Programs\Python\Python310\python.exe""
    if exist "%ProgramFiles%\Python311\python.exe" set "PYTHON_CMD="%ProgramFiles%\Python311\python.exe""
    if exist "C:\Python311\python.exe" set "PYTHON_CMD=C:\Python311\python.exe"
    if exist "C:\Python312\python.exe" set "PYTHON_CMD=C:\Python312\python.exe"
)

if "%PYTHON_CMD%"=="" (
    echo.
    echo  ⚠ Python nao encontrado no sistema. Baixando e instalando automaticamente...
    echo.
    
    set PYTHON_URL=https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe
    set PYTHON_INSTALLER=%TEMP%\python_installer.exe
    
    echo  Baixando Python 3.11 (aguarde)...
    powershell -Command "& { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object Net.WebClient).DownloadFile('%PYTHON_URL%', '%PYTHON_INSTALLER%') }" >nul 2>&1
    
    if exist "%PYTHON_INSTALLER%" (
        echo  Instalando Python 3.11 com suporte a PATH...
        "%PYTHON_INSTALLER%" /quiet InstallAllUsers=0 PrependPath=1 Include_pip=1 Include_launcher=1
        del /f /q "%PYTHON_INSTALLER%" 2>nul
        
        if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" (
            set "PYTHON_CMD="%LOCALAPPDATA%\Programs\Python\Python311\python.exe""
        ) else (
            py -3 --version >nul 2>&1 && set "PYTHON_CMD=py -3"
            python --version >nul 2>&1 && set "PYTHON_CMD=python"
        )
    ) else (
        echo  ❌ Falha ao baixar o Python automaticamente.
        echo     Acesse: https://www.python.org/downloads/
        echo     Baixe o Python e marque a opcao "Add python.exe to PATH".
        pause
        exit /b 1
    )
)

echo  ✅ Python localizado: %PYTHON_CMD%
echo.

:: ── Passo 2: Instalar dependências Python (IA e Visão Computacional) ───
echo [PASSO 2/3] Instalando modulos de Visao Computacional (OpenCV, Flask, NumPy)...
echo  (Isso pode levar de 1 a 3 minutos dependendo da sua conexao)
echo.

%PYTHON_CMD% -m pip install --upgrade pip --quiet
%PYTHON_CMD% -m pip install opencv-python numpy flask flask-cors pytesseract requests

if %errorlevel% neq 0 (
    echo.
    echo  ⚠ Houve um aviso durante a instalacao dos modulos.
) else (
    echo.
    echo  ✅ Modulos de Visao Computacional instalados com sucesso!
)
echo.

:: ── Passo 3: Verificar Tesseract OCR ──────────────────────────────────
echo [PASSO 3/3] Verificando Tesseract-OCR (leitura de texto de caixas)...

set TESSERACT_FOUND=0
if exist "C:\Program Files\Tesseract-OCR\tesseract.exe" set TESSERACT_FOUND=1
if exist "C:\Program Files (x86)\Tesseract-OCR\tesseract.exe" set TESSERACT_FOUND=1
if exist "%LOCALAPPDATA%\Programs\Tesseract-OCR\tesseract.exe" set TESSERACT_FOUND=1

if %TESSERACT_FOUND%==1 (
    echo  ✅ Tesseract-OCR encontrado e pronto.
) else (
    echo  ℹ Tesseract-OCR nao encontrado (opcional para leitura de etiquetas).
    echo    Instalador opcional: https://github.com/UB-Mannheim/tesseract/wiki
)
echo.

:: ── Concluído ──────────────────────────────────────────────────────────
echo ╔══════════════════════════════════════════════════════════════════════╗
echo ║   ✅ AMBIENTE PYTHON CONFIGURADO COM SUCESSO!                       ║
echo ║                                                                      ║
echo ║   Reinicie o PRODTEC Packinghouse para carregar o servico CV.        ║
echo ╚══════════════════════════════════════════════════════════════════════╝
echo.
pause
