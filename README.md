# wb-mcp-server

[![npm version](https://img.shields.io/npm/v/wb-mcp-server)](https://www.npmjs.com/package/wb-mcp-server)
[![license](https://img.shields.io/npm/l/wb-mcp-server)](LICENSE)

[Русская версия](README.ru.md)

MCP server for the Wildberries Seller API. Connect any AI agent (Claude Desktop, OpenClaw, or any MCP client) to your Wildberries store.

## Quick Start

### 1. Install

```bash
npm install -g wb-mcp-server
```

### 2. Get a WB API token

Create an API token in your [WB Seller Dashboard](https://seller.wildberries.ru/) under **Settings > API Access**.

### 3. Add to Claude Desktop config

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

## Available Tools

| Tool | Description | Type |
|---|---|---|
| `get_feedbacks` | Get customer reviews | read |
| `reply_feedback` | Reply to a review | **write** |
| `get_unanswered_count` | Count of unanswered reviews | read |
| `get_stocks` | Warehouse stock levels | read |
| `get_orders` | Recent orders | read |
| `get_sales` | Sales data | read |
| `get_nm_report` | Per-product report (views, cart, orders, buyouts) | read |
| `get_advert_list` | Advertising campaigns list | read |
| `get_advert_stats` | Campaign statistics | read |

## Configuration

| Variable | Description | Required |
|---|---|---|
| `WB_API_TOKEN` | Wildberries Seller API token | Yes |

Or pass via CLI: `wb-mcp-server --token=your_token`

## Development

```bash
git clone https://github.com/dmitriykosik74-rgb/wb-mcp-server.git
cd wb-mcp-server
npm install
npm test
npm run build
```

## Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'feat: add my feature'`)
4. Push and create a Pull Request

## License

[MIT](LICENSE)
