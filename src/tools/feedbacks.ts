import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WBClient } from "../wb-client.js";
import { BASE_URLS } from "../config.js";
import { formatError } from "../utils/errors.js";

export function registerFeedbackTools(server: McpServer, client: WBClient): void {
  // get_feedbacks
  server.tool(
    "get_feedbacks",
    "Получить список отзывов покупателей. Можно фильтровать по отвеченным/неотвеченным. Возвращает текст отзыва, оценку, дату, информацию о товаре и ответ продавца (если есть).",
    {
      isAnswered: z.boolean().describe("true — отвеченные отзывы, false — неотвеченные"),
      take: z.number().min(1).max(10000).default(50).describe("Количество отзывов (макс 10000)"),
      skip: z.number().default(0).describe("Смещение для пагинации"),
      order: z.enum(["dateAsc", "dateDesc"]).default("dateDesc").describe("Сортировка по дате"),
      nmId: z.number().optional().describe("Фильтр по артикулу WB (необязательно)"),
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
  server.tool(
    "reply_feedback",
    "⚠️ ОТВЕТИТЬ на отзыв покупателя. ВНИМАНИЕ: это действие отправляет реальный ответ, который увидит покупатель! Убедитесь, что текст корректен перед отправкой. Ответ можно отредактировать только 1 раз в течение 60 дней.",
    {
      id: z.string().describe("ID отзыва (получите через get_feedbacks)"),
      text: z.string().min(2).max(5000).describe("Текст ответа на отзыв (2-5000 символов)"),
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

  // get_unanswered_count
  server.tool(
    "get_unanswered_count",
    "Получить количество неотвеченных отзывов. Полезно для быстрой проверки: есть ли новые отзывы, требующие ответа.",
    async () => {
      try {
        const data = await client.get<{ data: number }>(
          BASE_URLS.feedbacks,
          "/api/v1/feedbacks/count-unanswered",
        );

        return {
          content: [{ type: "text" as const, text: `Неотвеченных отзывов: ${data.data}` }],
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
