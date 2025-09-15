// Find all staff members and their IDs
const db = require('./server/db');
const { staff, users } = require('./server/schema');
const { eq } = require('drizzle-orm');

async function getAllStaff() {
  const allStaff = await db.select({
    id: staff.id,
    userId: staff.userId,
    firstName: users.firstName,
    lastName: users.lastName,
    email: users.email,
    username: users.username
  })
  .from(staff)
  .leftJoin(users, eq(staff.userId, users.id));
  
  console.log('All staff members:');
  console.table(allStaff);
}

getAllStaff().catch(console.error);
