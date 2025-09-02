# MCP Async Tool Proxy Server

A Model Context Protocol server that acts as an asynchronous proxy for other MCP servers.

This server provides the same tools as a target MCP server, but instead of returning results immediately, it creates resources that are updated with the results when tool calls complete asynchronously.

This allows an agent to fire off a long-running task and periodically check the results while continuing other elements of its task without having its progress blocked while the task is running.

<img width="335" height="847" alt="image" src="https://github.com/user-attachments/assets/29d33691-8c80-48be-9809-03fa2a51f49f" />

## Features

### Tools
- **Proxy all tools from target server** - Any tool available on the target MCP server
  - Tool calls are executed asynchronously
  - Returns operation ID and resource URI for tracking progress
  - Results are stored in resources when complete

### Resources
- List and access async operation status via `async://operation/` URIs
- Each operation tracks the status, arguments, and results of async tool calls
- JSON format for structured data access

### Configuration
The server requires environment variables to configure the target MCP server:
- `targetUrl` - like `http://localhost:3001`
- `mcpPort` - defaults to 3000

### Running
```
node src/index.ts --mcpPort 3000 --targetUrl http://localhost:3001
```

or `npx .`
