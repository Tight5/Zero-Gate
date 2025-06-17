CREATE INDEX IF NOT EXISTS idx_tenants_domain ON tenants(domain);
CREATE INDEX IF NOT EXISTS idx_sponsors_tenant_id ON sponsors(tenant_id);
CREATE INDEX IF NOT EXISTS idx_grants_tenant_id ON grants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_grants_sponsor_id ON grants(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_relationships_tenant_id ON relationships(tenant_id);
CREATE INDEX IF NOT EXISTS idx_content_calendar_tenant_id ON content_calendar(tenant_id);
CREATE INDEX IF NOT EXISTS idx_content_calendar_scheduled_date ON content_calendar(scheduled_date);