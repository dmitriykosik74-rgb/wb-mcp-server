# TASKS.md — wb-mcp-server (все версии, 22 инструмента)

## Карта версий

```
v0.1.0 ✅ опубликована — 10 инструментов
v0.2.0 🔧 MVP-блокер  — +3 = 13 инструментов
v0.3.0 ⏳ Phase 2     — +5 = 18 инструментов
v0.4.0 ⏳ Phase 3     — +4 = 22 инструмента
```

---

## ✅ v0.1.0 — ВЫПОЛНЕНО (задачи 1-10)

10 инструментов опубликованы на npm:
- feedbacks.ts: get_feedbacks, reply_feedback, get_unanswered_count, get_questions
- statistics.ts: get_stocks, get_orders, get_sales
- analytics.ts: get_nm_report
- advertising.ts: get_advert_list, get_advert_stats

---

## 🔧 v0.2.0 — MVP-блокер (задачи 11-13)

Нужна ДО старта wb-seller-agent. Разблокирует Reviews Agent (полный) и Finance Agent (реальный P&L).

После выполнения: `npm version minor` → `npm publish` → обновить Dockerfile в wb-seller-agent.

---

### ЗАДАЧА 11: reply_question

Файл: `src/tools/feedbacks.ts` (добавить к существующим)

```typescript
name: "reply_question"
description: "⚠️ ОТВЕТИТЬ на вопрос покупателя. ВНИМАНИЕ: отправляет реальный ответ, который увидит покупатель."
WB Endpoint: PATCH https://feedbacks-api.wildberries.ru/api/v1/questions
Токен: Feedbacks
```

Input (zod):
```typescript
{
  id: z.string().describe("ID вопроса (из get_questions)"),
  text: z.string().min(1).describe("Текст ответа")
}
```

Body: `{ id, text }`

Тесты в `tests/tools/feedbacks.test.ts`:
- happy path: успешный ответ
- error: 401 при неверном токене

Коммит: `feat: reply_question tool`

---

### ЗАДАЧА 12: get_financial_report

Файл: `src/tools/statistics.ts` (добавить к существующим)

```typescript
name: "get_financial_report"
description: "Детализация отчёта реализации WB: комиссии, логистика, хранение, штрафы, сумма к оплате.
Используй для расчёта реального P&L. Лимит: 1 запрос в минуту.
При >100000 строк — использовать пагинацию через rrdid."
WB Endpoint: GET https://statistics-api.wildberries.ru/api/v5/supplier/reportDetailByPeriod
Rate limit: 1 req/min. Токен: Statistics
```

Input (zod):
```typescript
{
  dateFrom: z.string().describe("Начало периода, ISO datetime, например 2026-03-01"),
  dateTo: z.string().describe("Конец периода, ISO datetime"),
  limit: z.number().max(100000).default(100000),
  rrdid: z.number().default(0).describe("ID последней строки для пагинации (0 = первый запрос)"),
  period: z.enum(["weekly", "daily"]).default("weekly")
}
```

Ключевые поля в ответе (описать в tool description):
- `ppvz_for_pay` — итоговая сумма к выплате
- `delivery_rub` — логистика WB
- `storage_fee` — хранение
- `penalty` — штрафы
- `commission_percent` — комиссия WB
- `retail_amount` — розничная выручка

Пагинация: если 100000 строк → следующий запрос с rrdid = rrd_id последней строки. Статус 204 = конец данных.

Тесты в `tests/tools/statistics.test.ts`:
- happy path: отчёт за период
- pagination: 100000 строк → предупреждение
- empty: 204 → пустой массив

Коммит: `feat: get_financial_report tool`

---

### ЗАДАЧА 13: get_seller_balance + публикация v0.2.0

Файл: `src/tools/finance.ts` (новый файл)

```typescript
name: "get_seller_balance"
description: "Текущий баланс продавца: доступные средства и сумма к ближайшей выплате. Лимит: 1 req/min."
WB Endpoint: GET https://finance-api.wildberries.ru/api/v1/account/balance
Rate limit: 1 req/min. Токен: Finance
```

Добавить в BASE_URLS: `finance: "https://finance-api.wildberries.ru"`

Input: нет.
Returns: `{ currency: string, current: number, for_withdraw: number }`

Тесты: happy path, 401.

**Чеклист v0.2.0:**
- [ ] `npm test` — все тесты проходят
- [ ] `npm run build` — без ошибок
- [ ] Все 13 инструментов видны в Claude Desktop
- [ ] reply_question работает в sandbox
- [ ] get_financial_report возвращает данные с комиссиями
- [ ] get_seller_balance возвращает баланс
- [ ] CHANGELOG.md обновлён
- [ ] README.ru.md — таблица обновлена (13 инструментов)

```bash
npm version minor   # 0.1.0 → 0.2.0
npm publish
```

