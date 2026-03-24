# WB MCP Server

## Project Overview

This is an open-source MCP (Model Context Protocol) server that provides AI agents (Claude, OpenClaw, any MCP-compatible client) with access to the Wildberries Seller API. It translates MCP tool calls into REST API requests to dev.wildberries.ru.

**Goal:** Become the standard open-source bridge between AI agents and Wildberries marketplace for Russian e-commerce sellers.

**License:** MIT
**Language:** TypeScript
**Runtime:** Node.js 20+
**Package name:** `wb-mcp-server` (npm)

## Architecture

```
MCP Client (Claude Desktop / OpenClaw / Custom Agent)
        ↓ MCP Protocol (stdio or SSE)
    wb-mcp-server
        ↓ REST/JSON over HTTPS
    Wildberries Seller API (dev.wildberries.ru)
```

The server uses `@modelcontextprotocol/sdk` to expose MCP tools. Each tool maps to one or more WB API endpoints. Authentication uses a WB API token passed via environment variable `WB_API_TOKEN`.

## Tech Stack

- **TypeScript** with strict mode
- **@modelcontextprotocol/sdk** — MCP server SDK
- **zod** — input validation for tool parameters
- **node-fetch** or built-in fetch — HTTP client for WB API
- **tsup** — bundler
- **vitest** — testing
- **tsx** — development runner

## Project Structure

```
wb-mcp-server/
├── src/
│   ├── index.ts              # Entry point, MCP server setup
│   ├── server.ts             # Server class, tool registration
│   ├── config.ts             # Configuration, env vars
│   ├── wb-client.ts          # WB API HTTP client (auth, rate-limiting, error handling)
│   ├── tools/
│   │   ├── feedbacks.ts      # get_feedbacks, reply_feedback, get_unanswered_count
│   │   ├── analytics.ts      # get_sales_report, get_nm_report, get_financial_report  
│   │   ├── stocks.ts         # get_stocks, get_warehouses
│   │   ├── orders.ts         # get_orders, get_order_meta
│   │   ├── advertising.ts    # get_advert_list, get_advert_stats, update_advert_bid
│   │   ├── prices.ts         # get_prices, update_prices
│   │   └── supplies.ts       # get_supplies, create_supply
│   ├── types/
│   │   ├── wb-api.ts         # WB API response/request types
│   │   └── tools.ts          # Tool input/output schemas
│   └── utils/
│       ├── rate-limiter.ts   # Per-endpoint rate limiting
│       ├── pagination.ts     # Cursor-based pagination helper
│       └── errors.ts         # Error classes and formatting
├── tests/
│   ├── tools/                # Tool-level tests (mocked WB API)
│   └── integration/          # Integration tests (requires WB_API_TOKEN)
├── examples/
│   ├── claude-desktop.json   # Example Claude Desktop MCP config
│   └── usage.md              # Usage examples with screenshots
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── .env.example              # WB_API_TOKEN=your_token_here
├── README.md
├── README.ru.md              # Russian README (primary audience)
├── LICENSE                   # MIT
├── CHANGELOG.md
└── CLAUDE.md                 # This file
```

## WB API Reference

**Base URLs:**
- Content: `https://content-api.wildberries.ru`
- Marketplace: `https://marketplace-api.wildberries.ru`
- Statistics: `https://statistics-api.wildberries.ru`  
- Advertising: `https://advert-api.wildberries.ru`
- Feedbacks: `https://feedbacks-api.wildberries.ru`
- Analytics: `https://seller-analytics-api.wildberries.ru`
- Prices: `https://discounts-prices-api.wildberries.ru`
- Documents: `https://seller-analytics-api.wildberries.ru`

**Sandbox URLs** (for testing, use sandbox token):
- Feedbacks sandbox: `https://feedbacks-api-sandbox.wildberries.ru`

**Authentication:** 
- Header: `Authorization: {token}` (no "Bearer" prefix)
- Token created in seller account → Settings → API Integrations
- Token valid for 180 days
- Different token categories for different API groups (content, analytics, marketplace, adv, feedbacks, prices, etc.)
- Prices are in kopecks (divide by 100 for rubles)

**Rate Limits:** Each endpoint group has its own rate limits. Implement exponential backoff. Common limits:
- Statistics: 1 req/min per seller
- Feedbacks: varies by method, documented per endpoint
- Marketplace: varies, typically 10-60 req/min

**Error format:**
```json
{
  "code": "error_code",
  "message": "Human readable error",
  "detail": "Technical details"  
}
```

## MCP Tools — MVP Scope (Phase 1)

### 1. get_feedbacks
**Purpose:** Get list of feedbacks (reviews) with pagination
**WB Endpoint:** `GET https://feedbacks-api.wildberries.ru/api/v1/feedbacks`
**Parameters:**
- `isAnswered` (boolean, required) — filter by answered/unanswered
- `take` (number, 1-10000, default 50) — items per page
- `skip` (number, default 0) — offset
- `order` (string: "dateAsc" | "dateDesc", default "dateDesc")
- `nmId` (number, optional) — filter by WB article
**Returns:** Array of feedbacks with id, text, productValuation (1-5), answer (if exists), createdDate, productDetails (nmId, productName, supplierArticle), userName

