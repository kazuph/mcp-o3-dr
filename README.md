# @kazuph/mcp-o3-dr

A Deep Research (DR) tool that provides AI-powered web search capabilities using OpenAI's o3 model. Works both as an MCP server for Claude Code and as a standalone CLI tool.

## Features

- 🔍 **Deep Research**: AI-powered web search using OpenAI's o3 model
- 🖥️ **CLI Mode**: Run searches directly from the command line with `dr` command
- 🔌 **MCP Server**: Integrates with Claude Code via Model Context Protocol
- ⚙️ **Configurable**: Customizable search context size and reasoning effort
- 🔄 **Retry Logic**: Built-in retry mechanism with configurable timeout
- 📁 **Config File**: Supports `~/.openai.env` file for API key configuration

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
# Set your OpenAI API key (method 1: environment variable)
export OPENAI_API_KEY=your-api-key

# Or create ~/.openai.env file (method 2: config file)
echo "OPENAI_API_KEY=your-api-key" > ~/.openai.env

# Run a search
dr "What are the latest developments in AI?"

# Alternative syntax with -p option
dr -p "How to optimize React performance?"

# Show help
dr -h
dr --help

# Or with npx
npx @kazuph/mcp-o3-dr "your search query"
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
	-- npx @kazuph/mcp-o3-dr mcp
```

**JSON Configuration:**

```json
{
  "mcpServers": {
    "dr": {
      "command": "npx",
      "args": ["@kazuph/mcp-o3-dr", "mcp"],
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
npm install
npm run build

# Set environment variable
export OPENAI_API_KEY=your-api-key

# Run as CLI
node build/index.js "your search query"

# Run as MCP server
node build/index.js mcp
```

**Claude Code with local build:**

```bash
$ claude mcp add o3 -s user \
	-e OPENAI_API_KEY=your-api-key \
	-e SEARCH_CONTEXT_SIZE=medium \
	-e REASONING_EFFORT=medium \
	-e OPENAI_API_TIMEOUT=60000 \
	-e OPENAI_MAX_RETRIES=3 \
	-- node /path/to/mcp-o3-dr/build/index.js mcp
```

**JSON Configuration:**

```json
{
  "mcpServers": {
    "dr": {
      "command": "node",
      "args": ["/path/to/mcp-o3-dr/build/index.js", "mcp"],
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

### API Key Configuration

You can configure your OpenAI API key in two ways:

1. **Environment Variable (Higher Priority)**:
   ```bash
   export OPENAI_API_KEY=your-api-key
   ```

2. **Config File** (`~/.openai.env`):
   ```bash
   echo "OPENAI_API_KEY=your-api-key" > ~/.openai.env
   ```

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

## Command Line Options

```
dr - Deep Research Tool

Usage:
  dr [query]                 Search with a query
  dr -p "query"               Search with a query (alternative syntax)
  dr mcp                     Start MCP server
  dr -h, --help              Show help message

Examples:
  dr "What is Node.js?"
  dr -p "Latest AI trends"
  dr mcp
```

## License

MIT