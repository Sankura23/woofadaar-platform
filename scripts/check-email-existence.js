const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkEmailExistence() {
  try {
    const email = 's@c.com';

    console.log(`Checking for email: ${email}`);

    // Check User table
    const users = await prisma.user.findMany({
      where: { email },
      select: { id: true, email: true, name: true, created_at: true }
    });

    // Check Partner table
    const partners = await prisma.partner.findMany({
      where: { email },
      select: { id: true, email: true, name: true, created_at: true }
    });

    console.log('Users found:', users);
    console.log('Partners found:', partners);

    if (users.length === 0 && partners.length === 0) {
      console.log('✅ Email is completely clean - should be able to register');
    } else {
      console.log('❌ Email still exists in database - this is why registration fails');

      // Show how to clean it up
      if (users.length > 0) {
        console.log('To clean up users:');
        users.forEach(user => {
          console.log(`  DELETE FROM User WHERE id = '${user.id}';`);
        });
      }

      if (partners.length > 0) {
        console.log('To clean up partners:');
        partners.forEach(partner => {
          console.log(`  DELETE FROM Partner WHERE id = '${partner.id}';`);
        });
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkEmailExistence();