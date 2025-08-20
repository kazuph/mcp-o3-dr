#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import OpenAI from "openai";
import { z } from "zod";
import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  version: "0.2.1",
});

// Configuration from environment variables
const config = {
  apiKey: loadApiKey(),
  maxRetries: parseInt(process.env.OPENAI_MAX_RETRIES || "3"),
  timeout: parseInt(process.env.OPENAI_API_TIMEOUT || "1800000"),
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

// Function to create cache directory and log file path
function setupLogFile(): { logPath: string; logStream: fs.WriteStream } {
  const cacheDir = path.join(os.homedir(), '.cache', 'dr');
  
  // Create cache directory if it doesn't exist
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  
  // Generate filename with date-time
  const now = new Date();
  const dateTime = now.toISOString()
    .replace(/T/, '-')
    .replace(/:/g, '-')
    .replace(/\..+/, '');
  const filename = `${dateTime}.md`;
  const logPath = path.join(cacheDir, filename);
  
  // Create write stream for real-time logging
  const logStream = fs.createWriteStream(logPath, { flags: 'w' });
  
  return { logPath, logStream };
}

// Function to show progress messages and handle timeout
async function progressWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  progressCallback: () => void
): Promise<T> {
  let progressInterval: NodeJS.Timeout;
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    const timeout = setTimeout(() => {
      clearInterval(progressInterval);
      reject(new Error(`Request timed out after ${timeoutMs / 1000} seconds`));
    }, timeoutMs);
    
    // Clear timeout if promise resolves first
    promise.finally(() => {
      clearTimeout(timeout);
      clearInterval(progressInterval);
    });
  });
  
  // Start progress indicator
  progressInterval = setInterval(progressCallback, 10000); // Every 10 seconds
  
  return Promise.race([promise, timeoutPromise]);
}

// Function to read from stdin
async function readStdin(): Promise<string | null> {
  // Check if stdin is a TTY (interactive terminal)
  if (process.stdin.isTTY) {
    return null;
  }

  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    
    process.stdin.on('readable', () => {
      let chunk;
      while (null !== (chunk = process.stdin.read())) {
        data += chunk;
      }
    });
    
    process.stdin.on('end', () => {
      resolve(data.trim());
    });
    
    process.stdin.on('error', reject);
  });
}

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
    const startTime = Date.now();
    let progressCount = 0;
    
    try {
      console.error("⏳ o3-search: Processing query (this may take several minutes)...");
      
      const apiCall = openai.responses.create({
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
      
      const response = await progressWithTimeout(
        apiCall,
        config.timeout,
        () => {
          progressCount++;
          const elapsed = Math.round((Date.now() - startTime) / 1000);
          console.error(`🔄 o3-search: Still processing... (${elapsed}s elapsed, check ${progressCount})`);
        }
      );

      const totalTime = Math.round((Date.now() - startTime) / 1000);
      console.error(`✅ o3-search: Completed in ${totalTime}s`);

      return {
        content: [
          {
            type: "text",
            text: response.output_text || "No response text available.",
          },
        ],
      };
    } catch (error) {
      const totalTime = Math.round((Date.now() - startTime) / 1000);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      
      console.error(`❌ o3-search: Error after ${totalTime}s:`, errorMessage);
      if (progressCount > 0) {
        console.error(`🔄 o3-search: Progress was tracked (${progressCount} checks completed)`);
      }
      
      return {
        content: [
          {
            type: "text",
            text: `Error after ${totalTime}s: ${errorMessage}${progressCount > 0 ? ` (Progress was tracked with ${progressCount} checks)` : ""}`,
          },
        ],
      };
    }
  },
);

