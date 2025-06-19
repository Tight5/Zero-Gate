-- Zero Gate ESO Platform - Complete Multi-Tenant Row-Level Security Schema
-- Enterprise-scale tenant isolation using PostgreSQL RLS policies
-- Based on attached assets specifications for comprehensive multi-tenancy

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis"; -- For geographic data

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

-- Sponsors table - relationship management with complete tenant isolation
CREATE TABLE sponsors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    organization VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address JSONB, -- Structured address data
    
    -- Relationship management
    relationship_manager VARCHAR REFERENCES users(id),
    tier VARCHAR(50) DEFAULT 'prospect', -- prospect, active, major, legacy
    status VARCHAR(50) DEFAULT 'active', -- active, inactive, archived
    
    -- Contact information
    contact_info JSONB DEFAULT '{}', -- Additional contact details
    social_media JSONB DEFAULT '{}', -- Social media profiles
    communication_preferences JSONB DEFAULT '{}',
    
    -- Relationship metrics
    relationship_strength DECIMAL(3,2) DEFAULT 0.50, -- 0.00 to 1.00
    last_contact_date TIMESTAMP,
    next_followup_date TIMESTAMP,
    contact_frequency_days INTEGER DEFAULT 30,
    
    -- Geographic and network data
    geographic_location POINT, -- PostGIS point for mapping
    network_centrality DECIMAL(5,4) DEFAULT 0.0000, -- NetworkX centrality score
    influence_score DECIMAL(5,2) DEFAULT 0.00, -- Custom influence metric
    
    -- Metadata
    tags JSONB DEFAULT '[]', -- Flexible tagging
    notes TEXT,
    custom_fields JSONB DEFAULT '{}', -- Tenant-specific fields
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR REFERENCES users(id),
    updated_by VARCHAR REFERENCES users(id)
);

-- Enable RLS on sponsors table
ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;

-- Grants table - opportunity tracking with backwards planning
CREATE TABLE grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sponsor_id UUID REFERENCES sponsors(id) ON DELETE SET NULL,
    
    -- Grant identification
    title VARCHAR(500) NOT NULL,
    opportunity_number VARCHAR(100),
    program_name VARCHAR(255),
    
    -- Financial information
    amount DECIMAL(15,2), -- Requested amount
    awarded_amount DECIMAL(15,2), -- Actual awarded amount
    match_required DECIMAL(15,2), -- Required matching funds
    indirect_cost_rate DECIMAL(5,2), -- Indirect cost percentage
    
    -- Timeline management
    submission_deadline TIMESTAMP NOT NULL,
    award_notification_date TIMESTAMP,
    project_start_date TIMESTAMP,
    project_end_date TIMESTAMP,
    
    -- Status tracking
    status VARCHAR(50) DEFAULT 'planning', -- planning, submitted, under_review, awarded, rejected, completed
    submission_status VARCHAR(50) DEFAULT 'draft', -- draft, in_progress, ready, submitted
    priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
    
    -- Grant details
    description TEXT,
    objectives JSONB DEFAULT '[]', -- Array of objectives
    methodology TEXT,
    budget_narrative TEXT,
    
    -- Backwards planning milestones (auto-generated)
    milestone_90_days JSONB, -- 90-day milestone data
    milestone_60_days JSONB, -- 60-day milestone data
    milestone_30_days JSONB, -- 30-day milestone data
    milestone_submission JSONB, -- Submission milestone data
    
    -- Success prediction
    success_probability DECIMAL(3,2), -- AI-calculated success probability
    risk_assessment JSONB DEFAULT '{}', -- Risk factors and mitigation
    
    -- Collaboration
    principal_investigator VARCHAR REFERENCES users(id),
    co_investigators JSONB DEFAULT '[]', -- Array of user IDs
    assigned_team JSONB DEFAULT '[]', -- Team member assignments
    
    -- Metadata
    tags JSONB DEFAULT '[]',
    attachments JSONB DEFAULT '[]', -- File attachment metadata
    notes TEXT,
    custom_fields JSONB DEFAULT '{}',
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR REFERENCES users(id),
    updated_by VARCHAR REFERENCES users(id)
);

-- Enable RLS on grants table
ALTER TABLE grants ENABLE ROW LEVEL SECURITY;

-- Grant milestones table - detailed milestone tracking
CREATE TABLE grant_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    grant_id UUID NOT NULL REFERENCES grants(id) ON DELETE CASCADE,
    
    -- Milestone identification
    title VARCHAR(255) NOT NULL,
    description TEXT,
    milestone_type VARCHAR(50) NOT NULL, -- 90_day, 60_day, 30_day, submission, custom
    
    -- Timeline
    due_date TIMESTAMP NOT NULL,
    completed_date TIMESTAMP,
    days_before_deadline INTEGER, -- Calculated field
    
    -- Status and progress
    status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, overdue, cancelled
    completion_percentage INTEGER DEFAULT 0, -- 0-100
    
    -- Task management
    tasks JSONB DEFAULT '[]', -- Array of task objects
    assignees JSONB DEFAULT '[]', -- Array of user IDs
    estimated_hours INTEGER,
    actual_hours INTEGER,
    
    -- Dependencies
    depends_on UUID REFERENCES grant_milestones(id), -- Milestone dependencies
    blocking JSONB DEFAULT '[]', -- Array of milestone IDs this blocks
    
    -- Quality and review
    review_required BOOLEAN DEFAULT false,
    reviewed_by VARCHAR REFERENCES users(id),
    reviewed_at TIMESTAMP,
    approval_status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    
    -- Metadata
    priority VARCHAR(20) DEFAULT 'medium',
    tags JSONB DEFAULT '[]',
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR REFERENCES users(id),
    updated_by VARCHAR REFERENCES users(id)
);

-- Enable RLS on grant_milestones table
ALTER TABLE grant_milestones ENABLE ROW LEVEL SECURITY;

-- Relationships table - network mapping with seven-degree path discovery
CREATE TABLE relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Relationship endpoints
    source_id UUID REFERENCES sponsors(id) ON DELETE CASCADE,
    target_id UUID REFERENCES sponsors(id) ON DELETE CASCADE,
    source_type VARCHAR(50) DEFAULT 'sponsor', -- sponsor, user, organization
    target_type VARCHAR(50) DEFAULT 'sponsor',
    
    -- Relationship metadata
    relationship_type VARCHAR(100) NOT NULL, -- colleague, mentor, board_member, donor, etc.
    strength DECIMAL(3,2) DEFAULT 0.50, -- 0.00 to 1.00
    confidence DECIMAL(3,2) DEFAULT 0.50, -- Confidence in relationship accuracy
    
    -- Interaction data
    last_interaction_date TIMESTAMP,
    interaction_frequency VARCHAR(20), -- daily, weekly, monthly, quarterly, yearly, rare
    interaction_count INTEGER DEFAULT 0,
    interaction_types JSONB DEFAULT '[]', -- email, meeting, social, phone, etc.
    
    -- Source and verification
    source_system VARCHAR(100), -- microsoft_graph, manual, imported, linkedin
    verified_by VARCHAR REFERENCES users(id),
    verified_at TIMESTAMP,
    is_verified BOOLEAN DEFAULT false,
    
    -- Network analysis
    centrality_score DECIMAL(5,4) DEFAULT 0.0000, -- NetworkX centrality
    betweenness_score DECIMAL(5,4) DEFAULT 0.0000, -- Path influence
    clustering_coefficient DECIMAL(5,4) DEFAULT 0.0000, -- Local clustering
    
    -- Bidirectional relationship handling
    is_mutual BOOLEAN DEFAULT false,
    reverse_relationship_id UUID REFERENCES relationships(id),
    
    -- Metadata
    tags JSONB DEFAULT '[]',
    notes TEXT,
    custom_attributes JSONB DEFAULT '{}',
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR REFERENCES users(id),
    updated_by VARCHAR REFERENCES users(id),
    
    -- Constraints
    CHECK (source_id != target_id), -- No self-relationships
    UNIQUE(tenant_id, source_id, target_id, relationship_type) -- No duplicate relationships
);

-- Enable RLS on relationships table
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;

-- Content calendar table - strategic communication planning
CREATE TABLE content_calendar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    grant_id UUID REFERENCES grants(id) ON DELETE SET NULL,
    
    -- Content identification
    title VARCHAR(500) NOT NULL,
    content_type VARCHAR(100) NOT NULL, -- social_media, email, newsletter, press_release, blog, website
    channel VARCHAR(100), -- facebook, linkedin, twitter, email_blast, website, etc.
    
    -- Scheduling
    scheduled_date TIMESTAMP NOT NULL,
    published_date TIMESTAMP,
    deadline TIMESTAMP,
    
    -- Status and workflow
    status VARCHAR(50) DEFAULT 'planned', -- planned, draft, review, approved, scheduled, published, archived
    approval_status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent
    
    -- Content details
    description TEXT,
    content_body TEXT, -- Main content
    excerpt TEXT, -- Summary/preview
    call_to_action VARCHAR(500), -- CTA text
    target_audience JSONB DEFAULT '[]', -- Audience segments
    
    -- Assets and attachments
    featured_image VARCHAR(500), -- Image URL or path
    attachments JSONB DEFAULT '[]', -- Additional files
    media_assets JSONB DEFAULT '[]', -- Videos, images, documents
    
    -- Campaign and tracking
    campaign_name VARCHAR(255),
    campaign_id UUID, -- Link to marketing campaigns
    tracking_tags JSONB DEFAULT '[]', -- UTM parameters, hashtags
    
    -- Engagement metrics (post-publication)
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    click_through_rate DECIMAL(5,4),
    engagement_rate DECIMAL(5,4),
    
    -- Team collaboration
    assigned_to VARCHAR REFERENCES users(id),
    created_by VARCHAR REFERENCES users(id),
    approved_by VARCHAR REFERENCES users(id),
    published_by VARCHAR REFERENCES users(id),
    
    -- Auto-generation from milestones
    auto_generated BOOLEAN DEFAULT false,
    milestone_id UUID REFERENCES grant_milestones(id),
    template_used VARCHAR(255),
    
    -- Metadata
    tags JSONB DEFAULT '[]',
    notes TEXT,
    custom_fields JSONB DEFAULT '{}',
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS on content_calendar table
ALTER TABLE content_calendar ENABLE ROW LEVEL SECURITY;

-- System metrics table - performance and scaling indicators
CREATE TABLE system_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL, -- NULL for global metrics
    
    -- Metric identification
    metric_name VARCHAR(100) NOT NULL,
    metric_type VARCHAR(50) NOT NULL, -- performance, usage, business, technical
    metric_category VARCHAR(100), -- memory, cpu, database, api, user_activity
    
    -- Metric values
    value DECIMAL(15,4) NOT NULL,
    unit VARCHAR(20), -- percentage, bytes, milliseconds, count, etc.
    threshold_warning DECIMAL(15,4), -- Warning threshold
    threshold_critical DECIMAL(15,4), -- Critical threshold
    
    -- Context and metadata
    dimension_1 VARCHAR(100), -- Additional dimension (e.g., endpoint, feature)
    dimension_2 VARCHAR(100), -- Second dimension (e.g., user_role, region)
    metadata JSONB DEFAULT '{}', -- Additional context
    
    -- Aggregation data
    aggregation_period VARCHAR(20) DEFAULT 'real_time', -- real_time, hourly, daily, weekly
    sample_count INTEGER DEFAULT 1,
    min_value DECIMAL(15,4),
    max_value DECIMAL(15,4),
    avg_value DECIMAL(15,4),
    
    -- Time series
    recorded_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS on system_metrics table
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;

-- CREATE RLS POLICIES
-- ===================

-- Users table policy - users can only see their own record
CREATE POLICY user_isolation_policy ON users
    FOR ALL
    TO public
    USING (id = current_setting('app.current_user_id', true));

-- Tenants table policy - users can only see tenants they belong to
CREATE POLICY tenant_member_access_policy ON tenants
    FOR ALL
    TO public
    USING (
        id::text IN (
            SELECT tenant_id 
            FROM user_tenants 
            WHERE user_id = current_setting('app.current_user_id', true)
        )
    );

-- User-tenants policy - users can only see their own tenant relationships
CREATE POLICY user_tenant_self_access ON user_tenants
    FOR ALL
    TO public
    USING (user_id = current_setting('app.current_user_id', true));

-- Sponsors table policy - complete tenant isolation
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

-- Grants table policy - complete tenant isolation
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

-- Grant milestones policy - complete tenant isolation
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

-- Relationships policy - complete tenant isolation
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

-- Content calendar policy - complete tenant isolation
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

-- System metrics policy - tenant isolation with global metrics visible to all
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

-- HELPER FUNCTIONS FOR TENANT CONTEXT MANAGEMENT
-- ==============================================

-- Function to set current user context for RLS
CREATE OR REPLACE FUNCTION set_current_user_context(user_id TEXT)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_user_id', user_id, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's accessible tenants
CREATE OR REPLACE FUNCTION get_user_tenants(user_id TEXT)
RETURNS TABLE(tenant_id TEXT, tenant_name VARCHAR, role VARCHAR) AS $$
BEGIN
    RETURN QUERY
    SELECT ut.tenant_id, t.name, ut.role
    FROM user_tenants ut
    JOIN tenants t ON t.id::text = ut.tenant_id
    WHERE ut.user_id = get_user_tenants.user_id
    AND ut.is_active = true
    AND t.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has role in tenant
CREATE OR REPLACE FUNCTION user_has_role_in_tenant(user_id TEXT, tenant_id TEXT, required_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    user_role VARCHAR;
    role_hierarchy INTEGER;
    required_hierarchy INTEGER;
BEGIN
    -- Get user's role in tenant
    SELECT role INTO user_role
    FROM user_tenants
    WHERE user_tenants.user_id = user_has_role_in_tenant.user_id
    AND user_tenants.tenant_id = user_has_role_in_tenant.tenant_id
    AND is_active = true;
    
    IF user_role IS NULL THEN
        RETURN false;
    END IF;
    
    -- Role hierarchy: owner(5) > admin(4) > manager(3) > member(2) > viewer(1)
    role_hierarchy := CASE user_role
        WHEN 'owner' THEN 5
        WHEN 'admin' THEN 4
        WHEN 'manager' THEN 3
        WHEN 'member' THEN 2
        WHEN 'viewer' THEN 1
        ELSE 0
    END;
    
    required_hierarchy := CASE required_role
        WHEN 'owner' THEN 5
        WHEN 'admin' THEN 4
        WHEN 'manager' THEN 3
        WHEN 'member' THEN 2
        WHEN 'viewer' THEN 1
        ELSE 0
    END;
    
    RETURN role_hierarchy >= required_hierarchy;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PERFORMANCE INDEXES FOR RLS QUERIES
-- ===================================

-- User context lookup optimization
CREATE INDEX IF NOT EXISTS idx_user_tenants_user_lookup ON user_tenants(user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_tenants_tenant_lookup ON user_tenants(tenant_id) WHERE is_active = true;

-- Tenant isolation optimization
CREATE INDEX IF NOT EXISTS idx_sponsors_tenant_rls ON sponsors(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_grants_tenant_rls ON grants(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_grant_milestones_tenant_rls ON grant_milestones(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_relationships_tenant_rls ON relationships(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_content_calendar_tenant_rls ON content_calendar(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_system_metrics_tenant_rls ON system_metrics(tenant_id) WHERE tenant_id IS NOT NULL;

-- Business logic optimization
CREATE INDEX IF NOT EXISTS idx_sponsors_relationship_manager ON sponsors(relationship_manager);
CREATE INDEX IF NOT EXISTS idx_grants_submission_deadline ON grants(submission_deadline);
CREATE INDEX IF NOT EXISTS idx_grants_status ON grants(status);
CREATE INDEX IF NOT EXISTS idx_grant_milestones_due_date ON grant_milestones(due_date);
CREATE INDEX IF NOT EXISTS idx_grant_milestones_grant_id ON grant_milestones(grant_id);
CREATE INDEX IF NOT EXISTS idx_relationships_source_target ON relationships(source_id, target_id);
CREATE INDEX IF NOT EXISTS idx_relationships_network_analysis ON relationships(tenant_id, strength, centrality_score);
CREATE INDEX IF NOT EXISTS idx_content_calendar_scheduled_date ON content_calendar(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_content_calendar_status ON content_calendar(status);
CREATE INDEX IF NOT EXISTS idx_system_metrics_recorded_at ON system_metrics(recorded_at);
CREATE INDEX IF NOT EXISTS idx_system_metrics_name_type ON system_metrics(metric_name, metric_type);

-- GRANT PERMISSIONS
-- ================

GRANT USAGE ON SCHEMA public TO public;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO public;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO public;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO public;

-- VERIFICATION AND TESTING
-- ========================

-- Test user context setting
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

-- Table and policy documentation
COMMENT ON TABLE users IS 'Global user accounts with RLS isolation - users can only see their own record';
COMMENT ON TABLE tenants IS 'Organizational units with complete tenant isolation via RLS';
COMMENT ON TABLE user_tenants IS 'User-tenant relationships with role-based access control';
COMMENT ON TABLE sponsors IS 'Sponsor/relationship management with complete tenant-level RLS isolation';
COMMENT ON TABLE grants IS 'Grant opportunities with backwards planning and complete tenant-level RLS isolation';
COMMENT ON TABLE grant_milestones IS 'Detailed milestone tracking with tenant-level RLS isolation';
COMMENT ON TABLE relationships IS 'Network relationships with seven-degree path discovery and tenant-level RLS isolation';
COMMENT ON TABLE content_calendar IS 'Strategic content planning with grant milestone integration and tenant-level RLS isolation';
COMMENT ON TABLE system_metrics IS 'Performance and scaling indicators with tenant-specific and global metrics';

-- Schema creation complete
SELECT 'Complete Multi-Tenant Row-Level Security schema created successfully' AS status,
       'All tables created with proper RLS policies for enterprise-scale tenant isolation' AS details;