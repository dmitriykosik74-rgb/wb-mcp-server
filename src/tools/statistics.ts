import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WBClient } from "../wb-client.js";
import { BASE_URLS } from "../config.js";
import { formatError } from "../utils/errors.js";

const STATISTICS_RATE_LIMIT = 1; // 1 req/min

export function registerStatisticsTools(server: McpServer, client: WBClient): void {
  // get_stocks
  server.registerTool(
    "get_stocks",
    {
      description: "Получить текущие остатки товаров на складах WB. Данные обновляются каждые 30 минут. Лимит: 1 запрос в минуту.",
      inputSchema: {
        dateFrom: z.string().describe("Дата начала в формате ISO, например 2024-01-01"),
      },
    },
    async (args) => {
      try {
        await client.rateLimiter.waitIfNeeded("statistics", STATISTICS_RATE_LIMIT);

        const data = await client.get<any[]>(BASE_URLS.statistics, "/api/v1/supplier/stocks", {
          dateFrom: args.dateFrom,
        });

        const items = Array.isArray(data) ? data : [];
        let text = JSON.stringify(items, null, 2);

        if (items.length >= 60000) {
          text += "\n\n⚠️ Получено 60000 записей — возможно, есть ещё данные. Используйте lastChangeDate последнего элемента как dateFrom для следующего запроса.";
        }

        return {
          content: [{ type: "text" as const, text }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: formatError(error) }],
          isError: true,
        };
      }
    },
  );

  // get_orders
  server.registerTool(
    "get_orders",
    {
      description: "Получить список заказов. Данные хранятся до 90 дней. Лимит: 1 запрос в минуту.",
      inputSchema: {
        dateFrom: z.string().describe("Дата начала в формате ISO, например 2024-01-01"),
        flag: z.number().optional().describe("0 — все заказы с указанной даты, 1 — только обновлённые"),
      },
    },
    async (args) => {
      try {
        await client.rateLimiter.waitIfNeeded("statistics", STATISTICS_RATE_LIMIT);

        const params: Record<string, any> = { dateFrom: args.dateFrom };
        if (args.flag !== undefined) params.flag = args.flag;

        const data = await client.get<any[]>(BASE_URLS.statistics, "/api/v1/supplier/orders", params);
        const items = Array.isArray(data) ? data : [];

        return {
          content: [{ type: "text" as const, text: JSON.stringify(items, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: formatError(error) }],
          isError: true,
        };
      }
    },
  );

  // get_sales
  server.registerTool(
    "get_sales",
    {
      description: "Получить данные о продажах (выкупах). Включает сумму к оплате продавцу. Лимит: 1 запрос в минуту.",
      inputSchema: {
        dateFrom: z.string().describe("Дата начала в формате ISO, например 2024-01-01"),
        flag: z.number().optional().describe("0 — все продажи с указанной даты, 1 — только обновлённые"),
      },
    },
    async (args) => {
      try {
        await client.rateLimiter.waitIfNeeded("statistics", STATISTICS_RATE_LIMIT);

        const params: Record<string, any> = { dateFrom: args.dateFrom };
        if (args.flag !== undefined) params.flag = args.flag;

        const data = await client.get<any[]>(BASE_URLS.statistics, "/api/v1/supplier/sales", params);
        const items = Array.isArray(data) ? data : [];

        return {
          content: [{ type: "text" as const, text: JSON.stringify(items, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: formatError(error) }],
          isError: true,
        };
      }
    },
  );

  // get_financial_report
  server.registerTool(
    "get_financial_report",
    {
      description: `Детализация отчёта реализации WB: комиссии, логистика, хранение, штрафы, сумма к оплате.
Используй для расчёта реального P&L. Лимит: 1 запрос в минуту.
Ключевые поля: ppvz_for_pay (сумма к выплате), delivery_rub (логистика), storage_fee (хранение), penalty (штрафы), commission_percent (комиссия WB), retail_amount (розничная выручка).
При >100000 строк — использовать пагинацию через параметр rrdid.`,
      inputSchema: {
        dateFrom: z.string().describe("Начало периода, ISO datetime, например 2026-03-01"),
        dateTo: z.string().describe("Конец периода, ISO datetime"),
        limit: z.number().max(100000).default(100000).describe("Максимум строк (до 100000)"),
        rrdid: z.number().default(0).describe("ID последней строки для пагинации (0 = первый запрос)"),
      },
    },
    async (args) => {
      try {
        await client.rateLimiter.waitIfNeeded("statistics", STATISTICS_RATE_LIMIT);

        const data = await client.get<any>(BASE_URLS.statistics, "/api/v5/supplier/reportDetailByPeriod", {
          dateFrom: args.dateFrom,
          dateTo: args.dateTo,
          limit: args.limit,
          rrdid: args.rrdid,
        });

        // 204 No Content — данных больше нет
        if (data === null || data === undefined) {
          return {
            content: [{ type: "text" as const, text: JSON.stringify([], null, 2) }],
          };
        }

        const items = Array.isArray(data) ? data : [];
        let text = JSON.stringify(items, null, 2);

        if (items.length >= 100000) {
          const lastRrdId = items[items.length - 1]?.rrd_id;
          text += `\n\n⚠️ Получено 100000 строк — есть ещё данные. Сделайте следующий запрос с rrdid=${lastRrdId ?? "rrd_id последней строки"}.`;
        }

        return {
          content: [{ type: "text" as const, text }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: formatError(error) }],
          isError: true,
        };
      }
    },
  );
}
