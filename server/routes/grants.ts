import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { grants, grantMilestones } from '../../shared/schema';
import { eq, and, desc, asc, sql, count } from 'drizzle-orm';

const router = Router();

// Get all grants for tenant
router.get('/', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    
    if (!db) {
      return res.status(500).json({ error: 'Database connection unavailable' });
    }
    
    const grantsList = await db
      .select()
      .from(grants)
      .where(eq(grants.tenantId, tenantId))
      .orderBy(desc(grants.createdAt));
    
    // If no grants found, provide sample data for demonstration
    if (grantsList.length === 0) {
      const sampleGrants = [
        {
          id: 'sample-1',
          name: 'Innovation Fund 2025',
          description: 'Technology innovation grant for emerging entrepreneurs',
          amount: '250000',
          currency: 'USD',
          status: 'in_progress',
          submissionDeadline: new Date('2025-08-15'),
          organization: 'NASDAQ Center Innovation Hub',
          tenantId: tenantId,
          createdAt: new Date(),
          updatedAt: new Date(),
          milestones: [
            {
              id: 'milestone-1',
              title: '90-Day Research Phase',
              description: 'Complete market research and feasibility analysis',
              dueDate: new Date('2025-05-17'),
              status: 'completed',
              type: '90-day',
              priority: 'high',
              tasks: [
                { id: 'task-1', title: 'Market Analysis', completed: true, dueDate: new Date('2025-05-10') },
                { id: 'task-2', title: 'Competitive Research', completed: true, dueDate: new Date('2025-05-15') }
              ]
            },
            {
              id: 'milestone-2',
              title: '60-Day Development Phase',
              description: 'Develop prototype and initial testing',
              dueDate: new Date('2025-06-16'),
              status: 'in-progress',
              type: '60-day',
              priority: 'high',
              tasks: [
                { id: 'task-3', title: 'Prototype Development', completed: false, dueDate: new Date('2025-06-10') },
                { id: 'task-4', title: 'User Testing', completed: false, dueDate: new Date('2025-06-15') }
              ]
            }
          ]
        },
        {
          id: 'sample-2', 
          name: 'Community Development Grant',
          description: 'Supporting local community development initiatives',
          amount: '150000',
          currency: 'USD',
          status: 'draft',
          submissionDeadline: new Date('2025-09-30'),
          organization: 'Community Foundation',
          tenantId: tenantId,
          createdAt: new Date(),
          updatedAt: new Date(),
          milestones: []
        },
        {
          id: 'sample-3',
          name: 'Tech Accelerator Program',
          description: 'Advanced technology acceleration funding',
          amount: '500000',
          currency: 'USD', 
          status: 'submitted',
          submissionDeadline: new Date('2025-07-20'),
          organization: 'Tech Innovation Fund',
          tenantId: tenantId,
          createdAt: new Date(),
          updatedAt: new Date(),
          milestones: [
            {
              id: 'milestone-3',
              title: 'Application Submitted',
              description: 'Complete application package submitted',
              dueDate: new Date('2025-07-20'),
              status: 'completed',
              type: 'submission',
              priority: 'critical',
              tasks: []
            }
          ]
        }
      ];
      return res.json(sampleGrants);
    }
    
    res.json(grantsList);
  } catch (error) {
    console.error('Error fetching grants:', error);
    res.status(500).json({ error: 'Failed to fetch grants' });
  }
});

// Get single grant with milestones
router.get('/:grantId', async (req, res) => {
  try {
    const { grantId } = req.params;
    const tenantId = (req as any).tenantId;
    
    if (!db) {
      return res.status(500).json({ error: 'Database connection unavailable' });
    }
    
    const [grant] = await db
      .select()
      .from(grants)
      .where(and(eq(grants.id, grantId), eq(grants.tenantId, tenantId)));
    
    if (!grant) {
      return res.status(404).json({ error: 'Grant not found' });
    }
    
    const milestones = await db
      .select()
      .from(grantMilestones)
      .where(eq(grantMilestones.grantId, grantId))
      .orderBy(asc(grantMilestones.milestoneDate));
    
    res.json({ ...grant, milestones });
  } catch (error) {
    console.error('Error fetching grant:', error);
    res.status(500).json({ error: 'Failed to fetch grant' });
  }
});

// Create new grant (basic endpoint for testing)
router.post('/', async (req, res) => {
  try {
    res.status(201).json({
      message: 'Grant creation endpoint available - schema alignment in progress',
      data: req.body
    });
  } catch (error) {
    console.error('Error creating grant:', error);
    res.status(500).json({ error: 'Failed to create grant' });
  }
});

// Update grant (basic endpoint for testing)
router.put('/:grantId', async (req, res) => {
  try {
    const { grantId } = req.params;
    res.json({
      message: 'Grant update endpoint available - schema alignment in progress',
      grantId,
      data: req.body
    });
  } catch (error) {
    console.error('Error updating grant:', error);
    res.status(500).json({ error: 'Failed to update grant' });
  }
});

// Delete grant
router.delete('/:grantId', async (req, res) => {
  try {
    const { grantId } = req.params;
    const tenantId = (req as any).tenantId;
    
    if (!db) {
      return res.status(500).json({ error: 'Database connection unavailable' });
    }
    
    // Delete milestones first
    await db
      .delete(grantMilestones)
      .where(eq(grantMilestones.grantId, grantId));
    
    // Delete grant
    const [deletedGrant] = await db
      .delete(grants)
      .where(and(eq(grants.id, grantId), eq(grants.tenantId, tenantId)))
      .returning();
    
    if (!deletedGrant) {
      return res.status(404).json({ error: 'Grant not found' });
    }
    
    res.json({ message: 'Grant deleted successfully' });
  } catch (error) {
    console.error('Error deleting grant:', error);
    res.status(500).json({ error: 'Failed to delete grant' });
  }
});

// Get grant analytics and metrics (simplified)
router.get('/analytics/summary', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    
    if (!db) {
      return res.status(500).json({ error: 'Database connection unavailable' });
    }
    
    const grantCount = await db
      .select({ count: count() })
      .from(grants)
      .where(eq(grants.tenantId, tenantId));
    
    res.json({
      summary: {
        totalGrants: grantCount[0]?.count || 0,
        totalAmount: "0.00",
        statusBreakdown: "draft",
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching grant analytics:', error);
    res.status(500).json({ error: 'Failed to fetch grant analytics' });
  }
});

export default router;