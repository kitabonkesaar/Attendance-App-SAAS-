
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyWorkforce() {
  console.log('--- Verifying Workforce Management System ---');

  // 1. Test Fetching Employees
  console.log('\n1. Testing Employee Fetch...');
  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('*')
    .limit(5);

  if (empError) {
    console.error('❌ Employee Fetch Failed:', empError.message);
    if (empError.message.includes('recursion')) {
      console.error('   -> CRITICAL: Infinite recursion still detected!');
    }
  } else {
    console.log(`✅ Success! Fetched ${employees.length} employees.`);
    if (employees.length > 0) {
      console.log('   Sample:', employees[0].name, `(${employees[0].role})`);
    } else {
      console.warn('   Note: No employees found. Table is empty or RLS is hiding them.');
    }
  }

  // 2. Test Fetching Profiles (Core Admin Check)
  console.log('\n2. Testing Profile Access...');
  const { data: profiles, error: profError } = await supabase
    .from('profiles')
    .select('*')
    .limit(5);

  if (profError) {
    console.error('❌ Profile Fetch Failed:', profError.message);
  } else {
    console.log(`✅ Success! Fetched ${profiles.length} profiles.`);
  }

  // 3. Test Admin Helper Function (if accessible via RPC, though it's internal)
  // We can't call it directly unless exposed, but we can test if policies block us.
  
  console.log('\n--- Verification Complete ---');
}

verifyWorkforce();
