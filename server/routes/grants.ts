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