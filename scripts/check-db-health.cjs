
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bnyiujoijyftorvvycuz.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJueWl1am9panlmdG9ydnZ5Y3V6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQyMjUxMSwiZXhwIjoyMDgyOTk4NTExfQ.r-VQMDBGkkIRangrxc6r0OFMGSC5bGZjyHCN-kU2sS4';

console.log(`Connecting to ${supabaseUrl}...`);

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkHealth() {
  try {
    console.log('1. Checking Auth Service...');
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
    
    if (authError) {
      console.error('❌ Auth Service Check Failed:', authError.message);
    } else {
      console.log('✅ Auth Service is UP. Users found:', users.length);
    }

    console.log('2. Checking Database (Table: app_settings)...');
    const { data: settings, error: dbError } = await supabase.from('app_settings').select('*').limit(1);

    if (dbError) {
      console.error('❌ Database Check Failed:', dbError.message);
    } else {
      console.log('✅ Database is UP. Settings found:', settings ? settings.length : 0);
    }

    console.log('3. Checking Database (Table: employees)...');
    const { count, error: empError } = await supabase.from('employees').select('*', { count: 'exact', head: true });
    
    if (empError) {
      console.error('❌ Employees Table Check Failed:', empError.message);
    } else {
      console.log('✅ Employees Table is Accessible. Count:', count);
    }

  } catch (err) {
    console.error('❌ Unexpected Error:', err);
  }
}

checkHealth();
