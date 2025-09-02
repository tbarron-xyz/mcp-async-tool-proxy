#!/usr/bin/env node

/**
 * MCP Async Tool Proxy Server
 *
 * This server acts as a proxy for another MCP server, providing the same tools
 * but making tool calls asynchronous. Instead of returning results immediately,
 * it creates resources that are updated with the results when the tool calls complete.
 */
import { v4 } from "uuid";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js"

import minimist from "minimist";
import express from "express";

const argv = minimist(process.argv.slice(2));

const targetServerUrl = argv.targetUrl;

/**
 * Interface for tracking async operations
 */
interface AsyncOperation {
  id: string;
  toolName: string;
  arguments: any;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

/**
 * In-memory storage for async operations
 */
const asyncOperations: Map<string, AsyncOperation> = new Map();
let operationCounter = 0;

/**
 * Generate a unique operation ID
 */
function generateOperationId(): string {
  return `op_${++operationCounter}_${Date.now()}`;
}

/**
 * Target MCP client connection
 */
let targetClient: Client | null = null;

/**
 * Initialize connection to target server
 */
async function initializeTargetClient(): Promise<Client> {
  if (targetClient) {
    return targetClient;
  }

  targetClient = new Client(
    {
      name: "mcp-async-tool-proxy-client",
      version: "0.1.0",
    },
    {
      capabilities: {},
    }
  );

    // Create StreamableHTTP transport for connecting to the server
  const transport = new StreamableHTTPClientTransport(new URL(`${targetServerUrl}/mcp`));


  await targetClient.connect(transport);
  return targetClient;
}


/**
 * Execute tool call asynchronously and update the operation
 */
async function executeAsyncToolCall(operationId: string, toolName: string, args: any) {
  const operation = asyncOperations.get(operationId);
  if (!operation) return;

  try {
    operation.status = 'running';

    const client = await initializeTargetClient();

    // Call the tool on the target server
    const response = await client.callTool({
          name: toolName,
          arguments: args,
        },
    );
    // const response = await client.request(
    //   {
    //     method: "tools/call",
    //     params: {
    //       name: toolName,
    //       arguments: args,
    //     },
    //   },
    //   CallToolRequestSchema
    // );

    // Update operation with success
    operation.status = 'completed';
    operation.result = response;
    operation.completedAt = new Date();

  } catch (error) {
    // Update operation with error
    operation.status = 'failed';
    operation.error = error instanceof Error ? error.message : String(error);
    operation.completedAt = new Date();
    console.error(`Async tool call ${operationId} failed:`, error);
  }
}


const app = express();
app.use(express.json());

// Map to store transports by session ID
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

// Handle POST requests for client-to-server communication
app.post('/mcp', async (req, res) => {
    // Check for existing session ID
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports[sessionId]) {
        // Reuse existing transport
        transport = transports[sessionId];
    } else if (!sessionId && isInitializeRequest(req.body)) {
        // New initialization request
        transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => v4(),
        onsessioninitialized: (sessionId) => {
            // Store the transport by session ID
            transports[sessionId] = transport;
        },
        // DNS rebinding protection is disabled by default for backwards compatibility. If you are running this server
        // locally, make sure to set:
        // enableDnsRebindingProtection: true,
        // allowedHosts: ['127.0.0.1'],
        });

        // Clean up transport when closed
        transport.onclose = () => {
        if (transport.sessionId) {
            delete transports[transport.sessionId];
        }
        };
        // const server = new McpServer({
        // name: "mcp-server-irc-client",
        // version: "1.0.0"
        // }, { capabilities: { tools: {}}});

/**
 * Create an MCP server that proxies tools asynchronously
 */
const server = new Server(
  {
    name: "mcp-async-tool-proxy",
    version: "0.1.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  }
);


        // ... set up server resources, tools, and prompts ...
/**
 * Handler for listing resources (async operations)
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const resources = Array.from(asyncOperations.entries()).map(([id, op]) => ({
    uri: `async://operation/${id}`,
    mimeType: "application/json",
    name: `Async Operation: ${op.toolName}`,
    description: `Status: ${op.status}, Created: ${op.createdAt.toISOString()}`,
  }));

  return { resources };
});

/**
 * Handler for reading async operation resources
 */
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const url = new URL(request.params.uri);
  const pathParts = url.pathname.split('/');
  if (url.host !== 'operation') {
    throw new McpError(
      ErrorCode.InvalidRequest,
      `Invalid resource URI: ${request.params.uri}`
    );
  }

  const operationId = pathParts[1];
  const operation = asyncOperations.get(operationId);

  if (!operation) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      `Async operation ${operationId} not found`
    );
  }

  const result = {
    id: operation.id,
    toolName: operation.toolName,
    arguments: operation.arguments,
    status: operation.status,
    createdAt: operation.createdAt.toISOString(),
    ...(operation.completedAt && { completedAt: operation.completedAt.toISOString() }),
    ...(operation.result && { result: operation.result }),
    ...(operation.error && { error: operation.error }),
  };

  return {
    contents: [{
      uri: request.params.uri,
      mimeType: "application/json",
      text: JSON.stringify(result, null, 2),
    }],
  };
});

/**
 * Handler for listing tools (proxied from target server)
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  try {
    const client = await initializeTargetClient();
    const response = await client.listTools();
    return response;
  } catch (error) {
    console.error('Error listing tools from target server:', error);
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to list tools from target server: ${error}`
    );
  }
});

/**
 * Handler for calling tools asynchronously
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const operationId = generateOperationId();

  // Create async operation record
  const operation: AsyncOperation = {
    id: operationId,
    toolName: request.params.name,
    arguments: request.params.arguments,
    status: 'pending',
    createdAt: new Date(),
  };

  asyncOperations.set(operationId, operation);

  // Start the async tool call
  executeAsyncToolCall(operationId, request.params.name, request.params.arguments);

  // Return information about the async operation
  return {
    content: [{
      type: "text",
      text: `Async tool call started. Operation ID: ${operationId}\n\nTrack progress at: async://operation/${operationId}`,
    }],
  };
});

        // Connect to the MCP server
        await server.connect(transport);
    } else {
        // Invalid request
        res.status(400).json({
        jsonrpc: '2.0',
        error: {
            code: -32000,
            message: 'Bad Request: No valid session ID provided',
        },
        id: null,
        });
        return;
    }

  // Handle the request
  await transport.handleRequest(req, res, req.body);
});

// Reusable handler for GET and DELETE requests
const handleSessionRequest = async (req: express.Request, res: express.Response) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }
  
  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
};

// Handle GET requests for server-to-client notifications via SSE
app.get('/mcp', handleSessionRequest);

// Handle DELETE requests for session termination
app.delete('/mcp', handleSessionRequest);
console.log("listening");
app.listen(argv["mcpPort"] || 3000);