/**
 * Microsoft Graph API Routes
 * Backend routes supporting the Microsoft Graph Service frontend implementation
 * Implements specification from attached asset 17
 */

import type { Express } from 'express';
import { isAuthenticated } from '../replitAuth';

export function registerMicrosoftRoutes(app: Express): void {
  // Microsoft Graph Authorization
  app.post('/api/integration/auth/microsoft', isAuthenticated, async (req, res) => {
    try {
      const { tenantId, redirectUri, scopes } = req.body;
      
      // Use existing integration agent to handle authorization
      const authResult = await fetch('http://localhost:3001/integration/initialize_auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          config: {
            redirect_uri: redirectUri,
            scopes: scopes || ['User.Read', 'People.Read', 'Files.Read', 'Sites.Read.All']
          }
        })
      });

      const data = await authResult.json();
      
      if (data.success) {
        res.json({
          success: true,
          authUrl: data.auth_url
        });
      } else {
        res.status(400).json({
          success: false,
          error: data.error || 'Failed to initialize Microsoft authorization'
        });
      }
    } catch (error: any) {
      console.error('Microsoft authorization error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error during authorization'
      });
    }
  });

  // Token exchange
  app.post('/api/integration/auth/microsoft/token', isAuthenticated, async (req, res) => {
    try {
      const { code, state } = req.body;
      
      // Exchange code for token using integration agent
      const tokenResult = await fetch('http://localhost:3001/integration/exchange_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: (req.user as any)?.claims?.sub || 'default',
          code,
          state
        })
      });

      const data = await tokenResult.json();
      
      if (data.success) {
        res.json({
          success: true,
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt: data.expires_at
        });
      } else {
        res.status(400).json({
          success: false,
          error: data.error || 'Token exchange failed'
        });
      }
    } catch (error: any) {
      console.error('Token exchange error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error during token exchange'
      });
    }
  });

  // Get current user
  app.get('/api/integration/microsoft/me', isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any)?.claims?.sub || 'default';
      
      const userResult = await fetch(`http://localhost:3001/integration/extract_users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          user_id: 'me'
        })
      });

      const data = await userResult.json();
      
      if (data.success && data.users && data.users.length > 0) {
        res.json({
          success: true,
          user: data.users[0]
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'User not found or not authenticated'
        });
      }
    } catch (error: any) {
      console.error('Get current user error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error retrieving user'
      });
    }
  });

  // Get people
  app.get('/api/integration/microsoft/people', isAuthenticated, async (req, res) => {
    try {
      const { search, top = '50', skip = '0' } = req.query;
      const tenantId = (req.user as any)?.claims?.sub || 'default';
      
      const peopleResult = await fetch(`http://localhost:3001/integration/extract_users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          filters: {
            search: search as string,
            limit: parseInt(top as string),
            offset: parseInt(skip as string)
          }
        })
      });

      const data = await peopleResult.json();
      
      if (data.success) {
        res.json({
          success: true,
          people: data.users || [],
          hasMore: data.has_more || false,
          total: data.total || 0
        });
      } else {
        res.status(400).json({
          success: false,
          error: data.error || 'Failed to retrieve people'
        });
      }
    } catch (error: any) {
      console.error('Get people error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error retrieving people'
      });
    }
  });

  // Get files
  app.get('/api/integration/microsoft/files', isAuthenticated, async (req, res) => {
    try {
      const { driveId, folderId, fileType, top = '50', skip = '0' } = req.query;
      const tenantId = (req.user as any)?.claims?.sub || 'default';
      
      // Use integration agent to get files
      const filesResult = await fetch(`http://localhost:3001/integration/get_files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          filters: {
            drive_id: driveId as string,
            folder_id: folderId as string,
            file_type: fileType as string,
            limit: parseInt(top as string),
            offset: parseInt(skip as string)
          }
        })
      });

      const data = await filesResult.json();
      
      if (data.success) {
        res.json({
          success: true,
          files: data.files || [],
          hasMore: data.has_more || false,
          total: data.total || 0
        });
      } else {
        res.status(400).json({
          success: false,
          error: data.error || 'Failed to retrieve files'
        });
      }
    } catch (error: any) {
      console.error('Get files error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error retrieving files'
      });
    }
  });

  // Get workbook
  app.get('/api/integration/microsoft/workbooks/:fileId', isAuthenticated, async (req, res) => {
    try {
      const { fileId } = req.params;
      const { driveId } = req.query;
      const tenantId = (req.user as any)?.claims?.sub || 'default';
      
      const workbookResult = await fetch(`http://localhost:3001/integration/process_excel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          file_id: fileId,
          drive_id: driveId as string,
          action: 'get_workbook'
        })
      });

      const data = await workbookResult.json();
      
      if (data.success) {
        res.json({
          success: true,
          workbook: data.workbook
        });
      } else {
        res.status(400).json({
          success: false,
          error: data.error || 'Failed to retrieve workbook'
        });
      }
    } catch (error: any) {
      console.error('Get workbook error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error retrieving workbook'
      });
    }
  });

  // Get worksheet data
  app.get('/api/integration/microsoft/workbooks/:fileId/worksheets/:worksheetId/data', isAuthenticated, async (req, res) => {
    try {
      const { fileId, worksheetId } = req.params;
      const { driveId, range } = req.query;
      const tenantId = (req.user as any)?.claims?.sub || 'default';
      
      const worksheetResult = await fetch(`http://localhost:3001/integration/process_excel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          file_id: fileId,
          worksheet_id: worksheetId,
          drive_id: driveId as string,
          range: range as string,
          action: 'get_worksheet_data'
        })
      });

      const data = await worksheetResult.json();
      
      if (data.success) {
        res.json({
          success: true,
          values: data.values || [],
          headers: data.headers || [],
          range: data.range || ''
        });
      } else {
        res.status(400).json({
          success: false,
          error: data.error || 'Failed to retrieve worksheet data'
        });
      }
    } catch (error: any) {
      console.error('Get worksheet data error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error retrieving worksheet data'
      });
    }
  });

  // Extract relationships
  app.get('/api/integration/microsoft/relationships/:userId', isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.params;
      const tenantId = (req.user as any)?.claims?.sub || 'default';
      
      const relationshipsResult = await fetch(`http://localhost:3001/integration/extract_relationships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          user_id: userId === 'me' ? 'me' : userId
        })
      });

      const data = await relationshipsResult.json();
      
      if (data.success) {
        res.json({
          success: true,
          manager: data.manager,
          directReports: data.direct_reports || [],
          colleagues: data.colleagues || [],
          collaborators: data.collaborators || []
        });
      } else {
        res.status(400).json({
          success: false,
          error: data.error || 'Failed to extract relationships'
        });
      }
    } catch (error: any) {
      console.error('Extract relationships error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error extracting relationships'
      });
    }
  });

  // Analyze collaboration
  app.get('/api/integration/microsoft/relationships/:userId/collaboration', isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.params;
      const { timeframe = '30days' } = req.query;
      const tenantId = (req.user as any)?.claims?.sub || 'default';
      
      const collaborationResult = await fetch(`http://localhost:3001/integration/analyze_email_patterns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          user_id: userId === 'me' ? 'me' : userId,
          timeframe: timeframe as string
        })
      });

      const data = await collaborationResult.json();
      
      if (data.success) {
        res.json({
          success: true,
          collaborationScore: data.collaboration_score || 0,
          topCollaborators: data.top_collaborators || [],
          communicationPatterns: data.communication_patterns || {},
          meetingInsights: data.meeting_insights || {}
        });
      } else {
        res.status(400).json({
          success: false,
          error: data.error || 'Failed to analyze collaboration'
        });
      }
    } catch (error: any) {
      console.error('Analyze collaboration error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error analyzing collaboration'
      });
    }
  });

  // Disconnect account
  app.delete('/api/integration/auth/microsoft/token', isAuthenticated, async (req, res) => {
    try {
      const tenantId = (req.user as any)?.claims?.sub || 'default';
      
      // Clear tokens and disconnect
      const disconnectResult = await fetch(`http://localhost:3001/integration/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId
        })
      });

      const data = await disconnectResult.json();
      
      if (data.success) {
        res.json({
          success: true,
          message: 'Microsoft account disconnected successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          error: data.error || 'Failed to disconnect account'
        });
      }
    } catch (error: any) {
      console.error('Disconnect account error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error disconnecting account'
      });
    }
  });
}