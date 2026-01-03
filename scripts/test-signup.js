import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Must use Service Role for Admin

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Error: Service Role Credentials missing.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testUserCreation() {
  const email = `test.user.${Date.now()}@example.com`;
  const password = "Test@123456";
  const name = "Test User";

  console.log(`Attempting to create user: ${email}`);

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    user_metadata: { name },
    email_confirm: true
  });

  if (error) {
    console.error("CREATION FAILED:");
    console.error(JSON.stringify(error, null, 2));
  } else {
    console.log("SUCCESS! User created.");
    console.log("User ID:", data.user.id);
    
    // Clean up
    console.log("Cleaning up (deleting user)...");
    await supabase.auth.admin.deleteUser(data.user.id);
  }
}

testUserCreation();
