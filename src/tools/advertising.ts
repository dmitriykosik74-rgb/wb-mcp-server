import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WBClient } from "../wb-client.js";
import { BASE_URLS } from "../config.js";
import { formatError } from "../utils/errors.js";

export function registerAdvertisingTools(server: McpServer, client: WBClient): void {
  // get_advert_list
  server.tool(
    "get_advert_list",
    "Получить список рекламных кампаний с количеством по статусам (активные, на паузе, завершённые и т.д.)",
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

  // get_advert_stats
  server.tool(
    "get_advert_stats",
    "Получить статистику рекламных кампаний по поисковым кластерам: показы, клики, CTR, CPC, CPM, заказы. Указывайте пары кампания+артикул и период.",
    {
      from: z.string().describe("Начало периода, YYYY-MM-DD"),
      to: z.string().describe("Конец периода, YYYY-MM-DD"),
      items: z.array(z.object({
        advert_id: z.number().describe("ID рекламной кампании"),
        nm_id: z.number().describe("Артикул WB"),
      })).describe("Массив пар кампания+артикул"),
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
