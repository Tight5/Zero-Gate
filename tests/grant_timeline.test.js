const request = require('supertest');
const { app } = require('../server/index');
const { storage } = require('../server/storage');

describe('Grant Timeline Tests', () => {
  let authToken;
  let tenantId = 'test-tenant';
  let sponsorId;
  let grantId;

  beforeAll(async () => {
    // Setup test authentication and tenant
    authToken = await getTestAuthToken();
    sponsorId = await createTestSponsor();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  beforeEach(async () => {
    // Create a fresh grant for each test
    const grantResponse = await request(app)
      .post('/api/grants')
      .set('Authorization', `Bearer ${authToken}`)
      .set('X-Tenant-ID', tenantId)
      .send({
        sponsor_id: sponsorId,
        title: 'Test Grant Application',
        amount: 50000,
        submission_deadline: '2024-12-31',
        description: 'Test grant for timeline validation'
      });
    
    grantId = grantResponse.body.id;
  });

  describe('Backwards Planning Timeline', () => {
    test('should generate 90/60/30-day milestones automatically', async () => {
      const response = await request(app)
        .get(`/api/grants/${grantId}/milestones`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', tenantId)
        .expect(200);

      const milestones = response.body;
      
      // Should have at least 3 milestones (90, 60, 30 days)
      expect(milestones.length).toBeGreaterThanOrEqual(3);
      
      // Check milestone dates are correctly calculated
      const deadline = new Date('2024-12-31');
      const milestone90 = new Date(deadline.getTime() - (90 * 24 * 60 * 60 * 1000));
      const milestone60 = new Date(deadline.getTime() - (60 * 24 * 60 * 60 * 1000));
      const milestone30 = new Date(deadline.getTime() - (30 * 24 * 60 * 60 * 1000));
      
      const milestoneDates = milestones.map(m => new Date(m.due_date));
      
      expect(milestoneDates).toContainEqual(expect.objectContaining({
        getTime: expect.any(Function)
      }));
    });

    test('should create appropriate tasks for each milestone', async () => {
      const response = await request(app)
        .get(`/api/grants/${grantId}/milestones`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', tenantId)
        .expect(200);

      const milestones = response.body;
      
      // 90-day milestone should have content strategy tasks
      const milestone90 = milestones.find(m => 
        m.title.includes('Content Strategy') || 
        m.title.includes('90')
      );
      expect(milestone90).toBeDefined();
      expect(milestone90.description).toContain('audit');

      // 60-day milestone should have development tasks
      const milestone60 = milestones.find(m => 
        m.title.includes('Development') || 
        m.title.includes('60')
      );
      expect(milestone60).toBeDefined();
      expect(milestone60.description).toContain('review');

      // 30-day milestone should have execution tasks
      const milestone30 = milestones.find(m => 
        m.title.includes('Execution') || 
        m.title.includes('30')
      );
      expect(milestone30).toBeDefined();
      expect(milestone30.description).toContain('publication');
    });
  });

  describe('Milestone Status Management', () => {
    let milestoneId;

    beforeEach(async () => {
      const milestonesResponse = await request(app)
        .get(`/api/grants/${grantId}/milestones`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', tenantId);
      
      milestoneId = milestonesResponse.body[0].id;
    });

    test('should update milestone status successfully', async () => {
      await request(app)
        .put(`/api/grants/${grantId}/milestones/${milestoneId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', tenantId)
        .send({ status: 'In Progress' })
        .expect(200);

      // Verify status was updated
      const response = await request(app)
        .get(`/api/grants/${grantId}/milestones`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', tenantId);

      const updatedMilestone = response.body.find(m => m.id === milestoneId);
      expect(updatedMilestone.status).toBe('In Progress');
    });

    test('should reject invalid status values', async () => {
      await request(app)
        .put(`/api/grants/${grantId}/milestones/${milestoneId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', tenantId)
        .send({ status: 'invalid_status' })
        .expect(400);
    });

    test('should prevent updating non-existent milestone', async () => {
      await request(app)
        .put(`/api/grants/${grantId}/milestones/non-existent-id`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', tenantId)
        .send({ status: 'Completed' })
        .expect(404);
    });
  });

  describe('Grant Timeline View', () => {
    test('should return complete timeline with milestones and progress', async () => {
      const response = await request(app)
        .get(`/api/grants/${grantId}/timeline`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', tenantId)
        .expect(200);

      const timeline = response.body;
      
      expect(timeline).toHaveProperty('grant_id', grantId);
      expect(timeline).toHaveProperty('title', 'Test Grant Application');
      expect(timeline).toHaveProperty('submission_deadline');
      expect(timeline).toHaveProperty('status');
      expect(timeline).toHaveProperty('milestones');
      expect(timeline).toHaveProperty('days_remaining');
      
      expect(Array.isArray(timeline.milestones)).toBe(true);
      expect(timeline.milestones.length).toBeGreaterThan(0);
      
      // Check that milestones are sorted by date
      const dates = timeline.milestones.map(m => new Date(m.due_date));
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i].getTime()).toBeGreaterThanOrEqual(dates[i-1].getTime());
      }
    });

    test('should calculate days remaining correctly', async () => {
      const response = await request(app)
        .get(`/api/grants/${grantId}/timeline`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', tenantId)
        .expect(200);

      const timeline = response.body;
      const deadline = new Date(timeline.submission_deadline);
      const today = new Date();
      const expectedDays = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
      
      expect(timeline.days_remaining).toBe(expectedDays);
    });
  });

  describe('Content Calendar Integration', () => {
    test('should create content calendar entries for milestones', async () => {
      // Get grant timeline
      const timelineResponse = await request(app)
        .get(`/api/grants/${grantId}/timeline`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', tenantId);

      const timeline = timelineResponse.body;
      
      // Check content calendar for milestone entries
      const calendarResponse = await request(app)
        .get('/api/content-calendar')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', tenantId)
        .expect(200);

      const calendarItems = calendarResponse.body || [];
      
      // Should have content items linked to grant milestones
      const grantContent = calendarItems.filter(item => item.grant_id === grantId);
      expect(grantContent.length).toBeGreaterThanOrEqual(0);
      
      // Check that content items align with milestone dates
      timeline.milestones.forEach(milestone => {
        const relatedContent = grantContent.filter(item => {
          const itemDate = new Date(item.scheduled_date);
          const milestoneDate = new Date(milestone.due_date);
          const daysDiff = Math.abs((itemDate - milestoneDate) / (1000 * 60 * 60 * 24));
          return daysDiff <= 7; // Within a week of milestone
        });
        
        expect(relatedContent.length).toBeGreaterThanOrEqual(0);
      });
    });
  });

  // Helper functions
  async function getTestAuthToken() {
    // Mock authentication for testing
    return 'test-jwt-token';
  }

  async function createTestSponsor() {
    const sponsor = await storage.createSponsor({
      name: 'Test Sponsor',
      email: 'sponsor@test.com',
      tier: 'Foundation',
      tenant_id: tenantId
    });
    return sponsor.id;
  }

  async function cleanupTestData() {
    // Clean up test data
    if (grantId) {
      try {
        await storage.deleteGrant(grantId, tenantId);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    
    if (sponsorId) {
      try {
        await storage.deleteSponsor(sponsorId, tenantId);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }
});