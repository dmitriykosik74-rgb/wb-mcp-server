# WB MCP Server — CLAUDE.md

## Project Overview

Open-source MCP (Model Context Protocol) server для доступа AI-агентов к Wildberries Seller API.
Переводит MCP tool calls в REST-запросы к dev.wildberries.ru.

**Goal:** Стать стандартным open-source мостом между AI-агентами и WB API для российских селлеров.

**License:** MIT
**Language:** TypeScript (strict mode)
**Runtime:** Node.js 20+
**Package:** `wb-mcp-server` (npm)

## Architecture

```
MCP Client (Claude Desktop / любой MCP-совместимый агент)
        ↓ MCP Protocol (stdio или SSE)
    wb-mcp-server
        ↓ REST/JSON over HTTPS
    Wildberries Seller API (dev.wildberries.ru)
```

## Tech Stack

- **TypeScript** strict mode, ESM only
- **@modelcontextprotocol/sdk** — MCP server SDK
- **zod** — валидация входных параметров инструментов
- **tsup** — сборка
- **vitest** — тесты
- **tsx** — dev-режим

## Project Structure

```
wb-mcp-server/
├── src/
│   ├── index.ts              # Entry point, shebang, запуск сервера
│   ├── server.ts             # WBMCPServer class, регистрация tools
│   ├── config.ts             # BASE_URLS, env vars
│   ├── wb-client.ts          # HTTP-клиент: auth, rate-limit, error handling
│   ├── tools/
│   │   ├── feedbacks.ts      # get_feedbacks, reply_feedback, get_unanswered_count, get_questions, reply_question
│   │   ├── statistics.ts     # get_stocks, get_orders, get_sales, get_financial_report
│   │   ├── analytics.ts      # get_nm_report, get_warehouses_inventory, search_analytics
│   │   ├── finance.ts        # get_seller_balance
│   │   ├── advertising.ts    # get_advert_list, get_advert_stats, get_advert_balance, update_advert_bid
│   │   ├── prices.ts         # get_prices, update_prices
│   │   ├── content.ts        # get_content_cards
│   │   ├── supplies.ts       # get_supplies, create_supply
│   │   └── documents.ts      # get_documents
│   ├── types/
│   │   ├── wb-api.ts         # WB API response/request types
│   │   └── tools.ts          # Tool input/output schemas
│   └── utils/
│       ├── rate-limiter.ts   # Per-endpoint rate limiting
│       ├── pagination.ts     # Cursor-based pagination helper
│       └── errors.ts         # WBApiError, formatError()
├── tests/
│   ├── tools/
│   └── integration/
├── examples/
│   ├── claude-desktop.json
│   └── usage.md
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── .env.example
├── README.md
├── README.ru.md
├── LICENSE
├── CHANGELOG.md
└── CLAUDE.md
```

---

## WB API — Base URLs

```typescript
export const BASE_URLS = {
  feedbacks:  "https://feedbacks-api.wildberries.ru",
  statistics: "https://statistics-api.wildberries.ru",
  analytics:  "https://seller-analytics-api.wildberries.ru",
  advertising:"https://advert-api.wildberries.ru",
  finance:    "https://finance-api.wildberries.ru",
  prices:     "https://discounts-prices-api.wildberries.ru",
  content:    "https://content-api.wildberries.ru",
  marketplace:"https://marketplace-api.wildberries.ru",
  documents:  "https://documents-api.wildberries.ru",
  feedbacks_sandbox: "https://feedbacks-api-sandbox.wildberries.ru",
}
```

**Authentication:** заголовок `Authorization: {token}` (без "Bearer").
**Токен:** создаётся в ЛК продавца → Настройки → Доступ к API. Действует 180 дней.
**Цены:** в копейках (делить на 100 для рублей).

---

## MCP Tools — полный реестр (22 инструмента)

### Версионирование:
- **v0.1.0** — реализовано и опубликовано (10 инструментов)
- **v0.2.0** — MVP-блокер для wb-seller-agent (+3 инструмента = 13)
- **v0.3.0** — Phase 2: Ads + Supply агенты (+5 инструментов = 18)
- **v0.4.0** — Phase 3: контент, поставки, документы, аналитика (+4 инструмента = 22)

---

### feedbacks.ts — Отзывы и вопросы

#### get_feedbacks ✅ v0.1.0
```
WB Endpoint: GET https://feedbacks-api.wildberries.ru/api/v1/feedbacks
Токен: Feedbacks
```
Input: isAnswered (bool), take (1-10000, default 50), skip (default 0), order ("dateAsc"|"dateDesc"), nmId (optional)
Returns: Array<{ id, text, productValuation, answer, createdDate, productDetails, userName }>

#### reply_feedback ✅ v0.1.0
```
Description: "⚠️ ОТВЕТИТЬ на отзыв. Отправляет реальный ответ покупателю. Редактировать можно 1 раз в 60 дней."
WB Endpoint: PATCH https://feedbacks-api.wildberries.ru/api/v1/feedbacks
Токен: Feedbacks
```
Input: id (string), text (string, min 1)

