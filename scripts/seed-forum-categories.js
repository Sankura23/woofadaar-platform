const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const defaultCategories = [
  {
    name: 'Health & Medical',
    description: 'Health concerns, symptoms, vet visits, and medical advice',
    slug: 'health-medical',
    icon: '🏥',
    color: '#dc2626',
    sort_order: 1
  },
  {
    name: 'Training & Behavior',
    description: 'Dog training tips, behavioral issues, and obedience',
    slug: 'training-behavior',
    icon: '🎓',
    color: '#2563eb',
    sort_order: 2
  },
  {
    name: 'Nutrition & Diet',
    description: 'Food recommendations, feeding schedules, and dietary questions',
    slug: 'nutrition-diet',
    icon: '🍖',
    color: '#16a34a',
    sort_order: 3
  },
  {
    name: 'Puppy Care',
    description: 'Everything about raising and caring for puppies',
    slug: 'puppy-care',
    icon: '🐶',
    color: '#f59e0b',
    sort_order: 4
  },
  {
    name: 'Breed Discussions',
    description: 'Breed-specific questions, characteristics, and experiences',
    slug: 'breed-discussions',
    icon: '🐕',
    color: '#7c3aed',
    sort_order: 5
  },
  {
    name: 'General Care',
    description: 'Daily care, grooming, exercise, and general questions',
    slug: 'general-care',
    icon: '🛁',
    color: '#059669',
    sort_order: 6
  },
  {
    name: 'Success Stories',
    description: 'Share your success stories and achievements',
    slug: 'success-stories',
    icon: '🏆',
    color: '#d97706',
    sort_order: 7
  },
  {
    name: 'Local Community',
    description: 'Location-specific discussions, meetups, and local recommendations',
    slug: 'local-community',
    icon: '📍',
    color: '#be185d',
    sort_order: 8
  },
  {
    name: 'Products & Reviews',
    description: 'Product recommendations, reviews, and shopping advice',
    slug: 'products-reviews',
    icon: '🛍️',
    color: '#0891b2',
    sort_order: 9
  },
  {
    name: 'Emergency & Urgent',
    description: 'Urgent situations requiring immediate help or advice',
    slug: 'emergency-urgent',
    icon: '🚨',
    color: '#dc2626',
    sort_order: 0
  }
];

async function seedForumCategories() {
  console.log('🌱 Seeding forum categories...');
  
  try {
    // Check if categories already exist
    const existingCategories = await prisma.forumCategory.findMany();
    if (existingCategories.length > 0) {
      console.log(`📊 Found ${existingCategories.length} existing categories. Skipping seed.`);
      console.log('Existing categories:');
      existingCategories.forEach(cat => {
        console.log(`  - ${cat.icon} ${cat.name} (${cat.post_count} posts)`);
      });
      return;
    }

    // Create categories
    const createdCategories = [];
    for (const categoryData of defaultCategories) {
      const category = await prisma.forumCategory.create({
        data: categoryData
      });
      createdCategories.push(category);
      console.log(`✅ Created: ${category.icon} ${category.name}`);
    }

    console.log(`🎉 Successfully created ${createdCategories.length} forum categories!`);
    
    // Display summary
    console.log('\n📋 Forum Categories Summary:');
    createdCategories
      .sort((a, b) => a.sort_order - b.sort_order)
      .forEach((cat, index) => {
        console.log(`${index + 1}. ${cat.icon} ${cat.name} - ${cat.description}`);
      });

  } catch (error) {
    console.error('❌ Error seeding forum categories:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
if (require.main === module) {
  seedForumCategories()
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { seedForumCategories };