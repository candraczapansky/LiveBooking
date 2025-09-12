const pg = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/salon_app';

async function addSchedulePermissions() {
  const client = new pg.Client({ connectionString });
  
  try {
    await client.connect();
    console.log('Connected to database');

    // Add missing schedule permissions
    const schedulePermissions = [
      { name: 'view_own_schedule', category: 'schedules', action: 'view', resource: 'own_schedule', description: 'View own schedule' },
      { name: 'edit_own_schedule', category: 'schedules', action: 'update', resource: 'own_schedule', description: 'Edit own schedule' },
      { name: 'edit_schedules', category: 'schedules', action: 'update', resource: 'schedules', description: 'Edit all schedules' },
    ];

    for (const perm of schedulePermissions) {
      // Check if permission already exists
      const checkResult = await client.query(
        'SELECT id FROM permissions WHERE name = $1',
        [perm.name]
      );

      if (checkResult.rows.length === 0) {
        // Add the permission
        const insertResult = await client.query(
          `INSERT INTO permissions (name, category, action, resource, description, is_active) 
           VALUES ($1, $2, $3, $4, $5, true) 
           RETURNING id`,
          [perm.name, perm.category, perm.action, perm.resource, perm.description]
        );
        console.log(`Added permission: ${perm.name} (ID: ${insertResult.rows[0].id})`);
      } else {
        console.log(`Permission already exists: ${perm.name}`);
      }
    }

    // Grant view_own_schedule and edit_own_schedule to basic staff users
    console.log('\nGranting schedule permissions to basic staff users...');
    
    // Get the permissions we need to grant
    const permissionResult = await client.query(
      `SELECT id FROM permissions 
       WHERE name IN ('view_own_schedule', 'edit_own_schedule')`
    );
    
    const permissionIds = permissionResult.rows.map(row => row.id);
    
    if (permissionIds.length > 0) {
      // Get all users with the 'basic_staff' role
      const usersResult = await client.query(
        `SELECT id FROM users WHERE role = 'basic_staff'`
      );
      
      console.log(`Found ${usersResult.rows.length} basic staff users`);
      
      for (const user of usersResult.rows) {
        for (const permId of permissionIds) {
          // Check if user already has this permission
          const checkUserPerm = await client.query(
            'SELECT id FROM user_direct_permissions WHERE user_id = $1 AND permission_id = $2',
            [user.id, permId]
          );
          
          if (checkUserPerm.rows.length === 0) {
            // Grant the permission
            await client.query(
              `INSERT INTO user_direct_permissions (user_id, permission_id, is_granted, granted_by) 
               VALUES ($1, $2, true, (SELECT id FROM users WHERE role = 'admin' LIMIT 1))`,
              [user.id, permId]
            );
            console.log(`Granted permission to user ${user.id}`);
          }
        }
      }
    }

    // Also ensure edit_schedules permission exists for admin/managers
    const editSchedulesCheck = await client.query(
      'SELECT id FROM permissions WHERE name = $1',
      ['edit_schedules']
    );

    if (editSchedulesCheck.rows.length > 0) {
      // Grant edit_schedules to admin users
      const adminUsers = await client.query(
        `SELECT id FROM users WHERE role = 'admin'`
      );
      
      for (const admin of adminUsers.rows) {
        const checkAdminPerm = await client.query(
          'SELECT id FROM user_direct_permissions WHERE user_id = $1 AND permission_id = $2',
          [admin.id, editSchedulesCheck.rows[0].id]
        );
        
        if (checkAdminPerm.rows.length === 0) {
          await client.query(
            `INSERT INTO user_direct_permissions (user_id, permission_id, is_granted, granted_by) 
             VALUES ($1, $2, true, $1)`,
            [admin.id, editSchedulesCheck.rows[0].id]
          );
          console.log(`Granted edit_schedules to admin user ${admin.id}`);
        }
      }
    }

    console.log('\n✓ Schedule permissions setup complete!');
    
  } catch (error) {
    console.error('Error setting up permissions:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run the function
addSchedulePermissions()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
