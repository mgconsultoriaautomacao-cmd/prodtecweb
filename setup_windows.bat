@echo off
setlocal enabledelayedexpansion

title PRODTEC Packinghouse — Instalador Visao Computacional (IA)

echo.
echo ======================================================================
echo          PRODTEC Packinghouse — Instalador Completo IA v2.1
echo          MG Consultoria e Automacao
echo ======================================================================
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
    echo  [!] Python nao encontrado no sistema. Baixando Python 3.11...
    echo.
    
    set PYTHON_URL=https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe
    set PYTHON_INSTALLER=%TEMP%\python_installer.exe
    
    echo  Baixando Python 3.11 64-bit (aguarde)...
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object Net.WebClient).DownloadFile('%PYTHON_URL%', '%PYTHON_INSTALLER%')"
    
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
        echo  [X] Falha ao baixar o Python automaticamente.
        echo     Baixe e instale manualmente: https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe
        echo.
        pause
        exit /b 1
    )
)

echo  [OK] Python localizado: %PYTHON_CMD%
echo.

:: ── Passo 2: Atualizar PIP ────────────────────────────────────────────
echo [PASSO 2/4] Atualizando PIP...
%PYTHON_CMD% -m pip install --upgrade pip
if %errorlevel% neq 0 (
    %PYTHON_CMD% -m pip install --user --upgrade pip
)

:: ── Passo 3: Instalar dependências (Com exibição de progresso real) ───
echo.
echo [PASSO 3/4] Instalando modulos de IA e Visao Computacional...
echo (OpenCV, NumPy, Flask, Flask-CORS, PyTesseract, Requests)
echo.

set "SUCCESS=0"

echo [Tentativa 1/4] Instalando pacotes com opencv-python-headless...
%PYTHON_CMD% -m pip install --prefer-binary opencv-python-headless numpy flask flask-cors pytesseract requests
%PYTHON_CMD% -c "import cv2, numpy, flask, pytesseract; print('COMPATIBILIDADE_OK')" > %TEMP%\pytest.txt 2>&1
type %TEMP%\pytest.txt | findstr "COMPATIBILIDADE_OK" >nul
if %errorlevel%==0 (
    set "SUCCESS=1"
    echo [OK] Modulos instalados com sucesso via Estrategia 1!
    goto :VERIFY_TESSERACT
)

echo.
echo [Tentativa 2/4] Tentando modo usuario (--user)...
%PYTHON_CMD% -m pip install --user --prefer-binary opencv-python-headless numpy flask flask-cors pytesseract requests
%PYTHON_CMD% -c "import cv2, numpy, flask, pytesseract; print('COMPATIBILIDADE_OK')" > %TEMP%\pytest.txt 2>&1
type %TEMP%\pytest.txt | findstr "COMPATIBILIDADE_OK" >nul
if %errorlevel%==0 (
    set "SUCCESS=1"
    echo [OK] Modulos instalados no perfil do usuario (--user)!
    goto :VERIFY_TESSERACT
)

echo.
echo [Tentativa 3/4] Tentando pacote opencv-python tradicional...
%PYTHON_CMD% -m pip install --user --prefer-binary opencv-python numpy flask flask-cors pytesseract requests
%PYTHON_CMD% -c "import cv2, numpy, flask, pytesseract; print('COMPATIBILIDADE_OK')" > %TEMP%\pytest.txt 2>&1
type %TEMP%\pytest.txt | findstr "COMPATIBILIDADE_OK" >nul
if %errorlevel%==0 (
    set "SUCCESS=1"
    echo [OK] Modulos instalados com sucesso via Estrategia 3!
    goto :VERIFY_TESSERACT
)

echo.
echo [Tentativa 4/4] Criando ambiente virtual venv isolado...
if not exist "venv" (
    %PYTHON_CMD% -m venv venv
)
if exist "venv\Scripts\python.exe" (
    "venv\Scripts\python.exe" -m pip install --upgrade pip
    "venv\Scripts\python.exe" -m pip install --prefer-binary opencv-python-headless numpy flask flask-cors pytesseract requests
    "venv\Scripts\python.exe" -c "import cv2, numpy, flask, pytesseract; print('COMPATIBILIDADE_OK')" > %TEMP%\pytest.txt 2>&1
    type %TEMP%\pytest.txt | findstr "COMPATIBILIDADE_OK" >nul
    if %errorlevel%==0 (
        set "SUCCESS=1"
        set "PYTHON_CMD=venv\Scripts\python.exe"
        echo [OK] Modulos instalados dentro de ambiente virtual venv!
        goto :VERIFY_TESSERACT
    )
)

if %SUCCESS%==0 (
    echo.
    echo [X] Erro ao instalar os modulos. Veja o log abaixo:
    if exist %TEMP%\pytest.txt type %TEMP%\pytest.txt
    echo.
    echo Pressione qualquer tecla para sair...
    pause
    exit /b 1
)

:VERIFY_TESSERACT
echo.
:: ── Passo 4: Verificar Tesseract OCR ──────────────────────────────────
echo [PASSO 4/4] Verificando Tesseract-OCR (leitura de caixas)...

set TESSERACT_FOUND=0
if exist "C:\Program Files\Tesseract-OCR\tesseract.exe" set TESSERACT_FOUND=1
if exist "C:\Program Files (x86)\Tesseract-OCR\tesseract.exe" set TESSERACT_FOUND=1
if exist "%LOCALAPPDATA%\Programs\Tesseract-OCR\tesseract.exe" set TESSERACT_FOUND=1

if %TESSERACT_FOUND%==1 (
    echo [OK] Tesseract-OCR encontrado no sistema!
) else (
    echo [!] Tesseract-OCR nao encontrado. Baixando instalador oficial...
    set TESS_URL=https://digi.bib.uni-mannheim.de/tesseract/tesseract-ocr-w64-setup-5.3.3.20231005.exe
    set TESS_INSTALLER=%TEMP%\tesseract_setup.exe
    
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object Net.WebClient).DownloadFile('%TESS_URL%', '%TESS_INSTALLER%')"
    
    if exist "%TESS_INSTALLER%" (
        echo Executando instalador do Tesseract-OCR...
        "%TESS_INSTALLER%" /S
        del /f /q "%TESS_INSTALLER%" 2>nul
        echo [OK] Tesseract-OCR instalado!
    ) else (
        echo [!] Baixe manualmente: https://github.com/UB-Mannheim/tesseract/wiki
    )
)

echo.
echo ======================================================================
echo    [OK] AMBIENTE DE IA CONFIGURADO COM SUCESSO!
echo    Pressione qualquer tecla para fechar esta janela.
echo ======================================================================
echo.
pause
