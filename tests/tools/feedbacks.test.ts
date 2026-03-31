import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WBClient } from "../../src/wb-client.js";
import { registerFeedbackTools } from "../../src/tools/feedbacks.js";
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

describe("feedbacks tools", () => {
  let server: McpServer;
  let client: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    server = new McpServer({ name: "test", version: "0.0.1" });
    client = createMockClient();
    registerFeedbackTools(server, client as unknown as WBClient);
  });

  describe("get_feedbacks", () => {
    it("returns formatted feedbacks", async () => {
      (client.get as any).mockResolvedValue({
        data: {
          feedbacks: [
            {
              id: "fb-1",
              text: "Отличный товар!",
              productValuation: 5,
              answer: { text: "Спасибо!" },
              createdDate: "2024-01-15T10:00:00Z",
              productDetails: {
                nmId: 12345,
                productName: "Футболка",
                supplierArticle: "ART-001",
              },
              userName: "Иван",
            },
          ],
        },
      });

      const result = await callTool(server, "get_feedbacks", {
        isAnswered: true,
        take: 50,
        skip: 0,
        order: "dateDesc",
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe("fb-1");
      expect(parsed[0].answer).toBe("Спасибо!");
      expect(parsed[0].productDetails.nmId).toBe(12345);
    });

    it("returns empty array when no feedbacks", async () => {
      (client.get as any).mockResolvedValue({ data: { feedbacks: [] } });

      const result = await callTool(server, "get_feedbacks", {
        isAnswered: false,
        take: 50,
        skip: 0,
        order: "dateDesc",
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveLength(0);
    });

    it("returns error on API failure", async () => {
      (client.get as any).mockRejectedValue(new WBApiError(401, "unauthorized", "Неавторизован"));

      const result = await callTool(server, "get_feedbacks", {
        isAnswered: false,
        take: 50,
        skip: 0,
        order: "dateDesc",
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("401");
    });
  });

  describe("reply_feedback", () => {
    it("sends reply successfully", async () => {
      (client.post as any).mockResolvedValue({});

      const result = await callTool(server, "reply_feedback", {
        id: "fb-1",
        text: "Спасибо за отзыв!",
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain("успешно");
      expect(client.post).toHaveBeenCalledWith(
        expect.any(String),
        "/api/v1/feedbacks/answer",
        { id: "fb-1", text: "Спасибо за отзыв!" },
      );
    });

    it("returns error on API failure", async () => {
      (client.post as any).mockRejectedValue(new WBApiError(500, "internal", "Внутренняя ошибка"));

      const result = await callTool(server, "reply_feedback", {
        id: "fb-1",
        text: "Спасибо!",
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("500");
    });
  });

  describe("get_questions", () => {
    it("returns formatted questions", async () => {
      (client.get as any).mockResolvedValue({
        data: {
          questions: [
            {
              id: "q-1",
              text: "Какой размер выбрать?",
              answer: { text: "Рекомендуем M" },
              createdDate: "2024-01-15T10:00:00Z",
              productDetails: {
                nmId: 12345,
                productName: "Футболка",
                supplierArticle: "ART-001",
              },
              userName: "Мария",
            },
          ],
        },
      });

      const result = await callTool(server, "get_questions", {
        isAnswered: true,
        take: 50,
        skip: 0,
        order: "dateDesc",
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe("q-1");
      expect(parsed[0].answer).toBe("Рекомендуем M");
      expect(parsed[0].productDetails.nmId).toBe(12345);
    });

    it("returns empty array when no questions", async () => {
      (client.get as any).mockResolvedValue({ data: { questions: [] } });

      const result = await callTool(server, "get_questions", {
        isAnswered: false,
        take: 50,
        skip: 0,
        order: "dateDesc",
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveLength(0);
    });
  });

  describe("reply_question", () => {
    it("sends reply successfully", async () => {
      (client.patch as any).mockResolvedValue({});

      const result = await callTool(server, "reply_question", {
        id: "q-1",
        text: "Рекомендуем размер M",
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain("успешно");
      expect(client.patch).toHaveBeenCalledWith(
        expect.any(String),
        "/api/v1/questions",
        { id: "q-1", text: "Рекомендуем размер M", state: "wbGoodsDetails" },
      );
    });

    it("returns error on 401", async () => {
      (client.patch as any).mockRejectedValue(new WBApiError(401, "unauthorized", "Неавторизован"));

      const result = await callTool(server, "reply_question", {
        id: "q-1",
        text: "Ответ",
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("401");
    });
  });

  describe("get_unanswered_count", () => {
    it("returns count", async () => {
      (client.get as any).mockResolvedValue({ data: { countUnanswered: 42, countUnansweredToday: 5 } });

      const result = await callTool(server, "get_unanswered_count");

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain("42");
    });

    it("returns error on 429", async () => {
      (client.get as any).mockRejectedValue(new WBApiError(429, "rate_limit", "Слишком много запросов"));

      const result = await callTool(server, "get_unanswered_count");

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("429");
    });
  });
});
