import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  decimal,
  boolean,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique().notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  currentTenantId: varchar("current_tenant_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tenants table for multi-tenancy
export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  domain: varchar("domain", { length: 255 }).unique(),
  settings: jsonb("settings").default({}),
  planTier: varchar("plan_tier", { length: 50 }).default("basic"),
  microsoft365TenantId: varchar("microsoft365_tenant_id", { length: 255 }),
  microsoft365Config: jsonb("microsoft365_config").default({}),
  agentDiscoveryEnabled: boolean("agent_discovery_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Data classification for intelligent data management
export const dataClassification = pgTable("data_classification", {
  id: serial("id").primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  dataType: varchar("data_type", { length: 50 }).notNull(),
  sensitivityLevel: varchar("sensitivity_level", { length: 20 }).notNull(), // public, internal, confidential
  retentionPeriod: integer("retention_period").notNull(), // days
  accessControl: jsonb("access_control").default({}),
  encryptionRequired: boolean("encryption_required").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Enhanced sponsor discovery and stakeholder mapping
export const sponsorDiscovery = pgTable("sponsor_discovery", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  sponsorId: uuid("sponsor_id"),
  discoveryStatus: varchar("discovery_status", { length: 50 }).default("pending"), // pending, processing, completed, failed
  microsoft365Data: jsonb("microsoft365_data").default({}),
  stakeholderPrincipals: jsonb("stakeholder_principals").default([]),
  emergingTopics: jsonb("emerging_topics").default([]),
  communicationPatterns: jsonb("communication_patterns").default({}),
  relationshipStrength: decimal("relationship_strength", { precision: 5, scale: 2 }),
  lastAnalysisDate: timestamp("last_analysis_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sponsor organization intelligence
export const sponsorOrganization = pgTable("sponsor_organization", {
  id: uuid("id").primaryKey().defaultRandom(),
  sponsorId: uuid("sponsor_id").notNull(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  organizationStructure: jsonb("organization_structure").default({}),
  keyStakeholders: jsonb("key_stakeholders").default([]),
  departmentHierarchy: jsonb("department_hierarchy").default({}),
  decisionMakers: jsonb("decision_makers").default([]),
  influenceMap: jsonb("influence_map").default({}),
  collaborationHistory: jsonb("collaboration_history").default([]),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

// Agent task orchestration tracking
export const agentTasks = pgTable("agent_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  taskType: varchar("task_type", { length: 100 }).notNull(), // sponsor_discovery, stakeholder_analysis, topic_analysis
  targetId: uuid("target_id"), // sponsor_id, grant_id, etc.
  status: varchar("status", { length: 50 }).default("queued"), // queued, processing, completed, failed
  priority: integer("priority").default(5), // 1-10, lower is higher priority
  agentType: varchar("agent_type", { length: 50 }).notNull(), // orchestration, processing, integration
  taskData: jsonb("task_data").default({}),
  results: jsonb("results").default({}),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tenant data feeds for dynamic integration
export const tenantDataFeeds = pgTable("tenant_data_feeds", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  feedType: varchar("feed_type", { length: 50 }).notNull(), // 'microsoft365', 'crm', 'custom'
  sourceConfig: jsonb("source_config").notNull(),
  classificationLevel: varchar("classification_level", { length: 20 }).notNull(), // 'public', 'internal', 'confidential'
  syncFrequency: integer("sync_frequency").default(3600), // seconds
  lastSync: timestamp("last_sync"),
  status: varchar("status", { length: 20 }).default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User-Tenant relationship (many-to-many)
export const userTenants = pgTable("user_tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").notNull(),
  tenantId: uuid("tenant_id").notNull(),
  role: varchar("role", { length: 50 }).default("member"),
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Sponsors table
export const sponsors = pgTable("sponsors", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  organization: varchar("organization", { length: 255 }),
  domain: varchar("domain", { length: 255 }), // Added for Microsoft 365 integration
  email: varchar("email", { length: 255 }),
  type: varchar("type", { length: 100 }),
  contactInfo: jsonb("contact_info").default({}),
  relationshipManager: varchar("relationship_manager", { length: 255 }),
  lastContactDate: timestamp("last_contact_date"),
  relationshipStrength: integer("relationship_strength").default(1),
  tags: jsonb("tags").default([]),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sponsor stakeholders from Microsoft 365 integration
export const sponsorStakeholders = pgTable("sponsor_stakeholders", {
  id: uuid("id").primaryKey().defaultRandom(),
  sponsorId: uuid("sponsor_id").notNull().references(() => sponsors.id),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  email: varchar("email", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }),
  role: varchar("role", { length: 100 }),
  department: varchar("department", { length: 100 }),
  orgLevel: integer("org_level"), // management hierarchy level
  communicationFrequency: integer("communication_frequency").default(0),
  lastInteraction: timestamp("last_interaction"),
  influenceScore: decimal("influence_score", { precision: 3, scale: 2 }), // 0.00 to 1.00
  relationshipStrength: varchar("relationship_strength", { length: 20 }), // 'weak', 'moderate', 'strong'
  sourceFeed: varchar("source_feed", { length: 50 }).default("microsoft365"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Emerging topics from communication analysis
export const sponsorTopics = pgTable("sponsor_topics", {
  id: uuid("id").primaryKey().defaultRandom(),
  sponsorId: uuid("sponsor_id").notNull().references(() => sponsors.id),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  topicName: varchar("topic_name", { length: 255 }).notNull(),
  relevanceScore: decimal("relevance_score", { precision: 3, scale: 2 }), // 0.00 to 1.00
  frequency: integer("frequency").default(1),
  firstMentioned: timestamp("first_mentioned"),
  lastMentioned: timestamp("last_mentioned"),
  sentiment: varchar("sentiment", { length: 20 }), // 'positive', 'neutral', 'negative'
  keywords: jsonb("keywords").default([]),
  sourceEmails: integer("source_emails").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Grants table
export const grants = pgTable("grants", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  sponsorId: uuid("sponsor_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  organization: varchar("organization", { length: 255 }),
  amount: decimal("amount", { precision: 12, scale: 2 }),
  status: varchar("status", { length: 50 }).default("draft"),
  deadline: timestamp("deadline"),
  submissionDeadline: timestamp("submission_deadline"),
  submittedAt: timestamp("submitted_at"),
  awardedAt: timestamp("awarded_at"),
  requirements: jsonb("requirements").default({}),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Grant milestones table
export const grantMilestones = pgTable("grant_milestones", {
  id: uuid("id").primaryKey().defaultRandom(),
  grantId: uuid("grant_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  milestoneDate: timestamp("milestone_date").notNull(),
  status: varchar("status", { length: 50 }).default("pending"),
  tasks: jsonb("tasks").default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relationships table (for relationship mapping)
export const relationships = pgTable("relationships", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  sourceId: varchar("source_id").notNull(),
  targetId: varchar("target_id").notNull(),
  sponsorId: uuid("sponsor_id"),
  personName: varchar("person_name", { length: 255 }),
  relationshipType: varchar("relationship_type", { length: 100 }),
  type: varchar("type", { length: 100 }),
  strength: integer("strength").default(1),
  verified: boolean("verified").default(false),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Content calendar table
export const contentCalendar = pgTable("content_calendar", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  grantId: uuid("grant_id"),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content"),
  scheduledDate: timestamp("scheduled_date").notNull(),
  platform: varchar("platform", { length: 100 }),
  status: varchar("status", { length: 50 }).default("draft"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// System metrics table
export const systemMetrics = pgTable("system_metrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id"),
  metricType: varchar("metric_type", { length: 100 }).notNull(),
  value: decimal("value", { precision: 10, scale: 2 }),
  metadata: jsonb("metadata").default({}),
  recordedAt: timestamp("recorded_at").defaultNow(),
});

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  userTenants: many(userTenants),
}));

export const tenantsRelations = relations(tenants, ({ many }) => ({
  userTenants: many(userTenants),
  sponsors: many(sponsors),
  grants: many(grants),
  relationships: many(relationships),
  contentCalendar: many(contentCalendar),
  systemMetrics: many(systemMetrics),
}));

export const userTenantsRelations = relations(userTenants, ({ one }) => ({
  user: one(users, {
    fields: [userTenants.userId],
    references: [users.id],
  }),
  tenant: one(tenants, {
    fields: [userTenants.tenantId],
    references: [tenants.id],
  }),
}));

export const sponsorsRelations = relations(sponsors, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [sponsors.tenantId],
    references: [tenants.id],
  }),
  grants: many(grants),
  stakeholders: many(sponsorStakeholders),
  topics: many(sponsorTopics),
}));

export const sponsorStakeholdersRelations = relations(sponsorStakeholders, ({ one }) => ({
  sponsor: one(sponsors, {
    fields: [sponsorStakeholders.sponsorId],
    references: [sponsors.id],
  }),
  tenant: one(tenants, {
    fields: [sponsorStakeholders.tenantId],
    references: [tenants.id],
  }),
}));

export const sponsorTopicsRelations = relations(sponsorTopics, ({ one }) => ({
  sponsor: one(sponsors, {
    fields: [sponsorTopics.sponsorId],
    references: [sponsors.id],
  }),
  tenant: one(tenants, {
    fields: [sponsorTopics.tenantId],
    references: [tenants.id],
  }),
}));

export const tenantDataFeedsRelations = relations(tenantDataFeeds, ({ one }) => ({
  tenant: one(tenants, {
    fields: [tenantDataFeeds.tenantId],
    references: [tenants.id],
  }),
}));

// OneDrive Storage Management Table
export const onedriveStorage = pgTable('onedrive_storage', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  fileType: text('file_type').notNull(), // 'sponsor_profile', 'stakeholder_data', 'analytics', 'documents'
  entityId: uuid('entity_id').notNull(), // Reference to sponsor, grant, etc.
  onedriveFileId: text('onedrive_file_id').notNull(),
  onedriveStoragePath: text('onedrive_storage_path').notNull(),
  fileName: text('file_name').notNull(),
  fileSize: integer('file_size'),
  contentType: text('content_type').default('application/json'),
  uploadMethod: text('upload_method').notNull().default('direct'), // 'direct', 'chunked', 'session'
  syncStatus: text('sync_status').notNull().default('synced'),
  lastSyncAt: timestamp('last_sync_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  // Data classification for security
  classificationLevel: text('classification_level').notNull().default('internal'), // 'public', 'internal', 'confidential'
  encryptionStatus: text('encryption_status').notNull().default('encrypted'),
  accessControl: jsonb('access_control') // Store access control metadata
});

// Enhanced Data Classification Schema (removing duplicate)
// Note: dataClassification is already defined above at line 56

export const onedriveStorageRelations = relations(onedriveStorage, ({ one }) => ({
  tenant: one(tenants, {
    fields: [onedriveStorage.tenantId],
    references: [tenants.id],
  }),
}));

export const dataClassificationRelations = relations(dataClassification, ({ one }) => ({
  tenant: one(tenants, {
    fields: [dataClassification.tenantId],
    references: [tenants.id],
  }),
}));

export const grantsRelations = relations(grants, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [grants.tenantId],
    references: [tenants.id],
  }),
  sponsor: one(sponsors, {
    fields: [grants.sponsorId],
    references: [sponsors.id],
  }),
  milestones: many(grantMilestones),
  contentCalendar: many(contentCalendar),
}));

export const grantMilestonesRelations = relations(grantMilestones, ({ one }) => ({
  grant: one(grants, {
    fields: [grantMilestones.grantId],
    references: [grants.id],
  }),
}));

export const relationshipsRelations = relations(relationships, ({ one }) => ({
  tenant: one(tenants, {
    fields: [relationships.tenantId],
    references: [tenants.id],
  }),
}));

export const contentCalendarRelations = relations(contentCalendar, ({ one }) => ({
  tenant: one(tenants, {
    fields: [contentCalendar.tenantId],
    references: [tenants.id],
  }),
  grant: one(grants, {
    fields: [contentCalendar.grantId],
    references: [grants.id],
  }),
}));

export const systemMetricsRelations = relations(systemMetrics, ({ one }) => ({
  tenant: one(tenants, {
    fields: [systemMetrics.tenantId],
    references: [tenants.id],
  }),
}));

// Enhanced Zod schemas with comprehensive validation
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
}).extend({
  email: z.string()
    .email("Please enter a valid email address")
    .min(1, "Email is required")
    .max(255, "Email must be less than 255 characters"),
  firstName: z.string()
    .min(1, "First name is required")
    .max(100, "First name must be less than 100 characters")
    .regex(/^[a-zA-Z\s'-]+$/, "First name can only contain letters, spaces, hyphens, and apostrophes")
    .optional(),
  lastName: z.string()
    .min(1, "Last name is required")
    .max(100, "Last name must be less than 100 characters")
    .regex(/^[a-zA-Z\s'-]+$/, "Last name can only contain letters, spaces, hyphens, and apostrophes")
    .optional(),
  profileImageUrl: z.string()
    .url("Please enter a valid URL")
    .optional()
    .or(z.literal(""))
});

export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string()
    .min(1, "Organization name is required")
    .max(255, "Organization name must be less than 255 characters")
    .regex(/^[a-zA-Z0-9\s&.,'-]+$/, "Organization name contains invalid characters"),
  domain: z.string()
    .regex(/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/, "Please enter a valid domain")
    .max(255, "Domain must be less than 255 characters")
    .optional(),
  planTier: z.enum(["basic", "professional", "enterprise"], {
    errorMap: () => ({ message: "Please select a valid plan tier" })
  }).default("basic"),
  microsoft365TenantId: z.string()
    .uuid("Microsoft 365 Tenant ID must be a valid UUID")
    .optional()
    .or(z.literal("")),
});

export const insertSponsorSchema = createInsertSchema(sponsors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string()
    .min(1, "Sponsor name is required")
    .max(255, "Sponsor name must be less than 255 characters")
    .regex(/^[a-zA-Z0-9\s&.,'-]+$/, "Sponsor name contains invalid characters"),
  organization: z.string()
    .min(1, "Organization is required")
    .max(255, "Organization must be less than 255 characters")
    .optional(),
  domain: z.string()
    .regex(/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/, "Please enter a valid domain")
    .optional()
    .or(z.literal("")),
  email: z.string()
    .email("Please enter a valid email address")
    .max(255, "Email must be less than 255 characters")
    .optional()
    .or(z.literal("")),
  type: z.enum(["foundation", "government", "corporation", "individual", "other"], {
    errorMap: () => ({ message: "Please select a valid sponsor type" })
  }).optional(),
  relationshipStrength: z.number()
    .int("Relationship strength must be a whole number")
    .min(1, "Relationship strength must be at least 1")
    .max(10, "Relationship strength cannot exceed 10")
    .default(1),
  relationshipManager: z.string()
    .max(255, "Relationship manager name must be less than 255 characters")
    .optional()
    .or(z.literal("")),
  notes: z.string()
    .max(5000, "Notes must be less than 5000 characters")
    .optional()
    .or(z.literal("")),
});

export const insertGrantSchema = createInsertSchema(grants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string()
    .min(1, "Grant name is required")
    .max(255, "Grant name must be less than 255 characters"),
  title: z.string()
    .min(1, "Grant title is required")
    .max(255, "Grant title must be less than 255 characters"),
  organization: z.string()
    .min(1, "Organization is required")
    .max(255, "Organization must be less than 255 characters")
    .optional(),
  amount: z.number()
    .positive("Grant amount must be positive")
    .max(999999999.99, "Grant amount is too large")
    .optional(),
  status: z.enum(["draft", "planning", "in_progress", "submitted", "approved", "rejected", "completed"], {
    errorMap: () => ({ message: "Please select a valid grant status" })
  }).default("draft"),
  submissionDeadline: z.date({
    required_error: "Submission deadline is required",
    invalid_type_error: "Please enter a valid date"
  }).refine((date) => date > new Date(), {
    message: "Submission deadline must be in the future"
  }),
  deadline: z.date({
    invalid_type_error: "Please enter a valid date"
  }).optional(),
  notes: z.string()
    .max(5000, "Notes must be less than 5000 characters")
    .optional()
    .or(z.literal("")),
});

export const insertGrantMilestoneSchema = createInsertSchema(grantMilestones).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  title: z.string()
    .min(1, "Milestone title is required")
    .max(255, "Milestone title must be less than 255 characters"),
  description: z.string()
    .max(1000, "Description must be less than 1000 characters")
    .optional()
    .or(z.literal("")),
  milestoneDate: z.date({
    required_error: "Milestone date is required",
    invalid_type_error: "Please enter a valid date"
  }),
  status: z.enum(["pending", "in_progress", "completed", "overdue"], {
    errorMap: () => ({ message: "Please select a valid milestone status" })
  }).default("pending"),
});

export const insertRelationshipSchema = createInsertSchema(relationships).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  sourceId: z.string()
    .min(1, "Source ID is required")
    .max(255, "Source ID must be less than 255 characters"),
  targetId: z.string()
    .min(1, "Target ID is required")
    .max(255, "Target ID must be less than 255 characters"),
  personName: z.string()
    .min(1, "Person name is required")
    .max(255, "Person name must be less than 255 characters")
    .regex(/^[a-zA-Z\s'-]+$/, "Person name can only contain letters, spaces, hyphens, and apostrophes")
    .optional(),
  relationshipType: z.enum(["colleague", "mentor", "advisor", "client", "partner", "friend", "family", "other"], {
    errorMap: () => ({ message: "Please select a valid relationship type" })
  }).optional(),
  type: z.enum(["professional", "personal", "academic", "business", "other"], {
    errorMap: () => ({ message: "Please select a valid relationship category" })
  }).optional(),
  strength: z.number()
    .int("Relationship strength must be a whole number")
    .min(1, "Relationship strength must be at least 1")
    .max(10, "Relationship strength cannot exceed 10")
    .default(1),
  verified: z.boolean().default(false),
});

export const insertContentCalendarSchema = createInsertSchema(contentCalendar).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  title: z.string()
    .min(1, "Content title is required")
    .max(255, "Content title must be less than 255 characters"),
  content: z.string()
    .max(10000, "Content must be less than 10000 characters")
    .optional()
    .or(z.literal("")),
  scheduledDate: z.date({
    required_error: "Scheduled date is required",
    invalid_type_error: "Please enter a valid date"
  }),
  platform: z.enum(["linkedin", "twitter", "facebook", "instagram", "email", "website", "newsletter", "press_release", "other"], {
    errorMap: () => ({ message: "Please select a valid platform" })
  }).optional(),
  status: z.enum(["draft", "scheduled", "published", "cancelled"], {
    errorMap: () => ({ message: "Please select a valid content status" })
  }).default("draft"),
});

// Form validation schemas with enhanced validation
export const loginFormSchema = z.object({
  email: z.string()
    .email("Please enter a valid email address")
    .min(1, "Email is required"),
  password: z.string()
    .min(6, "Password must be at least 6 characters")
    .min(1, "Password is required"),
  rememberMe: z.boolean().default(false),
});

export const grantFormStepSchemas = {
  basicInfo: z.object({
    title: z.string()
      .min(1, "Grant title is required")
      .max(255, "Grant title must be less than 255 characters"),
    organization: z.string()
      .min(1, "Organization is required")
      .max(255, "Organization must be less than 255 characters"),
    amount: z.number()
      .positive("Grant amount must be positive")
      .max(999999999.99, "Grant amount is too large")
      .optional(),
    submissionDeadline: z.date({
      required_error: "Submission deadline is required",
      invalid_type_error: "Please enter a valid date"
    }).refine((date) => date > new Date(), {
      message: "Submission deadline must be in the future"
    }),
    category: z.enum(["research", "education", "community", "technology", "healthcare", "environment", "arts", "other"], {
      errorMap: () => ({ message: "Please select a valid category" })
    }),
    status: z.enum(["draft", "planning", "in_progress"], {
      errorMap: () => ({ message: "Please select a valid status" })
    }).default("draft"),
  }),
  
  details: z.object({
    description: z.string()
      .min(50, "Description must be at least 50 characters")
      .max(5000, "Description must be less than 5000 characters"),
    objectives: z.string()
      .min(20, "Objectives must be at least 20 characters")
      .max(2000, "Objectives must be less than 2000 characters"),
    methodology: z.string()
      .min(20, "Methodology must be at least 20 characters")
      .max(2000, "Methodology must be less than 2000 characters"),
    budget: z.string()
      .min(20, "Budget details must be at least 20 characters")
      .max(2000, "Budget details must be less than 2000 characters"),
    timeline: z.string()
      .min(20, "Timeline must be at least 20 characters")
      .max(2000, "Timeline must be less than 2000 characters"),
    teamMembers: z.array(z.string().min(1, "Team member name is required")).optional(),
    requiredDocuments: z.array(z.string().min(1, "Document name is required")).optional(),
  }),
  
  milestones: z.object({
    milestones: z.array(z.object({
      title: z.string()
        .min(1, "Milestone title is required")
        .max(255, "Milestone title must be less than 255 characters"),
      description: z.string()
        .max(1000, "Description must be less than 1000 characters")
        .optional(),
      milestoneDate: z.date({
        required_error: "Milestone date is required",
        invalid_type_error: "Please enter a valid date"
      }),
      status: z.enum(["pending", "in_progress", "completed"], {
        errorMap: () => ({ message: "Please select a valid status" })
      }).default("pending"),
    })).min(1, "At least one milestone is required"),
  }),
  
  review: z.object({
    termsAccepted: z.boolean()
      .refine((val) => val === true, {
        message: "You must accept the terms and conditions"
      }),
    dataAccuracy: z.boolean()
      .refine((val) => val === true, {
        message: "You must confirm the data accuracy"
      }),
  }),
};

export const sponsorFormSchema = z.object({
  name: z.string()
    .min(1, "Sponsor name is required")
    .max(255, "Sponsor name must be less than 255 characters")
    .regex(/^[a-zA-Z0-9\s&.,'-]+$/, "Sponsor name contains invalid characters"),
  organization: z.string()
    .min(1, "Organization is required")
    .max(255, "Organization must be less than 255 characters"),
  email: z.string()
    .email("Please enter a valid email address")
    .max(255, "Email must be less than 255 characters")
    .optional()
    .or(z.literal("")),
  phone: z.string()
    .regex(/^[\+]?[1-9][\d]{0,15}$/, "Please enter a valid phone number")
    .optional()
    .or(z.literal("")),
  type: z.enum(["foundation", "government", "corporation", "individual", "other"], {
    errorMap: () => ({ message: "Please select a valid sponsor type" })
  }),
  relationshipManager: z.string()
    .max(255, "Relationship manager name must be less than 255 characters")
    .optional()
    .or(z.literal("")),
  relationshipStrength: z.number()
    .int("Relationship strength must be a whole number")
    .min(1, "Relationship strength must be at least 1")
    .max(10, "Relationship strength cannot exceed 10")
    .default(5),
  tags: z.array(z.string().min(1, "Tag cannot be empty")).optional(),
  notes: z.string()
    .max(5000, "Notes must be less than 5000 characters")
    .optional()
    .or(z.literal("")),
});

// All type exports consolidated
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;

export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Tenant = typeof tenants.$inferSelect;

export type InsertSponsor = z.infer<typeof insertSponsorSchema>;
export type Sponsor = typeof sponsors.$inferSelect;

export type InsertGrant = z.infer<typeof insertGrantSchema>;
export type Grant = typeof grants.$inferSelect;

export type InsertGrantMilestone = z.infer<typeof insertGrantMilestoneSchema>;
export type GrantMilestone = typeof grantMilestones.$inferSelect;

export type InsertRelationship = z.infer<typeof insertRelationshipSchema>;
export type Relationship = typeof relationships.$inferSelect;

export type InsertContentCalendar = z.infer<typeof insertContentCalendarSchema>;
export type ContentCalendar = typeof contentCalendar.$inferSelect;

// Form data types
export type LoginFormData = z.infer<typeof loginFormSchema>;
export type SponsorFormData = z.infer<typeof sponsorFormSchema>;
export type GrantBasicInfoData = z.infer<typeof grantFormStepSchemas.basicInfo>;
export type GrantDetailsData = z.infer<typeof grantFormStepSchemas.details>;
export type GrantMilestonesData = z.infer<typeof grantFormStepSchemas.milestones>;
export type GrantReviewData = z.infer<typeof grantFormStepSchemas.review>;

export const insertSponsorDiscoverySchema = createInsertSchema(sponsorDiscovery).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSponsorOrganizationSchema = createInsertSchema(sponsorOrganization).omit({
  id: true,
  lastUpdated: true,
});

export const insertAgentTaskSchema = createInsertSchema(agentTasks).omit({
  id: true,
  createdAt: true,
});

export const insertDataClassificationSchema = createInsertSchema(dataClassification).omit({
  id: true,
  createdAt: true,
});

export const insertTenantDataFeedSchema = createInsertSchema(tenantDataFeeds).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSponsorStakeholderSchema = createInsertSchema(sponsorStakeholders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSponsorTopicSchema = createInsertSchema(sponsorTopics).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Additional schema types
export type InsertSponsorDiscovery = z.infer<typeof insertSponsorDiscoverySchema>;
export type SponsorDiscovery = typeof sponsorDiscovery.$inferSelect;
export type InsertSponsorOrganization = z.infer<typeof insertSponsorOrganizationSchema>;
export type SponsorOrganization = typeof sponsorOrganization.$inferSelect;
export type InsertAgentTask = z.infer<typeof insertAgentTaskSchema>;
export type AgentTask = typeof agentTasks.$inferSelect;
export type InsertDataClassification = z.infer<typeof insertDataClassificationSchema>;
export type DataClassification = typeof dataClassification.$inferSelect;
export type InsertTenantDataFeed = z.infer<typeof insertTenantDataFeedSchema>;
export type TenantDataFeed = typeof tenantDataFeeds.$inferSelect;
export type InsertSponsorStakeholder = z.infer<typeof insertSponsorStakeholderSchema>;
export type SponsorStakeholder = typeof sponsorStakeholders.$inferSelect;
export type InsertSponsorTopic = z.infer<typeof insertSponsorTopicSchema>;
export type SponsorTopic = typeof sponsorTopics.$inferSelect;
