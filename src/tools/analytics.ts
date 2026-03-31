import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WBClient } from "../wb-client.js";
import { BASE_URLS } from "../config.js";
import { formatError } from "../utils/errors.js";

export function registerAnalyticsTools(server: McpServer, client: WBClient): void {
  // get_nm_report
  server.registerTool(
    "get_nm_report",
    {
      description: "Детальный отчёт по товарам: просмотры карточки, добавления в корзину, заказы, выкупы, конверсии. Данные за указанный период. Лимит: 3 запроса в минуту.",
      inputSchema: {
        beginDate: z.string().describe("Начало периода, ISO, например 2024-01-01"),
        endDate: z.string().describe("Конец периода, ISO, например 2024-01-31"),
        page: z.number().default(1).describe("Номер страницы"),
        nmIds: z.array(z.number()).optional().describe("Фильтр по артикулам WB (необязательно)"),
      },
    },
    async (args) => {
      try {
        const body: Record<string, any> = {
          selectedPeriod: {
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
