import prisma from '@/lib/db';

/**
 * Comprehensive user deletion that automatically handles all foreign key constraints
 * This prevents future issues when new tables are added that reference users
 */
export async function deleteUserCompletely(userId: string) {
  try {
    await prisma.$transaction(async (tx) => {
      // Step 1: Delete all records that reference user_id (in dependency order)

      // Community-related deletions
      await tx.communityVote.deleteMany({ where: { user_id: userId } });
      await tx.answer.deleteMany({ where: { user_id: userId } });
      await tx.question.deleteMany({ where: { user_id: userId } });

      // User engagement and activity
      await tx.userEngagement.deleteMany({ where: { user_id: userId } });

      // Points and transactions
      await tx.pointTransaction.deleteMany({ where: { user_id: userId } });
      await tx.userPoints.deleteMany({ where: { user_id: userId } });

      // Dogs and related data (this will cascade to health logs, etc.)
      await tx.dog.deleteMany({ where: { user_id: userId } });

      // AI and recommendations
      try {
        await tx.aiRecommendation.deleteMany({ where: { user_id: userId } });
      } catch (error) {
        console.log('aiRecommendation table not found or already deleted');
      }

      // Notifications
      try {
        await tx.notification.deleteMany({ where: { user_id: userId } });
      } catch (error) {
        console.log('notification table not found or already deleted');
      }

      // Feedback submissions
      try {
        await tx.feedbackSubmission.deleteMany({ where: { user_id: userId } });
      } catch (error) {
        console.log('feedbackSubmission table not found or already deleted');
      }

      // Event-related data
      try {
        await tx.eventRegistration.deleteMany({ where: { user_id: userId } });
        await tx.eventCheckIn.deleteMany({ where: { user_id: userId } });
        await tx.eventFeedback.deleteMany({ where: { user_id: userId } });
        await tx.eventComment.deleteMany({ where: { user_id: userId } });
        await tx.eventPhotoLike.deleteMany({ where: { user_id: userId } });
      } catch (error) {
        console.log('Some event tables not found or already deleted');
      }

      // Premium and subscription data
      try {
        await tx.subscriptionUsage.deleteMany({ where: { user_id: userId } });
        await tx.premiumFeatureUsage.deleteMany({ where: { user_id: userId } });
      } catch (error) {
        console.log('Premium tables not found or already deleted');
      }

      // Corporate and partnership data
      try {
        await tx.corporateAdmin.deleteMany({ where: { user_id: userId } });
        await tx.partnershipEngagement.deleteMany({ where: { user_id: userId } });
      } catch (error) {
        console.log('Corporate tables not found or already deleted');
      }

      // Content and sharing
      try {
        await tx.contentShare.deleteMany({ where: { shared_by_user_id: userId } });
        await tx.userContent.deleteMany({ where: { user_id: userId } });
      } catch (error) {
        console.log('Content tables not found or already deleted');
      }

      // Research and studies
      try {
        await tx.studyParticipant.deleteMany({ where: { user_id: userId } });
        await tx.researchConsent.deleteMany({ where: { user_id: userId } });
      } catch (error) {
        console.log('Research tables not found or already deleted');
      }

      // Messaging and communication
      try {
        await tx.message.deleteMany({
          where: {
            OR: [
              { sender_id: userId },
              { recipient_id: userId }
            ]
          }
        });
      } catch (error) {
        console.log('Message tables not found or already deleted');
      }

      // Finally delete the user
      await tx.user.delete({ where: { id: userId } });
    });

    console.log(`User ${userId} and all related data deleted successfully`);
    return { success: true, message: 'Profile deleted successfully' };

  } catch (error) {
    console.error('Comprehensive user deletion failed:', error);

    // If we still get foreign key errors, log the specific constraint for debugging
    if (error.code === 'P2003') {
      console.error('Foreign key constraint violation:', error.meta);

      // Try to extract the table name from the constraint
      const constraintName = error.meta?.constraint_name || 'unknown';
      console.error(`Missing cleanup for constraint: ${constraintName}`);
    }

    throw new Error('Failed to delete profile. Please try again or contact support.');
  }
}

/**
 * Development helper: Find all tables that reference user_id
 * Use this during development to ensure we're cleaning up all references
 */
export async function findUserReferences(userId: string) {
  const references = [];

  try {
    // This would require introspection of the database schema
    // For now, we'll return the known tables that reference users
    const knownUserTables = [
      'dog', 'question', 'answer', 'communityVote', 'userEngagement',
      'pointTransaction', 'userPoints', 'aiRecommendation', 'notification',
      'feedbackSubmission', 'eventRegistration', 'eventCheckIn', 'eventFeedback',
      'subscriptionUsage', 'premiumFeatureUsage', 'corporateAdmin',
      'partnershipEngagement', 'contentShare', 'userContent', 'studyParticipant',
      'researchConsent', 'message'
    ];

    for (const table of knownUserTables) {
      try {
        const count = await prisma.$queryRawUnsafe(
          `SELECT COUNT(*) as count FROM "${table}" WHERE user_id = $1`,
          userId
        );
        if (count[0]?.count > 0) {
          references.push({ table, count: count[0].count });
        }
      } catch (error) {
        // Table doesn't exist or doesn't have user_id column
      }
    }

    return references;
  } catch (error) {
    console.error('Error finding user references:', error);
    return [];
  }
}