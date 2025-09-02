#!/usr/bin/env node
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
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
import { CallToolRequestSchema, ListResourcesRequestSchema, ListToolsRequestSchema, ReadResourceRequestSchema, ErrorCode, McpError, } from "@modelcontextprotocol/sdk/types.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import minimist from "minimist";
import express from "express";
var argv = minimist(process.argv.slice(2));
var targetServerUrl = argv.targetUrl;
/**
 * In-memory storage for async operations
 */
var asyncOperations = new Map();
var operationCounter = 0;
/**
 * Generate a unique operation ID
 */
function generateOperationId() {
    return "op_".concat(++operationCounter, "_").concat(Date.now());
}
/**
 * Target MCP client connection
 */
var targetClient = null;
/**
 * Initialize connection to target server
 */
function initializeTargetClient() {
    return __awaiter(this, void 0, void 0, function () {
        var transport;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (targetClient) {
                        return [2 /*return*/, targetClient];
                    }
                    targetClient = new Client({
                        name: "mcp-async-tool-proxy-client",
                        version: "0.1.0",
                    }, {
                        capabilities: {},
                    });
                    transport = new StreamableHTTPClientTransport(new URL("".concat(targetServerUrl, "/mcp")));
                    return [4 /*yield*/, targetClient.connect(transport)];
                case 1:
                    _a.sent();
                    return [2 /*return*/, targetClient];
            }
        });
    });
}
/**
 * Execute tool call asynchronously and update the operation
 */
