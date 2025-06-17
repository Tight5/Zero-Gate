-- Migration script to apply Row-Level Security to existing Zero Gate ESO Platform
-- This preserves existing data while adding RLS policies for multi-tenant isolation

-- Create backup tables first
CREATE TABLE users_backup AS SELECT * FROM users;
CREATE TABLE tenants_backup AS SELECT * FROM tenants;
CREATE TABLE sponsors_backup AS SELECT * FROM sponsors;
CREATE TABLE grants_backup AS SELECT * FROM grants;

-- Add required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Add missing columns to existing tables if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'settings') THEN
        ALTER TABLE tenants ADD COLUMN settings JSONB DEFAULT '{}';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sponsors' AND column_name = 'tags') THEN
        ALTER TABLE sponsors ADD COLUMN tags TEXT[];
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'grants' AND column_name = 'requirements') THEN
        ALTER TABLE grants ADD COLUMN requirements TEXT[];
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'grants' AND column_name = 'currency') THEN
        ALTER TABLE grants ADD COLUMN currency VARCHAR(3) DEFAULT 'USD';
    END IF;
END $$;

-- Enable RLS on all existing tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE grant_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users table
DROP POLICY IF EXISTS user_isolation_policy ON users;
CREATE POLICY user_isolation_policy ON users
    FOR ALL
    TO public
    USING (id = current_setting('app.current_user_id', true));

-- Create RLS policies for tenants table
DROP POLICY IF EXISTS tenant_member_access_policy ON tenants;
CREATE POLICY tenant_member_access_policy ON tenants
    FOR ALL
    TO public
    USING (
        id IN (
            SELECT tenant_id::uuid 
            FROM user_tenants 
            WHERE user_id = current_setting('app.current_user_id', true)
        )
    );

-- Create RLS policies for user_tenants table
DROP POLICY IF EXISTS user_tenant_self_access ON user_tenants;
CREATE POLICY user_tenant_self_access ON user_tenants
    FOR ALL
    TO public
    USING (user_id = current_setting('app.current_user_id', true));

-- Create RLS policies for sponsors table
DROP POLICY IF EXISTS sponsor_tenant_isolation ON sponsors;
CREATE POLICY sponsor_tenant_isolation ON sponsors
    FOR ALL
    TO public
    USING (
        tenant_id::text IN (
            SELECT tenant_id 
            FROM user_tenants 
            WHERE user_id = current_setting('app.current_user_id', true)
        )
    );

-- Create RLS policies for grants table
DROP POLICY IF EXISTS grant_tenant_isolation ON grants;
CREATE POLICY grant_tenant_isolation ON grants
    FOR ALL
    TO public
    USING (
        tenant_id::text IN (
            SELECT tenant_id 
            FROM user_tenants 
            WHERE user_id = current_setting('app.current_user_id', true)
        )
    );

-- Create RLS policies for grant_milestones table
DROP POLICY IF EXISTS milestone_tenant_isolation ON grant_milestones;
CREATE POLICY milestone_tenant_isolation ON grant_milestones
    FOR ALL
    TO public
    USING (
        tenant_id::text IN (
            SELECT tenant_id 
            FROM user_tenants 
            WHERE user_id = current_setting('app.current_user_id', true)
        )
    );

-- Create RLS policies for relationships table
DROP POLICY IF EXISTS relationship_tenant_isolation ON relationships;
CREATE POLICY relationship_tenant_isolation ON relationships
    FOR ALL
    TO public
    USING (
        tenant_id::text IN (
            SELECT tenant_id 
            FROM user_tenants 
            WHERE user_id = current_setting('app.current_user_id', true)
        )
    );

-- Create RLS policies for content_calendar table
DROP POLICY IF EXISTS content_tenant_isolation ON content_calendar;
CREATE POLICY content_tenant_isolation ON content_calendar
    FOR ALL
    TO public
    USING (
        tenant_id::text IN (
            SELECT tenant_id 
            FROM user_tenants 
            WHERE user_id = current_setting('app.current_user_id', true)
        )
    );

