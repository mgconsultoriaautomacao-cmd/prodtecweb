@echo off
title PRODTEC Packinghouse — Instalador de Visao Computacional (IA)

echo.
echo ======================================================================
echo          PRODTEC Packinghouse — Instalador Visao Computacional v2.3
echo          MG Consultoria e Automacao
echo ======================================================================
echo.

:: 1. Tentar encontrar o Python no sistema
set "PYCMD="

py -3 --version >nul 2>&1
if not errorlevel 1 (
    set "PYCMD=py -3"
    goto :PYTHON_FOUND
)

python --version >nul 2>&1
if not errorlevel 1 (
    set "PYCMD=python"
    goto :PYTHON_FOUND
)

python3 --version >nul 2>&1
if not errorlevel 1 (
    set "PYCMD=python3"
    goto :PYTHON_FOUND
)

if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" (
    set "PYCMD="%LOCALAPPDATA%\Programs\Python\Python311\python.exe""
    goto :PYTHON_FOUND
)

if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" (
    set "PYCMD="%LOCALAPPDATA%\Programs\Python\Python312\python.exe""
    goto :PYTHON_FOUND
)

if exist "%LOCALAPPDATA%\Programs\Python\Python310\python.exe" (
    set "PYCMD="%LOCALAPPDATA%\Programs\Python\Python310\python.exe""
    goto :PYTHON_FOUND
)

if exist "C:\Python311\python.exe" (
    set "PYCMD=C:\Python311\python.exe"
    goto :PYTHON_FOUND
)

if exist "C:\Python312\python.exe" (
    set "PYCMD=C:\Python312\python.exe"
    goto :PYTHON_FOUND
)

:: Se o Python não foi encontrado, tenta baixar automaticamente
echo [!] Python nao foi localizado nas pastas padrao do Windows.
echo [!] Baixando o instalador do Python 3.11...
echo.

set "PYURL=https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe"
set "PYINSTALLER=%TEMP%\python_setup.exe"

curl.exe -sSL -A "Mozilla/5.0" -o "%PYINSTALLER%" "%PYURL%" 2>nul
if not exist "%PYINSTALLER%" (
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $wc = New-Object Net.WebClient; $wc.Headers.Add('User-Agent', 'Mozilla/5.0'); $wc.DownloadFile('%PYURL%', '%PYINSTALLER%')"
)

if exist "%PYINSTALLER%" (
    echo Executando instalador silencioso do Python 3.11...
    "%PYINSTALLER%" /quiet InstallAllUsers=0 PrependPath=1 Include_pip=1 Include_launcher=1
    del /f /q "%PYINSTALLER%" 2>nul
)

py -3 --version >nul 2>&1
if not errorlevel 1 (
    set "PYCMD=py -3"
    goto :PYTHON_FOUND
)

python --version >nul 2>&1
if not errorlevel 1 (
    set "PYCMD=python"
    goto :PYTHON_FOUND
)

echo [ERRO CRITICO] O Python nao pode ser instalado automaticamente.
echo Baixe o Python manualmente em: https://www.python.org/downloads/
echo Marque a opcao 'Add python.exe to PATH' ao instalar.
echo.
pause
exit /b 1

:PYTHON_FOUND
echo [OK] Executavel do Python encontrado: %PYCMD%
echo.

:: 2. Atualizar PIP e instalar módulos de Visão Computacional
echo [PASSO 2/4] Atualizando gerenciador de pacotes PIP...
%PYCMD% -m pip install --upgrade pip

echo.
echo [PASSO 3/4] Instalando pacotes de Visao Computacional (OpenCV, Flask, NumPy)...
echo.

%PYCMD% -m pip install --user --prefer-binary opencv-python-headless numpy flask flask-cors pytesseract requests

if errorlevel 1 (
    echo.
    echo [!] Falha na instalacao no modo usuario. Tentando criar venv isolado...
    %PYCMD% -m venv venv
    if exist "venv\Scripts\python.exe" (
        venv\Scripts\python.exe -m pip install --upgrade pip
        venv\Scripts\python.exe -m pip install --prefer-binary opencv-python-headless numpy flask flask-cors pytesseract requests
    )
)

echo.
echo [PASSO 4/4] Verificando Tesseract-OCR...
set TESS_FOUND=0
if exist "C:\Program Files\Tesseract-OCR\tesseract.exe" set TESS_FOUND=1
if exist "C:\Program Files (x86)\Tesseract-OCR\tesseract.exe" set TESS_FOUND=1
if exist "%LOCALAPPDATA%\Programs\Tesseract-OCR\tesseract.exe" set TESS_FOUND=1

if %TESS_FOUND%==1 (
    echo [OK] Tesseract-OCR instalado e pronto!
) else (
    echo [!] Tesseract-OCR nao encontrado. Baixando instalador 64-bit...
    set "TESS_URL=https://digi.bib.uni-mannheim.de/tesseract/tesseract-ocr-w64-setup-5.3.3.20231005.exe"
    set "TESS_URL2=https://github.com/UB-Mannheim/tesseract/releases/download/v5.3.3.20231005/tesseract-ocr-w64-setup-5.3.3.20231005.exe"
    set "TESS_INSTALLER=%TEMP%\tesseract_setup.exe"
    
    echo  [1/2] Baixando Tesseract via curl...
    curl.exe -sSL -A "Mozilla/5.0" -o "%TESS_INSTALLER%" "%TESS_URL%" 2>nul
    
    if not exist "%TESS_INSTALLER%" (
        echo  [2/2] Baixando Tesseract via PowerShell / GitHub Mirror...
        powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $wc = New-Object Net.WebClient; $wc.Headers.Add('User-Agent', 'Mozilla/5.0'); try { $wc.DownloadFile('%TESS_URL2%', '%TESS_INSTALLER%') } catch { $wc.DownloadFile('%TESS_URL%', '%TESS_INSTALLER%') }"
    )
    
    if exist "%TESS_INSTALLER%" (
        echo Executando instalador silencioso do Tesseract-OCR...
        "%TESS_INSTALLER%" /S
        del /f /q "%TESS_INSTALLER%" 2>nul
        echo [OK] Tesseract-OCR instalado com sucesso!
    ) else (
        echo.
        echo [!] Nao foi possivel baixar o Tesseract-OCR automaticamente.
        echo     Baixe e instale manualmente em:
        echo     https://github.com/UB-Mannheim/tesseract/wiki
    )
)

echo.
echo ======================================================================
echo    [OK] AMBIENTE DE IA E VISÃO COMPUTACIONAL CONFIGURADO!
echo    Pressione qualquer tecla para fechar esta janela.
echo ======================================================================
echo.
pause
