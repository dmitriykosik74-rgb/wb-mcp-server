import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WBClient } from "../wb-client.js";
import { BASE_URLS } from "../config.js";
import { formatError } from "../utils/errors.js";

export function registerPricesTools(server: McpServer, client: WBClient): void {
  // get_prices
  server.registerTool(
    "get_prices",
    {
      description: "Получить список товаров с ценами и скидками. Возвращает nmID, vendorCode, по каждому размеру — price (цена до скидки), discountedPrice (цена после скидки), discount (%).",
      inputSchema: {
        limit: z.number().min(1).max(1000).default(1000).describe("Количество товаров (1-1000)"),
        offset: z.number().min(0).default(0).describe("Смещение для пагинации"),
        filterNmID: z.number().optional().describe("Фильтр по артикулу WB"),
      },
    },
    async (args) => {
      try {
        const params: Record<string, any> = {
          limit: args.limit,
          offset: args.offset,
        };
        if (args.filterNmID !== undefined) params.filterNmID = args.filterNmID;

        const data = await client.get<any>(
          BASE_URLS.prices,
          "/api/v2/list/goods/filter",
          params,
        );

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

  // update_prices
  server.registerTool(
    "update_prices",
    {
      description: `⚠️ ВНИМАНИЕ: ИЗМЕНИТЬ цены и/или скидки на товары. Изменения немедленно вступают в силу на витрине WB.
Цены указываются в РУБЛЯХ (не копейках), скидка — целое число 0-99.
Перед вызовом обязательно подтвердить у пользователя список артикулов и новых цен.`,
      inputSchema: {
        data: z.array(z.object({
          nmID: z.number().describe("Артикул WB"),
          price: z.number().int().positive().describe("Новая цена в рублях (целое, без копеек)"),
          discount: z.number().int().min(0).max(99).describe("Скидка в процентах (0-99)"),
        })).min(1).max(1000).describe("Массив товаров для обновления (до 1000 за раз)"),
      },
    },
    async (args) => {
      try {
        const result = await client.post<any>(
          BASE_URLS.prices,
          "/api/v2/upload/task",
          { data: args.data },
        );

        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
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
