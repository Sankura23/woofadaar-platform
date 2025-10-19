const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function deleteSakshiComments() {
  try {
    console.log('Connecting to database...');

    // Focus on CommunityAnswer table which is what we see in the API response
    const sakshiCommunityAnswers = await prisma.communityAnswer.findMany({
      where: {
        user_id: 'user-1755769240167-fgxpbr06x'
      },
      include: {
        User: true
      }
    });

    console.log(`Found ${sakshiCommunityAnswers.length} community answers by Sakshi Gaikwad`);

    if (sakshiCommunityAnswers.length > 0) {
      sakshiCommunityAnswers.forEach(answer => {
        console.log(`- Answer ID: ${answer.id}, Content: ${answer.content?.substring(0, 50)}...`);
      });

      // Delete all community answers by Sakshi
      const deletedCommunity = await prisma.communityAnswer.deleteMany({
        where: {
          user_id: 'user-1755769240167-fgxpbr06x'
        }
      });

      console.log(`Deleted ${deletedCommunity.count} community answers by Sakshi Gaikwad`);
    }

    console.log('All Sakshi Gaikwad comments have been deleted successfully!');

  } catch (error) {
    console.error('Error deleting comments:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteSakshiComments();