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

async function getSchema() {
  console.log("Fetching schema for 'attendance' table...");
  
  // 1. Try to get one row to see columns
  const { data, error } = await supabase.from('attendance').select('*').limit(1);

  if (error) {
    console.error("Error fetching data:", error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log("Table is empty, cannot infer full schema from data.");
    console.log("Using TypeScript definition as reference:");
    console.log(`
      id: uuid (string)
      employee_id: uuid (string)
      date: date (string)
      time: time (string)
      photo_url: text (string)
      latitude: float8 (number)
      longitude: float8 (number)
      punch_out_time: time (string)
      punch_out_photo_url: text (string)
      device_id: text (string)
      status: text (enum)
      created_at: timestamptz (string)
    `);
    return;
  }

  const sample = data[0];
  console.log("\n--- Attendance Table Schema (Inferred from Row 1) ---");
  Object.keys(sample).forEach(key => {
    const value = sample[key];
    const type = typeof value;
    console.log(`- ${key}: ${type} (Example: ${value})`);
  });
}

getSchema();
