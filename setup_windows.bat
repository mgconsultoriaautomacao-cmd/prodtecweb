@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

title PRODTEC Packinghouse — Instalador Completo de Visao Computacional (IA)

echo.
echo ╔══════════════════════════════════════════════════════════════════════╗
echo ║         PRODTEC Packinghouse — Instalador Completo IA v2.0           ║
echo ║         MG Consultoria e Automação                                  ║
echo ╚══════════════════════════════════════════════════════════════════════╝
echo.

:: ── Passo 1: Localizar ou Instalar Python ─────────────────────────────
echo [PASSO 1/4] Verificando instalacao do Python...

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
    echo  ⚠ Python nao encontrado no sistema. Baixando e instalando Python 3.11...
    echo.
    
    set PYTHON_URL=https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe
    set PYTHON_INSTALLER=%TEMP%\python_installer.exe
    
    echo  Baixando Python 3.11 64-bit (aguarde)...
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
        echo     Baixe e instale manualmente marcando "Add python.exe to PATH":
        echo     https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe
        pause
        exit /b 1
    )
)

echo  ✅ Python localizado: %PYTHON_CMD%
echo.

:: ── Passo 2: Atualizar PIP ────────────────────────────────────────────
echo [PASSO 2/4] Atualizando PIP...
%PYTHON_CMD% -m pip install --upgrade pip --quiet >nul 2>&1
if %errorlevel% neq 0 (
    %PYTHON_CMD% -m pip install --user --upgrade pip --quiet >nul 2>&1
)

:: ── Passo 3: Instalar dependências (Estratégias Resilientes) ───────────
echo [PASSO 3/4] Instalando modulos de IA e Visao Computacional...
echo  (OpenCV, NumPy, Flask, Flask-CORS, PyTesseract, Requests)
echo.

set "SUCCESS=0"

:: Estratégia 1: Instalador padrão com prefer-binary (opencv-python-headless)
echo  [Tentativa 1/4] Instalando pacotes com opencv-python-headless...
%PYTHON_CMD% -m pip install --prefer-binary opencv-python-headless numpy flask flask-cors pytesseract requests >nul 2>&1
%PYTHON_CMD% -c "import cv2, numpy, flask, pytesseract; print('OK')" >nul 2>&1
if %errorlevel%==0 (
    set "SUCCESS=1"
    echo  ✅ Modulos instalados com sucesso via Estratégia 1!
    goto :VERIFY_TESSERACT
)

:: Estratégia 2: Modo --user (Resolve erros de permissao no Windows)
echo  [Tentativa 2/4] Tentando instalacao no modo usuario (--user)...
%PYTHON_CMD% -m pip install --user --prefer-binary opencv-python-headless numpy flask flask-cors pytesseract requests >nul 2>&1
%PYTHON_CMD% -c "import cv2, numpy, flask, pytesseract; print('OK')" >nul 2>&1
if %errorlevel%==0 (
    set "SUCCESS=1"
    echo  ✅ Modulos instalados com sucesso via Estratégia 2 (--user)!
    goto :VERIFY_TESSERACT
)

:: Estratégia 3: opencv-python tradicional com --user
echo  [Tentativa 3/4] Tentando pacote opencv-python tradicional...
%PYTHON_CMD% -m pip install --user --prefer-binary opencv-python numpy flask flask-cors pytesseract requests >nul 2>&1
%PYTHON_CMD% -c "import cv2, numpy, flask, pytesseract; print('OK')" >nul 2>&1
if %errorlevel%==0 (
    set "SUCCESS=1"
    echo  ✅ Modulos instalados com sucesso via Estratégia 3!
    goto :VERIFY_TESSERACT
)

:: Estratégia 4: Criar Ambiente Virtual (venv) isolado na pasta
echo  [Tentativa 4/4] Criando ambiente virtual venv isolado...
if not exist "venv" (
    %PYTHON_CMD% -m venv venv
)
if exist "venv\Scripts\python.exe" (
    "venv\Scripts\python.exe" -m pip install --upgrade pip --quiet >nul 2>&1
    "venv\Scripts\python.exe" -m pip install --prefer-binary opencv-python-headless numpy flask flask-cors pytesseract requests >nul 2>&1
    "venv\Scripts\python.exe" -c "import cv2, numpy, flask, pytesseract; print('OK')" >nul 2>&1
    if %errorlevel%==0 (
        set "SUCCESS=1"
        set "PYTHON_CMD=venv\Scripts\python.exe"
        echo  ✅ Modulos instalados com sucesso dentro de ambiente virtual venv!
        goto :VERIFY_TESSERACT
    )
)

if %SUCCESS%==0 (
    echo.
    echo  ❌ Nao foi possivel instalar os modulos Python automaticamente.
    echo     Tente executar o Prompt de Comando como ADMINISTRADOR e rode:
    echo     pip install opencv-python-headless numpy flask flask-cors pytesseract requests
    pause
    exit /b 1
)

:VERIFY_TESSERACT
echo.
:: ── Passo 4: Verificar Tesseract OCR no Windows ────────────────────────
echo [PASSO 4/4] Verificando Tesseract-OCR (leitura de texto em caixas)...

set TESSERACT_FOUND=0
if exist "C:\Program Files\Tesseract-OCR\tesseract.exe" set TESSERACT_FOUND=1
if exist "C:\Program Files (x86)\Tesseract-OCR\tesseract.exe" set TESSERACT_FOUND=1
if exist "%LOCALAPPDATA%\Programs\Tesseract-OCR\tesseract.exe" set TESSERACT_FOUND=1

if %TESSERACT_FOUND%==1 (
    echo  ✅ Tesseract-OCR encontrado e pronto para leitura de texto!
) else (
    echo  ⚠ Tesseract-OCR nao encontrado no caminho padrao.
    echo     Baixando e instalando o Tesseract-OCR para Windows automaticamente...
    
    set TESS_URL=https://digi.bib.uni-mannheim.de/tesseract/tesseract-ocr-w64-setup-5.3.3.20231005.exe
    set TESS_INSTALLER=%TEMP%\tesseract_setup.exe
    
    powershell -Command "& { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object Net.WebClient).DownloadFile('%TESS_URL%', '%TESS_INSTALLER%') }" >nul 2>&1
    
    if exist "%TESS_INSTALLER%" (
        echo  Executando instalador do Tesseract-OCR...
        "%TESS_INSTALLER%" /S
        del /f /q "%TESS_INSTALLER%" 2>nul
        echo  ✅ Tesseract-OCR instalado!
    ) else (
        echo  ℹ Baixe manualmente o Tesseract-OCR para Windows em:
        echo    https://github.com/UB-Mannheim/tesseract/wiki
    )
)

echo.
echo ╔══════════════════════════════════════════════════════════════════════╗
echo ║   ✅ AMBIENTE DE IA E VISÃO COMPUTACIONAL CONFIGURADO COM SUCESSO!   ║
echo ║                                                                      ║
echo ║   Reinicie a aplicacao para iniciar a IA de leitura de caixas.       ║
echo ╚══════════════════════════════════════════════════════════════════════╝
echo.
pause
