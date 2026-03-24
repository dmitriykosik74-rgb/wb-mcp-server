export class RateLimiter {
  private timestamps: Map<string, number[]> = new Map();

  async waitIfNeeded(endpoint: string, limitPerMinute: number): Promise<void> {
    const now = Date.now();
    const windowMs = 60_000;

    let history = this.timestamps.get(endpoint) ?? [];
    history = history.filter((t) => now - t < windowMs);

    if (history.length >= limitPerMinute) {
      const oldest = history[0];
      const waitMs = windowMs - (now - oldest) + 100;
      process.stderr.write(
        `[rate-limiter] Лимит для ${endpoint}: ${limitPerMinute} req/min. Ожидание ${Math.ceil(waitMs / 1000)}с...\n`,
      );
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      history = history.filter((t) => Date.now() - t < windowMs);
    }

    history.push(Date.now());
    this.timestamps.set(endpoint, history);
  }
}
