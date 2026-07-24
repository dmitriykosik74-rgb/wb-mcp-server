# wb-mcp-server — исторический репозиторий

[English version](README.md)

> [!IMPORTANT]
> Не используйте старые инструкции по установке и ручной настройке Claude
> Desktop из этого репозитория. Эта open-source версия больше не поддерживается.

Проект вырос в **Artel AI** — актуальную интеграцию с Claude Desktop для
селлеров Wildberries с готовыми расследованиями и комплексными Pro-сценариями
принятия решений.

- **Актуальный установщик и инструкция:** [artelai.ru/product](https://artelai.ru/product/)
- **Telegram-бот:** [@artellight_bot](https://t.me/artellight_bot)
- **Актуальный npm-пакет:** [`wb-mcp-server`](https://www.npmjs.com/package/wb-mcp-server)

## Если вы раньше устанавливали сервер из этого репозитория

1. Удалите старую ручную запись `wb-mcp-server` из конфигурации Claude Desktop.
2. Скачайте актуальный установщик `.mcpb` с сайта или через Telegram-бота.
3. Установите его в Claude Desktop и укажите API-токен Wildberries.
4. Ключ Artel Pro нужен только для запуска Pro-сценариев.

Имя npm-пакета `wb-mcp-server` теперь используется актуальной сборкой Artel.
Не объединяйте её со старой JSON-конфигурацией из этого репозитория.

## Исторический код и документация

Репозиторий остаётся публичным и не архивируется. Исходный код и история задач
сохранены для справки, но развитие продукта продолжается в Artel AI.

- [Архивная документация на русском](LEGACY.ru.md)
- [Legacy documentation in English](LEGACY.md)
- [Последний снимок исходного кода v0.4.3](https://github.com/dmitriykosik74-rgb/wb-mcp-server/tree/ba706d81dd6e15817e4ed7042ae4e980601e154f)

Код распространяется по лицензии [MIT](LICENSE).
