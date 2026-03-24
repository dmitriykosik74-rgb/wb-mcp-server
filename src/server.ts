import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { WBClient } from "./wb-client.js";

export class WBMCPServer {
  public mcpServer: McpServer;
  public wbClient: WBClient;
  private version: string;

  constructor(token: string, version: string) {
    this.version = version;
    this.wbClient = new WBClient(token);
    this.mcpServer = new McpServer({
      name: "wb-mcp-server",
      version,
    });

    this.registerTools();
  }

  private registerTools(): void {
    // Tools will be registered here in subsequent tasks
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.mcpServer.connect(transport);
    process.stderr.write(`wb-mcp-server v${this.version} started\n`);
  }
}