function executeAsyncToolCall(operationId, toolName, args) {
    return __awaiter(this, void 0, void 0, function () {
        var operation, client, response, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    operation = asyncOperations.get(operationId);
                    if (!operation)
                        return [2 /*return*/];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    operation.status = 'running';
                    return [4 /*yield*/, initializeTargetClient()];
                case 2:
                    client = _a.sent();
                    return [4 /*yield*/, client.request({
                            method: "tools/call",
                            params: {
                                name: toolName,
                                arguments: args,
                            },
                        }, CallToolRequestSchema)];
                case 3:
                    response = _a.sent();
                    // Update operation with success
                    operation.status = 'completed';
                    operation.result = response;
                    operation.completedAt = new Date();
                    return [3 /*break*/, 5];
                case 4:
                    error_1 = _a.sent();
                    // Update operation with error
                    operation.status = 'failed';
                    operation.error = error_1 instanceof Error ? error_1.message : String(error_1);
                    operation.completedAt = new Date();
                    console.error("Async tool call ".concat(operationId, " failed:"), error_1);
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    });
}
var app = express();
app.use(express.json());
// Map to store transports by session ID
var transports = {};
// Handle POST requests for client-to-server communication
app.post('/mcp', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var sessionId, transport, server;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                sessionId = req.headers['mcp-session-id'];
                if (!(sessionId && transports[sessionId])) return [3 /*break*/, 1];
                // Reuse existing transport
                transport = transports[sessionId];
                return [3 /*break*/, 4];
            case 1:
                if (!(!sessionId && isInitializeRequest(req.body))) return [3 /*break*/, 3];
                // New initialization request
                transport = new StreamableHTTPServerTransport({
                    sessionIdGenerator: function () { return v4(); },
                    onsessioninitialized: function (sessionId) {
                        // Store the transport by session ID
                        transports[sessionId] = transport;
                    },
                    // DNS rebinding protection is disabled by default for backwards compatibility. If you are running this server
                    // locally, make sure to set:
                    // enableDnsRebindingProtection: true,
                    // allowedHosts: ['127.0.0.1'],
                });
                // Clean up transport when closed
                transport.onclose = function () {
                    if (transport.sessionId) {
                        delete transports[transport.sessionId];
                    }
                };
                server = new Server({
                    name: "mcp-async-tool-proxy",
                    version: "0.1.0",
                }, {
                    capabilities: {
                        resources: {},
                        tools: {},
                    },
                });
                // ... set up server resources, tools, and prompts ...
                /**
                 * Handler for listing resources (async operations)
                 */
                server.setRequestHandler(ListResourcesRequestSchema, function () { return __awaiter(void 0, void 0, void 0, function () {
                    var resources;
                    return __generator(this, function (_a) {
                        resources = Array.from(asyncOperations.entries()).map(function (_a) {
                            var id = _a[0], op = _a[1];
                            return ({
                                uri: "async://operation/".concat(id),
                                mimeType: "application/json",
                                name: "Async Operation: ".concat(op.toolName),
                                description: "Status: ".concat(op.status, ", Created: ").concat(op.createdAt.toISOString()),
                            });
                        });
                        return [2 /*return*/, { resources: resources }];
                    });
                }); });
                /**
                 * Handler for reading async operation resources
                 */
                server.setRequestHandler(ReadResourceRequestSchema, function (request) { return __awaiter(void 0, void 0, void 0, function () {
                    var url, pathParts, operationId, operation, result;
                    return __generator(this, function (_a) {
                        url = new URL(request.params.uri);
                        pathParts = url.pathname.split('/');
                        if (pathParts[1] !== 'operation') {
                            throw new McpError(ErrorCode.InvalidRequest, "Invalid resource URI: ".concat(request.params.uri));
                        }
                        operationId = pathParts[2];
                        operation = asyncOperations.get(operationId);
                        if (!operation) {
                            throw new McpError(ErrorCode.InvalidRequest, "Async operation ".concat(operationId, " not found"));
                        }
                        result = __assign(__assign(__assign({ id: operation.id, toolName: operation.toolName, arguments: operation.arguments, status: operation.status, createdAt: operation.createdAt.toISOString() }, (operation.completedAt && { completedAt: operation.completedAt.toISOString() })), (operation.result && { result: operation.result })), (operation.error && { error: operation.error }));
                        return [2 /*return*/, {
                                contents: [{
                                        uri: request.params.uri,
                                        mimeType: "application/json",
                                        text: JSON.stringify(result, null, 2),
                                    }],
                            }];
                    });
                }); });
                /**
                 * Handler for listing tools (proxied from target server)
                 */
                server.setRequestHandler(ListToolsRequestSchema, function () { return __awaiter(void 0, void 0, void 0, function () {
                    var client, response, error_2;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                _a.trys.push([0, 3, , 4]);
                                return [4 /*yield*/, initializeTargetClient()];
                            case 1:
                                client = _a.sent();
                                return [4 /*yield*/, client.request({ method: "tools/list" }, ListToolsRequestSchema)];
                            case 2:
                                response = _a.sent();
                                return [2 /*return*/, response];
                            case 3:
                                error_2 = _a.sent();
                                console.error('Error listing tools from target server:', error_2);
                                throw new McpError(ErrorCode.InternalError, "Failed to list tools from target server: ".concat(error_2));
                            case 4: return [2 /*return*/];
                        }
                    });
                }); });
                /**
                 * Handler for calling tools asynchronously
                 */
                server.setRequestHandler(CallToolRequestSchema, function (request) { return __awaiter(void 0, void 0, void 0, function () {
                    var operationId, operation;
                    return __generator(this, function (_a) {
                        operationId = generateOperationId();
                        operation = {
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
                        return [2 /*return*/, {
                                content: [{
                                        type: "text",
                                        text: "Async tool call started. Operation ID: ".concat(operationId, "\n\nTrack progress at: async://operation/").concat(operationId),
                                    }],
                            }];
                    });
                }); });
                // Connect to the MCP server
                return [4 /*yield*/, server.connect(transport)];
            case 2:
                // Connect to the MCP server
                _a.sent();
                return [3 /*break*/, 4];
            case 3:
                // Invalid request
                res.status(400).json({
                    jsonrpc: '2.0',
                    error: {
                        code: -32000,
                        message: 'Bad Request: No valid session ID provided',
                    },
                    id: null,
                });
                return [2 /*return*/];
            case 4: 
            // Handle the request
            return [4 /*yield*/, transport.handleRequest(req, res, req.body)];
            case 5:
                // Handle the request
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
// Reusable handler for GET and DELETE requests
var handleSessionRequest = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var sessionId, transport;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                sessionId = req.headers['mcp-session-id'];
                if (!sessionId || !transports[sessionId]) {
                    res.status(400).send('Invalid or missing session ID');
                    return [2 /*return*/];
                }
                transport = transports[sessionId];
                return [4 /*yield*/, transport.handleRequest(req, res)];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); };
// Handle GET requests for server-to-client notifications via SSE
app.get('/mcp', handleSessionRequest);
// Handle DELETE requests for session termination
app.delete('/mcp', handleSessionRequest);
console.log("listening");
app.listen(argv["mcpPort"] || 3000);
