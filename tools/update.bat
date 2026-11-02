@echo off
chcp 65001 >nul
title Monster Tier - Обновление
color 0A

echo ========================================
echo   Monster Energy Tier List
echo   Обновление проекта
echo ========================================
echo.

:: Проверяем git
where git >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [ОШИБКА] Git не установлен!
    echo Скачайте с https://git-scm.com/downloads
    echo.
    pause
    exit /b 1
)

:: Проверяем репозиторий
if not exist ".git" (
    color 0C
    echo [ОШИБКА] Эта папка не является git-репозиторием!
    echo.
    pause
    exit /b 1
)

echo [1/3] Проверяем соединение...
git remote -v >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [ОШИБКА] Не удалось подключиться к репозиторию!
    echo.
    pause
    exit /b 1
)

echo [2/3] Скачиваем обновления...
git pull
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo.
    echo [ОШИБКА] Не удалось обновить!
    echo Возможные причины:
    echo - Нет интернета
    echo - Изменения в файлах (сделайте git stash)
    echo.
    pause
    exit /b 1
)

echo.
echo [3/3] Обновление завершено успешно!
echo.
color 0A
echo ========================================
echo   Проект обновлен до последней версии
echo ========================================
echo.
pause

start site\index.html
timeout /t 2 >nul