import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WBClient } from "../../src/wb-client.js";
import { registerStatisticsTools } from "../../src/tools/statistics.js";
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

describe("statistics tools", () => {
  let server: McpServer;
  let client: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    server = new McpServer({ name: "test", version: "0.0.1" });
    client = createMockClient();
    registerStatisticsTools(server, client as unknown as WBClient);
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

  describe("get_financial_report", () => {
    it("returns report data", async () => {
      const report = [
        { rrd_id: 1, ppvz_for_pay: 500, delivery_rub: 50, storage_fee: 10, penalty: 0, commission_percent: 15, retail_amount: 1000 },
      ];
      (client.get as any).mockResolvedValue(report);

      const result = await callTool(server, "get_financial_report", {
        dateFrom: "2026-03-01",
        dateTo: "2026-03-31",
        limit: 100000,
        rrdid: 0,
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].ppvz_for_pay).toBe(500);
      expect(client.rateLimiter.waitIfNeeded).toHaveBeenCalledWith("statistics", 1);
    });

    it("warns when 100000 items returned", async () => {
      const report = Array.from({ length: 100000 }, (_, i) => ({ rrd_id: i + 1 }));
      (client.get as any).mockResolvedValue(report);

      const result = await callTool(server, "get_financial_report", {
        dateFrom: "2026-03-01",
        dateTo: "2026-03-31",
        limit: 100000,
        rrdid: 0,
      });

      expect(result.content[0].text).toContain("100000");
      expect(result.content[0].text).toContain("ещё данные");
    });

    it("returns empty array on null response (204)", async () => {
      (client.get as any).mockResolvedValue(null);

      const result = await callTool(server, "get_financial_report", {
        dateFrom: "2026-03-01",
        dateTo: "2026-03-31",
        limit: 100000,
        rrdid: 0,
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveLength(0);
    });
  });
});
