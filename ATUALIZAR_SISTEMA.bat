@echo off
setlocal EnableDelayedExpansion
title PRODTEC - Atualizador Automatico do Sistema

echo ======================================================================
echo          PRODTEC Packinghouse - Atualizacao Remota via Git
echo          MG Consultoria e Automacao
echo ======================================================================
echo.

cd /d "%~dp0"

echo [1/3] Verificando conexao e repositorio Git...
git --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERRO] Git nao foi encontrado no sistema!
    echo Certifique-se de que o Git esta instalado e adicionado ao PATH.
    echo.
    pause
    exit /b 1
)

echo.
echo [2/3] Baixando ultimas atualizacoes do servidor GitHub...
git pull origin main
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [AVISO] O 'git pull origin main' retornou um aviso ou erro. Tentando 'git pull' padrao...
    git pull
)

echo.
echo [3/3] Verificando dependencias Python...
set "PYCMD="
python --version >nul 2>&1 && set "PYCMD=python"
if not defined PYCMD (
    py -3 --version >nul 2>&1 && set "PYCMD=py -3"
)
if not defined PYCMD (
    python3 --version >nul 2>&1 && set "PYCMD=python3"
)

if defined PYCMD (
    if exist "requirements.txt" (
        echo Atualizando bibliotecas necessarias via pip...
        %PYCMD% -m pip install -r requirements.txt --quiet
    )
) else (
    echo [AVISO] Python nao detectado para atualizacao de pacotes, continuando...
)

echo.
echo ======================================================================
echo          ATUALIZACAO CONCLUIDA COM SUCESSO!
echo ======================================================================
echo.
echo Pressione qualquer tecla para iniciar o PRODTEC Packinghouse...
echo Ou feche esta janela para sair.
pause >nul

if exist "INICIAR_PRODTEC_PYTHON.bat" (
    start "" "INICIAR_PRODTEC_PYTHON.bat"
)
exit /b 0
