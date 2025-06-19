import type { Express } from "express";
import { isAuthenticated } from "../replitAuth";
import { getAnalyticsEngine } from "../analytics";

export function registerAnalyticsRoutes(app: Express) {
  const analyticsEngine = getAnalyticsEngine();

  // Network Analytics
  app.get('/api/analytics/network/:tenantId', isAuthenticated, async (req, res) => {
    try {
      const { tenantId } = req.params;
      
      // Mock relationship data for development
      const mockRelationships = [
        {
          id: '1',
          source: 'center-hub',
          target: 'tech-partner',
          strength: 0.85,
          type: 'partner',
          interactions: 25,
          lastContact: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
        },
        {
          id: '2',
          source: 'center-hub',
          target: 'major-sponsor',
          strength: 0.92,
          type: 'sponsor',
          interactions: 45,
          lastContact: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
        }
      ];

      const networkMetrics = await analyticsEngine.analyzeNetwork(mockRelationships);
      
      // Broadcast real-time analytics
      await analyticsEngine.broadcastAnalytics(tenantId, 'network', networkMetrics);

      res.json({
        success: true,
        metrics: networkMetrics,
        relationships: mockRelationships.length,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Network analytics error:', error);
      res.status(500).json({ error: 'Failed to analyze network' });
    }
  });

  // Relationship Strength Analysis
  app.post('/api/analytics/relationship-strength', isAuthenticated, async (req, res) => {
    try {
      const { relationshipData } = req.body;
      
      if (!relationshipData) {
        return res.status(400).json({ error: 'Relationship data required' });
      }

      const strength = await analyticsEngine.calculateRelationshipStrength(relationshipData);
      
      res.json({
        success: true,
        originalStrength: relationshipData.strength,
        calculatedStrength: strength,
        improvement: strength - (relationshipData.strength || 0.5),
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Relationship strength calculation error:', error);
      res.status(500).json({ error: 'Failed to calculate relationship strength' });
    }
  });

  // Grant Success Prediction
  app.post('/api/analytics/grant-prediction', isAuthenticated, async (req, res) => {
    try {
      const { grantData } = req.body;
      
      if (!grantData) {
        return res.status(400).json({ error: 'Grant data required' });
      }

      // Convert string dates to Date objects
      const grant = {
        ...grantData,
        deadline: new Date(grantData.deadline),
        milestones: grantData.milestones?.map((m: any) => ({
          ...m,
          dueDate: new Date(m.dueDate),
          completedDate: m.completedDate ? new Date(m.completedDate) : undefined
        })) || []
      };

      const prediction = await analyticsEngine.predictGrantSuccess(grant);
      
      // Broadcast real-time analytics
      const tenantId = req.user?.currentTenantId || 'dev-tenant-1';
      await analyticsEngine.broadcastAnalytics(tenantId, 'grant', {
        grantId: grant.id,
        prediction
      });

      res.json({
        success: true,
        grantId: grant.id,
        prediction,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Grant prediction error:', error);
      res.status(500).json({ error: 'Failed to predict grant success' });
    }
  });

  // Bulk Analytics Processing
  app.post('/api/analytics/bulk-process', isAuthenticated, async (req, res) => {
    try {
      const { type, data } = req.body;
      const tenantId = req.user?.currentTenantId || 'dev-tenant-1';
      
      let results: any = {};

      switch (type) {
        case 'relationships':
          results.strengthAnalysis = await Promise.all(
            data.map((rel: any) => analyticsEngine.calculateRelationshipStrength(rel))
          );
          break;

        case 'grants':
          results.predictions = await Promise.all(
            data.map((grant: any) => analyticsEngine.predictGrantSuccess({
              ...grant,
              deadline: new Date(grant.deadline),
              milestones: grant.milestones?.map((m: any) => ({
                ...m,
                dueDate: new Date(m.dueDate),
                completedDate: m.completedDate ? new Date(m.completedDate) : undefined
              })) || []
            }))
          );
          break;

        case 'network':
          results.networkMetrics = await analyticsEngine.analyzeNetwork(data);
          break;

        default:
          return res.status(400).json({ error: 'Invalid analytics type' });
      }

      // Broadcast bulk results
      await analyticsEngine.broadcastAnalytics(tenantId, type as any, results);

      res.json({
        success: true,
        type,
        processedCount: Array.isArray(data) ? data.length : 1,
        results,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Bulk analytics processing error:', error);
      res.status(500).json({ error: 'Failed to process bulk analytics' });
    }
  });

  // Performance Metrics
  app.get('/api/analytics/performance', isAuthenticated, async (req, res) => {
    try {
      const metrics = analyticsEngine.getPerformanceMetrics();
      
      res.json({
        success: true,
        performance: metrics,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Performance metrics error:', error);
      res.status(500).json({ error: 'Failed to get performance metrics' });
    }
  });

  // Real-time Analytics Status
  app.get('/api/analytics/status', isAuthenticated, async (req, res) => {
    try {
      const status = {
        engine: 'active',
        capabilities: [
          'relationship_strength_calculation',
          'network_analysis',
          'grant_success_prediction',
          'real_time_broadcasting'
        ],
        performance: analyticsEngine.getPerformanceMetrics(),
        timestamp: new Date()
      };

      res.json(status);

    } catch (error) {
      console.error('Analytics status error:', error);
      res.status(500).json({ error: 'Failed to get analytics status' });
    }
  });
}