#### get_unanswered_count ✅ v0.1.0
```
WB Endpoint: GET https://feedbacks-api.wildberries.ru/api/v1/feedbacks/count-unanswered
Токен: Feedbacks
```
Input: нет. Returns: { count: number }

#### get_questions ✅ v0.1.0
```
WB Endpoint: GET https://feedbacks-api.wildberries.ru/api/v1/questions
Токен: Feedbacks
```
Input: аналогично get_feedbacks

#### reply_question 🔧 v0.2.0
```
Description: "⚠️ ОТВЕТИТЬ на вопрос покупателя. Отправляет реальный ответ."
WB Endpoint: PATCH https://feedbacks-api.wildberries.ru/api/v1/questions
Токен: Feedbacks
```
Input: id (string), text (string, min 1)

---

### statistics.ts — Статистика

#### get_stocks ✅ v0.1.0
```
WB Endpoint: GET https://statistics-api.wildberries.ru/api/v1/supplier/stocks
Rate limit: 1 req/min. Токен: Statistics
```
Input: dateFrom (ISO date)
Pagination: если 60000 строк — есть ещё, использовать lastChangeDate последней строки.

#### get_orders ✅ v0.1.0
```
WB Endpoint: GET https://statistics-api.wildberries.ru/api/v1/supplier/orders
Rate limit: 1 req/min. Токен: Statistics
```
Input: dateFrom (ISO), flag (0 = все с даты, 1 = только обновлённые, optional)

#### get_sales ✅ v0.1.0
```
WB Endpoint: GET https://statistics-api.wildberries.ru/api/v1/supplier/sales
Rate limit: 1 req/min. Токен: Statistics
```
Input: аналогично get_orders

#### get_financial_report 🔧 v0.2.0
```
Description: "Детализация отчёта реализации: комиссии WB, логистика, хранение, штрафы, сумма к оплате.
Используй для расчёта реального P&L. Лимит: 1 req/min."
WB Endpoint: GET https://statistics-api.wildberries.ru/api/v5/supplier/reportDetailByPeriod
Rate limit: 1 req/min. Токен: Statistics
```
Input: dateFrom (ISO datetime), dateTo (ISO datetime), limit (default 100000), rrdid (default 0), period ("weekly"|"daily")
Pagination: если 100000 строк — делать следующий запрос с rrdid = rrd_id последней строки. Статус 204 = данных больше нет.
Ключевые поля: ppvz_for_pay, delivery_rub, storage_fee, penalty, commission_percent, retail_amount

---

### analytics.ts — Аналитика

#### get_nm_report ✅ v0.1.0
```
WB Endpoint: POST https://seller-analytics-api.wildberries.ru/api/v2/nm-report/detail
Токен: Analytics
```
Input: beginDate (ISO), endDate (ISO), page (default 1)
Body: { period: { begin, end }, page }

#### get_warehouses_inventory ⏳ v0.3.0
```
Description: "Актуальный отчёт по остаткам. Точнее get_stocks для оперативного управления.
Асинхронный: создать задачу → polling статуса → скачать результат."
WB Endpoint (создать): GET https://statistics-api.wildberries.ru/api/v1/warehouse_remains
WB Endpoint (статус):  GET .../tasks/{task_id}/status
WB Endpoint (скачать): GET .../tasks/{task_id}/download
Токен: Statistics
```
Input: нет обязательных.
Реализация: создать → polling каждые 5 сек, макс 60 сек → скачать.

#### search_analytics ⏳ v0.4.0
```
Description: "⚠️ ТРЕБУЕТ подписку «Джем» в личном кабинете WB. Без подписки вернёт 403.
Поисковые запросы покупателей по товарам: частота, позиции, клики, конверсии."
WB Endpoint: POST https://seller-analytics-api.wildberries.ru/api/v2/analytics/search-report
Токен: Analytics (+ подписка «Джем»)
```
Input: nmIds (array<number>), dateFrom (ISO), dateTo (ISO), page (default 1)
Важно: в tool description явно указывать что без подписки «Джем» метод вернёт ошибку.

---

### finance.ts — Финансы

#### get_seller_balance 🔧 v0.2.0
```
WB Endpoint: GET https://finance-api.wildberries.ru/api/v1/account/balance
Rate limit: 1 req/min. Токен: Finance
```
Input: нет.
Returns: { currency: string, current: number, for_withdraw: number }

---

### advertising.ts — Реклама

#### get_advert_list ✅ v0.1.0
```
WB Endpoint: POST https://advert-api.wildberries.ru/adv/v1/promotion/count
Токен: Promotion
```
Input: нет.
Returns: массив { type, status, count, advert_list: [{ advertId, changeTime }] }

#### get_advert_stats ✅ v0.1.0
```
WB Endpoint: POST https://advert-api.wildberries.ru/adv/v3/fullstats
Токен: Promotion
```
Input: campaignIds — array<number>, max 100.