Коммит: `feat: get_seller_balance, finance.ts, release v0.2.0`

---

## ⏳ v0.3.0 — Phase 2 (задачи 14-16)

Нужна перед стартом Ads Agent и Supply Agent в wb-seller-agent (неделя 9 Гантта).

---

### ЗАДАЧА 14: get_advert_balance + update_advert_bid

Файл: `src/tools/advertising.ts` (добавить к существующим)

#### get_advert_balance
```typescript
name: "get_advert_balance"
description: "Баланс рекламного кабинета продавца: доступные средства и бонусы."
WB Endpoint: GET https://advert-api.wildberries.ru/adv/v1/balance
Токен: Promotion
```
Input: нет. Returns: `{ balance: number, net: number, bonus: number }`

#### update_advert_bid
```typescript
name: "update_advert_bid"
description: "⚠️ ИЗМЕНИТЬ ставки в кампании. ВНИМАНИЕ: немедленно влияет на показы и расход бюджета.
Только для кампаний в статусах 4 (готова), 9 (активна), 11 (на паузе)."
WB Endpoint: PATCH https://advert-api.wildberries.ru/api/advert/v1/bids
Токен: Promotion
```
Input:
```typescript
{
  advertId: z.number().describe("ID кампании"),
  type: z.number().describe("Тип кампании (из get_advert_list)"),
  bids: z.array(z.object({
    nm: z.number().describe("Артикул WB (nmId)"),
    price: z.number().describe("Новая ставка в копейках")
  }))
}
```

Коммит: `feat: get_advert_balance, update_advert_bid`

---

### ЗАДАЧА 15: get_prices + update_prices

Файл: `src/tools/prices.ts` (уже есть заготовка, дополнить)

#### get_prices
```typescript
name: "get_prices"
description: "Текущие цены и скидки по товарам продавца."
WB Endpoint: GET https://discounts-prices-api.wildberries.ru/api/v2/list/goods/filter
Токен: Prices
```
Input: `{ limit: max 1000, offset: default 0, filterNmID?: number }`

#### update_prices
```typescript
name: "update_prices"
description: "⚠️ ИЗМЕНИТЬ цены и/или скидки. ВНИМАНИЕ: изменения немедленно вступают в силу на WB."
WB Endpoint: POST https://discounts-prices-api.wildberries.ru/api/v2/upload/task
Токен: Prices
```
Input: `{ data: array<{ nmID: number, price: number (рубли), discount: number (0-99) }> }`

Коммит: `feat: get_prices, update_prices`

---

### ЗАДАЧА 16: get_warehouses_inventory + публикация v0.3.0

Файл: `src/tools/analytics.ts` (добавить к существующим)

```typescript
name: "get_warehouses_inventory"
description: "Актуальный отчёт по остаткам на складах. Точнее get_stocks для оперативного управления.
Асинхронный: создаёт задачу, ожидает готовности (polling), возвращает данные."
WB Endpoint (создать): GET https://statistics-api.wildberries.ru/api/v1/warehouse_remains
WB Endpoint (статус):  GET .../tasks/{task_id}/status
WB Endpoint (скачать): GET .../tasks/{task_id}/download
Токен: Statistics
```

Реализация:
```typescript
// 1. создать задачу → task_id
// 2. polling каждые 5 сек, макс 60 сек
// 3. статус "done" → скачать и вернуть данные
// 4. timeout → вернуть ошибку с подсказкой попробовать позже
```

**Чеклист v0.3.0:**
- [ ] `npm test` — все тесты проходят
- [ ] Все 18 инструментов видны в Claude Desktop
- [ ] update_advert_bid и update_prices — предупреждения в описаниях
- [ ] get_warehouses_inventory — polling работает
- [ ] CHANGELOG.md обновлён
- [ ] README.ru.md — таблица обновлена (18 инструментов)

```bash
npm version minor   # 0.2.0 → 0.3.0
npm publish
```

Коммит: `feat: get_warehouses_inventory, release v0.3.0`

---

## ⏳ v0.4.0 — Phase 3 (задачи 17-19)

Нужна перед расширенными сценариями: контент карточек, управление поставками, документы, поисковая аналитика.

---

### ЗАДАЧА 17: get_content_cards

Новый файл: `src/tools/content.ts`

```typescript
name: "get_content_cards"
description: "Карточки товаров продавца: название, характеристики, артикул, категория, бренд.
Полезно агентам для получения названия товара при работе с отзывами и аналитикой."
WB Endpoint: POST https://content-api.wildberries.ru/content/v2/get/cards/list
Токен: Content
```

Input:
```typescript
{
  settings: z.object({
    cursor: z.object({
      limit: z.number().max(100).default(100),
      updatedAt: z.string().optional(),
      nmID: z.number().optional()
    }),
    filter: z.object({
      withPhoto: z.number().optional(),
      textSearch: z.string().optional(),
      allowedCategoriesOnly: z.boolean().optional()
    }).optional()
  })
}
```

