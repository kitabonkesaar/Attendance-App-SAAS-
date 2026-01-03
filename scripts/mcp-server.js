
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// Load environment variables from .env file
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../.env");
const logPath = path.resolve(__dirname, "../mcp-server.log");

function log(message) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`);
}

log("Starting MCP Server...");
log(`Loading env from: ${envPath}`);

dotenv.config({ path: envPath });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
// Use Service Role if available for full access, otherwise Anon
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  const errorMsg = "Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env";
  log(errorMsg);
  console.error(errorMsg);
  process.exit(1);
}

log("Supabase credentials found. Initializing client...");
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Create the MCP Server
const server = new Server(
  {
    name: "supabase-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "query_db",
        description: "Run a read-only SQL query against the Supabase database to fetch data (e.g., attendance logs, employees).",
        inputSchema: {
          type: "object",
          properties: {
            table: {
              type: "string",
              description: "The name of the table to query (e.g., 'employees', 'attendance', 'profiles')",
            },
            columns: {
              type: "string",
              description: "Comma-separated columns to select (default: '*')",
            },
            limit: {
              type: "number",
              description: "Number of records to return (default: 10)",
            },
          },
          required: ["table"],
        },
      },
      {
        name: "get_schema",
        description: "Get the schema/structure of a specific table.",
        inputSchema: {
            type: "object",
            properties: {
                table: { type: "string", description: "Table name" }
            },
            required: ["table"]
        }
      }
    ],
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "query_db") {
    const table = String(args.table);
    const columns = args.columns ? String(args.columns) : "*";
    const limit = Number(args.limit) || 10;

    try {
      const { data, error } = await supabase
        .from(table)
        .select(columns)
        .limit(limit);

      if (error) throw error;
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    } catch (err) {
      return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
    }
  }
  
  if (name === "get_schema") {
      // Note: This is a basic schema inference since Supabase JS client doesn't expose schema metadata directly easily
      // We fetch one row to see structure
      try {
          const { data, error } = await supabase.from(String(args.table)).select('*').limit(1);
          if (error) throw error;
          
          if (!data || data.length === 0) {
              return { content: [{ type: "text", text: "Table exists but is empty, cannot infer schema." }] };
          }
          
          const keys = Object.keys(data[0]);
          return { content: [{ type: "text", text: `Columns in ${args.table}: ${keys.join(", ")}` }] };
      } catch (err) {
          return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
      }
  }

  throw new Error(`Unknown tool: ${name}`);
});

// Start the server
async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  log("MCP Server connected to transport.");
}

run().catch((err) => {
  log(`Fatal Error: ${err.message}`);
  log(err.stack);
  console.error(err);
  process.exit(1);
});
