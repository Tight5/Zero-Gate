/**
 * Microsoft 365 Integration Debug and Testing Routes
 * Comprehensive testing suite for organizational data access and permissions
 */

import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Microsoft Graph API endpoints for testing
const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';
const GRAPH_BETA_URL = 'https://graph.microsoft.com/beta';

// Test authentication and get access token
router.get('/auth/test', async (req: Request, res: Response) => {
  try {
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    const tenantId = process.env.MICROSOFT_TENANT_ID;

    if (!clientId || !clientSecret || !tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing Microsoft 365 credentials',
        details: {
          client_id: !!clientId,
          client_secret: !!clientSecret,
          tenant_id: !!tenantId
        }
      });
    }

    // Test client credentials flow
    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const tokenBody = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials'
    });

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: tokenBody
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      return res.status(401).json({
        success: false,
        error: 'Authentication failed',
        details: tokenData,
        timestamp: new Date().toISOString()
      });
    }

    // Test basic Graph API access
    const meResponse = await fetch(`${GRAPH_BASE_URL}/organization`, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    const orgData = await meResponse.json();

    res.json({
      success: true,
      authentication: {
        status: 'success',
        token_type: tokenData.token_type,
        expires_in: tokenData.expires_in,
        scope: tokenData.scope
      },
      organization: {
        accessible: meResponse.ok,
        data: meResponse.ok ? orgData : null,
        error: !meResponse.ok ? orgData : null
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Microsoft 365 auth test error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication test failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test available permissions and scopes
router.get('/permissions/test', async (req: Request, res: Response) => {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return res.status(401).json({ success: false, error: 'Unable to obtain access token' });
    }

    const permissionTests = [
      { name: 'Users', endpoint: '/users', scope: 'User.Read.All' },
      { name: 'Groups', endpoint: '/groups', scope: 'Group.Read.All' },
      { name: 'Organization', endpoint: '/organization', scope: 'Organization.Read.All' },
      { name: 'Directory Objects', endpoint: '/directoryObjects', scope: 'Directory.Read.All' },
      { name: 'Applications', endpoint: '/applications', scope: 'Application.Read.All' },
      { name: 'Service Principals', endpoint: '/servicePrincipals', scope: 'Application.Read.All' },
      { name: 'Contacts', endpoint: '/contacts', scope: 'Contacts.Read' },
      { name: 'Calendar', endpoint: '/me/calendar', scope: 'Calendars.Read' },
      { name: 'Mail', endpoint: '/me/messages', scope: 'Mail.Read' },
      { name: 'Files', endpoint: '/me/drive/root/children', scope: 'Files.Read.All' },
      { name: 'Teams', endpoint: '/teams', scope: 'Team.ReadBasic.All' },
      { name: 'Channels', endpoint: '/teams?$expand=channels', scope: 'Channel.ReadBasic.All' },
      { name: 'Reports - Usage', endpoint: '/reports/getOffice365ActiveUserDetail(period=\'D30\')', scope: 'Reports.Read.All' },
      { name: 'Security - Alerts', endpoint: '/security/alerts', scope: 'SecurityEvents.Read.All' },
      { name: 'Devices', endpoint: '/devices', scope: 'Device.Read.All' }
    ];

    const results = await Promise.all(
      permissionTests.map(async (test) => {
        try {
          const response = await fetch(`${GRAPH_BASE_URL}${test.endpoint}`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          });

          const data = await response.json();
          
          return {
            name: test.name,
            endpoint: test.endpoint,
            scope: test.scope,
            status: response.status,
            success: response.ok,
            data_count: data.value ? data.value.length : (data.length || 0),
            error: !response.ok ? data.error : null
          };
        } catch (error: any) {
          return {
            name: test.name,
            endpoint: test.endpoint,
            scope: test.scope,
            status: 0,
            success: false,
            error: error.message
          };
        }
      })
    );

    const successfulPermissions = results.filter(r => r.success);
    const failedPermissions = results.filter(r => !r.success);

    res.json({
      success: true,
      summary: {
        total_tests: results.length,
        successful: successfulPermissions.length,
        failed: failedPermissions.length,
        success_rate: `${Math.round((successfulPermissions.length / results.length) * 100)}%`
      },
      successful_permissions: successfulPermissions,
      failed_permissions: failedPermissions,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Permission test error:', error);
    res.status(500).json({
      success: false,
      error: 'Permission testing failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test organizational data extraction
router.get('/data/organizational', async (req: Request, res: Response) => {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return res.status(401).json({ success: false, error: 'Unable to obtain access token' });
    }

    // Extract comprehensive organizational data
    const [usersResponse, groupsResponse, orgResponse] = await Promise.all([
      fetch(`${GRAPH_BASE_URL}/users?$select=id,displayName,userPrincipalName,mail,jobTitle,department,officeLocation,manager&$expand=manager($select=displayName,mail)&$top=50`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }),
      fetch(`${GRAPH_BASE_URL}/groups?$select=id,displayName,description,groupTypes,mail&$top=20`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }),
      fetch(`${GRAPH_BASE_URL}/organization?$select=id,displayName,verifiedDomains,businessPhones,city,country`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
    ]);

    const [users, groups, organization] = await Promise.all([
      usersResponse.ok ? usersResponse.json() : { error: await usersResponse.json() },
      groupsResponse.ok ? groupsResponse.json() : { error: await groupsResponse.json() },
      orgResponse.ok ? orgResponse.json() : { error: await orgResponse.json() }
    ]);

    // Analyze organizational structure
    const organizationalInsights: any = {
      total_users: users.value?.length || 0,
      total_groups: groups.value?.length || 0,
      departments: {} as Record<string, number>,
      locations: {} as Record<string, number>,
      management_hierarchy: {} as Record<string, any>
    };

    // Process user data for insights
    if (users.value) {
      users.value.forEach((user: any) => {
        if (user.department) {
          organizationalInsights.departments[user.department] = 
            (organizationalInsights.departments[user.department] || 0) + 1;
        }
        if (user.officeLocation) {
          organizationalInsights.locations[user.officeLocation] = 
            (organizationalInsights.locations[user.officeLocation] || 0) + 1;
        }
        if (user.manager) {
          organizationalInsights.management_hierarchy[user.id] = {
            user: user.displayName,
            manager: user.manager.displayName,
            department: user.department
          };
        }
      });
    }

    res.json({
      success: true,
      data: {
        users: {
          success: usersResponse.ok,
          count: users.value?.length || 0,
          data: users.value || users.error
        },
        groups: {
          success: groupsResponse.ok,
          count: groups.value?.length || 0,
          data: groups.value || groups.error
        },
        organization: {
          success: orgResponse.ok,
          data: organization.value || organization.error
        }
      },
      insights: organizationalInsights,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Organizational data extraction error:', error);
    res.status(500).json({
      success: false,
      error: 'Organizational data extraction failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test email and communication data access
router.get('/data/communications', async (req: Request, res: Response) => {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return res.status(401).json({ success: false, error: 'Unable to obtain access token' });
    }

    // Test communication data access with different scopes
    const communicationTests = [
      {
        name: 'Mail Messages',
        endpoint: '/me/messages?$select=id,subject,from,toRecipients,receivedDateTime&$top=10',
        scope: 'Mail.Read'
      },
      {
        name: 'Calendar Events',
        endpoint: '/me/events?$select=id,subject,organizer,attendees,start,end&$top=10',
        scope: 'Calendars.Read'
      },
      {
        name: 'Teams Messages',
        endpoint: '/me/chats?$expand=messages&$top=5',
        scope: 'Chat.Read'
      },
      {
        name: 'People Insights',
        endpoint: '/me/insights/used?$top=10',
        scope: 'Sites.Read.All'
      }
    ];

    const results = await Promise.all(
      communicationTests.map(async (test) => {
        try {
          const response = await fetch(`${GRAPH_BASE_URL}${test.endpoint}`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          });

          const data = await response.json();
          
          return {
            name: test.name,
            scope: test.scope,
            success: response.ok,
            status: response.status,
            data_count: data.value?.length || 0,
            sample_data: response.ok && data.value ? data.value.slice(0, 2) : null,
            error: !response.ok ? data.error : null
          };
        } catch (error: any) {
          return {
            name: test.name,
            scope: test.scope,
            success: false,
            error: error.message
          };
        }
      })
    );

    res.json({
      success: true,
      communication_data: results,
      accessible_scopes: results.filter(r => r.success).map(r => r.scope),
      blocked_scopes: results.filter(r => !r.success).map(r => r.scope),
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Communication data test error:', error);
    res.status(500).json({
      success: false,
      error: 'Communication data testing failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Comprehensive integration health check
router.get('/health', async (req: Request, res: Response) => {
  try {
    const accessToken = await getAccessToken();
    
    const healthChecks = {
      credentials: {
        client_id: !!process.env.MICROSOFT_CLIENT_ID,
        client_secret: !!process.env.MICROSOFT_CLIENT_SECRET,
        tenant_id: !!process.env.MICROSOFT_TENANT_ID
      },
      authentication: {
        can_authenticate: !!accessToken,
        token_valid: false
      },
      api_connectivity: {
        graph_reachable: false,
        organization_accessible: false
      },
      permissions: {
        user_read: false,
        group_read: false,
        directory_read: false,
        organization_read: false
      }
    };

    if (accessToken) {
      // Test basic Graph API connectivity
      try {
        const orgResponse = await fetch(`${GRAPH_BASE_URL}/organization`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        healthChecks.authentication.token_valid = orgResponse.ok;
        healthChecks.api_connectivity.graph_reachable = true;
        healthChecks.api_connectivity.organization_accessible = orgResponse.ok;

        // Test key permissions
        const permissionTests = [
          { key: 'user_read', endpoint: '/users?$top=1' },
          { key: 'group_read', endpoint: '/groups?$top=1' },
          { key: 'directory_read', endpoint: '/directoryObjects?$top=1' },
          { key: 'organization_read', endpoint: '/organization' }
        ];

        for (const test of permissionTests) {
          try {
            const response = await fetch(`${GRAPH_BASE_URL}${test.endpoint}`, {
              headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            healthChecks.permissions[test.key] = response.ok;
          } catch {
            healthChecks.permissions[test.key] = false;
          }
        }
      } catch (error) {
        console.error('Health check API test error:', error);
      }
    }

    const overallHealth = 
      healthChecks.credentials.client_id &&
      healthChecks.credentials.client_secret &&
      healthChecks.credentials.tenant_id &&
      healthChecks.authentication.can_authenticate &&
      healthChecks.authentication.token_valid &&
      healthChecks.api_connectivity.organization_accessible;

    res.json({
      success: true,
      overall_health: overallHealth ? 'healthy' : 'unhealthy',
      health_checks: healthChecks,
      recommendations: generateHealthRecommendations(healthChecks),
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Integration health check error:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Helper function to get access token
async function getAccessToken(): Promise<string | null> {
  try {
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    const tenantId = process.env.MICROSOFT_TENANT_ID;

    if (!clientId || !clientSecret || !tenantId) {
      return null;
    }

    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const tokenBody = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials'
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.access_token;
  } catch {
    return null;
  }
}

// Helper function to generate health recommendations
function generateHealthRecommendations(healthChecks: any): string[] {
  const recommendations = [];

  if (!healthChecks.credentials.client_id) {
    recommendations.push('Configure MICROSOFT_CLIENT_ID environment variable');
  }
  if (!healthChecks.credentials.client_secret) {
    recommendations.push('Configure MICROSOFT_CLIENT_SECRET environment variable');
  }
  if (!healthChecks.credentials.tenant_id) {
    recommendations.push('Configure MICROSOFT_TENANT_ID environment variable');
  }
  if (!healthChecks.authentication.can_authenticate) {
    recommendations.push('Verify Microsoft 365 application registration and credentials');
  }
  if (!healthChecks.authentication.token_valid) {
    recommendations.push('Check Microsoft Graph API permissions and consent');
  }
  if (!healthChecks.api_connectivity.organization_accessible) {
    recommendations.push('Ensure application has Organization.Read.All permission');
  }
  if (!healthChecks.permissions.user_read) {
    recommendations.push('Grant User.Read.All permission for user data access');
  }
  if (!healthChecks.permissions.directory_read) {
    recommendations.push('Grant Directory.Read.All permission for full directory access');
  }

  if (recommendations.length === 0) {
    recommendations.push('Microsoft 365 integration is healthy and operational');
  }

  return recommendations;
}

export default router;