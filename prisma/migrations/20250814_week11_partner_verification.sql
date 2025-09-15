-- Week 11: Partner Verification Enhancement Database Schema
-- Dog ID Verification Tracking
CREATE TABLE dog_id_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id VARCHAR(20) NOT NULL,
  partner_id UUID NOT NULL,
  verification_type VARCHAR(50) NOT NULL, -- 'appointment', 'emergency', 'routine', 'insurance'
  access_reason TEXT NOT NULL,
  health_data_accessed JSONB DEFAULT '{}', -- track which health data was accessed
  location_coordinates POINT, -- GPS location of access
  ip_address INET,
  user_agent TEXT,
  session_duration_seconds INTEGER,
  verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verified_by UUID,
  audit_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enhanced Partners Table (add new columns to existing table)
ALTER TABLE partners ADD COLUMN IF NOT EXISTS dog_id_access_level VARCHAR(20) DEFAULT 'basic';
ALTER TABLE partners ADD COLUMN IF NOT EXISTS emergency_access_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS last_dog_id_access TIMESTAMP;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS total_verifications_count INTEGER DEFAULT 0;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS digital_certificate_hash VARCHAR(256);
ALTER TABLE partners ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS api_rate_limit INTEGER DEFAULT 100;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS compliance_status VARCHAR(20) DEFAULT 'pending';

-- Security Audit Logs
CREATE TABLE security_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID,
  user_id UUID,
  action_type VARCHAR(100) NOT NULL, -- 'login', 'dog_id_access', 'data_export', 'record_update'
  resource_accessed VARCHAR(200),
  success BOOLEAN NOT NULL,
  failure_reason TEXT,
  ip_address INET,
  user_agent TEXT,
  location_country VARCHAR(100),
  location_city VARCHAR(100),
  risk_score INTEGER DEFAULT 0, -- 0-100 risk assessment
  flagged_for_review BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Partner Notifications
CREATE TABLE partner_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL,
  notification_type VARCHAR(100) NOT NULL, -- 'new_appointment', 'emergency_access', 'system_alert'
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  action_url VARCHAR(500),
  priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_dog_verifications_partner ON dog_id_verifications(partner_id, verified_at DESC);
CREATE INDEX IF NOT EXISTS idx_dog_verifications_dog ON dog_id_verifications(dog_id, verified_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_partner ON security_audit_logs(partner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_high_risk ON security_audit_logs(risk_score DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_partner_notifications ON partner_notifications(partner_id, created_at DESC);

-- Add foreign key constraints (if tables exist)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'partners') THEN
        ALTER TABLE dog_id_verifications ADD CONSTRAINT fk_verification_partner 
        FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE;
        
        ALTER TABLE security_audit_logs ADD CONSTRAINT fk_audit_partner 
        FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE SET NULL;
        
        ALTER TABLE partner_notifications ADD CONSTRAINT fk_notification_partner 
        FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dogs') THEN
        ALTER TABLE dog_id_verifications ADD CONSTRAINT fk_verification_dog 
        FOREIGN KEY (dog_id) REFERENCES dogs(dog_id) ON DELETE CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        ALTER TABLE dog_id_verifications ADD CONSTRAINT fk_verification_user 
        FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL;
        
        ALTER TABLE security_audit_logs ADD CONSTRAINT fk_audit_user 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;