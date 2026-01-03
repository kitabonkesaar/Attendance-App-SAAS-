import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Error: Credentials missing.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const table = process.argv[2];
const limit = process.argv[3] || 5;

async function run() {
  if (!table) {
    console.log("Usage: node scripts/query-db.js <table_name> [limit]");
    return;
  }

  console.log(`Querying table: '${table}' (Limit: ${limit})...`);
  
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .limit(Number(limit));

  if (error) {
    console.error("Query Error:", error.message);
    return;
  }

  if (data.length === 0) {
    console.log("Result: [] (Table is empty)");
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

run();
