
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://bnyiujoijyftorvvycuz.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJueWl1am9panlmdG9ydnZ5Y3V6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQyMjUxMSwiZXhwIjoyMDgyOTk4NTExfQ.r-VQMDBGkkIRangrxc6r0OFMGSC5bGZjyHCN-kU2sS4";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function checkData() {
  console.log("--- Checking Auth Users ---");
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) console.error("Auth Error:", authError);
  else {
    console.log(`Found ${users.length} Auth Users:`);
    users.forEach(u => console.log(` - ${u.email} (ID: ${u.id}) [Metadata: ${JSON.stringify(u.user_metadata)}]`));
  }

  console.log("\n--- Checking Public Employees ---");
  const { data: employees, error: empError } = await supabase.from('employees').select('*');
  if (empError) console.error("Employee Error:", empError);
  else {
    console.log(`Found ${employees.length} Employee Records:`);
    employees.forEach(e => console.log(` - ${e.email} (Name: ${e.name}) [Role: ${e.role}]`));
  }
}

checkData();