#### get_advert_balance ⏳ v0.3.0
```
WB Endpoint: GET https://advert-api.wildberries.ru/adv/v1/balance
Токен: Promotion
```
Input: нет.
Returns: { balance: number, net: number, bonus: number }

#### update_advert_bid ⏳ v0.3.0
```
Description: "⚠️ ИЗМЕНИТЬ ставку в кампании. Немедленно влияет на показы и расход бюджета.
Только для кампаний в статусах 4, 9, 11."
WB Endpoint: PATCH https://advert-api.wildberries.ru/api/advert/v1/bids
Токен: Promotion
```
Input: advertId (number), type (number), bids: array<{ nm: number, price: number }>

---

### prices.ts — Цены

#### get_prices ⏳ v0.3.0
```
WB Endpoint: GET https://discounts-prices-api.wildberries.ru/api/v2/list/goods/filter
Токен: Prices
```
Input: limit (default 1000, max 1000), offset (default 0), filterNmID (optional)
Returns: array<{ nmID, vendorCode, sizes: [{ price, discountedPrice, discount }] }>

#### update_prices ⏳ v0.3.0
```
Description: "⚠️ ИЗМЕНИТЬ цены и/или скидки. Изменения немедленно вступают в силу на WB."
WB Endpoint: POST https://discounts-prices-api.wildberries.ru/api/v2/upload/task
Токен: Prices
```
Input: data: array<{ nmID: number, price: number (в рублях), discount: number (0-99%) }>

---

### content.ts — Контент карточек

#### get_content_cards ⏳ v0.4.0
```
Description: "Получить карточки товаров продавца: название, характеристики, артикул, категория.
Полезно для агентов чтобы знать название товара при работе с отзывами и аналитикой."
WB Endpoint: POST https://content-api.wildberries.ru/content/v2/get/cards/list
Токен: Content
```
Input:
- settings: { cursor: { limit: number (default 100), updatedAt?: string, nmID?: number }, filter: { withPhoto?: number, textSearch?: string, allowedCategoriesOnly?: boolean } }
Returns: array<{ nmID, vendorCode, subjectName, brand, title, sizes, characteristics }>
Pagination: cursor-based, использовать cursor из ответа для следующей страницы.

---

### supplies.ts — Поставки FBO

#### get_supplies ⏳ v0.4.0
```
Description: "Получить список поставок FBO: статус, дата, склад, количество товаров."
WB Endpoint: GET https://marketplace-api.wildberries.ru/api/v3/supplies
Токен: Marketplace
```
Input: limit (default 1000, max 1000), next (cursor, default 0), status (optional: "NEW"|"ACCEPTED"|"SORTED")
Returns: array<{ id, done, createdAt, closedAt, scanDt, name, warehouseId, warehouseName, cargoType }>

#### create_supply ⏳ v0.4.0
```
Description: "⚠️ СОЗДАТЬ новую поставку FBO. Создаёт реальную поставку в личном кабинете WB.
Используй только после подтверждения пользователем."
WB Endpoint: POST https://marketplace-api.wildberries.ru/api/v3/supplies
Токен: Marketplace
```
Input: name (string, название поставки)
Returns: { id: number } — ID созданной поставки

---

### documents.ts — Документы

#### get_documents ⏳ v0.4.0
```
Description: "Получить список финансовых документов продавца: акты, отчёты, счета.
Возвращает ссылки для скачивания."
WB Endpoint: GET https://documents-api.wildberries.ru/api/v1/documents/list
Токен: Documents
```
Input: locale (default "ru"), beginTime (ISO date, optional), endTime (ISO date, optional), sort ("date"|"category", default "date")
Returns: array<{ id, title, date, url, category }>

---

## Coding Standards

- TypeScript strict mode, ESM only
- zod для валидации ВСЕХ входных параметров
- Описания инструментов на русском
- "⚠️ ВНИМАНИЕ" в описании всех write-операций
- "⚠️ ТРЕБУЕТ подписку «Джем»" для search_analytics
- JSDoc на всех публичных функциях
- WB API ошибки → человекочитаемые сообщения на русском
- Rate limiting через rate-limiter.ts (statistics, finance — 1 req/min)
- Unit тесты для каждого инструмента

## Important Conventions

- README.ru.md — PRIMARY. README.md — английский.
- Semantic versioning: v0.1.0 → v0.2.0 → v0.3.0 → v0.4.0
- Имена инструментов в snake_case
- Ошибки пользователю — на русском
- Никогда не логировать WB-токен

## What NOT to do

- Не использовать эндпоинты не из документации dev.wildberries.ru
- Не хранить и не логировать WB API токен
- Не делать write-операции без явного предупреждения в описании
- Не хардкодить URL — только через BASE_URLS
- Не игнорировать rate limits — exponential backoff обязателен
- Не использовать CommonJS — только ESM
