-- Week 13: Corporate Partnership Program Database Schema
-- Creating comprehensive corporate partnership system tables

-- Corporate Companies
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  email_domain VARCHAR(100) NOT NULL UNIQUE, -- @company.com
  industry VARCHAR(100),
  employee_count INTEGER,
  address TEXT,
  billing_address TEXT,
  contact_person VARCHAR(100),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(15),
  logo_url VARCHAR(500),
  subscription_tier VARCHAR(20) DEFAULT 'basic', -- basic, premium, enterprise
  billing_cycle VARCHAR(10) DEFAULT 'monthly', -- monthly, annual
  status VARCHAR(20) DEFAULT 'active', -- active, suspended, cancelled
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Corporate Admins (HR/Admin users)
CREATE TABLE corporate_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'admin', -- admin, hr, manager
  permissions JSONB DEFAULT '[]', -- array of permissions
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Employee Enrollments
CREATE TABLE employee_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  employee_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  employee_email VARCHAR(255) NOT NULL,
  employee_name VARCHAR(100),
  department VARCHAR(100),
  enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active', -- active, inactive, pending
  pet_allowance_used DECIMAL(10,2) DEFAULT 0.00,
  pet_allowance_limit DECIMAL(10,2) DEFAULT 5000.00, -- in INR
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Corporate Dog IDs (enhance existing dogs table)
ALTER TABLE dogs ADD COLUMN company_id UUID REFERENCES companies(id);
ALTER TABLE dogs ADD COLUMN is_corporate_pet BOOLEAN DEFAULT false;
ALTER TABLE dogs ADD COLUMN corporate_benefits_active BOOLEAN DEFAULT false;

-- Corporate Billing
CREATE TABLE corporate_billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  employee_count INTEGER NOT NULL,
  pet_count INTEGER NOT NULL,
  base_amount DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) DEFAULT 0.00,
  tax_amount DECIMAL(10,2) DEFAULT 0.00,
  total_amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  status VARCHAR(20) DEFAULT 'pending', -- pending, paid, overdue, cancelled
  invoice_url VARCHAR(500),
  payment_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pet Benefit Claims
CREATE TABLE pet_benefit_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_enrollment_id UUID REFERENCES employee_enrollments(id),
  dog_id UUID REFERENCES dogs(id),
  claim_type VARCHAR(30), -- vet_visit, vaccination, insurance, training
  claim_amount DECIMAL(10,2) NOT NULL,
  receipt_url VARCHAR(500),
  claim_date DATE NOT NULL,
  approval_status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
  approved_amount DECIMAL(10,2),
  approved_by UUID REFERENCES corporate_admins(id),
  approved_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_companies_email_domain ON companies(email_domain);
CREATE INDEX idx_employee_enrollments_company ON employee_enrollments(company_id);
CREATE INDEX idx_employee_enrollments_user ON employee_enrollments(employee_user_id);
CREATE INDEX idx_dogs_company ON dogs(company_id);
CREATE INDEX idx_corporate_billing_company ON corporate_billing(company_id);
CREATE INDEX idx_pet_benefit_claims_employee ON pet_benefit_claims(employee_enrollment_id);
CREATE INDEX idx_pet_benefit_claims_dog ON pet_benefit_claims(dog_id);

-- Insert sample corporate subscription tiers data
INSERT INTO companies (name, email_domain, industry, employee_count, contact_person, contact_email, subscription_tier) VALUES
('TechCorp India', 'techcorp.com', 'Technology', 150, 'Priya Sharma', 'hr@techcorp.com', 'premium'),
('Mumbai Marketing Ltd', 'mumbaimarketing.com', 'Marketing', 45, 'Rahul Patel', 'rahul.patel@mumbaimarketing.com', 'basic'),
('Bangalore Innovations', 'bangaloreinnovations.com', 'Software', 300, 'Anjali Nair', 'anjali@bangaloreinnovations.com', 'enterprise');