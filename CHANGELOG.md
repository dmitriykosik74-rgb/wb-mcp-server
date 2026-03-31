# Changelog

## 0.2.0 (2026-03-31)

### Features

- **get_questions** — получение списка вопросов покупателей
- **reply_question** — ответ на вопрос покупателя (⚠️ write-операция)
- **get_financial_report** — детализация отчёта реализации WB (комиссии, логистика, хранение, штрафы)
- **get_seller_balance** — текущий баланс продавца

### Refactoring

- Разделение `analytics.ts` → `statistics.ts` (stocks, orders, sales) + `analytics.ts` (nm_report)
- Добавлен `finance.ts` для финансовых инструментов
- Исправлены BASE_URLS: добавлен `finance`, исправлен `documents`
- Исправлена конфигурация vitest для стабильного запуска тестов

## 0.1.0 (2026-03-24)

### Features

- MCP server with stdio transport
- WB API client with authentication, error handling, and rate limiting
- **Feedback tools:** get_feedbacks, reply_feedback, get_unanswered_count
- **Analytics tools:** get_stocks, get_orders, get_sales, get_nm_report
- **Advertising tools:** get_advert_list, get_advert_stats
- Claude Desktop configuration example
