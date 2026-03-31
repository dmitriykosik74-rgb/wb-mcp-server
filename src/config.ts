export const BASE_URLS = {
  content: "https://content-api.wildberries.ru",
  marketplace: "https://marketplace-api.wildberries.ru",
  statistics: "https://statistics-api.wildberries.ru",
  advertising: "https://advert-api.wildberries.ru",
  feedbacks: "https://feedbacks-api.wildberries.ru",
  analytics: "https://seller-analytics-api.wildberries.ru",
  prices: "https://discounts-prices-api.wildberries.ru",
  finance: "https://finance-api.wildberries.ru",
  documents: "https://documents-api.wildberries.ru",
  feedbacksSandbox: "https://feedbacks-api-sandbox.wildberries.ru",
} as const;

export type BaseUrlKey = keyof typeof BASE_URLS;

export interface Config {
  token: string;
}

export function getToken(): string | undefined {
  const tokenArg = process.argv.find((arg) => arg.startsWith("--token="));
  if (tokenArg) {
    return tokenArg.split("=")[1];
  }

  return process.env.WB_API_TOKEN;
}
