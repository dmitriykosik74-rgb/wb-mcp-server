import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WBClient } from "../wb-client.js";
import { BASE_URLS } from "../config.js";
import { formatError } from "../utils/errors.js";

export function registerFeedbackTools(server: McpServer, client: WBClient): void {
  // get_feedbacks
  server.registerTool(
    "get_feedbacks",
    {
      description: "Получить список отзывов покупателей. Можно фильтровать по отвеченным/неотвеченным. Возвращает текст отзыва, оценку, дату, информацию о товаре и ответ продавца (если есть).",
      inputSchema: {
        isAnswered: z.boolean().describe("true — отвеченные отзывы, false — неотвеченные"),
        take: z.number().min(1).max(10000).default(50).describe("Количество отзывов (макс 10000)"),
        skip: z.number().default(0).describe("Смещение для пагинации"),
        order: z.enum(["dateAsc", "dateDesc"]).default("dateDesc").describe("Сортировка по дате"),
        nmId: z.number().optional().describe("Фильтр по артикулу WB (необязательно)"),
      },
    },
    async (args) => {
      try {
        const params: Record<string, any> = {
          isAnswered: args.isAnswered,
          take: args.take,
          skip: args.skip,
          order: args.order,
        };
        if (args.nmId !== undefined) {
          params.nmId = args.nmId;
        }

        const data = await client.get<any>(BASE_URLS.feedbacks, "/api/v1/feedbacks", params);

        const feedbacks = (data.data?.feedbacks ?? []).map((f: any) => ({
          id: f.id,
          text: f.text,
          productValuation: f.productValuation,
          answer: f.answer?.text ?? null,
          createdDate: f.createdDate,
          productDetails: {
            nmId: f.productDetails?.nmId,
            productName: f.productDetails?.productName,
            supplierArticle: f.productDetails?.supplierArticle,
          },
          userName: f.userName,
        }));

        return {
          content: [{ type: "text" as const, text: JSON.stringify(feedbacks, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: formatError(error) }],
          isError: true,
        };
      }
    },
  );

  // reply_feedback
  server.registerTool(
    "reply_feedback",
    {
      description: "⚠️ ОТВЕТИТЬ на отзыв покупателя. ВНИМАНИЕ: это действие отправляет реальный ответ, который увидит покупатель! Убедитесь, что текст корректен перед отправкой. Ответ можно отредактировать только 1 раз в течение 60 дней.",
      inputSchema: {
        id: z.string().describe("ID отзыва (получите через get_feedbacks)"),
        text: z.string().min(2).max(5000).describe("Текст ответа на отзыв (2-5000 символов)"),
      },
      annotations: { destructiveHint: true },
    },
    async (args) => {
      try {
        await client.post<any>(BASE_URLS.feedbacks, "/api/v1/feedbacks/answer", {
          id: args.id,
          text: args.text,
        });

        return {
          content: [{ type: "text" as const, text: "Ответ на отзыв успешно отправлен." }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: formatError(error) }],
          isError: true,
        };
      }
    },
  );

  // get_questions
  server.registerTool(
    "get_questions",
    {
      description: "Получить список вопросов покупателей. Можно фильтровать по отвеченным/неотвеченным. Возвращает текст вопроса, дату, информацию о товаре и ответ продавца (если есть).",
      inputSchema: {
        isAnswered: z.boolean().describe("true — отвеченные вопросы, false — неотвеченные"),
        take: z.number().min(1).max(10000).default(50).describe("Количество вопросов (макс 10000)"),
        skip: z.number().default(0).describe("Смещение для пагинации"),
        order: z.enum(["dateAsc", "dateDesc"]).default("dateDesc").describe("Сортировка по дате"),
        nmId: z.number().optional().describe("Фильтр по артикулу WB (необязательно)"),
      },
    },
    async (args) => {
      try {
        const params: Record<string, any> = {
          isAnswered: args.isAnswered,
          take: args.take,
          skip: args.skip,
          order: args.order,
        };
        if (args.nmId !== undefined) {
          params.nmId = args.nmId;
        }

        const data = await client.get<any>(BASE_URLS.feedbacks, "/api/v1/questions", params);

        const questions = (data.data?.questions ?? []).map((q: any) => ({
          id: q.id,
          text: q.text,
          answer: q.answer?.text ?? null,
          createdDate: q.createdDate,
          productDetails: {
            nmId: q.productDetails?.nmId,
            productName: q.productDetails?.productName,
            supplierArticle: q.productDetails?.supplierArticle,
          },
          userName: q.userName,
        }));

        return {
          content: [{ type: "text" as const, text: JSON.stringify(questions, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: formatError(error) }],
          isError: true,
        };
      }
    },
  );

  // reply_question
  server.registerTool(
    "reply_question",
    {
      description: "⚠️ ОТВЕТИТЬ на вопрос покупателя. ВНИМАНИЕ: это действие отправляет реальный ответ, который увидит покупатель! Убедитесь, что текст корректен перед отправкой.",
      inputSchema: {
        id: z.string().describe("ID вопроса (получите через get_questions)"),
        text: z.string().min(1).describe("Текст ответа на вопрос"),
      },
      annotations: { destructiveHint: true },
    },
    async (args) => {
      try {
        await client.patch<any>(BASE_URLS.feedbacks, "/api/v1/questions", {
          id: args.id,
          text: args.text,
          state: "wbGoodsDetails",
        });

        return {
          content: [{ type: "text" as const, text: "Ответ на вопрос успешно отправлен." }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: formatError(error) }],
          isError: true,
        };
      }
    },
  );

  // get_unanswered_count
  server.registerTool(
    "get_unanswered_count",
    {
      description: "Получить количество неотвеченных отзывов. Полезно для быстрой проверки: есть ли новые отзывы, требующие ответа.",
    },
    async () => {
      try {
        const data = await client.get<{ data: { countUnanswered: number; countUnansweredToday: number } }>(
          BASE_URLS.feedbacks,
          "/api/v1/feedbacks/count-unanswered",
        );

        return {
          content: [{ type: "text" as const, text: `Неотвеченных отзывов: ${data.data?.countUnanswered ?? 0} (из них сегодня: ${data.data?.countUnansweredToday ?? 0})` }],
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
