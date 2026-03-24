# TASKS.md — Пошаговые задачи для разработки wb-mcp-server

Этот файл содержит последовательные задачи. Выполняй их по одной.
После каждой задачи — коммить с осмысленным сообщением.

---

## ЗАДАЧА 1: Инициализация проекта

Создай структуру проекта wb-mcp-server согласно CLAUDE.md.

1. Инициализируй npm-проект с `type: "module"` в package.json
2. Установи зависимости:
   - `@modelcontextprotocol/sdk` — MCP SDK
   - `zod` — валидация
   - Dev: `typescript`, `tsup`, `vitest`, `tsx`, `@types/node`
3. Настрой tsconfig.json: strict mode, ESM, target ES2022, outDir dist
4. Настрой tsup.config.ts: entry src/index.ts, format esm, dts true
5. Создай .env.example с `WB_API_TOKEN=your_wildberries_api_token_here`
6. Создай .gitignore (node_modules, dist, .env, *.js в корне)
7. Создай src/config.ts:
   - Читай WB_API_TOKEN из env (или аргумента --token)
   - Объект BASE_URLS со всеми WB API base URLs из CLAUDE.md
   - Типизированный конфиг
8. Создай пустую структуру директорий: src/tools/, src/types/, src/utils/, tests/, examples/
9. В package.json добавь scripts: build, dev, start, test
10. Добавь bin field в package.json чтобы пакет работал как CLI: `"wb-mcp-server": "./dist/index.js"`

Коммит: `feat: initial project setup with TypeScript, MCP SDK, config`

---

## ЗАДАЧА 2: WB API клиент

Создай src/wb-client.ts — единый HTTP-клиент для всех запросов к WB API.

Класс `WBClient`:
- Конструктор принимает `token: string`
- Метод `get<T>(baseUrl: string, path: string, params?: Record<string, any>): Promise<T>` 
- Метод `post<T>(baseUrl: string, path: string, body?: any): Promise<T>`
- Метод `patch<T>(baseUrl: string, path: string, body?: any): Promise<T>`
- Автоматически добавляет заголовок `Authorization: ${this.token}`
- Автоматически добавляет `Content-Type: application/json`
- Обработка ошибок: если HTTP status не 2xx, парсит тело ответа и выбрасывает типизированную ошибку `WBApiError` с полями code, message, status
- Логирование: при ошибке выводи в stderr URL, статус и тело ответа (без токена!)

Создай src/utils/errors.ts:
- Класс `WBApiError extends Error` с полями httpStatus, code, detail
- Функция `formatError(error: unknown): string` — возвращает человекочитаемую строку на русском

Создай src/utils/rate-limiter.ts:
- Простой rate limiter на основе timestamps
- Метод `waitIfNeeded(endpoint: string, limitPerMinute: number): Promise<void>`
- Если лимит превышен — ждёт нужное время (не выбрасывает ошибку)

Коммит: `feat: WB API client with auth, error handling, rate limiting`

---

## ЗАДАЧА 3: MCP сервер — скелет

Создай src/server.ts и src/index.ts — базовый MCP сервер, который стартует и отвечает на list_tools.

src/server.ts:
- Класс `WBMCPServer`
- Использует `@modelcontextprotocol/sdk` Server
- В конструкторе создаёт WBClient с токеном из конфига
- Метод `registerTools()` — будет вызывать регистрацию из файлов tools/*
- Метод `start()` — запускает MCP сервер через StdioServerTransport
- Выведи в stderr при старте: `wb-mcp-server v{version} started` (version из package.json)

src/index.ts:
- Shebang `#!/usr/bin/env node`
- Проверяет наличие WB_API_TOKEN (из env или --token аргумента)
- Если токена нет — выводит понятную ошибку на русском и английском, exit 1
- Создаёт и запускает WBMCPServer

После этого сервер должен запускаться через `npx tsx src/index.ts` и отвечать на MCP handshake (пока без tools).

Коммит: `feat: MCP server skeleton with stdio transport`

---

## ЗАДАЧА 4: Первые tools — отзывы (feedbacks)

Создай src/tools/feedbacks.ts с тремя MCP tools.

### Tool: get_feedbacks
```
name: "get_feedbacks"
description: "Получить список отзывов покупателей. Можно фильтровать по отвеченным/неотвеченным. Возвращает текст отзыва, оценку, дату, информацию о товаре и ответ продавца (если есть)."
```
Input schema (zod):
- isAnswered: z.boolean().describe("true — отвеченные отзывы, false — неотвеченные")
- take: z.number().min(1).max(10000).default(50).describe("Количество отзывов (макс 10000)")
- skip: z.number().default(0).describe("Смещение для пагинации")
- order: z.enum(["dateAsc", "dateDesc"]).default("dateDesc").describe("Сортировка по дате")
- nmId: z.number().optional().describe("Фильтр по артикулу WB (необязательно)")

WB API call: GET feedbacks-api base + /api/v1/feedbacks с query-параметрами

Форматирование ответа: верни структурированный JSON с массивом отзывов, каждый содержит: id, text, productValuation, answer (text или null), createdDate, productDetails (nmId, productName, supplierArticle), userName.

### Tool: reply_feedback
```
name: "reply_feedback"  
description: "⚠️ ОТВЕТИТЬ на отзыв покупателя. ВНИМАНИЕ: это действие отправляет реальный ответ, который увидит покупатель! Убедитесь, что текст корректен перед отправкой. Ответ можно отредактировать только 1 раз в течение 60 дней."
```
Input schema:
- id: z.string().describe("ID отзыва (получите через get_feedbacks)")
- text: z.string().min(1).describe("Текст ответа на отзыв")

WB API call: PATCH feedbacks-api base + /api/v1/feedbacks, body: { id, text }

### Tool: get_unanswered_count
```
name: "get_unanswered_count"
description: "Получить количество неотвеченных отзывов. Полезно для быстрой проверки: есть ли новые отзывы, требующие ответа."
```
No input parameters.
WB API call: GET feedbacks-api base + /api/v1/feedbacks/count-unanswered

Зарегистрируй все три инструмента в server.ts.

Протестируй: запусти сервер, подключи к Claude Desktop (создай examples/claude-desktop.json с примером конфига), убедись что tools видны и get_unanswered_count возвращает число.

Коммит: `feat: feedback tools — get_feedbacks, reply_feedback, get_unanswered_count`

---

## ЗАДАЧА 5: Tools — аналитика и статистика

Создай src/tools/analytics.ts с tools для аналитики.

### Tool: get_stocks
```
name: "get_stocks"
description: "Получить текущие остатки товаров на складах WB. Данные обновляются каждые 30 минут. Лимит: 1 запрос в минуту."
```
Input: dateFrom (z.string().describe("Дата начала в формате ISO, например 2024-01-01"))
WB API: GET statistics-api base + /api/v1/supplier/stocks?dateFrom={dateFrom}
Handle pagination: if response has 60000 items, warn that there may be more.

### Tool: get_orders
```
name: "get_orders"
description: "Получить список заказов. Данные хранятся до 90 дней. Лимит: 1 запрос в минуту."
```
Input: dateFrom (string, required), flag (z.number().optional() — 0 все с даты, 1 только обновлённые)
WB API: GET statistics-api base + /api/v1/supplier/orders

### Tool: get_sales
```
name: "get_sales"
description: "Получить данные о продажах (выкупах). Включает сумму к оплате продавцу. Лимит: 1 запрос в минуту."
```
Input: dateFrom (string, required), flag (z.number().optional())
WB API: GET statistics-api base + /api/v1/supplier/sales

### Tool: get_nm_report
```
name: "get_nm_report"
description: "Детальный отчёт по товарам: просмотры карточки, добавления в корзину, заказы, выкупы, конверсии. Данные за указанный период."
```
Input: 
- beginDate: z.string().describe("Начало периода, ISO")
- endDate: z.string().describe("Конец периода, ISO")
- page: z.number().default(1)
WB API: POST seller-analytics-api base + /api/v2/nm-report/detail, body: { period: { begin, end }, page }

Не забудь: statistics-api endpoints имеют лимит 1 запрос в минуту — используй rate-limiter.

Коммит: `feat: analytics tools — stocks, orders, sales, nm_report`

---

## ЗАДАЧА 6: Tools — реклама

Создай src/tools/advertising.ts.

### Tool: get_advert_list
```
name: "get_advert_list"
description: "Получить список рекламных кампаний с количеством по статусам (активные, на паузе, завершённые и т.д.)"
```
No required input.
WB API: POST advert-api base + /adv/v1/promotion/count
Returns: adverts array with type, status, count, campain IDs.

### Tool: get_advert_stats
```
name: "get_advert_stats"
description: "Получить подробную статистику рекламных кампаний: показы, клики, CTR, CPC, расход, заказы. Максимум 100 кампаний за запрос."
```
Input: campaignIds — z.array(z.number()).max(100).describe("Массив ID рекламных кампаний")
WB API: POST advert-api base + /adv/v2/fullstats, body: array of campaign IDs
Returns: detailed stats per campaign per day.

Коммит: `feat: advertising tools — get_advert_list, get_advert_stats`

---

## ЗАДАЧА 7: Тесты

Создай тесты для каждого tool-файла в tests/tools/.

Для каждого теста:
1. Мокай WBClient (не делай реальных HTTP-запросов)
2. Проверяй что tool корректно формирует запрос к WB API
3. Проверяй что tool корректно парсит ответ
4. Проверяй обработку ошибок (401, 429, 500)
5. Проверяй валидацию входных параметров (zod)

Минимум тесты для:
- feedbacks: get_feedbacks (happy path + empty result), reply_feedback (success + error), get_unanswered_count
- analytics: get_stocks (happy path + pagination warning), get_nm_report
- advertising: get_advert_stats (happy path + empty campaigns)

Убедись что `npm test` проходит.

Коммит: `test: unit tests for all MCP tools`

---

## ЗАДАЧА 8: README и документация

### README.ru.md (основной, на русском):

Структура:
1. **Заголовок** с бейджами: npm version, license MIT, GitHub stars
2. **Что это** — 2-3 предложения: MCP-сервер для WB API, работает с Claude Desktop, OpenClaw, любым MCP-клиентом
3. **Быстрый старт** — 3 шага:
   - `npm install -g wb-mcp-server`
   - Добавь WB API токен в переменную окружения
   - Добавь в конфиг Claude Desktop (пример JSON)
4. **Список инструментов** — таблица: название, описание, тип (read/write)
5. **Примеры использования** — 3-4 примера что можно спросить у Claude:
   - "Сколько у меня неотвеченных отзывов?"
   - "Покажи продажи за последнюю неделю"
   - "Какие товары лучше всего конвертируются?"
   - "Какая статистика по рекламным кампаниям?"
6. **Получение WB API токена** — пошаговая инструкция с скриншотами (описание, скриншоты добавишь позже)
7. **Конфигурация** — env vars, CLI args
8. **Разработка** — как собрать и запустить локально
9. **Contributing** — как контрибьютить
10. **Лицензия** — MIT

### README.md (английский):
Краткая версия README.ru.md на английском.

### examples/claude-desktop.json:
```json
{
  "mcpServers": {
    "wildberries": {
      "command": "wb-mcp-server",
      "env": {
        "WB_API_TOKEN": "your_token_here"
      }
    }
  }
}
```

### examples/usage.md:
5-10 примеров промптов для Claude с wb-mcp-server на русском.

### CHANGELOG.md:
Первая запись для v0.1.0.

### LICENSE:
MIT license text.

Коммит: `docs: README (ru + en), examples, changelog, license`

---

## ЗАДАЧА 9: Сборка и публикация

1. Убедись что `npm run build` создаёт dist/ с рабочим JS
2. Убедись что `node dist/index.js` запускается (и ругается на отсутствие токена)
3. Добавь в package.json:
   - `"files": ["dist", "README.md", "README.ru.md", "LICENSE"]`
   - `"keywords": ["mcp", "wildberries", "wb", "marketplace", "ai", "agent", "seller"]`
   - `"repository"` — GitHub URL
   - `"homepage"` — GitHub URL
4. Проверь что `npm pack` создаёт корректный tarball
5. Добавь GitHub Actions workflow (.github/workflows/ci.yml):
   - На push в main: lint, test, build
   - На tag v*: publish to npm

Коммит: `chore: build config, npm package setup, CI workflow`

---

## ЗАДАЧА 10: Финальная проверка

Выполни полный чеклист:

- [ ] `npm install` — без ошибок
- [ ] `npm run build` — без ошибок
- [ ] `npm test` — все тесты проходят
- [ ] `node dist/index.js` без токена — понятная ошибка
- [ ] `WB_API_TOKEN=test node dist/index.js` — сервер стартует
- [ ] README.ru.md содержит быстрый старт, список tools, примеры
- [ ] README.md содержит English version
- [ ] examples/claude-desktop.json корректен
- [ ] .env.example существует
- [ ] LICENSE — MIT
- [ ] .gitignore покрывает node_modules, dist, .env
- [ ] package.json имеет bin, files, keywords, repository

Если что-то не проходит — исправь.

Коммит: `chore: final checks and fixes for v0.1.0 release`

---

## Что дальше (не в скоупе этого файла)

После выполнения задач 1-10 у тебя будет готовый к публикации wb-mcp-server v0.1.0.
Следующие шаги (отдельный TASKS файл):
- Добавить tools для цен (get_prices, update_prices)
- Добавить tools для поставок (get_supplies, create_supply)
- Добавить tools для вопросов покупателей (answer_question)
- Создать Telegram-бот с LangGraph (отдельный репозиторий)
- Написать статью для Хабр