### 2. reply_feedback
**Purpose:** Reply to a feedback
**WB Endpoint:** `PATCH https://feedbacks-api.wildberries.ru/api/v1/feedbacks`
**Parameters:**
- `id` (string, required) — feedback ID
- `text` (string, required) — reply text
**Returns:** success/error. NOTE: No validation by feedback ID — incorrect ID won't produce error.
**CRITICAL:** This is a write operation. Tool description must warn that this sends a real reply.

### 3. get_unanswered_count
**Purpose:** Get count of unanswered feedbacks
**WB Endpoint:** `GET https://feedbacks-api.wildberries.ru/api/v1/feedbacks/count-unanswered`
**Returns:** `{ "data": number }`

### 4. get_questions
**Purpose:** Get list of customer questions
**WB Endpoint:** `GET https://feedbacks-api.wildberries.ru/api/v1/questions`
**Parameters:** Same pattern as feedbacks (isAnswered, take, skip, order)
**Returns:** Array of questions

### 5. get_stocks
**Purpose:** Get current product stock levels
**WB Endpoint:** `GET https://statistics-api.wildberries.ru/api/v1/supplier/stocks`
**Parameters:**
- `dateFrom` (string, ISO date, required) — use last known date for pagination
**Rate limit:** 1 req/min per seller
**Returns:** Array of stock items with warehouse, nmId, quantity, quantityFull, etc.
**Pagination:** If response has 60000 items, there are more — use lastChangeDate of last item as dateFrom for next request.

### 6. get_orders
**Purpose:** Get recent orders
**WB Endpoint:** `GET https://statistics-api.wildberries.ru/api/v1/supplier/orders`  
**Parameters:**
- `dateFrom` (string, ISO date, required)
- `flag` (0 or 1, optional) — 0 for all since dateFrom, 1 for only updated
**Rate limit:** 1 req/min per seller
**Returns:** Array of orders with date, srid, nmId, finishedPrice, etc.

### 7. get_sales
**Purpose:** Get sales data
**WB Endpoint:** `GET https://statistics-api.wildberries.ru/api/v1/supplier/sales`
**Parameters:** Same as orders
**Rate limit:** 1 req/min per seller
**Returns:** Array of sales with saleID, date, nmId, finishedPrice, forPay, etc.

### 8. get_nm_report  
**Purpose:** Get detailed report per product (views, cart, orders, buyouts)
**WB Endpoint:** `POST https://seller-analytics-api.wildberries.ru/api/v2/nm-report/detail`
**Parameters:**
- `period` object with `begin` and `end` (ISO dates)
- `page` (number, default 1)
**Returns:** Cards with nmID, statistics (openCardCount, addToCartCount, ordersCount, buyoutsCount, etc.)

### 9. get_advert_list
**Purpose:** Get list of advertising campaigns
**WB Endpoint:** `POST https://advert-api.wildberries.ru/adv/v1/promotion/count`
**Returns:** Campaign counts by status, then use `POST /adv/v1/promotion/adverts` to get details

### 10. get_advert_stats
**Purpose:** Get advertising campaign statistics  
**WB Endpoint:** `POST https://advert-api.wildberries.ru/adv/v2/fullstats`
**Parameters:** Array of campaign IDs (max 100)
**Returns:** Detailed stats: views, clicks, ctr, cpc, spend, orders, etc.

## Coding Standards

- All code in TypeScript strict mode
- Use zod schemas for ALL tool input validation
- Every tool must have a clear, helpful description in Russian (primary users are Russian sellers)
- Tool descriptions should explain what the tool does, what parameters mean, and any important caveats
- Use JSDoc comments on all public functions
- Handle WB API errors gracefully — return human-readable error messages, not raw stack traces
- Log rate limit hits and retries
- All dates in ISO 8601 format
- All monetary values: note in tool output that prices from WB are in kopecks
- Write unit tests for each tool (mock WB API responses)
- Keep dependencies minimal

## Important Conventions

- README.ru.md is the PRIMARY readme (Russian audience). README.md is English.
- Both READMEs must include: quick start (3 steps), Claude Desktop config example, full tool list with descriptions, contributing guide
- Use semantic versioning
- Every tool name uses snake_case
- Error messages should be in Russian when returned to the user
- The .env.example must clearly explain how to get a WB API token

## What NOT to do

- Don't use any WB API endpoints not documented at dev.wildberries.ru
- Don't store or log the WB API token (except for auth header)
- Don't make write operations without clear warning in tool description
- Don't hardcode any URLs — use config
- Don't ignore rate limits — implement proper backoff
- Don't use CommonJS — ESM only
