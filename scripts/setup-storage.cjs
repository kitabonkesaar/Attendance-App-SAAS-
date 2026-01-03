
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bnyiujoijyftorvvycuz.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJueWl1am9panlmdG9ydnZ5Y3V6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzQyMjUxMSwiZXhwIjoyMDgyOTk4NTExfQ.r-VQMDBGkkIRangrxc6r0OFMGSC5bGZjyHCN-kU2sS4';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function setupStorage() {
  const bucketName = 'attendance-photos';
  console.log(`Checking storage bucket: ${bucketName}...`);

  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  
  if (listError) {
    console.error('❌ Failed to list buckets:', listError.message);
    return;
  }

  const bucketExists = buckets.some(b => b.name === bucketName);

  if (!bucketExists) {
    console.log(`Bucket '${bucketName}' not found. Creating...`);
    const { data, error: createError } = await supabase.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/jpeg', 'image/png']
    });

    if (createError) {
      console.error('❌ Failed to create bucket:', createError.message);
    } else {
      console.log('✅ Bucket created successfully!');
    }
  } else {
    console.log(`✅ Bucket '${bucketName}' already exists.`);
    
    // Ensure it is public
    const { error: updateError } = await supabase.storage.updateBucket(bucketName, {
      public: true
    });
    
    if (updateError) console.warn('⚠️ Could not verify/update bucket public status:', updateError.message);
  }

  // Set Policy (Optional: Service role can always access, but for client uploads we need RLS)
  // Since we can't run SQL easily from here without the SQL editor or specific postgres connection,
  // we will assume the public bucket setting handles the read access.
  // For write access, Supabase Storage usually requires an RLS policy.
  // We will print the SQL needed for the user to run if uploads fail.
  
  console.log('\nIMPORTANT: Ensure these Policies exist in your Supabase Dashboard -> Storage -> Policies:');
  console.log('1. SELECT: Enable "Give users access to all files" (or specific logic)');
  console.log('2. INSERT: Enable "Allow authenticated uploads" (or anon if needed)');
}

setupStorage();
