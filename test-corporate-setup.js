const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function setupTestCorporateData() {
  console.log('🏢 Setting up corporate partnership test data...');

  try {
    // 1. Create a test company
    const company = await prisma.company.upsert({
      where: { email_domain: 'testcorp.com' },
      update: {},
      create: {
        name: 'Test Corporation',
        email_domain: 'testcorp.com',
        contact_email: 'hr@testcorp.com',
        subscription_tier: 'premium',
        billing_cycle: 'monthly',
        employee_count: 50,
        status: 'active',
        logo_url: 'https://via.placeholder.com/100x100?text=TestCorp'
      }
    });
    console.log('✅ Created company:', company.name);

    // 2. Create a corporate admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@testcorp.com' },
      update: {},
      create: {
        id: `admin-${Date.now()}`,
        email: 'admin@testcorp.com',
        name: 'Corporate Admin',
        password_hash: hashedPassword,
        updated_at: new Date()
      }
    });
    console.log('✅ Created admin user:', adminUser.email);

    // 3. Create corporate admin record
    try {
      const corporateAdmin = await prisma.corporateAdmin.create({
        data: {
          id: `cadmin-${Date.now()}`,
          user_id: adminUser.id,
          company_id: company.id,
          role: 'admin',
          permissions: ['manage_employees', 'view_billing', 'generate_dog_ids'],
          department: 'Human Resources'
        }
      });
      console.log('✅ Created corporate admin record');
    } catch (e) {
      console.log('ℹ️ Corporate admin already exists');
    }

    // 4. Create an employee user
    const employeePassword = await bcrypt.hash('emp123', 10);
    const employeeUser = await prisma.user.upsert({
      where: { email: 'john.doe@testcorp.com' },
      update: {},
      create: {
        id: `emp-${Date.now()}`,
        email: 'john.doe@testcorp.com',
        name: 'John Doe',
        password_hash: employeePassword,
        updated_at: new Date()
      }
    });
    console.log('✅ Created employee user:', employeeUser.email);

    // 5. Create employee enrollment
    try {
      const enrollment = await prisma.employeeEnrollment.create({
        data: {
          id: `enroll-${Date.now()}`,
          company_id: company.id,
          employee_user_id: employeeUser.id,
          employee_email: 'john.doe@testcorp.com',
          employee_name: 'John Doe',
          department: 'Engineering',
          status: 'active',
          pet_allowance_limit: 10000, // ₹10,000 allowance
          invitation_code: 'TESTCORP2024'
        }
      });
      console.log('✅ Created employee enrollment');
    } catch (e) {
      console.log('ℹ️ Employee enrollment already exists');
    }

    // 6. Create a sample billing record
    const billing = await prisma.corporateBilling.create({
      data: {
        company_id: company.id,
        billing_period_start: new Date('2024-01-01'),
        billing_period_end: new Date('2024-01-31'),
        employee_count: 50,
        pet_count: 25,
        base_amount: 8000, // Premium tier base price
        tax_amount: 1440, // 18% GST
        total_amount: 9440,
        currency: 'INR',
        status: 'paid',
        payment_date: new Date('2024-02-01')
      }
    });
    console.log('✅ Created sample billing record');

    console.log('\n🎉 Test data setup complete!');
    console.log('\n📋 Test Accounts:');
    console.log('Corporate Admin:');
    console.log('  Email: admin@testcorp.com');
    console.log('  Password: admin123');
    console.log('  Company: testcorp.com');
    console.log('\nEmployee:');
    console.log('  Email: john.doe@testcorp.com');
    console.log('  Password: emp123');
    console.log('  Company: testcorp.com');
    console.log('  Allowance: ₹10,000');

    console.log('\n🔗 Test URLs:');
    console.log('Employee Login: http://localhost:3000/employee/login');
    console.log('Employee Portal: http://localhost:3000/employee/portal');
    console.log('Corporate Admin: http://localhost:3000/login (use admin credentials)');

  } catch (error) {
    console.error('❌ Error setting up test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupTestCorporateData();