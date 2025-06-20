import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { grants, grantMilestones } from '../../shared/schema';
import { eq, and, desc, asc, sql, count } from 'drizzle-orm';

const router = Router();

// Get all grants for tenant
router.get('/grants', async (req, res) => {
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
router.get('/grants/:grantId', async (req, res) => {
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

// Create new grant with backwards planning
router.post('/grants', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    
    const createSchema = z.object({
      title: z.string().min(1).max(200),
      description: z.string().optional(),
      organization: z.string().min(1).max(100),
      amount: z.number().positive(),
      submissionDeadline: z.string().datetime(),
      status: z.enum(['planning', 'in_progress', 'submitted', 'awarded', 'rejected']).default('planning'),
      priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
      category: z.string().optional(),
      requirements: z.array(z.string()).default([]),
    });
    
    const grantData = createSchema.parse(req.body);
    
    if (!db) {
      return res.status(500).json({ error: 'Database connection unavailable' });
    }
    
    const [newGrant] = await db
      .insert(grants)
      .values({
        name: grantData.title,
        tenantId,
        sponsorId: null, // Will be linked later if needed
        description: grantData.description,
        organization: grantData.organization,
        amount: grantData.amount.toString(),
        status: grantData.status,
        deadline: new Date(grantData.submissionDeadline),
        submissionDeadline: new Date(grantData.submissionDeadline),
        requirements: grantData.requirements,
        notes: `Category: ${grantData.category || 'General'}, Priority: ${grantData.priority}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    
    // Generate backwards planning milestones
    const submissionDate = new Date(grantData.submissionDeadline);
    const milestones = [
      {
        grantId: newGrant.id,
        title: 'Final Review & Submission',
        description: 'Complete final review and submit grant application',
        milestoneDate: new Date(submissionDate.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days before
        status: 'pending' as const,
        tasks: [{ task: 'Final review', estimated_hours: 8 }],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        grantId: newGrant.id,
        title: '30-Day Milestone',
        description: 'Complete all supporting documents and narratives',
        milestoneDate: new Date(submissionDate.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days before
        status: 'pending' as const,
        tasks: [{ task: 'Document preparation', estimated_hours: 40 }],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        grantId: newGrant.id,
        title: '60-Day Milestone',
        description: 'Finalize budget, timeline, and key partnerships',
        milestoneDate: new Date(submissionDate.getTime() - 60 * 24 * 60 * 60 * 1000), // 60 days before
        status: 'pending' as const,
        tasks: [{ task: 'Budget and partnerships', estimated_hours: 24 }],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        grantId: newGrant.id,
        title: '90-Day Milestone',
        description: 'Initial research, stakeholder outreach, and requirement analysis',
        milestoneDate: new Date(submissionDate.getTime() - 90 * 24 * 60 * 60 * 1000), // 90 days before
        status: 'pending' as const,
        tasks: [{ task: 'Research and analysis', estimated_hours: 16 }],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    
    await db.insert(grantMilestones).values(milestones);
    
    res.status(201).json({
      grant: newGrant,
      milestones: milestones.length,
      message: 'Grant created with backwards planning milestones'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid grant data', details: error.errors });
    }
    console.error('Error creating grant:', error);
    res.status(500).json({ error: 'Failed to create grant' });
  }
});

// Update grant
router.put('/grants/:grantId', async (req, res) => {
  try {
    const { grantId } = req.params;
    const tenantId = (req as any).tenantId;
    
    const updateSchema = z.object({
      title: z.string().min(1).max(200).optional(),
      description: z.string().optional(),
      organization: z.string().min(1).max(100).optional(),
      amount: z.number().positive().optional(),
      submissionDeadline: z.string().datetime().optional(),
      status: z.enum(['planning', 'in_progress', 'submitted', 'awarded', 'rejected']).optional(),
      priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
      category: z.string().optional(),
      requirements: z.array(z.string()).optional(),
    });
    
    const updateData = updateSchema.parse(req.body);
    
    if (!db) {
      return res.status(500).json({ error: 'Database connection unavailable' });
    }
    
    const [updatedGrant] = await db
      .update(grants)
      .set({
        ...updateData,
        submissionDeadline: updateData.submissionDeadline ? new Date(updateData.submissionDeadline) : undefined,
        updatedAt: new Date(),
      })
      .where(and(eq(grants.id, grantId), eq(grants.tenantId, tenantId)))
      .returning();
    
    if (!updatedGrant) {
      return res.status(404).json({ error: 'Grant not found' });
    }
    
    res.json(updatedGrant);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid update data', details: error.errors });
    }
    console.error('Error updating grant:', error);
    res.status(500).json({ error: 'Failed to update grant' });
  }
});

// Delete grant
router.delete('/grants/:grantId', async (req, res) => {
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

// Get grant analytics and metrics
router.get('/grants/analytics/summary', async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    
    if (!db) {
      return res.status(500).json({ error: 'Database connection unavailable' });
    }
    
    const analytics = await db
      .select({
        totalGrants: db.$count(grants),
        totalAmount: db.sum(grants.amount),
        statusBreakdown: grants.status,
        priorityBreakdown: grants.priority,
      })
      .from(grants)
      .where(eq(grants.tenantId, tenantId));
    
    res.json({
      summary: analytics,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching grant analytics:', error);
    res.status(500).json({ error: 'Failed to fetch grant analytics' });
  }
});

export default router;