Добавить в BASE_URLS: `content: "https://content-api.wildberries.ru"`

Pagination: cursor-based — брать cursor из ответа и передавать в следующий запрос.

Тесты: happy path, cursor pagination, пустой список.

Коммит: `feat: get_content_cards, content.ts`

---

### ЗАДАЧА 18: get_supplies + create_supply

Файл: `src/tools/supplies.ts` (уже есть заготовка, дополнить)

#### get_supplies
```typescript
name: "get_supplies"
description: "Список поставок FBO: статус, дата создания, склад, количество товаров."
WB Endpoint: GET https://marketplace-api.wildberries.ru/api/v3/supplies
Токен: Marketplace
```
Input: `{ limit: default 1000 max 1000, next: cursor default 0, status?: "NEW"|"ACCEPTED"|"SORTED" }`
Returns: `array<{ id, done, createdAt, closedAt, name, warehouseId, warehouseName, cargoType }>`

#### create_supply
```typescript
name: "create_supply"
description: "⚠️ СОЗДАТЬ новую поставку FBO в личном кабинете WB.
ВНИМАНИЕ: создаёт реальную поставку. Используй только после явного подтверждения пользователем."
WB Endpoint: POST https://marketplace-api.wildberries.ru/api/v3/supplies
Токен: Marketplace
```
Input: `{ name: z.string().describe("Название поставки") }`
Returns: `{ id: number }`

Добавить в BASE_URLS: `marketplace: "https://marketplace-api.wildberries.ru"`

Коммит: `feat: get_supplies, create_supply`

---

### ЗАДАЧА 19: get_documents + search_analytics + публикация v0.4.0

#### get_documents — новый файл `src/tools/documents.ts`
```typescript
name: "get_documents"
description: "Финансовые документы продавца: акты, отчёты, счета со ссылками для скачивания."
WB Endpoint: GET https://documents-api.wildberries.ru/api/v1/documents/list
Токен: Documents
```
Input: `{ locale: default "ru", beginTime?: ISO date, endTime?: ISO date, sort?: "date"|"category" }`

Добавить в BASE_URLS: `documents: "https://documents-api.wildberries.ru"`

#### search_analytics — добавить в `src/tools/analytics.ts`
```typescript
name: "search_analytics"
description: "⚠️ ТРЕБУЕТ подписку «Джем» в личном кабинете WB. Без подписки вернёт ошибку 403.
Поисковые запросы покупателей по товарам: частота запросов, позиции, клики, конверсии в корзину."
WB Endpoint: POST https://seller-analytics-api.wildberries.ru/api/v2/analytics/search-report
Токен: Analytics + подписка «Джем»
```
Input:
```typescript
{
  nmIds: z.array(z.number()).describe("Артикулы WB для анализа"),
  dateFrom: z.string().describe("Начало периода, ISO"),
  dateTo: z.string().describe("Конец периода, ISO"),
  page: z.number().default(1)
}
```

**Чеклист v0.4.0:**
- [ ] `npm test` — все тесты проходят
- [ ] Все 22 инструмента видны в Claude Desktop
- [ ] create_supply и update_prices — предупреждения в описаниях
- [ ] search_analytics — предупреждение про «Джем» в описании, корректно возвращает ошибку при 403
- [ ] get_content_cards — pagination работает
- [ ] CHANGELOG.md обновлён
- [ ] README.ru.md — таблица обновлена (22 инструмента)

```bash
npm version minor   # 0.3.0 → 0.4.0
npm publish
```

Коммит: `feat: get_documents, search_analytics, release v0.4.0`

---

## Итоговая карта всех 22 инструментов

```
v0.1.0 ✅  feedbacks.ts:    get_feedbacks, reply_feedback,
                             get_unanswered_count, get_questions
           statistics.ts:   get_stocks, get_orders, get_sales
           analytics.ts:    get_nm_report
           advertising.ts:  get_advert_list, get_advert_stats
           Итого: 10

v0.2.0 🔧  feedbacks.ts:   + reply_question
           statistics.ts:  + get_financial_report
           finance.ts:     + get_seller_balance (новый файл)
           Итого: +3 = 13

v0.3.0 ⏳  advertising.ts: + get_advert_balance, update_advert_bid
           prices.ts:      + get_prices, update_prices
           analytics.ts:   + get_warehouses_inventory
           Итого: +5 = 18

v0.4.0 ⏳  content.ts:     + get_content_cards (новый файл)
           supplies.ts:    + get_supplies, create_supply
           documents.ts:   + get_documents (новый файл)
           analytics.ts:   + search_analytics (⚠️ требует «Джем»)
           Итого: +4 = 22
```
