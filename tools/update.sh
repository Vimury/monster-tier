#!/bin/bash

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================"
echo "  Monster Energy Tier List"
echo "  Обновление проекта"
echo "========================================"
echo ""

# Проверяем git
if ! command -v git &> /dev/null; then
    echo -e "${RED}[ОШИБКА] Git не установлен!${NC}"
    echo "Установите: https://git-scm.com/downloads"
    read -p "Нажмите Enter для выхода..."
    exit 1
fi

# Проверяем репозиторий
if [ ! -d ".git" ]; then
    echo -e "${RED}[ОШИБКА] Эта папка не является git-репозиторием!${NC}"
    read -p "Нажмите Enter для выхода..."
    exit 1
fi

echo -e "${YELLOW}[1/3] Проверяем соединение...${NC}"
git remote -v > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo -e "${RED}[ОШИБКА] Не удалось подключиться к репозиторию!${NC}"
    read -p "Нажмите Enter для выхода..."
    exit 1
fi

echo -e "${YELLOW}[2/3] Скачиваем обновления...${NC}"
git pull
if [ $? -ne 0 ]; then
    echo ""
    echo -e "${RED}[ОШИБКА] Не удалось обновить!${NC}"
    echo "Возможные причины:"
    echo "- Нет интернета"
    echo "- Изменения в файлах (сделайте git stash)"
    echo ""
    read -p "Нажмите Enter для выхода..."
    exit 1
fi

echo ""
echo -e "${GREEN}[3/3] Обновление завершено успешно!${NC}"
echo ""
echo "========================================"
echo "  Проект обновлен до последней версии"
echo "========================================"
echo ""

open site/index.html 2>/dev/null || xdg-open site/index.html 2>/dev/null
sleep 2

read -p "Нажмите Enter для выхода..."

