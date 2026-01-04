
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://bnyiujoijyftorvvycuz.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJueWl1am9panlmdG9ydnZ5Y3V6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQyMjUxMSwiZXhwIjoyMDgyOTk4NTExfQ.r-VQMDBGkkIRangrxc6r0OFMGSC5bGZjyHCN-kU2sS4";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function syncUsers() {
  console.log("Starting user sync...");

  // 1. Get all Auth users
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (authError) {
    console.error("Auth list error:", authError);
    return;
  }

  // 2. Get all existing Employee records
  const { data: employees, error: empError } = await supabase.from('employees').select('id, email');
  if (empError) {
    console.error("Employee list error:", empError);
    return;
  }

  const existingIds = new Set(employees.map(e => e.id));

  for (const user of users) {
    // Skip if already exists
    if (existingIds.has(user.id)) {
      // Optional: Check if we need to update anything? 
      // For now, assume existing records are fine.
      continue;
    }

    console.log(`Syncing user: ${user.email} (${user.id})`);

    // Determine Role
    const isMainAdmin = user.email.includes('admin@demo.com'); // Specific check
    const role = isMainAdmin ? 'Admin' : 'Staff';
    const name = user.user_metadata?.name || user.email.split('@')[0];

    // Create Profile
    await supabase.from('profiles').upsert({
      id: user.id,
      name: name,
      role: isMainAdmin ? 'ADMIN' : 'EMPLOYEE'
    });

    // Create Employee Record
    const { error: insertError } = await supabase.from('employees').insert({
      id: user.id,
      employee_code: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
      name: name,
      email: user.email,
      mobile: user.user_metadata?.mobile || user.phone || `000-000-${Math.floor(1000 + Math.random() * 9000)}`,
      role: role,
      department: 'General',
      status: 'ACTIVE',
      joining_date: new Date(user.created_at).toISOString().split('T')[0],
      shift_start: '09:00',
      shift_end: '18:00',
      password: 'SyncedUser@123' // Default for synced users
    });

    if (insertError) {
      console.error(`Failed to insert ${user.email}:`, insertError.message);
    } else {
      console.log(`Successfully added ${user.email} to employees.`);
    }
  }

  console.log("Sync completed.");
}

syncUsers();
