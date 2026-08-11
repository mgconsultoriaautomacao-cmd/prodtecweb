@echo off
chcp 65001 >nul
title INSTALADOR PRODTEC PACKINGHOUSE - IA & VISAO COMPUTACIONAL (WINDOWS)
echo =========================================================================
echo  PRODTEC PACKINGHOUSE - CONFIGURACAO AUTOMATICA DA IA DE CAIXAS (WINDOWS)
echo =========================================================================
echo.

echo [1/3] Verificando instalacao do Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ERRO: Python nao encontrado!
    echo Por favor, baixe e instale o Python 3.10 ou superior marcando a opcao:
    echo "Add python.exe to PATH"
    echo Download: https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)
echo ✅ Python detectado no sistema.

echo.
echo [2/3] Instalando dependencias de IA e Visao Computacional...
python -m pip install --upgrade pip
python -m pip install opencv-python numpy flask flask-cors pytesseract requests

echo.
echo [3/3] Verificando Tesseract-OCR para leitura de caixas e marcas...
if exist "C:\Program Files\Tesseract-OCR\tesseract.exe" (
    echo ✅ Tesseract OCR encontrado em C:\Program Files\Tesseract-OCR\tesseract.exe
) else if exist "C:\Program Files (x86)\Tesseract-OCR\tesseract.exe" (
    echo ✅ Tesseract OCR encontrado em C:\Program Files (x86)\Tesseract-OCR\tesseract.exe
) else (
    echo ⚠️ AVISO: Tesseract-OCR nao foi encontrado.
    echo Para leitura de texto e identificacao automatica de caixas no Windows,
    echo recomendamos baixar e instalar o Tesseract-OCR (instale no caminho padrao):
    echo https://github.com/UB-Mannheim/tesseract/wiki
)

echo.
echo =========================================================================
echo 🎉 TUDO PRONTO! O ambiente de IA esta configurado no Windows.
echo Voce ja pode executar o PRODTEC Packinghouse (.exe)!
echo =========================================================================
pause
