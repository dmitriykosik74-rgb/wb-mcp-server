# wb-mcp-server — historical repository

[Русская версия](README.ru.md)

> [!IMPORTANT]
> Do not use the old installation and Claude Desktop configuration instructions
> from this repository. This open-source version is no longer maintained.

The project has evolved into **Artel AI** — a current Claude Desktop integration
for Wildberries sellers with ready-to-run investigations and Pro workflows.

- **Current installer and setup guide:** [artelai.ru/product](https://artelai.ru/product/)
- **Telegram bot:** [@artellight_bot](https://t.me/artellight_bot)
- **Current npm package:** [`wb-mcp-server`](https://www.npmjs.com/package/wb-mcp-server)

## If you used this repository before

1. Remove the old manually configured `wb-mcp-server` entry from Claude Desktop.
2. Download the current `.mcpb` installer from the website or Telegram bot.
3. Install it in Claude Desktop and enter your Wildberries API token.
4. Add an Artel Pro license key only if you use Pro workflows.

The npm package name `wb-mcp-server` now points to the current Artel build. Do
not combine it with the legacy JSON configuration published in this repository.

## Historical source and documentation

This repository remains public as a reference and is not archived. Its source
code and issue history are preserved, but feature development happens in Artel
AI.

- [Legacy documentation in English](LEGACY.md)
- [Архивная документация на русском](LEGACY.ru.md)
- [Last legacy v0.4.3 source snapshot](https://github.com/dmitriykosik74-rgb/wb-mcp-server/tree/ba706d81dd6e15817e4ed7042ae4e980601e154f)

Licensed under the [MIT License](LICENSE).
