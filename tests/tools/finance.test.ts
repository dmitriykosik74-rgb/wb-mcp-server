import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WBClient } from "../../src/wb-client.js";
import { registerFinanceTools } from "../../src/tools/finance.js";
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

describe("finance tools", () => {
  let server: McpServer;
  let client: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    server = new McpServer({ name: "test", version: "0.0.1" });
    client = createMockClient();
    registerFinanceTools(server, client as unknown as WBClient);
  });

  describe("get_seller_balance", () => {
    it("returns balance data", async () => {
      const balance = { currency: "RUB", current: 150000, for_withdraw: 120000 };
      (client.get as any).mockResolvedValue(balance);

      const result = await callTool(server, "get_seller_balance");

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.currency).toBe("RUB");
      expect(parsed.current).toBe(150000);
      expect(parsed.for_withdraw).toBe(120000);
      expect(client.rateLimiter.waitIfNeeded).toHaveBeenCalledWith("finance", 1);
    });

    it("returns error on 401", async () => {
      (client.get as any).mockRejectedValue(new WBApiError(401, "unauthorized", "Неавторизован"));

      const result = await callTool(server, "get_seller_balance");

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("401");
    });
  });
});
