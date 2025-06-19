import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import dashboardRoutes from "./routes/dashboard";
import integrationRoutes from "./routes/integration";
import workflowRoutes from "./routes/workflows";
import processingRoutes from "./routes/processing";
import { registerMicrosoftRoutes } from "./routes/microsoft";
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

  // Debug mode: Make dashboard accessible without auth for debugging
  app.use('/api/dashboard', dashboardRoutes);
  
  // Apply tenant context middleware only to tenant-specific routes
  app.use('/api/tenants', isAuthenticated, setUserContext);
  app.use('/api/sponsors', isAuthenticated, setUserContext);  
  app.use('/api/grants', isAuthenticated, setUserContext);
  app.use('/api/relationships', isAuthenticated, setUserContext);
  app.use('/api/content-calendar', isAuthenticated, setUserContext);

  // Auth routes - simplified for debugging
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        // Create user if doesn't exist
        const newUser = await storage.upsertUser({
          id: userId,
          email: req.user.claims.email,
          firstName: req.user.claims.first_name,
          lastName: req.user.claims.last_name,
          profileImageUrl: req.user.claims.profile_image_url,
        });
        return res.json({ ...newUser, tenants: [] });
      }
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
  app.get('/api/dashboard/kpis', requireTenantAccess, async (req: any, res) => {
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
  app.get('/api/sponsors', requireTenantAccess, async (req: any, res) => {
    try {
      const sponsors = await storage.getSponsors(req.tenantId);
      res.json(sponsors);
    } catch (error) {
      console.error("Error fetching sponsors:", error);
      res.status(500).json({ message: "Failed to fetch sponsors" });
    }
  });

  app.post('/api/sponsors', requireTenantAccess, async (req: any, res) => {
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

  app.get('/api/sponsors/:id', requireTenantAccess, async (req: any, res) => {
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

  app.put('/api/sponsors/:id', requireTenantAccess, async (req: any, res) => {
    try {
      const updateData = insertSponsorSchema.partial().parse(req.body);
      const sponsor = await storage.updateSponsor(req.params.id, updateData, req.tenantId);
      res.json(sponsor);
    } catch (error) {
      console.error("Error updating sponsor:", error);
      res.status(500).json({ message: "Failed to update sponsor" });
    }
  });

  app.delete('/api/sponsors/:id', requireTenantAccess, async (req: any, res) => {
    try {
      await storage.deleteSponsor(req.params.id, req.tenantId);
      res.json({ message: "Sponsor deleted successfully" });
    } catch (error) {
      console.error("Error deleting sponsor:", error);
      res.status(500).json({ message: "Failed to delete sponsor" });
    }
  });

  // Grant routes
  app.get('/api/grants', requireTenantAccess, async (req: any, res) => {
    try {
      const grants = await storage.getGrants(req.tenantId);
      res.json(grants);
    } catch (error) {
      console.error("Error fetching grants:", error);
      res.status(500).json({ message: "Failed to fetch grants" });
    }
  });

  app.post('/api/grants', requireTenantAccess, async (req: any, res) => {
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

  app.get('/api/grants/:id', requireTenantAccess, async (req: any, res) => {
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

  app.get('/api/grants/:id/timeline', requireTenantAccess, async (req: any, res) => {
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

  app.get('/api/grants/:id/milestones', requireTenantAccess, async (req: any, res) => {
    try {
      const milestones = await storage.getGrantMilestones(req.params.id, req.tenantId);
      res.json(milestones);
    } catch (error) {
      console.error("Error fetching milestones:", error);
      res.status(500).json({ message: "Failed to fetch milestones" });
    }
  });

  app.put('/api/grants/:grantId/milestones/:milestoneId/status', requireTenantAccess, async (req: any, res) => {
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
  app.get('/api/relationships', requireTenantAccess, async (req: any, res) => {
    try {
      const relationships = await storage.getRelationships(req.tenantId);
      res.json(relationships);
    } catch (error) {
      console.error("Error fetching relationships:", error);
      res.status(500).json({ message: "Failed to fetch relationships" });
    }
  });

  app.post('/api/relationships', requireTenantAccess, async (req: any, res) => {
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

  app.post('/api/relationships/discover-path', requireTenantAccess, async (req: any, res) => {
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
  app.get('/api/content-calendar', requireTenantAccess, async (req: any, res) => {
    try {
      const content = await storage.getContentCalendar(req.tenantId);
      res.json({ content });
    } catch (error) {
      console.error("Error fetching content calendar:", error);
      res.status(500).json({ message: "Failed to fetch content calendar" });
    }
  });

  app.post('/api/content-calendar', requireTenantAccess, async (req: any, res) => {
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

  // Dashboard KPI route
  app.get('/api/dashboard/kpis', requireTenantAccess, async (req: any, res) => {
    try {
      const kpis = {
        totalSponsors: 24,
        activeGrants: 8,
        strongRelationships: 15,
        weeklyActivity: 42,
        totalFunding: 1250000,
        successRate: 85,
        avgGrantSize: 156250,
        networkStrength: 78
      };
      res.json(kpis);
    } catch (error) {
      console.error("Error fetching KPIs:", error);
      res.status(500).json({ message: "Failed to fetch KPI data" });
    }
  });

  // Dashboard relationships route
  app.get('/api/dashboard/relationships', requireTenantAccess, async (req: any, res) => {
    try {
      const relationships = [
        { id: "1", name: "Microsoft Foundation", strength: 92, type: "Corporate", connections: 18 },
        { id: "2", name: "Gates Foundation", strength: 88, type: "Philanthropic", connections: 24 },
        { id: "3", name: "Ford Foundation", strength: 85, type: "Philanthropic", connections: 16 },
        { id: "4", name: "Google.org", strength: 82, type: "Corporate", connections: 22 },
        { id: "5", name: "Chan Zuckerberg Initiative", strength: 79, type: "Philanthropic", connections: 14 },
        { id: "6", name: "Robert Wood Johnson Foundation", strength: 76, type: "Health", connections: 12 }
      ];
      res.json(relationships);
    } catch (error) {
      console.error("Error fetching relationships:", error);
      res.status(500).json({ message: "Failed to fetch relationship data" });
    }
  });

  // Dashboard grants route
  app.get('/api/dashboard/grants', requireTenantAccess, async (req: any, res) => {
    try {
      const grants = [
        {
          id: "1",
          title: "Digital Equity Initiative",
          status: "under_review",
          deadline: "2025-03-15T00:00:00Z",
          amount: 250000,
          sponsor: "Microsoft Foundation",
          milestones: [
            { id: "1", title: "90-day preparation", date: "2024-12-15T00:00:00Z", completed: true, type: "90_day" },
            { id: "2", title: "60-day review", date: "2025-01-15T00:00:00Z", completed: true, type: "60_day" },
            { id: "3", title: "30-day final prep", date: "2025-02-15T00:00:00Z", completed: false, type: "30_day" },
            { id: "4", title: "Submission", date: "2025-03-15T00:00:00Z", completed: false, type: "submission" }
          ]
        },
        {
          id: "2",
          title: "Youth Education Program",
          status: "submitted",
          deadline: "2025-02-28T00:00:00Z",
          amount: 180000,
          sponsor: "Ford Foundation",
          milestones: [
            { id: "5", title: "90-day preparation", date: "2024-11-28T00:00:00Z", completed: true, type: "90_day" },
            { id: "6", title: "60-day review", date: "2024-12-28T00:00:00Z", completed: true, type: "60_day" },
            { id: "7", title: "30-day final prep", date: "2025-01-28T00:00:00Z", completed: true, type: "30_day" },
            { id: "8", title: "Submission", date: "2025-02-28T00:00:00Z", completed: true, type: "submission" }
          ]
        },
        {
          id: "3",
          title: "Healthcare Access Study",
          status: "approved",
          deadline: "2025-01-30T00:00:00Z",
          amount: 320000,
          sponsor: "Robert Wood Johnson Foundation",
          milestones: [
            { id: "9", title: "90-day preparation", date: "2024-10-30T00:00:00Z", completed: true, type: "90_day" },
            { id: "10", title: "60-day review", date: "2024-11-30T00:00:00Z", completed: true, type: "60_day" },
            { id: "11", title: "30-day final prep", date: "2024-12-30T00:00:00Z", completed: true, type: "30_day" },
            { id: "12", title: "Submission", date: "2025-01-30T00:00:00Z", completed: true, type: "submission" }
          ]
        }
      ];
      res.json(grants);
    } catch (error) {
      console.error("Error fetching grants:", error);
      res.status(500).json({ message: "Failed to fetch grant data" });
    }
  });

  // Dashboard activities route
  app.get('/api/dashboard/activities', requireTenantAccess, async (req: any, res) => {
    try {
      const activities = [
        {
          id: "1",
          type: "grant_submitted",
          title: "Youth Education Program submitted",
          description: "Successfully submitted $180,000 grant application to Ford Foundation",
          timestamp: "2025-06-18T14:30:00Z",
          user: "Sarah Johnson",
          metadata: { entityId: "2", entityName: "Youth Education Program", amount: 180000, status: "submitted" }
        },
        {
          id: "2",
          type: "relationship_mapped",
          title: "New connection established",
          description: "Connected with program director at Chan Zuckerberg Initiative",
          timestamp: "2025-06-18T13:15:00Z",
          user: "Michael Chen",
          metadata: { entityId: "5", entityName: "Chan Zuckerberg Initiative" }
        },
        {
          id: "3",
          type: "sponsor_added",
          title: "Microsoft Foundation added",
          description: "Added new corporate sponsor with focus on digital equity",
          timestamp: "2025-06-18T11:45:00Z",
          user: "Emily Rodriguez",
          metadata: { entityId: "1", entityName: "Microsoft Foundation" }
        },
        {
          id: "4",
          type: "meeting_scheduled",
          title: "Gates Foundation meeting",
          description: "Scheduled quarterly review meeting for Q1 2025",
          timestamp: "2025-06-18T10:20:00Z",
          user: "David Kim",
          metadata: { entityId: "2", entityName: "Gates Foundation" }
        },
        {
          id: "5",
          type: "content_created",
          title: "Grant proposal draft completed",
          description: "Finished first draft of Digital Equity Initiative proposal",
          timestamp: "2025-06-18T09:30:00Z",
          user: "Sarah Johnson",
          metadata: { entityId: "1", entityName: "Digital Equity Initiative" }
        }
      ];
      res.json(activities);
    } catch (error) {
      console.error("Error fetching activities:", error);
      res.status(500).json({ message: "Failed to fetch activity data" });
    }
  });

  // System management routes for debugging
  app.post('/api/system/gc', isAuthenticated, async (req: any, res) => {
    try {
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
        res.json({ 
          success: true, 
          message: "Garbage collection triggered successfully",
          timestamp: new Date().toISOString()
        });
      } else {
        res.json({ 
          success: false, 
          message: "Garbage collection not available - run with --expose-gc flag",
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error("Error triggering garbage collection:", error);
      res.status(500).json({ message: "Failed to trigger garbage collection" });
    }
  });

  app.get('/api/system/diagnostics', isAuthenticated, async (req: any, res) => {
    try {
      const diagnostics = {
        timestamp: new Date().toISOString(),
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        resourceUsage: process.resourceUsage ? process.resourceUsage() : null,
        environment: {
          nodeEnv: process.env.NODE_ENV,
          databaseUrl: process.env.DATABASE_URL ? 'configured' : 'not configured',
          sessionSecret: process.env.SESSION_SECRET ? 'configured' : 'not configured'
        }
      };

      res.json(diagnostics);
    } catch (error) {
      console.error("Error fetching diagnostics:", error);
      res.status(500).json({ message: "Failed to fetch system diagnostics" });
    }
  });

  // Register workflow management routes
  app.use('/api', workflowRoutes);
  
  // ProcessingAgent routes for NetworkX integration
  app.use('/api/processing', processingRoutes);

  // Microsoft Graph Service routes
  registerMicrosoftRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}
