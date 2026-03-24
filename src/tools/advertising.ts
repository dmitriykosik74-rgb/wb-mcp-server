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
        const data = await client.post<any>(BASE_URLS.advertising, "/adv/v1/promotion/count");

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
    "Получить подробную статистику рекламных кампаний: показы, клики, CTR, CPC, расход, заказы. Максимум 100 кампаний за запрос.",
    {
      campaignIds: z.array(z.number()).max(100).describe("Массив ID рекламных кампаний (макс 100)"),
    },
    async (args) => {
      try {
        const data = await client.post<any>(BASE_URLS.advertising, "/adv/v2/fullstats", args.campaignIds);

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
