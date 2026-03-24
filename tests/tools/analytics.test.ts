import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WBClient } from "../../src/wb-client.js";
import { registerAnalyticsTools } from "../../src/tools/analytics.js";
import { WBApiError } from "../../src/utils/errors.js";

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

  describe("get_stocks", () => {
    it("returns stock data", async () => {
      const stocks = [
        { nmId: 111, warehouseName: "Коледино", quantity: 10, quantityFull: 15 },
        { nmId: 222, warehouseName: "Казань", quantity: 5, quantityFull: 5 },
      ];
      (client.get as any).mockResolvedValue(stocks);

      const result = await callTool(server, "get_stocks", { dateFrom: "2024-01-01" });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].nmId).toBe(111);
      expect(client.rateLimiter.waitIfNeeded).toHaveBeenCalledWith("statistics", 1);
    });

    it("warns when 60000 items returned", async () => {
      const stocks = Array.from({ length: 60000 }, (_, i) => ({ nmId: i }));
      (client.get as any).mockResolvedValue(stocks);

      const result = await callTool(server, "get_stocks", { dateFrom: "2024-01-01" });

      expect(result.content[0].text).toContain("60000");
      expect(result.content[0].text).toContain("ещё данные");
    });

    it("returns error on API failure", async () => {
      (client.get as any).mockRejectedValue(new WBApiError(401, "unauthorized", "Неавторизован"));

      const result = await callTool(server, "get_stocks", { dateFrom: "2024-01-01" });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("401");
    });
  });

  describe("get_orders", () => {
    it("returns orders", async () => {
      const orders = [{ srid: "order-1", nmId: 111, finishedPrice: 1500 }];
      (client.get as any).mockResolvedValue(orders);

      const result = await callTool(server, "get_orders", { dateFrom: "2024-01-01" });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].srid).toBe("order-1");
    });
  });

  describe("get_sales", () => {
    it("returns sales", async () => {
      const sales = [{ saleID: "S-1", nmId: 111, forPay: 1200 }];
      (client.get as any).mockResolvedValue(sales);

      const result = await callTool(server, "get_sales", { dateFrom: "2024-01-01" });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].saleID).toBe("S-1");
    });
  });

  describe("get_nm_report", () => {
    it("returns report data", async () => {
      const report = {
        data: {
          cards: [{ nmID: 111, statistics: { openCardCount: 500, addToCartCount: 50 } }],
        },
      };
      (client.post as any).mockResolvedValue(report);

      const result = await callTool(server, "get_nm_report", {
        beginDate: "2024-01-01",
        endDate: "2024-01-31",
        page: 1,
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.data.cards[0].nmID).toBe(111);
      expect(client.post).toHaveBeenCalledWith(
        expect.any(String),
        "/api/v2/nm-report/detail",
        { period: { begin: "2024-01-01", end: "2024-01-31" }, page: 1 },
      );
    });
  });
});