async function runCLI(query: string) {
  // Setup log file
  const { logPath, logStream } = setupLogFile();
  
  // Display log path at the beginning
  console.log(`📝 調査ログ: ${logPath}`);
  console.log(`🔍 Searching for: ${query}`);
  
  // Write initial query to log file
  logStream.write(`# Deep Research Log\n\n`);
  logStream.write(`**Date**: ${new Date().toISOString()}\n\n`);
  logStream.write(`**Query**: ${query}\n\n`);
  logStream.write(`---\n\n`);
  
  let startTime = Date.now();
  let progressCount = 0;
  
  try {
    // Log that we're starting the API call
    logStream.write(`## Processing\n\n`);
    logStream.write(`Started: ${new Date().toISOString()}\n`);
    logStream.write(`Calling OpenAI o3 model...\n\n`);
    console.log("⏳ Processing with o3 model (this may take several minutes)...");
    
    const apiCall = openai.responses.create({
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
    
    const response = await progressWithTimeout(
      apiCall,
      config.timeout,
      () => {
        progressCount++;
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        const progressMsg = `🔄 Still processing... (${elapsed}s elapsed, check ${progressCount})`;
        console.log(progressMsg);
        logStream.write(`Progress: ${progressMsg} - ${new Date().toISOString()}\n`);
      }
    );

    const resultText = response.output_text || "No response text available.";
    const totalTime = Math.round((Date.now() - startTime) / 1000);
    
    // Write results to both console and log file
    console.log(`\n✅ Completed in ${totalTime}s`);
    console.log("\n📄 Results:");
    console.log(resultText);
    
    // Write final results to log file
    logStream.write(`\n## Results\n\n`);
    logStream.write(`Completed in ${totalTime}s\n\n`);
    logStream.write(resultText);
    logStream.write(`\n\n---\n\n`);
    logStream.write(`**Completed**: ${new Date().toISOString()}\n`);
    
    // Close the stream
    logStream.end();
    
    console.log(`\n✅ ログファイル保存完了: ${logPath}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    const totalTime = Math.round((Date.now() - startTime) / 1000);
    
    // Log error to both console and file
    console.error(`\n❌ Error after ${totalTime}s:`, errorMessage);
    
    logStream.write(`\n## Error\n\n`);
    logStream.write(`Failed after ${totalTime}s\n`);
    logStream.write(`❌ ${errorMessage}\n\n`);
    
    // Save any partial progress info
    if (progressCount > 0) {
      logStream.write(`Progress checks completed: ${progressCount}\n`);
      console.log(`🔄 Progress was tracked (${progressCount} checks completed)`);
    }
    
    logStream.write(`**Failed**: ${new Date().toISOString()}\n`);
    logStream.end();
    
    console.log(`\n📝 Error log saved: ${logPath}`);
    process.exit(1);
  }
}

function showVersion() {
  try {
    const packageJsonPath = path.join(__dirname, '../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    console.log(packageJson.version);
  } catch (error) {
    console.log("0.2.1"); // Fallback version
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
  dr -v, --version           Show version number
  
  Supports stdin input:
  echo "query" | dr         Search with stdin input
  cat file.txt | dr         Search with file content
  dr < file.txt             Search with file content

Examples:
  dr "What is Node.js?"
  dr -p "Latest AI trends"
  echo "What is React?" | dr
  cat error.log | dr "explain this error"
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
  
  // Version options
  if (firstArg === '-v' || firstArg === '--version') {
    showVersion();
    return { action: 'version' };
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
  
  // Check for stdin input
  const stdinData = await readStdin();
  
  // If stdin has data and no arguments, use stdin as search query
  if (stdinData && args.length === 0) {
    await runCLI(stdinData);
    return;
  }
  
  // If stdin has data and arguments, combine them
  if (stdinData && args.length > 0) {
    // If the first argument is a flag or mcp, handle normally
    const firstArg = args[0];
    if (firstArg && (firstArg === 'mcp' || firstArg.startsWith('-'))) {
      const parsed = parseArguments(args);
      
      switch (parsed.action) {
        case 'help':
          // Help already shown
          break;
          
        case 'version':
          // Version already shown
          break;
          
        case 'mcp':
          // Run MCP server
          const transport = new StdioServerTransport();
          await server.connect(transport);
          console.log("MCP Server running on stdio");
          break;
          
        case 'search':
          // Append stdin data to the query
          await runCLI((parsed.query || '') + ' ' + stdinData);
          break;
      }
    } else {
      // Use args as query and append stdin data
      await runCLI(args.join(' ') + ' ' + stdinData);
    }
    return;
  }
  
  // No stdin data, process normally
  const parsed = parseArguments(args);
  
  switch (parsed.action) {
    case 'help':
      // Help already shown
      break;
      
    case 'version':
      // Version already shown
      break;
      
    case 'mcp':
      // Run MCP server
      const transport = new StdioServerTransport();
      await server.connect(transport);
      console.log("MCP Server running on stdio");
      break;
      
    case 'search':
      if (parsed.query) {
        await runCLI(parsed.query);
      }
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
