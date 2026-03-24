export class WBApiError extends Error {
  public readonly httpStatus: number;
  public readonly code: string;
  public readonly detail: string;

  constructor(httpStatus: number, code: string, message: string, detail: string = "") {
    super(message);
    this.name = "WBApiError";
    this.httpStatus = httpStatus;
    this.code = code;
    this.detail = detail;
  }
}

export function formatError(error: unknown): string {
  if (error instanceof WBApiError) {
    const parts = [`Ошибка WB API (HTTP ${error.httpStatus})`];
    if (error.code) parts.push(`Код: ${error.code}`);
    parts.push(error.message);
    if (error.detail) parts.push(`Детали: ${error.detail}`);
    return parts.join(". ");
  }

  if (error instanceof Error) {
    return `Ошибка: ${error.message}`;
  }

  return `Неизвестная ошибка: ${String(error)}`;
}
