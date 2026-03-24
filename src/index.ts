#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { getToken } from "./config.js";
import { WBMCPServer } from "./server.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getVersion(): string {
  try {
    const pkg = JSON.parse(
      readFileSync(resolve(__dirname, "..", "package.json"), "utf-8"),
    );
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

async function main(): Promise<void> {
  const token = getToken();

  if (!token) {
    process.stderr.write(
      `Ошибка: не указан WB API токен.\n` +
      `Установите переменную окружения WB_API_TOKEN или передайте аргумент --token=<ваш_токен>.\n\n` +
      `Error: WB API token is not set.\n` +
      `Set the WB_API_TOKEN environment variable or pass --token=<your_token>.\n`,
    );
    process.exit(1);
  }

  const version = getVersion();
  const server = new WBMCPServer(token, version);
  await server.start();
}

main().catch((error) => {
  process.stderr.write(`Критическая ошибка: ${error}\n`);
  process.exit(1);
});