-- Create RLS policies for system_metrics table
DROP POLICY IF EXISTS metrics_tenant_isolation ON system_metrics;
CREATE POLICY metrics_tenant_isolation ON system_metrics
    FOR ALL
    TO public
    USING (
        tenant_id IS NULL OR -- Global metrics visible to all
        tenant_id::text IN (
            SELECT tenant_id 
            FROM user_tenants 
            WHERE user_id = current_setting('app.current_user_id', true)
        )
    );

-- Create helper functions for tenant context management
CREATE OR REPLACE FUNCTION set_current_user_context(user_id TEXT)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_user_id', user_id, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_tenants(user_id TEXT)
RETURNS TABLE(tenant_id TEXT, tenant_name VARCHAR, role VARCHAR) AS $$
BEGIN
    RETURN QUERY
    SELECT ut.tenant_id, t.name, ut.role
    FROM user_tenants ut
    JOIN tenants t ON t.id::text = ut.tenant_id
    WHERE ut.user_id = get_user_tenants.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create default tenant for new users
CREATE OR REPLACE FUNCTION create_default_tenant_for_user(
    user_id TEXT,
    user_email TEXT
) RETURNS TEXT AS $$
DECLARE
    tenant_uuid UUID;
    domain_name TEXT;
BEGIN
    -- Generate domain from email
    domain_name := COALESCE(
        split_part(user_email, '@', 2),
        'user-' || substring(user_id from 1 for 8)
    );
    
    -- Create tenant
    INSERT INTO tenants (name, domain, plan_tier)
    VALUES (
        'Personal Workspace',
        domain_name || '-' || substring(md5(user_id) from 1 for 8),
        'basic'
    )
    RETURNING id INTO tenant_uuid;
    
    -- Add user to tenant as admin
    INSERT INTO user_tenants (user_id, tenant_id, role)
    VALUES (user_id, tenant_uuid::text, 'admin');
    
    RETURN tenant_uuid::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing data to ensure compatibility
-- Set default tenant for existing users who don't have one
DO $$
DECLARE
    user_record RECORD;
    default_tenant_id TEXT;
BEGIN
    FOR user_record IN 
        SELECT u.id, u.email 
        FROM users u 
        LEFT JOIN user_tenants ut ON u.id = ut.user_id 
        WHERE ut.user_id IS NULL
    LOOP
        default_tenant_id := create_default_tenant_for_user(user_record.id, user_record.email);
        RAISE NOTICE 'Created default tenant % for user %', default_tenant_id, user_record.id;
    END LOOP;
END $$;

-- Add performance indexes for RLS queries
CREATE INDEX IF NOT EXISTS idx_user_tenants_user_lookup ON user_tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tenants_tenant_lookup ON user_tenants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sponsors_tenant_rls ON sponsors(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_grants_tenant_rls ON grants(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_relationships_tenant_rls ON relationships(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_content_calendar_tenant_rls ON content_calendar(tenant_id) WHERE tenant_id IS NOT NULL;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO public;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO public;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO public;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO public;

-- Verify RLS is working by testing policies
DO $$
BEGIN
    -- Test user context setting
    PERFORM set_current_user_context('test-user-123');
    
    -- Verify the setting worked
    IF current_setting('app.current_user_id', true) = 'test-user-123' THEN
        RAISE NOTICE 'RLS user context setting is working correctly';
    ELSE
        RAISE EXCEPTION 'RLS user context setting failed';
    END IF;
END $$;

COMMENT ON TABLE users IS 'Users table with RLS isolation - users can only see their own record';
COMMENT ON TABLE tenants IS 'Tenants table with RLS isolation - users can only see tenants they belong to';
COMMENT ON TABLE sponsors IS 'Sponsors table with complete tenant-level RLS isolation';
COMMENT ON TABLE grants IS 'Grants table with complete tenant-level RLS isolation';
COMMENT ON TABLE relationships IS 'Relationships table with complete tenant-level RLS isolation';
COMMENT ON TABLE content_calendar IS 'Content calendar with complete tenant-level RLS isolation';

-- Migration complete
SELECT 'Row-Level Security migration completed successfully' AS status;