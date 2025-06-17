import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { setUserContext, requireTenantAccess, requireTenantRole } from "./middleware/tenantContext";
import { 
  insertTenantSchema, 
  insertSponsorSchema, 
  insertGrantSchema,
  insertRelationshipSchema,
  insertContentCalendarSchema 
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Tenant context middleware
  const requireTenant = async (req: any, res: any, next: any) => {
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId) {
      return res.status(400).json({ message: "Tenant ID required" });
    }
    req.tenantId = tenantId;
    next();
  };

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const tenants = await storage.getUserTenants(userId);
      res.json({ ...user, tenants });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Tenant routes
  app.post('/api/tenants', isAuthenticated, async (req: any, res) => {
    try {
      const tenantData = insertTenantSchema.parse(req.body);
      const tenant = await storage.createTenant(tenantData);
      
      // Add user as admin of the new tenant
      await storage.joinTenant(req.user.claims.sub, tenant.id, 'admin');
      
      res.json(tenant);
    } catch (error) {
      console.error("Error creating tenant:", error);
      res.status(500).json({ message: "Failed to create tenant" });
    }
  });

  app.get('/api/tenants/:id', isAuthenticated, async (req: any, res) => {
    try {
      const tenant = await storage.getTenant(req.params.id);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }
      res.json(tenant);
    } catch (error) {
      console.error("Error fetching tenant:", error);
      res.status(500).json({ message: "Failed to fetch tenant" });
    }
  });

  // Dashboard routes
  app.get('/api/dashboard/kpis', isAuthenticated, requireTenant, async (req: any, res) => {
    try {
      const kpis = await storage.getDashboardKPIs(req.tenantId);
      res.json(kpis);
    } catch (error) {
      console.error("Error fetching KPIs:", error);
      res.status(500).json({ message: "Failed to fetch KPIs" });
    }
  });

  app.get('/api/dashboard/metrics', isAuthenticated, async (req: any, res) => {
    try {
      const metrics = await storage.getSystemMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching metrics:", error);
      res.status(500).json({ message: "Failed to fetch metrics" });
    }
  });

  // Sponsor routes
  app.get('/api/sponsors', isAuthenticated, requireTenant, async (req: any, res) => {
    try {
      const sponsors = await storage.getSponsors(req.tenantId);
      res.json(sponsors);
    } catch (error) {
      console.error("Error fetching sponsors:", error);
      res.status(500).json({ message: "Failed to fetch sponsors" });
    }
  });

  app.post('/api/sponsors', isAuthenticated, requireTenant, async (req: any, res) => {
    try {
      const sponsorData = insertSponsorSchema.parse({
        ...req.body,
        tenantId: req.tenantId
      });
      const sponsor = await storage.createSponsor(sponsorData);
      res.json(sponsor);
    } catch (error) {
      console.error("Error creating sponsor:", error);
      res.status(500).json({ message: "Failed to create sponsor" });
    }
  });

  app.get('/api/sponsors/:id', isAuthenticated, requireTenant, async (req: any, res) => {
    try {
      const sponsor = await storage.getSponsor(req.params.id, req.tenantId);
      if (!sponsor) {
        return res.status(404).json({ message: "Sponsor not found" });
      }
      res.json(sponsor);
    } catch (error) {
      console.error("Error fetching sponsor:", error);
      res.status(500).json({ message: "Failed to fetch sponsor" });
    }
  });

  app.put('/api/sponsors/:id', isAuthenticated, requireTenant, async (req: any, res) => {
    try {
      const updateData = insertSponsorSchema.partial().parse(req.body);
      const sponsor = await storage.updateSponsor(req.params.id, updateData, req.tenantId);
      res.json(sponsor);
    } catch (error) {
      console.error("Error updating sponsor:", error);
      res.status(500).json({ message: "Failed to update sponsor" });
    }
  });

  app.delete('/api/sponsors/:id', isAuthenticated, requireTenant, async (req: any, res) => {
    try {
      await storage.deleteSponsor(req.params.id, req.tenantId);
      res.json({ message: "Sponsor deleted successfully" });
    } catch (error) {
      console.error("Error deleting sponsor:", error);
      res.status(500).json({ message: "Failed to delete sponsor" });
    }
  });

  // Grant routes
  app.get('/api/grants', isAuthenticated, requireTenant, async (req: any, res) => {
    try {
      const grants = await storage.getGrants(req.tenantId);
      res.json(grants);
    } catch (error) {
      console.error("Error fetching grants:", error);
      res.status(500).json({ message: "Failed to fetch grants" });
    }
  });

  app.post('/api/grants', isAuthenticated, requireTenant, async (req: any, res) => {
    try {
      const grantData = insertGrantSchema.parse({
        ...req.body,
        tenantId: req.tenantId
      });
      const grant = await storage.createGrant(grantData);
      res.json(grant);
    } catch (error) {
      console.error("Error creating grant:", error);
      res.status(500).json({ message: "Failed to create grant" });
    }
  });

  app.get('/api/grants/:id', isAuthenticated, requireTenant, async (req: any, res) => {
    try {
      const grant = await storage.getGrant(req.params.id, req.tenantId);
      if (!grant) {
        return res.status(404).json({ message: "Grant not found" });
      }
      res.json(grant);
    } catch (error) {
      console.error("Error fetching grant:", error);
      res.status(500).json({ message: "Failed to fetch grant" });
    }
  });

  app.get('/api/grants/:id/timeline', isAuthenticated, requireTenant, async (req: any, res) => {
    try {
      const grant = await storage.getGrant(req.params.id, req.tenantId);
      if (!grant) {
        return res.status(404).json({ message: "Grant not found" });
      }
      
      const milestones = await storage.getGrantMilestones(req.params.id, req.tenantId);
      
      const today = new Date();
      const deadline = grant.submissionDeadline ? new Date(grant.submissionDeadline) : null;
      const daysRemaining = deadline ? Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;
      
      res.json({
        grant_id: grant.id,
        grant_name: grant.name,
        submission_deadline: grant.submissionDeadline,
        status: grant.status,
        days_remaining: daysRemaining,
        milestones: milestones.map(m => ({
          milestone_id: m.id,
          title: m.title,
          date: m.milestoneDate,
          status: m.status,
          tasks: m.tasks
        }))
      });
    } catch (error) {
      console.error("Error fetching grant timeline:", error);
      res.status(500).json({ message: "Failed to fetch grant timeline" });
    }
  });

  app.get('/api/grants/:id/milestones', isAuthenticated, requireTenant, async (req: any, res) => {
    try {
      const milestones = await storage.getGrantMilestones(req.params.id, req.tenantId);
      res.json(milestones);
    } catch (error) {
      console.error("Error fetching milestones:", error);
      res.status(500).json({ message: "Failed to fetch milestones" });
    }
  });

  app.put('/api/grants/:grantId/milestones/:milestoneId/status', isAuthenticated, requireTenant, async (req: any, res) => {
    try {
      const { status } = req.body;
      if (!['pending', 'in_progress', 'completed'].includes(status)) {
        return res.status(400).json({ message: "Invalid status value" });
      }
      
      const milestone = await storage.updateGrantMilestone(
        req.params.milestoneId,
        { status },
        req.tenantId
      );
      res.json(milestone);
    } catch (error) {
      console.error("Error updating milestone status:", error);
      res.status(500).json({ message: "Failed to update milestone status" });
    }
  });

  // Relationship routes
  app.get('/api/relationships', isAuthenticated, requireTenant, async (req: any, res) => {
    try {
      const relationships = await storage.getRelationships(req.tenantId);
      res.json(relationships);
    } catch (error) {
      console.error("Error fetching relationships:", error);
      res.status(500).json({ message: "Failed to fetch relationships" });
    }
  });

  app.post('/api/relationships', isAuthenticated, requireTenant, async (req: any, res) => {
    try {
      const relationshipData = insertRelationshipSchema.parse({
        ...req.body,
        tenantId: req.tenantId
      });
      const relationship = await storage.createRelationship(relationshipData);
      res.json(relationship);
    } catch (error) {
      console.error("Error creating relationship:", error);
      res.status(500).json({ message: "Failed to create relationship" });
    }
  });

  app.post('/api/relationships/discover-path', isAuthenticated, requireTenant, async (req: any, res) => {
    try {
      const { source_id, target_id } = req.body;
      if (!source_id || !target_id) {
        return res.status(400).json({ message: "Source and target IDs required" });
      }
      
      const pathResult = await storage.findRelationshipPath(source_id, target_id, req.tenantId);
      
      if (pathResult.path) {
        res.json({
          path_found: true,
          degrees_of_separation: pathResult.degrees,
          path: pathResult.path
        });
      } else {
        res.status(404).json({
          path_found: false,
          message: "No path found within 7 degrees of separation"
        });
      }
    } catch (error) {
      console.error("Error discovering relationship path:", error);
      res.status(500).json({ message: "Failed to discover relationship path" });
    }
  });

  // Content calendar routes
  app.get('/api/content-calendar', isAuthenticated, requireTenant, async (req: any, res) => {
    try {
      const content = await storage.getContentCalendar(req.tenantId);
      res.json({ content });
    } catch (error) {
      console.error("Error fetching content calendar:", error);
      res.status(500).json({ message: "Failed to fetch content calendar" });
    }
  });

  app.post('/api/content-calendar', isAuthenticated, requireTenant, async (req: any, res) => {
    try {
      const contentData = insertContentCalendarSchema.parse({
        ...req.body,
        tenantId: req.tenantId
      });
      const content = await storage.createContentCalendarItem(contentData);
      res.json(content);
    } catch (error) {
      console.error("Error creating content calendar item:", error);
      res.status(500).json({ message: "Failed to create content calendar item" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
