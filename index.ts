#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import OpenAI from "openai";
import { z } from "zod";
import fs from "fs";
import path from "path";
import os from "os";

// Function to load API key from environment variable or ~/.openai.env file
function loadApiKey(): string | undefined {
  // First, try environment variable
  if (process.env.OPENAI_API_KEY) {
    return process.env.OPENAI_API_KEY;
  }
  
  // Then, try ~/.openai.env file
  try {
    const envPath = path.join(os.homedir(), '.openai.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const lines = envContent.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('OPENAI_API_KEY=')) {
          return trimmed.replace('OPENAI_API_KEY=', '').replace(/^["']|["']$/g, '');
        }
      }
    }
  } catch (error) {
    console.warn('Warning: Could not read ~/.openai.env file:', error);
  }
  
  return undefined;
}

// Create server instance
const server = new McpServer({
  name: "@kazuph/mcp-o3-dr",
  version: "0.0.9",
});

// Configuration from environment variables
const config = {
  apiKey: loadApiKey(),
  maxRetries: parseInt(process.env.OPENAI_MAX_RETRIES || "3"),
  timeout: parseInt(process.env.OPENAI_API_TIMEOUT || "60000"),
  searchContextSize: (process.env.SEARCH_CONTEXT_SIZE || "medium") as
    | "low"
    | "medium"
    | "high",
  reasoningEffort: (process.env.REASONING_EFFORT || "medium") as
    | "low"
    | "medium"
    | "high",
};

// Initialize OpenAI client with retry and timeout configuration
const openai = new OpenAI({
  apiKey: config.apiKey,
  maxRetries: config.maxRetries,
  timeout: config.timeout,
});

// Define the o3-search tool
server.tool(
  "o3-search",
  `An AI agent with advanced web search capabilities. Useful for finding the latest information, troubleshooting errors, and discussing ideas or design challenges. Supports natural language queries.`,
  {
    input: z
      .string()
      .describe(
        "Ask questions, search for information, or consult about complex problems in English.",
      ),
  },
  async ({ input }) => {
    try {
      const response = await openai.responses.create({
        model: "o3",
        input,
        tools: [
          {
            type: "web_search_preview",
            search_context_size: config.searchContextSize,
          },
        ],
        tool_choice: "auto",
        parallel_tool_calls: true,
        reasoning: { effort: config.reasoningEffort },
      });

      return {
        content: [
          {
            type: "text",
            text: response.output_text || "No response text available.",
          },
        ],
      };
    } catch (error) {
      console.error("Error calling OpenAI API:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : "Unknown error occurred"}`,
          },
        ],
      };
    }
  },
);

async function runCLI(query: string) {
  console.log(`🔍 Searching for: ${query}`);
  
  try {
    const response = await openai.responses.create({
      model: "o3",
      input: query,
      tools: [
        {
          type: "web_search_preview",
          search_context_size: config.searchContextSize,
        },
      ],
      tool_choice: "auto",
      parallel_tool_calls: true,
      reasoning: { effort: config.reasoningEffort },
    });

    console.log("\n📄 Results:");
    console.log(response.output_text || "No response text available.");
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : "Unknown error occurred");
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
dr - Deep Research Tool

Usage:
  dr [query]                 Search with a query
  dr -p "query"               Search with a query (alternative syntax)
  dr mcp                     Start MCP server
  dr -h, --help              Show this help message

Examples:
  dr "What is Node.js?"
  dr -p "Latest AI trends"
  dr mcp

API Key Configuration:
  Set OPENAI_API_KEY environment variable or create ~/.openai.env file with:
  OPENAI_API_KEY=your-api-key-here
`);
}

function parseArguments(args: string[]) {
  if (args.length === 0) {
    showHelp();
    return { action: 'help' };
  }

  const firstArg = args[0];
  
  // Help options
  if (firstArg === '-h' || firstArg === '--help') {
    showHelp();
    return { action: 'help' };
  }
  
  // MCP server
  if (firstArg === 'mcp') {
    return { action: 'mcp' };
  }
  
  // Search with -p option
  if (firstArg === '-p' && args.length > 1) {
    return { action: 'search', query: args.slice(1).join(' ') };
  }
  
  // Default: search with all arguments as query
  return { action: 'search', query: args.join(' ') };
}

async function main() {
  const args = process.argv.slice(2);
  const parsed = parseArguments(args);
  
  switch (parsed.action) {
    case 'help':
      // Help already shown
      break;
      
    case 'mcp':
      // Run MCP server
      const transport = new StdioServerTransport();
      await server.connect(transport);
      console.log("MCP Server running on stdio");
      break;
      
    case 'search':
      await runCLI(parsed.query!);
      break;
      
    default:
      console.error('Unknown action');
      process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
