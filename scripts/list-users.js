const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        email: true,
        name: true,
        created_at: true
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    console.log('Existing users in database:');
    console.log('============================');
    users.forEach(user => {
      console.log(`Email: ${user.email}`);
      console.log(`Name: ${user.name || 'Not set'}`);
      console.log(`Created: ${user.created_at}`);
      console.log('----------------------------');
    });
    console.log(`\nTotal users: ${users.length}`);
    console.log('\nNote: Passwords are hashed and cannot be retrieved.');
    console.log('Users must use their original passwords or reset them.');

    // Show test accounts if any
    console.log('\n\nCommon test accounts to try:');
    console.log('Email: test@example.com | Password: password123');
    console.log('Email: demo@woofadaar.com | Password: demo123');
    console.log('Email: user@test.com | Password: test123');

  } catch (error) {
    console.error('Error fetching users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getUsers();