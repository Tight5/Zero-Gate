-- Zero Gate ESO Platform - Multi-Tenant Row-Level Security Schema
-- Complete tenant isolation using PostgreSQL RLS policies
-- Based on attached assets specifications for enterprise-scale multi-tenancy

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS system_metrics CASCADE;
DROP TABLE IF EXISTS content_calendar CASCADE;
DROP TABLE IF EXISTS relationships CASCADE;
DROP TABLE IF EXISTS grant_milestones CASCADE;
DROP TABLE IF EXISTS grants CASCADE;
DROP TABLE IF EXISTS sponsors CASCADE;
DROP TABLE IF EXISTS user_tenants CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;

-- Session storage table (no RLS needed - managed by connect-pg-simple)
CREATE TABLE sessions (
    sid VARCHAR NOT NULL COLLATE "default",
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL,
    PRIMARY KEY (sid)
);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON sessions (expire);

-- Users table - global user accounts with RLS isolation
CREATE TABLE users (
    id VARCHAR PRIMARY KEY NOT NULL,
    email VARCHAR UNIQUE NOT NULL,
    first_name VARCHAR,
    last_name VARCHAR,
    profile_image_url VARCHAR,
    password_hash VARCHAR, -- For JWT authentication
    role VARCHAR DEFAULT 'user', -- Global role: admin, user
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Tenants table - organizational units with complete isolation
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    domain VARCHAR(255), -- Custom domain for tenant
    settings JSONB DEFAULT '{}', -- Tenant-specific configuration
    subscription_tier VARCHAR(50) DEFAULT 'basic', -- basic, premium, enterprise
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Tenant metadata
    max_users INTEGER DEFAULT 10,
    max_sponsors INTEGER DEFAULT 100,
    max_grants INTEGER DEFAULT 50,
    features JSONB DEFAULT '{}' -- Feature flags per tenant
);

-- Enable RLS on tenants table
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- User-tenant relationships with role-based access
CREATE TABLE user_tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member', -- owner, admin, manager, member, viewer
    permissions JSONB DEFAULT '{}', -- Granular permissions
    is_active BOOLEAN DEFAULT true,
    invited_by VARCHAR REFERENCES users(id),
    invited_at TIMESTAMP,
    joined_at TIMESTAMP DEFAULT NOW(),
    last_accessed TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id, tenant_id)
);

-- Enable RLS on user_tenants table
ALTER TABLE user_tenants ENABLE ROW LEVEL SECURITY;

-- Users can only see their own record
CREATE POLICY user_isolation_policy ON users
    FOR ALL
    TO public
    USING (id = current_setting('app.current_user_id', true));

-- Tenants table - organization/workspace isolation
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR NOT NULL,
    domain VARCHAR UNIQUE NOT NULL,
    plan_tier VARCHAR DEFAULT 'basic',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS on tenants table
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Users can only see tenants they belong to
CREATE POLICY tenant_member_access_policy ON tenants
    FOR ALL
    TO public
    USING (
        id IN (
            SELECT tenant_id 
            FROM user_tenants 
            WHERE user_id = current_setting('app.current_user_id', true)
        )
    );

-- User-Tenant relationships with roles
CREATE TABLE user_tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role VARCHAR DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, tenant_id)
);

-- Enable RLS on user_tenants table
ALTER TABLE user_tenants ENABLE ROW LEVEL SECURITY;

-- Users can only see their own tenant memberships
CREATE POLICY user_tenant_self_access ON user_tenants
    FOR ALL
    TO public
    USING (user_id = current_setting('app.current_user_id', true));

-- Sponsors table - tenant-isolated sponsor management
CREATE TABLE sponsors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR NOT NULL,
    email VARCHAR,
    phone VARCHAR,
    organization VARCHAR,
    tier VARCHAR DEFAULT 'standard',
    contact_preference VARCHAR DEFAULT 'email',
    notes TEXT,
    tags TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS on sponsors table
ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;

-- Create tenant isolation policy for sponsors
CREATE POLICY sponsor_tenant_isolation ON sponsors
    FOR ALL
    TO public
    USING (
        tenant_id IN (
            SELECT tenant_id 
            FROM user_tenants 
            WHERE user_id = current_setting('app.current_user_id', true)
        )
    );

-- Grants table - tenant-isolated grant opportunities
CREATE TABLE grants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sponsor_id UUID REFERENCES sponsors(id) ON DELETE SET NULL,
    title VARCHAR NOT NULL,
    description TEXT,
    amount DECIMAL(12,2),
    currency VARCHAR(3) DEFAULT 'USD',
    submission_deadline DATE,
    award_date DATE,
    status VARCHAR DEFAULT 'open',
    requirements TEXT[],
    application_url VARCHAR,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS on grants table
ALTER TABLE grants ENABLE ROW LEVEL SECURITY;

-- Create tenant isolation policy for grants
CREATE POLICY grant_tenant_isolation ON grants
    FOR ALL
    TO public
    USING (
        tenant_id IN (
            SELECT tenant_id 
            FROM user_tenants 
            WHERE user_id = current_setting('app.current_user_id', true)
        )
    );

-- Grant milestones table - backwards planning support
CREATE TABLE grant_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    grant_id UUID NOT NULL REFERENCES grants(id) ON DELETE CASCADE,
    title VARCHAR NOT NULL,
    description TEXT,
    due_date DATE NOT NULL,
    status VARCHAR DEFAULT 'pending',
    milestone_type VARCHAR DEFAULT 'preparation',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS on grant_milestones table
ALTER TABLE grant_milestones ENABLE ROW LEVEL SECURITY;

-- Create tenant isolation policy for grant milestones
CREATE POLICY milestone_tenant_isolation ON grant_milestones
    FOR ALL
    TO public
    USING (
        tenant_id IN (
            SELECT tenant_id 
            FROM user_tenants 
            WHERE user_id = current_setting('app.current_user_id', true)
        )
    );

-- Relationships table - network mapping and pathfinding
CREATE TABLE relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    source_type VARCHAR NOT NULL, -- 'sponsor', 'organization', 'person'
    source_id VARCHAR NOT NULL,   -- Reference to external entity
    target_type VARCHAR NOT NULL,
    target_id VARCHAR NOT NULL,
    relationship_type VARCHAR NOT NULL, -- 'partnership', 'funding', 'advisory', etc.
    strength INTEGER DEFAULT 1,   -- 1-10 relationship strength
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(tenant_id, source_type, source_id, target_type, target_id, relationship_type)
);

-- Enable RLS on relationships table
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;

-- Create tenant isolation policy for relationships
CREATE POLICY relationship_tenant_isolation ON relationships
    FOR ALL
    TO public
    USING (
        tenant_id IN (
            SELECT tenant_id 
            FROM user_tenants 
            WHERE user_id = current_setting('app.current_user_id', true)
        )
    );

-- Content calendar table - strategic communication planning
CREATE TABLE content_calendar (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title VARCHAR NOT NULL,
    content_type VARCHAR NOT NULL, -- 'social_post', 'newsletter', 'blog', 'email'
    description TEXT,
    scheduled_date DATE NOT NULL,
    status VARCHAR DEFAULT 'draft',
    platform VARCHAR, -- 'linkedin', 'twitter', 'email', etc.
    content_body TEXT,
    tags TEXT[],
    related_grant_id UUID REFERENCES grants(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS on content_calendar table
ALTER TABLE content_calendar ENABLE ROW LEVEL SECURITY;

-- Create tenant isolation policy for content calendar
CREATE POLICY content_tenant_isolation ON content_calendar
    FOR ALL
    TO public
    USING (
        tenant_id IN (
            SELECT tenant_id 
            FROM user_tenants 
            WHERE user_id = current_setting('app.current_user_id', true)
        )
    );

-- System metrics table - performance and analytics
CREATE TABLE system_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NULL for global metrics
    metric_name VARCHAR NOT NULL,
    metric_value DECIMAL(15,4),
    metadata JSONB DEFAULT '{}',
    recorded_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS on system_metrics table
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;

-- Create tenant isolation policy for system metrics
CREATE POLICY metrics_tenant_isolation ON system_metrics
    FOR ALL
    TO public
    USING (
        tenant_id IS NULL OR -- Global metrics visible to all
        tenant_id IN (
            SELECT tenant_id 
            FROM user_tenants 
            WHERE user_id = current_setting('app.current_user_id', true)
        )
    );

-- Create indexes for optimal performance with multi-tenant queries
CREATE INDEX idx_user_tenants_user_id ON user_tenants(user_id);
CREATE INDEX idx_user_tenants_tenant_id ON user_tenants(tenant_id);
CREATE INDEX idx_sponsors_tenant_id ON sponsors(tenant_id);
CREATE INDEX idx_sponsors_tier ON sponsors(tenant_id, tier);
CREATE INDEX idx_grants_tenant_id ON grants(tenant_id);
CREATE INDEX idx_grants_sponsor_id ON grants(tenant_id, sponsor_id);
CREATE INDEX idx_grants_deadline ON grants(tenant_id, submission_deadline);
CREATE INDEX idx_grants_status ON grants(tenant_id, status);
CREATE INDEX idx_milestones_tenant_grant ON grant_milestones(tenant_id, grant_id);
CREATE INDEX idx_milestones_due_date ON grant_milestones(tenant_id, due_date);
CREATE INDEX idx_relationships_tenant_id ON relationships(tenant_id);
CREATE INDEX idx_relationships_source ON relationships(tenant_id, source_type, source_id);
CREATE INDEX idx_relationships_target ON relationships(tenant_id, target_type, target_id);
CREATE INDEX idx_content_tenant_date ON content_calendar(tenant_id, scheduled_date);
CREATE INDEX idx_content_status ON content_calendar(tenant_id, status);
CREATE INDEX idx_metrics_tenant_name ON system_metrics(tenant_id, metric_name);
CREATE INDEX idx_metrics_recorded_at ON system_metrics(recorded_at);

-- Create helper functions for tenant context management
CREATE OR REPLACE FUNCTION set_current_user_context(user_id TEXT)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_user_id', user_id, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_tenants(user_id TEXT)
RETURNS TABLE(tenant_id UUID, tenant_name VARCHAR, role VARCHAR) AS $$
BEGIN
    RETURN QUERY
    SELECT t.id, t.name, ut.role
    FROM tenants t
    JOIN user_tenants ut ON t.id = ut.tenant_id
    WHERE ut.user_id = get_user_tenants.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create default tenant for new users
CREATE OR REPLACE FUNCTION create_default_tenant_for_user(
    user_id TEXT,
    user_email TEXT
) RETURNS UUID AS $$
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
    VALUES (user_id, tenant_uuid, 'admin');
    
    RETURN tenant_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create sample data insertion function (for testing)
CREATE OR REPLACE FUNCTION create_sample_data(target_tenant_id UUID)
RETURNS VOID AS $$
DECLARE
    sponsor_uuid1 UUID;
    sponsor_uuid2 UUID;
    grant_uuid1 UUID;
BEGIN
    -- Insert sample sponsors
    INSERT INTO sponsors (tenant_id, name, email, organization, tier, notes)
    VALUES 
        (target_tenant_id, 'John Smith', 'john@techfoundation.org', 'Tech Foundation', 'premium', 'Key contact for technology grants'),
        (target_tenant_id, 'Sarah Johnson', 'sarah@greenfund.org', 'Green Fund Initiative', 'standard', 'Environmental sustainability focus')
    RETURNING id INTO sponsor_uuid1;
    
    -- Get the second sponsor ID
    SELECT id INTO sponsor_uuid2 FROM sponsors 
    WHERE tenant_id = target_tenant_id AND name = 'Sarah Johnson';
    
    -- Insert sample grants  
    INSERT INTO grants (tenant_id, sponsor_id, title, description, amount, submission_deadline, status)
    VALUES 
        (target_tenant_id, sponsor_uuid1, 'Innovation Technology Grant', 'Funding for innovative technology solutions', 50000.00, CURRENT_DATE + INTERVAL '60 days', 'open'),
        (target_tenant_id, sponsor_uuid2, 'Sustainability Impact Grant', 'Supporting environmental sustainability projects', 25000.00, CURRENT_DATE + INTERVAL '45 days', 'open')
    RETURNING id INTO grant_uuid1;
    
    -- Insert sample relationships
    INSERT INTO relationships (tenant_id, source_type, source_id, target_type, target_id, relationship_type, strength)
    VALUES 
        (target_tenant_id, 'sponsor', sponsor_uuid1::text, 'sponsor', sponsor_uuid2::text, 'partnership', 7),
        (target_tenant_id, 'organization', 'tech-foundation', 'organization', 'green-fund', 'collaboration', 5);
    
    -- Insert sample content calendar items
    INSERT INTO content_calendar (tenant_id, title, content_type, description, scheduled_date, platform, related_grant_id)
    VALUES 
        (target_tenant_id, 'Grant Application Reminder', 'email', 'Reminder about upcoming grant deadline', CURRENT_DATE + INTERVAL '30 days', 'email', grant_uuid1),
        (target_tenant_id, 'Success Story Social Post', 'social_post', 'Share recent funding success', CURRENT_DATE + INTERVAL '7 days', 'linkedin', NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO public;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO public;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO public;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO public;

-- Comments for documentation
COMMENT ON TABLE tenants IS 'Organizations/workspaces with complete data isolation via RLS';
COMMENT ON TABLE user_tenants IS 'Many-to-many relationship between users and tenants with role-based access';
COMMENT ON TABLE sponsors IS 'Sponsor contacts and organizations with tenant-level isolation';
COMMENT ON TABLE grants IS 'Grant opportunities with backwards planning timeline support';
COMMENT ON TABLE grant_milestones IS 'Auto-generated milestones for grant application planning';
COMMENT ON TABLE relationships IS 'Network mapping for 7-degree pathfinding algorithms';
COMMENT ON TABLE content_calendar IS 'Strategic communication planning with grant integration';
COMMENT ON TABLE system_metrics IS 'Performance analytics with optional tenant-level granularity';

-- Security notes
COMMENT ON POLICY user_isolation_policy ON users IS 'Users can only access their own user record';
COMMENT ON POLICY tenant_member_access_policy ON tenants IS 'Users can only see tenants they are members of';
COMMENT ON POLICY sponsor_tenant_isolation ON sponsors IS 'Complete tenant isolation for sponsor data';
COMMENT ON POLICY grant_tenant_isolation ON grants IS 'Complete tenant isolation for grant data';
COMMENT ON POLICY relationship_tenant_isolation ON relationships IS 'Complete tenant isolation for relationship mapping';
COMMENT ON POLICY content_tenant_isolation ON content_calendar IS 'Complete tenant isolation for content planning';
COMMENT ON POLICY metrics_tenant_isolation ON system_metrics IS 'Tenant isolation with global metrics exception';