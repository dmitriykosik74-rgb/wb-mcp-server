# wb-mcp-server

[![npm version](https://img.shields.io/npm/v/wb-mcp-server)](https://www.npmjs.com/package/wb-mcp-server)
[![license](https://img.shields.io/npm/l/wb-mcp-server)](LICENSE)

MCP-сервер для Wildberries Seller API. Подключите AI-агента (Claude Desktop, OpenClaw, любой MCP-клиент) к вашему магазину на Wildberries.

Сервер переводит MCP tool calls в REST-запросы к API Wildberries (dev.wildberries.ru), позволяя AI-агентам работать с отзывами, аналитикой, заказами, остатками и рекламой.

## Быстрый старт

### 1. Установите пакет

```bash
npm install -g wb-mcp-server
```

### 2. Получите WB API токен

1. Войдите в [личный кабинет продавца WB](https://seller.wildberries.ru/)
2. Перейдите в **Настройки** > **Доступ к API**
3. Создайте новый токен с нужными правами (статистика, аналитика, продвижение, отзывы)
4. Скопируйте токен

### 3. Добавьте в конфиг Claude Desktop

Откройте файл конфигурации Claude Desktop и добавьте:

```json
{
  "mcpServers": {
    "wildberries": {
      "command": "wb-mcp-server",
      "env": {
        "WB_API_TOKEN": "ваш_токен"
      }
    }
  }
}
```

Готово! Теперь Claude может работать с вашим магазином на WB.

## Доступные инструменты

| Инструмент | Описание | Тип |
|---|---|---|
| `get_feedbacks` | Получить список отзывов покупателей | read |
| `reply_feedback` | Ответить на отзыв покупателя | **write** |
| `get_unanswered_count` | Количество неотвеченных отзывов | read |
| `get_stocks` | Остатки товаров на складах | read |
| `get_orders` | Список заказов | read |
| `get_sales` | Данные о продажах (выкупах) | read |
| `get_nm_report` | Детальный отчёт по товарам (просмотры, корзина, заказы, выкупы) | read |
| `get_advert_list` | Список рекламных кампаний | read |
| `get_advert_stats` | Статистика рекламных кампаний | read |

## Примеры использования

Спросите у Claude:

- "Сколько у меня неотвеченных отзывов?"
- "Покажи последние 10 негативных отзывов (оценка 1-2)"
- "Покажи продажи за последнюю неделю"
- "Какие товары лучше всего конвертируются из просмотра в заказ?"
- "Какая статистика по рекламным кампаниям?"
- "Сколько товара осталось на складах?"

## Конфигурация

### Переменные окружения

| Переменная | Описание | Обязательна |
|---|---|---|
| `WB_API_TOKEN` | Токен WB Seller API | Да |

### Аргументы командной строки

```bash
wb-mcp-server --token=ваш_токен
```

## Разработка

```bash
# Клонируйте репозиторий
git clone https://github.com/dmitriykosik74-rgb/wb-mcp-server.git
cd wb-mcp-server

# Установите зависимости
npm install

# Запуск в режиме разработки
WB_API_TOKEN=ваш_токен npm run dev

# Сборка
npm run build

# Тесты
npm test
```

## Contributing

1. Форкните репозиторий
2. Создайте ветку для фичи (`git checkout -b feature/my-feature`)
3. Сделайте коммит (`git commit -m 'feat: add my feature'`)
4. Запушьте ветку (`git push origin feature/my-feature`)
5. Создайте Pull Request

## Лицензия

[MIT](LICENSE)
