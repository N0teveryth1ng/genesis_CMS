require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const db = new PrismaClient();

db.user.findMany()
  .then(async (users) => {
    console.log('Total users:', users.length);
    for (const u of users) {
      console.log('\n--- User ---');
      console.log('id:     ', u.id);
      console.log('name:   ', u.name);
      console.log('email:  ', u.email);
      console.log('role:   ', u.role);
      console.log('active: ', u.active);
      const ok = await bcrypt.compare('genesis123', u.password);
      console.log('password "genesis123" matches:', ok);
    }
  })
  .catch(e => console.error('DB ERROR:', e.message))
  .finally(() => db.$disconnect());
