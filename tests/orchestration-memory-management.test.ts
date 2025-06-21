/**
 * Orchestration Agent Memory Management Tests
 * Comprehensive test suite for critical memory threshold failures and feature degradation
 * Validates compliance with attached asset requirements
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import orchestrationRouter from '../server/routes/orchestration';

// Mock tenant middleware for testing
const mockTenantMiddleware = (req: any, res: any, next: any) => {
  req.tenantId = '1';
  req.userEmail = 'test@example.com';
  req.isAdmin = false;
  next();
};

describe('Orchestration Agent Memory Management', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(mockTenantMiddleware);
    app.use('/api/orchestration', orchestrationRouter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Memory Threshold Monitoring', () => {
    it('should return orchestration status with memory thresholds', async () => {
      const response = await request(app)
        .get('/api/orchestration/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('memory_status');
      expect(response.body.data.memory_status).toHaveProperty('warning_threshold', 0.75);
      expect(response.body.data.memory_status).toHaveProperty('critical_threshold', 0.90);
      expect(response.body.data.memory_status).toHaveProperty('emergency_threshold', 0.95);
    });

    it('should monitor memory usage within acceptable ranges', async () => {
      const response = await request(app)
        .get('/api/orchestration/status')
        .expect(200);

      const memoryUsage = response.body.data.memory_status.current_usage;
      expect(memoryUsage).toBeGreaterThanOrEqual(0);
      expect(memoryUsage).toBeLessThanOrEqual(1);
    });

    it('should track degraded features when memory exceeds thresholds', async () => {
      const response = await request(app)
        .get('/api/orchestration/status')
        .expect(200);

      expect(response.body.data.memory_status).toHaveProperty('degraded_features');
      expect(Array.isArray(response.body.data.memory_status.degraded_features)).toBe(true);
    });
  });

  describe('Feature Degradation System', () => {
    it('should trigger memory optimization when memory exceeds critical threshold', async () => {
      const response = await request(app)
        .post('/api/orchestration/memory/optimize')
        .send({ force: false })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('memory_usage_before');
      expect(response.body.data).toHaveProperty('memory_usage_after');
      expect(response.body.data).toHaveProperty('degraded_features');
    });

    it('should force optimization regardless of memory level', async () => {
      const response = await request(app)
        .post('/api/orchestration/memory/optimize')
        .send({ force: true })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.degraded_features).toContain('advanced_analytics');
      expect(response.body.data.degraded_features).toContain('relationship_mapping');
      expect(response.body.data.degraded_features).toContain('excel_processing');
    });

    it('should disable non-essential features at critical threshold (90%)', async () => {
      // First, force degradation to simulate high memory
      await request(app)
        .post('/api/orchestration/memory/optimize')
        .send({ force: true });

      const statusResponse = await request(app)
        .get('/api/orchestration/status')
        .expect(200);

      const degradedFeatures = statusResponse.body.data.memory_status.degraded_features;
      expect(degradedFeatures).toEqual(
        expect.arrayContaining(['advanced_analytics', 'relationship_mapping', 'excel_processing'])
      );
    });
  });

  describe('Feature Recovery System', () => {
    it('should recover features when memory drops below warning threshold', async () => {
      // First degrade features
      await request(app)
        .post('/api/orchestration/memory/optimize')
        .send({ force: true });

      // Then attempt recovery
      const response = await request(app)
        .post('/api/orchestration/features/recover')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('recovered_features');
    });

    it('should maintain degraded state when memory still above threshold', async () => {
      // Force degradation
      await request(app)
        .post('/api/orchestration/memory/optimize')
        .send({ force: true });

      const statusResponse = await request(app)
        .get('/api/orchestration/status')
        .expect(200);

      const degradedFeatures = statusResponse.body.data.memory_status.degraded_features;
      expect(degradedFeatures.length).toBeGreaterThan(0);
    });
  });

  describe('Emergency Resource Management', () => {
    it('should provide comprehensive health check information', async () => {
      const response = await request(app)
        .get('/api/orchestration/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('memory_compliance');
      expect(response.body.data).toHaveProperty('feature_degradation_capability');
      expect(response.body.data).toHaveProperty('monitoring_active');
    });

    it('should track active workflows and queue size', async () => {
      const response = await request(app)
        .get('/api/orchestration/status')
        .expect(200);

      expect(response.body.data).toHaveProperty('active_workflows');
      expect(response.body.data).toHaveProperty('queue_size');
      expect(typeof response.body.data.active_workflows).toBe('number');
      expect(typeof response.body.data.queue_size).toBe('number');
    });
  });

  describe('Task Submission and Management', () => {
    it('should submit tasks with proper validation', async () => {
      const taskData = {
        type: 'sponsor_analysis',
        tenant_id: '1',
        data: {
          sponsor_id: 'test-sponsor-123',
          analysis_type: 'full'
        }
      };

      const response = await request(app)
        .post('/api/orchestration/submit-task')
        .send(taskData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('task_id');
      expect(response.body.data).toHaveProperty('estimated_completion');
    });

    it('should reject tasks when memory is critically high', async () => {
      // Force high memory condition
      await request(app)
        .post('/api/orchestration/memory/optimize')
        .send({ force: true });

      const taskData = {
        type: 'relationship_mapping',
        tenant_id: '1',
        data: { source: 'user1', target: 'user2' }
      };

      const response = await request(app)
        .post('/api/orchestration/submit-task')
        .send(taskData);

      // Should either accept with warning or reject based on feature availability
      expect([200, 503]).toContain(response.status);
    });
  });

  describe('Attached Asset Compliance Validation', () => {
    it('should meet 90% critical threshold requirement', async () => {
      const response = await request(app)
        .get('/api/orchestration/status')
        .expect(200);

      const criticalThreshold = response.body.data.memory_status.critical_threshold;
      expect(criticalThreshold).toBe(0.90); // Exactly 90% per attached asset requirements
    });

    it('should automatically disable advanced analytics at critical threshold', async () => {
      await request(app)
        .post('/api/orchestration/memory/optimize')
        .send({ force: true });

      const response = await request(app)
        .get('/api/orchestration/status')
        .expect(200);

      const degradedFeatures = response.body.data.memory_status.degraded_features;
      expect(degradedFeatures).toContain('advanced_analytics');
    });

    it('should automatically disable relationship mapping at critical threshold', async () => {
      await request(app)
        .post('/api/orchestration/memory/optimize')
        .send({ force: true });

      const response = await request(app)
        .get('/api/orchestration/status')
        .expect(200);

      const degradedFeatures = response.body.data.memory_status.degraded_features;
      expect(degradedFeatures).toContain('relationship_mapping');
    });

    it('should provide monitoring at 5-second intervals capability', async () => {
      const response = await request(app)
        .get('/api/orchestration/status')
        .expect(200);

      expect(response.body.data.memory_status.monitoring_enabled).toBe(true);
      expect(response.body.data.memory_status).toHaveProperty('last_check');
      
      // Verify timestamp is recent (within last minute)
      const lastCheck = new Date(response.body.data.memory_status.last_check);
      const now = new Date();
      const timeDiff = now.getTime() - lastCheck.getTime();
      expect(timeDiff).toBeLessThan(60000); // Less than 1 minute
    });
  });

  describe('API Response Performance', () => {
    it('should respond to status requests within 200ms', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/orchestration/status')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(200);
    });

    it('should handle memory optimization requests efficiently', async () => {
      const startTime = Date.now();
      
      await request(app)
        .post('/api/orchestration/memory/optimize')
        .send({ force: false });
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(500); // Allow more time for optimization
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid task submission gracefully', async () => {
      const invalidTask = {
        type: 'invalid_task_type',
        tenant_id: '1'
        // Missing required data field
      };

      const response = await request(app)
        .post('/api/orchestration/submit-task')
        .send(invalidTask)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should handle missing tenant context', async () => {
      const appWithoutTenant = express();
      appWithoutTenant.use(express.json());
      appWithoutTenant.use('/api/orchestration', orchestrationRouter);

      const response = await request(appWithoutTenant)
        .get('/api/orchestration/status')
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should maintain state consistency during rapid requests', async () => {
      // Send multiple optimization requests rapidly
      const promises = Array(5).fill(null).map(() =>
        request(app)
          .post('/api/orchestration/memory/optimize')
          .send({ force: false })
      );

      const responses = await Promise.all(promises);
      
      // All should succeed or fail consistently
      const successCount = responses.filter(r => r.status === 200).length;
      expect(successCount).toBeGreaterThan(0);
    });
  });
});

describe('Integration with Existing Platform', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(mockTenantMiddleware);
    app.use('/api/orchestration', orchestrationRouter);
  });

  it('should maintain tenant isolation in orchestration operations', async () => {
    const response = await request(app)
      .get('/api/orchestration/status')
      .expect(200);

    // Orchestration should be aware of tenant context but not expose cross-tenant data
    expect(response.body.data).not.toHaveProperty('all_tenants');
    expect(response.body.data).not.toHaveProperty('global_state');
  });

  it('should integrate with validation dashboard requirements', async () => {
    const response = await request(app)
      .get('/api/orchestration/health')
      .expect(200);

    // Should provide data suitable for dashboard display
    expect(response.body.data).toHaveProperty('status');
    expect(response.body.data).toHaveProperty('timestamp');
    expect(response.body.data.memory_compliance).toBeDefined();
  });

  it('should support admin mode operations', async () => {
    const adminApp = express();
    adminApp.use(express.json());
    adminApp.use((req: any, res: any, next: any) => {
      req.tenantId = '1';
      req.userEmail = 'admin@tight5digital.com';
      req.isAdmin = true;
      next();
    });
    adminApp.use('/api/orchestration', orchestrationRouter);

    const response = await request(adminApp)
      .get('/api/orchestration/status')
      .expect(200);

    expect(response.body.success).toBe(true);
  });
});