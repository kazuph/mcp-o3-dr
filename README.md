# @kazuph/mcp-o3-dr

An MCP (Model Context Protocol) server and CLI tool that provides web search capabilities using OpenAI's o3 model. Works both as an MCP server for Claude Code and as a standalone CLI tool.

## Features

- 🔍 **Web Search**: AI-powered web search using OpenAI's o3 model
- 🖥️ **CLI Mode**: Run searches directly from the command line
- 🔌 **MCP Server**: Integrates with Claude Code via Model Context Protocol
- ⚙️ **Configurable**: Customizable search context size and reasoning effort
- 🔄 **Retry Logic**: Built-in retry mechanism with configurable timeout

## Installation

### Using npm (Recommended)

```bash
npm install -g @kazuph/mcp-o3-dr
```

### Using npx (No Installation Required)

```bash
npx @kazuph/mcp-o3-dr "your search query"
```

## Usage

### CLI Mode

Run searches directly from the command line:

```bash
# Set your OpenAI API key
export OPENAI_API_KEY=your-api-key

# Run a search
o3-dr "What are the latest developments in AI?"

# Or with npx
npx @kazuph/mcp-o3-dr "How to optimize React performance?"
```

### MCP Server Mode

Integrate with Claude Code as an MCP server:

**Claude Code:**

```bash
$ claude mcp add o3 -s user \
	-e OPENAI_API_KEY=your-api-key \
	-e SEARCH_CONTEXT_SIZE=medium \
	-e REASONING_EFFORT=medium \
	-e OPENAI_API_TIMEOUT=60000 \
	-e OPENAI_MAX_RETRIES=3 \
	-- npx @kazuph/mcp-o3-dr
```

**JSON Configuration:**

```json
{
  "mcpServers": {
    "o3-search": {
      "command": "npx",
      "args": ["@kazuph/mcp-o3-dr"],
      "env": {
        "OPENAI_API_KEY": "your-api-key",
        "SEARCH_CONTEXT_SIZE": "medium",
        "REASONING_EFFORT": "medium",
        "OPENAI_API_TIMEOUT": "60000",
        "OPENAI_MAX_RETRIES": "3"
      }
    }
  }
}
```

### Local Development Setup

If you want to download and run the code locally:

```bash
# Clone the repository
git clone https://github.com/kazuph/mcp-o3-dr.git
cd mcp-o3-dr
pnpm install
pnpm build

# Set environment variable
export OPENAI_API_KEY=your-api-key

# Run as CLI
node build/index.js "your search query"
```

**Claude Code with local build:**

```bash
$ claude mcp add o3 -s user \
	-e OPENAI_API_KEY=your-api-key \
	-e SEARCH_CONTEXT_SIZE=medium \
	-e REASONING_EFFORT=medium \
	-e OPENAI_API_TIMEOUT=60000 \
	-e OPENAI_MAX_RETRIES=3 \
	-- node /path/to/mcp-o3-dr/build/index.js
```

**JSON Configuration:**

```json
{
  "mcpServers": {
    "o3-search": {
      "command": "node",
      "args": ["/path/to/mcp-o3-dr/build/index.js"],
      "env": {
        "OPENAI_API_KEY": "your-api-key",
        "SEARCH_CONTEXT_SIZE": "medium",
        "REASONING_EFFORT": "medium",
        "OPENAI_API_TIMEOUT": "60000",
        "OPENAI_MAX_RETRIES": "3"
      }
    }
  }
}
```

## Configuration

### Environment Variables

- **OPENAI_API_KEY** (required): Your OpenAI API key
- **SEARCH_CONTEXT_SIZE** (optional): Controls the search context size
  - Values: `low`, `medium`, `high`
  - Default: `medium`
- **REASONING_EFFORT** (optional): Controls the reasoning effort level
  - Values: `low`, `medium`, `high`
  - Default: `medium`
- **OPENAI_API_TIMEOUT** (optional): API request timeout in milliseconds
  - Default: `60000` (60 seconds)
  - Example: `120000` for 2 minutes
- **OPENAI_MAX_RETRIES** (optional): Maximum number of retry attempts for failed requests
  - Default: `3`
  - The SDK automatically retries on rate limits (429), server errors (5xx), and connection errors
