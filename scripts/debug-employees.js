
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Use Service Role Key to bypass RLS
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEmployees() {
  console.log('Logging in as Admin...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@demo.com',
    password: 'Admin@123'
  });

  if (authError) {
    console.error('Login failed:', authError);
    return;
  }
  console.log('Login successful. User ID:', authData.user.id);

  console.log('Checking employees table...');

  // 1. Try to fetch
  const { data, error } = await supabase.from('employees').select('*');
  
  if (error) {
    console.error('Error fetching employees:', error);
  } else {
    console.log(`Found ${data.length} employees.`);
  }

  // 2. Try to insert a dummy employee
  const dummyId = '11111111-1111-1111-1111-111111111111'; // UUID format
  console.log('Attempting dummy insert...');
  
  const { error: insertError } = await supabase.from('employees').insert({
    id: dummyId,
    employee_code: 'TEST001',
    name: 'Test User',
    mobile: '1234567890',
    email: 'test@example.com'
  });

  if (insertError) {
    console.error('Insert failed:', insertError);
  } else {
    console.log('Insert successful!');
    // Clean up
    await supabase.from('employees').delete().eq('id', dummyId);
  }
}

checkEmployees();
