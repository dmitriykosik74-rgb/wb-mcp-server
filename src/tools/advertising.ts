import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WBClient } from "../wb-client.js";
import { BASE_URLS } from "../config.js";
import { formatError } from "../utils/errors.js";

export function registerAdvertisingTools(server: McpServer, client: WBClient): void {
  // get_advert_list
  server.registerTool(
    "get_advert_list",
    {
      description: "Получить список рекламных кампаний с количеством по статусам (активные, на паузе, завершённые и т.д.)",
    },
    async () => {
      try {
        const data = await client.get<any>(BASE_URLS.advertising, "/adv/v1/promotion/count");

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

  // get_advert_balance
  server.registerTool(
    "get_advert_balance",
    {
      description: "Баланс рекламного кабинета: основной счёт, бонусы и чистый баланс (рубли).",
    },
    async () => {
      try {
        const data = await client.get<any>(BASE_URLS.advertising, "/adv/v1/balance");
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

  // update_advert_bid
  server.registerTool(
    "update_advert_bid",
    {
      description: `⚠️ ВНИМАНИЕ: ИЗМЕНИТЬ ставки в рекламной кампании. Немедленно влияет на показы и расход бюджета.
Работает только для кампаний в статусах 4, 9, 11 (активные, на паузе, готовые к запуску).
Перед вызовом обязательно подтвердить у пользователя список артикулов и новых ставок.`,
      inputSchema: {
        advertId: z.number().describe("ID рекламной кампании"),
        type: z.number().describe("Тип кампании (например, 8 — авто, 9 — аукцион)"),
        bids: z.array(z.object({
          nm: z.number().describe("Артикул WB"),
          price: z.number().describe("Новая ставка в рублях"),
        })).min(1).describe("Массив ставок по артикулам"),
      },
    },
    async (args) => {
      try {
        const data = await client.patch<any>(BASE_URLS.advertising, "/api/advert/v1/bids", {
          advertId: args.advertId,
          type: args.type,
          bids: args.bids,
        });
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

  // get_advert_stats
  server.registerTool(
    "get_advert_stats",
    {
      description: "Получить статистику рекламных кампаний по поисковым кластерам: показы, клики, CTR, CPC, CPM, заказы. Указывайте пары кампания+артикул и период.",
      inputSchema: {
        from: z.string().describe("Начало периода, YYYY-MM-DD"),
        to: z.string().describe("Конец периода, YYYY-MM-DD"),
        items: z.array(z.object({
          advert_id: z.number().describe("ID рекламной кампании"),
          nm_id: z.number().describe("Артикул WB"),
        })).describe("Массив пар кампания+артикул"),
      },
    },
    async (args) => {
      try {
        const data = await client.post<any>(BASE_URLS.advertising, "/adv/v0/normquery/stats", {
          from: args.from,
          to: args.to,
          items: args.items,
        });

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
