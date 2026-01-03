
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
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function purgeData() {
  console.log('Starting data purge...');

  // 1. Delete Attendance Logs
  console.log('Deleting attendance logs...');
  const { error: attError } = await supabase.from('attendance').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
  if (attError) console.error('Error deleting attendance:', attError.message);

  // 2. Delete Audit Logs
  console.log('Deleting audit logs...');
  const { error: auditError } = await supabase.from('audit_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (auditError) console.error('Error deleting audit logs:', auditError.message);

  // 3. Delete Employees (Public table)
  console.log('Deleting employee records...');
  const { error: empError } = await supabase.from('employees').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (empError) console.error('Error deleting employees:', empError.message);

  // 4. Delete Profiles (Except Admin if possible, but request says "Remove all user data")
  // Note: We might be restricted by RLS here.
  console.log('Deleting profiles...');
  const { error: profError } = await supabase.from('profiles').delete().neq('role', 'ADMIN'); // Keep admins to avoid lockout? 
  // User said "Delete all employee records... Erase all staff profiles...". 
  // Usually this means non-admin, or else the user can't log in to verify.
  // I will try to delete all non-admins first.
  if (profError) console.error('Error deleting profiles:', profError.message);

  console.log('Data purge complete.');
}

purgeData();
