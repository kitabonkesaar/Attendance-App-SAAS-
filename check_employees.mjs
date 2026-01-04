
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://bnyiujoijyftorvvycuz.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJueWl1am9panlmdG9ydnZ5Y3V6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQyMjUxMSwiZXhwIjoyMDgyOTk4NTExfQ.r-VQMDBGkkIRangrxc6r0OFMGSC5bGZjyHCN-kU2sS4";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEmployees() {
  console.log("Checking employees in database...");
  const { data, error } = await supabase.from('employees').select('id, name, employee_code, email');
  
  if (error) {
    console.error("Error fetching employees:", error);
    return;
  }
  
  console.log(`Found ${data.length} employees:`);
  console.table(data);
}

checkEmployees();
