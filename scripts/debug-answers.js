const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugAnswers() {
  try {
    console.log('Checking answers for first question...');

    // Check specific question that shows inconsistency
    const questionId = 'cmf6di2vw0010yghdbzr41uy2';

    const question = await prisma.communityQuestion.findFirst({
      where: { id: questionId },
      select: {
        id: true,
        title: true,
        answer_count: true,
        CommunityAnswer: {
          select: {
            id: true,
            status: true,
            content: true
          }
        },
        _count: {
          select: {
            CommunityAnswer: true
          }
        }
      }
    });

    console.log('Question:', question);

    // Count active answers manually
    const activeAnswers = await prisma.communityAnswer.count({
      where: {
        question_id: questionId,
        status: 'active'
      }
    });

    console.log('Active answers count:', activeAnswers);

    // Count all answers (any status)
    const allAnswers = await prisma.communityAnswer.count({
      where: {
        question_id: questionId
      }
    });

    console.log('Total answers count:', allAnswers);

    // Get all answers with status
    const answers = await prisma.communityAnswer.findMany({
      where: {
        question_id: questionId
      },
      select: {
        id: true,
        status: true,
        content: true
      }
    });

    console.log('All answers:', answers);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugAnswers();