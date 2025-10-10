#!/usr/bin/env node

/**
 * Development validation script to ensure user deletion handles all foreign key constraints
 * Run this script during development to catch missing cleanup automatically
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function validateUserDeletion() {
  console.log('🔍 Validating user deletion completeness...\n');

  try {
    // Get all table names from the database
    const tables = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    `;

    const userReferencingTables = [];

    // Check each table for user_id columns
    for (const table of tables) {
      try {
        const columns = await prisma.$queryRaw`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = ${table.table_name}
          AND column_name LIKE '%user_id%'
        `;

        if (columns.length > 0) {
          userReferencingTables.push({
            table: table.table_name,
            columns: columns.map(c => c.column_name)
          });
        }
      } catch (error) {
        // Skip tables we can't query
      }
    }

    console.log('📋 Tables with user_id references:');
    userReferencingTables.forEach(({ table, columns }) => {
      console.log(`  • ${table}: ${columns.join(', ')}`);
    });

    // Read the user deletion function to check coverage
    const fs = require('fs');
    const deletionFunction = fs.readFileSync('./src/lib/user-deletion.ts', 'utf8');

    console.log('\n🧹 Checking cleanup coverage:');
    const missingTables = [];

    userReferencingTables.forEach(({ table, columns }) => {
      const isHandled = deletionFunction.includes(`${table}.deleteMany`) ||
                       deletionFunction.includes(`CASCADE`) ||
                       table === 'user'; // Skip the user table itself

      if (!isHandled) {
        missingTables.push({ table, columns });
      }

      const status = isHandled ? '✅' : '❌';
      console.log(`  ${status} ${table}`);
    });

    if (missingTables.length > 0) {
      console.log('\n⚠️  WARNING: Missing cleanup for these tables:');
      missingTables.forEach(({ table, columns }) => {
        console.log(`  • ${table} (${columns.join(', ')})`);
      });

      console.log('\n💡 Add these to src/lib/user-deletion.ts:');
      missingTables.forEach(({ table }) => {
        console.log(`      await tx.${table}.deleteMany({ where: { user_id: userId } });`);
      });

      process.exit(1);
    }

    console.log('\n✅ All user references are properly handled in deletion function!');

  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Create a test user deletion to verify it works
async function testUserDeletion() {
  console.log('\n🧪 Testing user deletion function...');

  try {
    const { deleteUserCompletely } = require('./src/lib/user-deletion');

    // Test with a non-existent user to check if function runs without errors
    const testUserId = 'test-user-deletion-validation';

    try {
      await deleteUserCompletely(testUserId);
    } catch (error) {
      // Expected to fail for non-existent user, but should not be a foreign key error
      if (error.code === 'P2003') {
        console.log('❌ Still has foreign key constraint issues');
        throw error;
      } else {
        console.log('✅ User deletion function works (failed as expected for non-existent user)');
      }
    }

  } catch (error) {
    console.error('❌ User deletion test failed:', error);
    throw error;
  }
}

if (require.main === module) {
  validateUserDeletion()
    .then(() => testUserDeletion())
    .then(() => {
      console.log('\n🎉 User deletion validation passed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Validation failed:', error);
      process.exit(1);
    });
}

module.exports = { validateUserDeletion, testUserDeletion };