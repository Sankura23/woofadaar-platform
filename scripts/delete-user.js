const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function deleteUser() {
  try {
    const userId = 'a402a75d-c9e2-47f3-b9ea-418f54d8c8fa';

    console.log(`Deleting user with ID: ${userId}`);

    const deletedUser = await prisma.user.delete({
      where: { id: userId }
    });

    console.log('✅ User deleted successfully:', deletedUser);

  } catch (error) {
    console.error('Error deleting user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteUser();