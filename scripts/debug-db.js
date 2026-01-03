import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Error: Service Role Credentials missing.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runDiagnostics() {
  console.log("--- STARTING DB DIAGNOSTICS ---");

  // 1. Test profiles table existence and schema
  console.log("\n1. Testing 'profiles' table insertion...");
  const testId = "00000000-0000-0000-0000-000000000001"; // Dummy UUID
  
  const { error: insertError } = await supabase.from('profiles').upsert({
    id: testId,
    name: "Diagnostic Test",
    role: "EMPLOYEE"
  });

  if (insertError) {
    console.error("FAIL: Could not insert into 'profiles'.");
    console.error("Error:", JSON.stringify(insertError, null, 2));
    console.log("Hypothesis: Table might be missing or schema mismatch.");
  } else {
    console.log("SUCCESS: 'profiles' table is writable.");
    // Cleanup
    await supabase.from('profiles').delete().eq('id', testId);
  }

  // 2. Test Trigger (via Auth)
  console.log("\n2. Testing 'on_auth_user_created' trigger...");
  const email = `diag.${Date.now()}@test.com`;
  const { data, error: authError } = await supabase.auth.admin.createUser({
    email: email,
    password: "Password123!",
    user_metadata: { name: "Trigger Test" },
    email_confirm: true
  });

  if (authError) {
    console.error("FAIL: Trigger blocked user creation.");
    console.error("Error:", JSON.stringify(authError, null, 2));
  } else {
    console.log("SUCCESS: User created! Trigger is working.");
    await supabase.auth.admin.deleteUser(data.user.id);
  }

  console.log("\n--- DIAGNOSTICS COMPLETE ---");
}

runDiagnostics();
