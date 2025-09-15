// Delete test subscriptions (keep only the first one as example)
async function deleteTestSubscriptions() {
  console.log("Cleaning up test subscriptions...\n");
  
  try {
    // IDs to delete: 11, 12, 13, 14, 15 (keeping ID 10 as example)
    const idsToDelete = [11, 12, 13, 14, 15];
    
    for (const id of idsToDelete) {
      console.log(`Deleting subscription ID ${id}...`);
      const response = await fetch(`http://localhost:5000/api/client-memberships/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        console.log(`  ✓ Deleted subscription ${id}`);
      } else {
        console.log(`  ✗ Failed to delete ${id}: ${response.status}`);
      }
    }
    
    console.log("\nVerifying remaining subscriptions...");
    const checkRes = await fetch('http://localhost:5000/api/client-memberships');
    const remaining = await checkRes.json();
    console.log(`Remaining subscriptions: ${remaining.length}`);
    remaining.forEach(s => {
      const client = s.client || {};
      console.log(`  - ID ${s.id}: ${client.firstName} ${client.lastName}`);
    });
    
  } catch (error) {
    console.error("Error:", error.message);
  }
}

deleteTestSubscriptions();
