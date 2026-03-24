import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WBClient } from "../../src/wb-client.js";
import { registerAdvertisingTools } from "../../src/tools/advertising.js";
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

describe("advertising tools", () => {
  let server: McpServer;
  let client: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    server = new McpServer({ name: "test", version: "0.0.1" });
    client = createMockClient();
    registerAdvertisingTools(server, client as unknown as WBClient);
  });

  describe("get_advert_list", () => {
    it("returns campaign list", async () => {
      const data = {
        adverts: [
          { type: 8, status: 9, count: 3, advert_list: [{ advertId: 1 }, { advertId: 2 }, { advertId: 3 }] },
        ],
      };
      (client.post as any).mockResolvedValue(data);

      const result = await callTool(server, "get_advert_list");

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.adverts[0].count).toBe(3);
    });

    it("returns error on API failure", async () => {
      (client.post as any).mockRejectedValue(new WBApiError(500, "internal", "Ошибка сервера"));

      const result = await callTool(server, "get_advert_list");

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("500");
    });
  });

  describe("get_advert_stats", () => {
    it("returns campaign stats", async () => {
      const data = [
        {
          advertId: 123,
          days: [
            { date: "2024-01-15", views: 1000, clicks: 50, ctr: 5, cpc: 10, spend: 500, orders: 5 },
          ],
        },
      ];
      (client.post as any).mockResolvedValue(data);

      const result = await callTool(server, "get_advert_stats", { campaignIds: [123] });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed[0].advertId).toBe(123);
      expect(client.post).toHaveBeenCalledWith(
        expect.any(String),
        "/adv/v2/fullstats",
        [123],
      );
    });

    it("handles empty campaign list", async () => {
      (client.post as any).mockResolvedValue([]);

      const result = await callTool(server, "get_advert_stats", { campaignIds: [] });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveLength(0);
    });
  });
});
