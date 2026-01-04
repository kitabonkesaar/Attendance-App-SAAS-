
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bnyiujoijyftorvvycuz.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJueWl1am9panlmdG9ydnZ5Y3V6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQyMjUxMSwiZXhwIjoyMDgyOTk4NTExfQ.r-VQMDBGkkIRangrxc6r0OFMGSC5bGZjyHCN-kU2sS4';

const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
    console.log('Fetching users from Auth...');
    const { data: { users }, error: authError } = await adminSupabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    
    if (authError) {
        console.error('Auth Error:', authError);
        return;
    }
    
    console.log(`Found ${users.length} users in Auth.`);
    
    console.log('Fetching existing employees...');
    const { data: existing, error: fetchError } = await adminSupabase.from('employees').select('id, email');
    
    if (fetchError) {
        console.error('Fetch Error:', fetchError);
        return;
    }
    
    console.log(`Found ${existing.length} existing employees.`);
    
    const existingMap = new Set(existing.map(e => e.id));
    const newUsers = users.filter(u => !existingMap.has(u.id));
    
    console.log(`Found ${newUsers.length} users to sync.`);
    
    if (newUsers.length > 0) {
        const newEmployees = newUsers.map(u => ({
             id: u.id,
             email: u.email,
             name: u.user_metadata?.name || u.email?.split('@')[0] || 'Unknown',
             employee_code: `EMP${Math.floor(1000 + Math.random() * 9000)}`,
             role: 'Staff',
             status: 'ACTIVE',
             created_at: u.created_at,
             mobile: u.phone || `000-000-${Math.floor(1000 + Math.random() * 9000)}`, // Dummy mobile if missing because it's required
             department: 'General'
        }));
        
        console.log('First new employee payload:', newEmployees[0]);

        const { error: insertError } = await adminSupabase.from('employees').upsert(newEmployees);
        
        if (insertError) {
            console.error('Insert Error:', insertError);
        } else {
            console.log('Successfully synced users!');
        }
    } else {
        console.log('No new users to sync.');
    }
}

run();
