import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// 사용자 관리
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("admin"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 사용자 설정
export const userSettings = pgTable("user_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  settingKey: text("setting_key").notNull(),
  settingValue: jsonb("setting_value"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 자동화 작업
export const automationTasks = pgTable("automation_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'full_automation', 'manual_upload', 'batch_process'
  status: text("status").notNull().default("pending"), // 'pending', 'running', 'completed', 'failed'
  config: jsonb("config"),
  progress: integer("progress").default(0),
  totalItems: integer("total_items").default(0),
  processedItems: integer("processed_items").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 자동화 로그
export const automationLogs = pgTable("automation_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").references(() => automationTasks.id).notNull(),
  level: text("level").notNull(), // 'info', 'warning', 'error', 'success'
  message: text("message").notNull(),
  metadata: jsonb("metadata"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// 처리된 이미지
export const processedImages = pgTable("processed_images", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  taskId: varchar("task_id").references(() => automationTasks.id),
  originalUrl: text("original_url").notNull(),
  processedUrl: text("processed_url"),
  status: text("status").notNull().default("pending"), // 'pending', 'processing', 'completed', 'failed'
  metadata: jsonb("metadata"),
  processingTime: integer("processing_time"), // in milliseconds
  fileSize: integer("file_size"),
  processedFileSize: integer("processed_file_size"),
  quality: integer("quality"), // 0-100
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 세션 관리
export const sessions = pgTable("sessions", {
  sid: varchar("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

// 삽입 스키마들
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertUserSettingSchema = createInsertSchema(userSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAutomationTaskSchema = createInsertSchema(automationTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAutomationLogSchema = createInsertSchema(automationLogs).omit({
  id: true,
  timestamp: true,
});

export const insertProcessedImageSchema = createInsertSchema(processedImages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// 타입 정의
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type UserSetting = typeof userSettings.$inferSelect;
export type InsertUserSetting = z.infer<typeof insertUserSettingSchema>;

export type AutomationTask = typeof automationTasks.$inferSelect;
export type InsertAutomationTask = z.infer<typeof insertAutomationTaskSchema>;

export type AutomationLog = typeof automationLogs.$inferSelect;
export type InsertAutomationLog = z.infer<typeof insertAutomationLogSchema>;

export type ProcessedImage = typeof processedImages.$inferSelect;
export type InsertProcessedImage = z.infer<typeof insertProcessedImageSchema>;

// API 응답 타입들
export interface DashboardStats {
  totalProcessed: number;
  queueSize: number;
  successRate: number;
  processingSpeed: number;
  todayProcessed: number;
  systemStatus: 'normal' | 'warning' | 'error';
}

export interface SystemStatus {
  chrome: 'normal' | 'warning' | 'error';
  pixian: 'normal' | 'warning' | 'error';
  database: 'normal' | 'warning' | 'error';
  storage: 'normal' | 'warning' | 'error';
  cpu: number;
  memory: number;
}

export interface ProcessingStatus {
  currentProcessing: ProcessedImage | null;
  queueItems: ProcessedImage[];
  recentLogs: AutomationLog[];
}

// 설정 스키마들
export const chromeSettingsSchema = z.object({
  url: z.string().url().default("https://www.mango.com/kr"),
  category: z.string().default("여성의류"),
  limit: z.number().min(1).max(500).default(50),
  headless: z.boolean().default(true),
  delay: z.number().min(100).max(5000).default(1000),
});

export const pixianSettingsSchema = z.object({
  apiKey: z.string().min(1),
  quality: z.number().min(50).max(100).default(90),
  format: z.enum(["png", "jpg"]).default("png"),
  timeout: z.number().min(5000).max(60000).default(30000),
});

export const storageSettingsSchema = z.object({
  type: z.enum(["local", "s3", "ftp"]).default("local"),
  path: z.string().default("./uploads"),
  s3Bucket: z.string().optional(),
  s3Region: z.string().optional(),
  ftpHost: z.string().optional(),
  ftpUser: z.string().optional(),
  ftpPassword: z.string().optional(),
});

export const generalSettingsSchema = z.object({
  autoStart: z.boolean().default(false),
  scheduleEnabled: z.boolean().default(false),
  scheduleTime: z.string().default("09:00"),
  maxConcurrent: z.number().min(1).max(10).default(3),
  retryAttempts: z.number().min(1).max(5).default(3),
});

export type ChromeSettings = z.infer<typeof chromeSettingsSchema>;
export type PixianSettings = z.infer<typeof pixianSettingsSchema>;
export type StorageSettings = z.infer<typeof storageSettingsSchema>;
export type GeneralSettings = z.infer<typeof generalSettingsSchema>;
