import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WBClient } from "../wb-client.js";
import { BASE_URLS } from "../config.js";
import { formatError } from "../utils/errors.js";

const STATISTICS_RATE_LIMIT = 1; // 1 req/min

export function registerAnalyticsTools(server: McpServer, client: WBClient): void {
  // get_stocks
  server.tool(
    "get_stocks",
    "Получить текущие остатки товаров на складах WB. Данные обновляются каждые 30 минут. Лимит: 1 запрос в минуту.",
    {
      dateFrom: z.string().describe("Дата начала в формате ISO, например 2024-01-01"),
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
  server.tool(
    "get_orders",
    "Получить список заказов. Данные хранятся до 90 дней. Лимит: 1 запрос в минуту.",
    {
      dateFrom: z.string().describe("Дата начала в формате ISO, например 2024-01-01"),
      flag: z.number().optional().describe("0 — все заказы с указанной даты, 1 — только обновлённые"),
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
  server.tool(
    "get_sales",
    "Получить данные о продажах (выкупах). Включает сумму к оплате продавцу. Лимит: 1 запрос в минуту.",
    {
      dateFrom: z.string().describe("Дата начала в формате ISO, например 2024-01-01"),
      flag: z.number().optional().describe("0 — все продажи с указанной даты, 1 — только обновлённые"),
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

  // get_nm_report
  server.tool(
    "get_nm_report",
    "Детальный отчёт по товарам: просмотры карточки, добавления в корзину, заказы, выкупы, конверсии. Данные за указанный период. Лимит: 3 запроса в минуту.",
    {
      beginDate: z.string().describe("Начало текущего периода, ISO, например 2024-01-01"),
      endDate: z.string().describe("Конец текущего периода, ISO, например 2024-01-31"),
      page: z.number().default(1).describe("Номер страницы"),
      nmIds: z.array(z.number()).optional().describe("Фильтр по артикулам WB (необязательно)"),
    },
    async (args) => {
      try {
        const body: Record<string, any> = {
          currentPeriod: {
            start: args.beginDate,
            end: args.endDate,
          },
          pageNumber: args.page,
          pageSize: 100,
        };
        if (args.nmIds && args.nmIds.length > 0) {
          body.nmIds = args.nmIds;
        }

        const data = await client.post<any>(BASE_URLS.analytics, "/api/analytics/v3/sales-funnel/products", body);

        return {
          content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
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
