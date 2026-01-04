
const { createClient } = require('@supabase/supabase-js');

// Hardcoded keys for the script to ensure it runs independently of Vite env
const SUPABASE_URL = "https://bnyiujoijyftorvvycuz.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJueWl1am9panlmdG9ydnZ5Y3V6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQyMjUxMSwiZXhwIjoyMDgyOTk4NTExfQ.r-VQMDBGkkIRangrxc6r0OFMGSC5bGZjyHCN-kU2sS4";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const users = [
  { name: 'Bhabendu', email: 'bhabendu@demo.com', mobile: '9000000001' },
  { name: 'Raj', email: 'raj@demo.com', mobile: '9000000002' },
  { name: 'Chirag', email: 'chirag@demo.com', mobile: '9000000003' }
];

async function seedUsers() {
  console.log("Starting seed process...");

  for (const user of users) {
    try {
      console.log(`Processing ${user.name}...`);

      // 1. Create Auth User
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: 'Staff@123',
        email_confirm: true,
        user_metadata: { name: user.name }
      });

      let userId;

      if (authError) {
        if (authError.message.includes('already registered')) {
          console.log(`User ${user.email} already exists. Fetching ID...`);
          const { data: listData } = await supabase.auth.admin.listUsers();
          const existing = listData.users.find(u => u.email === user.email);
          if (existing) userId = existing.id;
        } else {
          console.error(`Failed to create auth user for ${user.name}:`, authError.message);
          continue;
        }
      } else {
        userId = authData.user.id;
        console.log(`Created Auth User: ${userId}`);
      }

      if (!userId) {
        console.error(`Could not resolve User ID for ${user.name}`);
        continue;
      }

      // 2. Create Profile (public.profiles)
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: userId,
        name: user.name,
        role: 'EMPLOYEE'
      });

      if (profileError) console.error(`Profile error for ${user.name}:`, profileError.message);

      // 3. Create Employee Record (public.employees)
      const { error: empError } = await supabase.from('employees').upsert({
        id: userId,
        employee_code: `EMP-${user.name.toUpperCase()}`,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: 'Staff',
        department: 'Operations',
        status: 'ACTIVE',
        joining_date: new Date().toISOString().split('T')[0],
        shift_start: '09:00',
        shift_end: '18:00'
      });

      if (empError) {
        console.error(`Employee record error for ${user.name}:`, empError.message);
      } else {
        console.log(`Successfully onboarded ${user.name}`);
      }

    } catch (err) {
      console.error(`Unexpected error for ${user.name}:`, err);
    }
  }

  console.log("Seed process completed.");
}

seedUsers();
