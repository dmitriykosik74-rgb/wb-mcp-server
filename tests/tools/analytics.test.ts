import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WBClient } from "../../src/wb-client.js";
import { registerAnalyticsTools } from "../../src/tools/analytics.js";

function createMockClient() {
  return {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    rateLimiter: { waitIfNeeded: vi.fn() },
  } as unknown as WBClient;
}

async function callTool(server: McpServer, name: string, args: Record<string, any> = {}) {
  const tools = (server as any)._registeredTools as Record<string, any>;
  const tool = tools[name];
  if (!tool) throw new Error(`Tool ${name} not found`);
  return tool.handler(args, {});
}

describe("analytics tools", () => {
  let server: McpServer;
  let client: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    server = new McpServer({ name: "test", version: "0.0.1" });
    client = createMockClient();
    registerAnalyticsTools(server, client as unknown as WBClient);
  });

  describe("get_nm_report", () => {
    it("returns report data", async () => {
      const report = {
        data: {
          products: [{ nmId: 111, openCardCount: 500, addToCartCount: 50 }],
        },
      };
      (client.post as any).mockResolvedValue(report);

      const result = await callTool(server, "get_nm_report", {
        beginDate: "2024-01-01",
        endDate: "2024-01-31",
        page: 1,
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.data.products[0].nmId).toBe(111);
      expect(client.post).toHaveBeenCalledWith(
        expect.any(String),
        "/api/analytics/v3/sales-funnel/products",
        { currentPeriod: { start: "2024-01-01", end: "2024-01-31" }, pageNumber: 1, pageSize: 100 },
      );
    });
  });
});
