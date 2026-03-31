import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WBClient } from "../wb-client.js";
import { BASE_URLS } from "../config.js";
import { formatError } from "../utils/errors.js";

const FINANCE_RATE_LIMIT = 1; // 1 req/min

export function registerFinanceTools(server: McpServer, client: WBClient): void {
  // get_seller_balance
  server.registerTool(
    "get_seller_balance",
    {
      description: "Текущий баланс продавца: доступные средства и сумма к ближайшей выплате. Лимит: 1 запрос в минуту.",
    },
    async () => {
      try {
        await client.rateLimiter.waitIfNeeded("finance", FINANCE_RATE_LIMIT);

        const data = await client.get<any>(BASE_URLS.finance, "/api/v1/account/balance");

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
