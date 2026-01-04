
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://bnyiujoijyftorvvycuz.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJueWl1am9panlmdG9ydnZ5Y3V6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQyMjUxMSwiZXhwIjoyMDgyOTk4NTExfQ.r-VQMDBGkkIRangrxc6r0OFMGSC5bGZjyHCN-kU2sS4";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function fixAdminProfile() {
  console.log("Fixing Admin Profile RLS...");

  // 1. Find Admin User
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  const adminUser = users.find(u => u.email === 'admin@demo.com');

  if (!adminUser) {
    console.error("Admin user not found!");
    return;
  }

  console.log(`Found Admin User: ${adminUser.id}`);

  // 2. Update Profiles table to set role = 'ADMIN'
  const { error: profileError } = await supabase.from('profiles').upsert({
    id: adminUser.id,
    name: 'Admin User',
    role: 'ADMIN'
  });

  if (profileError) {
    console.error("Profile update failed:", profileError);
  } else {
    console.log("SUCCESS: Updated public.profiles role to 'ADMIN'.");
  }

  // 3. Verify Employees table
  // We want to ensure Staff are visible.
  const { count } = await supabase.from('employees').select('*', { count: 'exact', head: true });
  console.log(`Total Employees in DB: ${count}`);

}

fixAdminProfile();
