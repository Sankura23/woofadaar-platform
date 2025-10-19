const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixAnswerCounts() {
  try {
    console.log('Connecting to database...');

    // Get all questions
    const questions = await prisma.communityQuestion.findMany({
      select: {
        id: true,
        answer_count: true
      }
    });

    console.log(`Found ${questions.length} questions to check`);

    for (const question of questions) {
      // Count actual active answers
      const actualAnswerCount = await prisma.communityAnswer.count({
        where: {
          question_id: question.id,
          status: 'active'
        }
      });

      if (question.answer_count !== actualAnswerCount) {
        console.log(`Updating question ${question.id}: ${question.answer_count} -> ${actualAnswerCount}`);

        await prisma.communityQuestion.update({
          where: { id: question.id },
          data: { answer_count: actualAnswerCount }
        });
      }
    }

    console.log('Answer counts have been fixed!');

  } catch (error) {
    console.error('Error fixing answer counts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAnswerCounts();