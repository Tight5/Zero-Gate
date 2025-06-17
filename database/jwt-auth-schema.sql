-- JWT Authentication Schema Extensions for Zero Gate ESO Platform
-- Adds password storage and enhanced role management for JWT auth

-- Add password field to users table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password_hash') THEN
        ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_active') THEN
        ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_login') THEN
        ALTER TABLE users ADD COLUMN last_login TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'failed_login_attempts') THEN
        ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'locked_until') THEN
        ALTER TABLE users ADD COLUMN locked_until TIMESTAMP;
    END IF;
END $$;

-- Create password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_reset_tokens_user_id (user_id),
    INDEX idx_reset_tokens_expires (expires_at)
);

-- Create refresh tokens table for token management
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP,
    user_agent TEXT,
    ip_address INET,
    INDEX idx_refresh_tokens_user_tenant (user_id, tenant_id),
    INDEX idx_refresh_tokens_expires (expires_at)
);

-- Create audit log table for authentication events
CREATE TABLE IF NOT EXISTS auth_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    event_type VARCHAR NOT NULL, -- 'login', 'logout', 'password_change', 'password_reset', 'token_refresh'
    event_status VARCHAR NOT NULL, -- 'success', 'failure', 'suspicious'
    ip_address INET,
    user_agent TEXT,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_audit_user_id (user_id),
    INDEX idx_audit_tenant_id (tenant_id),
    INDEX idx_audit_event_type (event_type),
    INDEX idx_audit_created_at (created_at)
);

-- Update user_tenants table to support enhanced roles
DO $$
BEGIN
    -- Add role hierarchy support
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_tenants' AND column_name = 'permissions') THEN
        ALTER TABLE user_tenants ADD COLUMN permissions JSONB DEFAULT '{}';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_tenants' AND column_name = 'is_active') THEN
        ALTER TABLE user_tenants ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_tenants' AND column_name = 'invited_by') THEN
        ALTER TABLE user_tenants ADD COLUMN invited_by VARCHAR REFERENCES users(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_tenants' AND column_name = 'invited_at') THEN
        ALTER TABLE user_tenants ADD COLUMN invited_at TIMESTAMP;
    END IF;
END $$;

-- Create role permissions table for fine-grained access control
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role VARCHAR NOT NULL,
    resource VARCHAR NOT NULL, -- 'sponsors', 'grants', 'relationships', etc.
    action VARCHAR NOT NULL,   -- 'create', 'read', 'update', 'delete', 'manage'
    conditions JSONB DEFAULT '{}', -- Additional conditions for permission
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(role, resource, action)
);

-- Insert default role permissions
INSERT INTO role_permissions (role, resource, action) VALUES
-- Viewer permissions
('viewer', 'sponsors', 'read'),
('viewer', 'grants', 'read'),
('viewer', 'relationships', 'read'),
('viewer', 'content_calendar', 'read'),
('viewer', 'dashboard', 'read'),

-- User permissions (includes viewer + create/update own items)
('user', 'sponsors', 'read'),
('user', 'sponsors', 'create'),
('user', 'sponsors', 'update'),
('user', 'grants', 'read'),
('user', 'grants', 'create'),
('user', 'grants', 'update'),
('user', 'relationships', 'read'),
('user', 'relationships', 'create'),
('user', 'content_calendar', 'read'),
('user', 'content_calendar', 'create'),
('user', 'content_calendar', 'update'),
('user', 'dashboard', 'read'),

-- Manager permissions (includes user + delete + manage team)
('manager', 'sponsors', 'read'),
('manager', 'sponsors', 'create'),
('manager', 'sponsors', 'update'),
('manager', 'sponsors', 'delete'),
('manager', 'grants', 'read'),
('manager', 'grants', 'create'),
('manager', 'grants', 'update'),
('manager', 'grants', 'delete'),
('manager', 'relationships', 'read'),
('manager', 'relationships', 'create'),
('manager', 'relationships', 'update'),
('manager', 'relationships', 'delete'),
('manager', 'content_calendar', 'read'),
('manager', 'content_calendar', 'create'),
('manager', 'content_calendar', 'update'),
('manager', 'content_calendar', 'delete'),
('manager', 'dashboard', 'read'),
('manager', 'users', 'read'),
('manager', 'users', 'invite'),

-- Admin permissions (full access)
('admin', 'sponsors', 'read'),
('admin', 'sponsors', 'create'),
('admin', 'sponsors', 'update'),
('admin', 'sponsors', 'delete'),
('admin', 'sponsors', 'manage'),
('admin', 'grants', 'read'),
('admin', 'grants', 'create'),
('admin', 'grants', 'update'),
('admin', 'grants', 'delete'),
('admin', 'grants', 'manage'),
('admin', 'relationships', 'read'),
('admin', 'relationships', 'create'),
('admin', 'relationships', 'update'),
('admin', 'relationships', 'delete'),
('admin', 'relationships', 'manage'),
('admin', 'content_calendar', 'read'),
('admin', 'content_calendar', 'create'),
('admin', 'content_calendar', 'update'),
('admin', 'content_calendar', 'delete'),
('admin', 'content_calendar', 'manage'),
('admin', 'dashboard', 'read'),
('admin', 'dashboard', 'manage'),
('admin', 'users', 'read'),
('admin', 'users', 'create'),
('admin', 'users', 'update'),
('admin', 'users', 'delete'),
('admin', 'users', 'manage'),
('admin', 'tenants', 'read'),
('admin', 'tenants', 'update'),
('admin', 'tenants', 'manage')
ON CONFLICT (role, resource, action) DO NOTHING;

-- Create functions for JWT authentication support
CREATE OR REPLACE FUNCTION get_user_by_email(user_email TEXT)
RETURNS TABLE(
    id VARCHAR,
    email VARCHAR,
    first_name VARCHAR,
    last_name VARCHAR,
    password_hash VARCHAR,
    is_active BOOLEAN,
    tenant_id TEXT,
    role VARCHAR,
    tenant_name VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.password_hash,
        u.is_active,
        ut.tenant_id,
        ut.role,
        t.name as tenant_name
    FROM users u
    LEFT JOIN user_tenants ut ON u.id = ut.user_id AND ut.is_active = true
    LEFT JOIN tenants t ON ut.tenant_id = t.id::text
    WHERE u.email = user_email AND u.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION create_user_with_password(
    user_email TEXT,
    password_hash TEXT,
    first_name TEXT DEFAULT NULL,
    last_name TEXT DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
    new_user_id TEXT;
    default_tenant_id TEXT;
BEGIN
    -- Generate user ID
    new_user_id := gen_random_uuid()::text;
    
    -- Create user
    INSERT INTO users (id, email, first_name, last_name, password_hash, is_active)
    VALUES (new_user_id, user_email, first_name, last_name, password_hash, true);
    
    -- Create default tenant
    default_tenant_id := create_default_tenant_for_user(new_user_id, user_email);
    
    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_user_password(
    user_id TEXT,
    new_password_hash TEXT
) RETURNS VOID AS $$
BEGIN
    UPDATE users 
    SET password_hash = new_password_hash, 
        updated_at = NOW(),
        failed_login_attempts = 0,
        locked_until = NULL
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION record_login_attempt(
    user_id TEXT,
    success BOOLEAN,
    ip_addr INET DEFAULT NULL,
    user_agent_str TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    IF success THEN
        -- Successful login
        UPDATE users 
        SET last_login = NOW(), 
            failed_login_attempts = 0,
            locked_until = NULL
        WHERE id = user_id;
        
        -- Log successful login
        INSERT INTO auth_audit_log (user_id, event_type, event_status, ip_address, user_agent)
        VALUES (user_id, 'login', 'success', ip_addr, user_agent_str);
    ELSE
        -- Failed login
        UPDATE users 
        SET failed_login_attempts = failed_login_attempts + 1,
            locked_until = CASE 
                WHEN failed_login_attempts >= 5 THEN NOW() + INTERVAL '15 minutes'
                ELSE locked_until
            END
        WHERE id = user_id;
        
        -- Log failed login
        INSERT INTO auth_audit_log (user_id, event_type, event_status, ip_address, user_agent)
        VALUES (user_id, 'login', 'failure', ip_addr, user_agent_str);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION check_user_permissions(
    user_role TEXT,
    resource_name TEXT,
    action_name TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    has_permission BOOLEAN DEFAULT FALSE;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM role_permissions 
        WHERE role = user_role 
        AND resource = resource_name 
        AND action = action_name
    ) INTO has_permission;
    
    RETURN has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email_active ON users(email) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_users_password_hash ON users(password_hash) WHERE password_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_tenants_active ON user_tenants(user_id, tenant_id) WHERE is_active = true;

-- Enable RLS on new tables
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_audit_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for new tables
CREATE POLICY password_reset_user_isolation ON password_reset_tokens
    FOR ALL
    TO public
    USING (user_id = current_setting('app.current_user_id', true));

CREATE POLICY refresh_tokens_user_isolation ON refresh_tokens
    FOR ALL
    TO public
    USING (user_id = current_setting('app.current_user_id', true));

CREATE POLICY audit_log_user_isolation ON auth_audit_log
    FOR ALL
    TO public
    USING (
        user_id = current_setting('app.current_user_id', true) OR
        tenant_id::text IN (
            SELECT tenant_id 
            FROM user_tenants 
            WHERE user_id = current_setting('app.current_user_id', true)
            AND role IN ('admin', 'manager')
        )
    );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON password_reset_tokens TO public;
GRANT SELECT, INSERT, UPDATE, DELETE ON refresh_tokens TO public;
GRANT SELECT, INSERT ON auth_audit_log TO public;
GRANT SELECT ON role_permissions TO public;

COMMENT ON TABLE password_reset_tokens IS 'Secure storage for password reset tokens';
COMMENT ON TABLE refresh_tokens IS 'JWT refresh token management with revocation support';
COMMENT ON TABLE auth_audit_log IS 'Comprehensive authentication event logging';
COMMENT ON TABLE role_permissions IS 'Fine-grained role-based permission definitions';

-- Migration complete
SELECT 'JWT Authentication schema migration completed successfully' AS status;