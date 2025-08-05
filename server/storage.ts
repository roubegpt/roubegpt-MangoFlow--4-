import { 
  type User, 
  type InsertUser,
  type UserSetting,
  type InsertUserSetting,
  type AutomationTask,
  type InsertAutomationTask,
  type AutomationLog,
  type InsertAutomationLog,
  type ProcessedImage,
  type InsertProcessedImage,
  type DashboardStats,
  type SystemStatus,
  type ProcessingStatus
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // 사용자 관리
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // 사용자 설정
  getUserSettings(userId: string): Promise<UserSetting[]>;
  getUserSetting(userId: string, key: string): Promise<UserSetting | undefined>;
  upsertUserSetting(setting: InsertUserSetting): Promise<UserSetting>;

  // 자동화 작업
  createAutomationTask(task: InsertAutomationTask): Promise<AutomationTask>;
  getAutomationTask(id: string): Promise<AutomationTask | undefined>;
  updateAutomationTask(id: string, updates: Partial<AutomationTask>): Promise<AutomationTask>;
  getAutomationTasks(userId: string): Promise<AutomationTask[]>;

  // 자동화 로그
  addAutomationLog(log: InsertAutomationLog): Promise<AutomationLog>;
  getAutomationLogs(taskId?: string, limit?: number): Promise<AutomationLog[]>;

  // 처리된 이미지
  createProcessedImage(image: InsertProcessedImage): Promise<ProcessedImage>;
  updateProcessedImage(id: string, updates: Partial<ProcessedImage>): Promise<ProcessedImage>;
  getProcessedImages(userId: string, status?: string): Promise<ProcessedImage[]>;
  getProcessedImage(id: string): Promise<ProcessedImage | undefined>;

  // 대시보드 통계
  getDashboardStats(userId: string): Promise<DashboardStats>;
  getSystemStatus(): Promise<SystemStatus>;
  getProcessingStatus(userId: string): Promise<ProcessingStatus>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private userSettings: Map<string, UserSetting>;
  private automationTasks: Map<string, AutomationTask>;
  private automationLogs: Map<string, AutomationLog>;
  private processedImages: Map<string, ProcessedImage>;

  constructor() {
    this.users = new Map();
    this.userSettings = new Map();
    this.automationTasks = new Map();
    this.automationLogs = new Map();
    this.processedImages = new Map();
    
    // 기본 관리자 계정 생성
    this.initializeDefaultUser();
  }

  private async initializeDefaultUser() {
    const adminUser: User = {
      id: randomUUID(),
      username: "admin",
      password: "roubeadmin",
      role: "admin",
      createdAt: new Date(),
    };
    this.users.set(adminUser.id, adminUser);
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id, 
      role: "admin",
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async getUserSettings(userId: string): Promise<UserSetting[]> {
    return Array.from(this.userSettings.values()).filter(
      setting => setting.userId === userId
    );
  }

  async getUserSetting(userId: string, key: string): Promise<UserSetting | undefined> {
    return Array.from(this.userSettings.values()).find(
      setting => setting.userId === userId && setting.settingKey === key
    );
  }

  async upsertUserSetting(setting: InsertUserSetting): Promise<UserSetting> {
    const existing = await this.getUserSetting(setting.userId, setting.settingKey);
    
    if (existing) {
      const updated: UserSetting = {
        ...existing,
        settingValue: setting.settingValue,
        updatedAt: new Date()
      };
      this.userSettings.set(existing.id, updated);
      return updated;
    } else {
      const id = randomUUID();
      const newSetting: UserSetting = {
        ...setting,
        id,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.userSettings.set(id, newSetting);
      return newSetting;
    }
  }

  async createAutomationTask(task: InsertAutomationTask): Promise<AutomationTask> {
    const id = randomUUID();
    const newTask: AutomationTask = {
      ...task,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.automationTasks.set(id, newTask);
    return newTask;
  }

  async getAutomationTask(id: string): Promise<AutomationTask | undefined> {
    return this.automationTasks.get(id);
  }

  async updateAutomationTask(id: string, updates: Partial<AutomationTask>): Promise<AutomationTask> {
    const existing = this.automationTasks.get(id);
    if (!existing) {
      throw new Error(`Automation task with id ${id} not found`);
    }
    
    const updated: AutomationTask = {
      ...existing,
      ...updates,
      updatedAt: new Date()
    };
    this.automationTasks.set(id, updated);
    return updated;
  }

  async getAutomationTasks(userId: string): Promise<AutomationTask[]> {
    return Array.from(this.automationTasks.values()).filter(
      task => task.userId === userId
    );
  }

  async addAutomationLog(log: InsertAutomationLog): Promise<AutomationLog> {
    const id = randomUUID();
    const newLog: AutomationLog = {
      ...log,
      id,
      timestamp: new Date()
    };
    this.automationLogs.set(id, newLog);
    return newLog;
  }

  async getAutomationLogs(taskId?: string, limit: number = 10): Promise<AutomationLog[]> {
    let logs = Array.from(this.automationLogs.values());
    
    if (taskId) {
      logs = logs.filter(log => log.taskId === taskId);
    }
    
    return logs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async createProcessedImage(image: InsertProcessedImage): Promise<ProcessedImage> {
    const id = randomUUID();
    const newImage: ProcessedImage = {
      ...image,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.processedImages.set(id, newImage);
    return newImage;
  }

  async updateProcessedImage(id: string, updates: Partial<ProcessedImage>): Promise<ProcessedImage> {
    const existing = this.processedImages.get(id);
    if (!existing) {
      throw new Error(`Processed image with id ${id} not found`);
    }
    
    const updated: ProcessedImage = {
      ...existing,
      ...updates,
      updatedAt: new Date()
    };
    this.processedImages.set(id, updated);
    return updated;
  }

  async getProcessedImages(userId: string, status?: string): Promise<ProcessedImage[]> {
    let images = Array.from(this.processedImages.values()).filter(
      image => image.userId === userId
    );
    
    if (status) {
      images = images.filter(image => image.status === status);
    }
    
    return images.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getProcessedImage(id: string): Promise<ProcessedImage | undefined> {
    return this.processedImages.get(id);
  }

  async getDashboardStats(userId: string): Promise<DashboardStats> {
    const allImages = await this.getProcessedImages(userId);
    const completedImages = allImages.filter(img => img.status === 'completed');
    const pendingImages = allImages.filter(img => img.status === 'pending');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayImages = completedImages.filter(img => img.updatedAt >= today);
    
    const totalProcessingTime = completedImages.reduce((sum, img) => sum + (img.processingTime || 0), 0);
    const avgProcessingTime = completedImages.length > 0 ? totalProcessingTime / completedImages.length : 0;
    const processingSpeed = avgProcessingTime > 0 ? 60000 / avgProcessingTime : 0; // images per minute
    
    const successRate = allImages.length > 0 ? (completedImages.length / allImages.length) * 100 : 100;

    return {
      totalProcessed: completedImages.length,
      queueSize: pendingImages.length,
      successRate: Math.round(successRate * 10) / 10,
      processingSpeed: Math.round(processingSpeed * 10) / 10,
      todayProcessed: todayImages.length,
      systemStatus: 'normal'
    };
  }

  async getSystemStatus(): Promise<SystemStatus> {
    return {
      chrome: 'normal',
      pixian: 'normal',
      database: 'normal',
      storage: 'normal',
      cpu: Math.floor(Math.random() * 30) + 10, // 10-40%
      memory: Math.floor(Math.random() * 30) + 30 // 30-60%
    };
  }

  async getProcessingStatus(userId: string): Promise<ProcessingStatus> {
    const processingImages = await this.getProcessedImages(userId, 'processing');
    const queueImages = await this.getProcessedImages(userId, 'pending');
    const recentLogs = await this.getAutomationLogs(undefined, 5);

    return {
      currentProcessing: processingImages[0] || null,
      queueItems: queueImages.slice(0, 10),
      recentLogs
    };
  }
}

export const storage = new MemStorage();
