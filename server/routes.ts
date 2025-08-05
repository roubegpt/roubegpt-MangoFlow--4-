import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import MemoryStore from "memorystore";
import { storage } from "./storage";
import { queueManager } from "./services/queue-manager";
import { chromeAutomationService } from "./services/chrome-automation";
import { pixianService } from "./services/pixian-service";
import {
  chromeSettingsSchema,
  pixianSettingsSchema,
  storageSettingsSchema,
  generalSettingsSchema,
  insertUserSchema,
  type DashboardStats,
  type SystemStatus,
  type ProcessingStatus
} from "@shared/schema";
import { z } from "zod";

const MemoryStoreSession = MemoryStore(session);

export async function registerRoutes(app: Express): Promise<Server> {
  // 세션 설정
  app.use(session({
    secret: process.env.SESSION_SECRET || 'mango-automation-secret',
    resave: false,
    saveUninitialized: false,
    store: new MemoryStoreSession({
      checkPeriod: 86400000 // 24시간
    }),
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24시간
    }
  }));

  // Passport 설정
  passport.use(new LocalStrategy(async (username, password, done) => {
    try {
      const user = await storage.getUserByUsername(username);
      if (user && user.password === password) {
        return done(null, user);
      }
      return done(null, false, { message: '잘못된 사용자명 또는 비밀번호입니다.' });
    } catch (error) {
      return done(error);
    }
  }));

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user || null);
    } catch (error) {
      done(error);
    }
  });

  app.use(passport.initialize());
  app.use(passport.session());

  // 인증 미들웨어
  function requireAuth(req: any, res: any, next: any) {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: '인증이 필요합니다.' });
  }

  // 인증 API
  app.post('/api/login', passport.authenticate('local'), (req: any, res) => {
    res.json({ user: req.user });
  });

  app.post('/api/logout', (req: any, res) => {
    req.logout((err: any) => {
      if (err) {
        return res.status(500).json({ message: '로그아웃 실패' });
      }
      res.json({ message: '로그아웃 성공' });
    });
  });

  app.get('/api/user', (req: any, res) => {
    if (req.isAuthenticated()) {
      res.json({ user: req.user });
    } else {
      res.status(401).json({ message: '인증되지 않음' });
    }
  });

  app.post('/api/register', async (req, res) => {
    try {
      const { username, password } = insertUserSchema.parse(req.body);
      
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: '이미 존재하는 사용자명입니다.' });
      }

      const user = await storage.createUser({ username, password });
      res.json({ user });
    } catch (error) {
      res.status(400).json({ message: '회원가입 실패', error });
    }
  });

  // 대시보드 API
  app.get('/api/dashboard/stats', requireAuth, async (req: any, res) => {
    try {
      const stats: DashboardStats = await storage.getDashboardStats(req.user.id);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: '통계 조회 실패', error });
    }
  });

  app.get('/api/dashboard/system-status', requireAuth, async (req, res) => {
    try {
      const status: SystemStatus = await storage.getSystemStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ message: '시스템 상태 조회 실패', error });
    }
  });

  app.get('/api/dashboard/processing-status', requireAuth, async (req: any, res) => {
    try {
      const status: ProcessingStatus = await storage.getProcessingStatus(req.user.id);
      res.json(status);
    } catch (error) {
      res.status(500).json({ message: '처리 상태 조회 실패', error });
    }
  });

  // 설정 API
  app.get('/api/settings', requireAuth, async (req: any, res) => {
    try {
      const settings = await storage.getUserSettings(req.user.id);
      const settingsMap = settings.reduce((acc, setting) => {
        acc[setting.settingKey] = setting.settingValue;
        return acc;
      }, {} as any);
      
      res.json(settingsMap);
    } catch (error) {
      res.status(500).json({ message: '설정 조회 실패', error });
    }
  });

  app.put('/api/settings/chrome', requireAuth, async (req: any, res) => {
    try {
      const settings = chromeSettingsSchema.parse(req.body);
      await storage.upsertUserSetting({
        userId: req.user.id,
        settingKey: 'chrome',
        settingValue: settings
      });
      res.json({ message: 'Chrome 설정이 저장되었습니다.' });
    } catch (error) {
      res.status(400).json({ message: 'Chrome 설정 저장 실패', error });
    }
  });

  app.post('/api/settings/chrome/test', requireAuth, async (req: any, res) => {
    try {
      const settings = chromeSettingsSchema.parse(req.body);
      const result = await chromeAutomationService.testConnection(settings);
      res.json(result);
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: `테스트 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}` 
      });
    }
  });

  app.put('/api/settings/pixian', requireAuth, async (req: any, res) => {
    try {
      const settings = pixianSettingsSchema.parse(req.body);
      await storage.upsertUserSetting({
        userId: req.user.id,
        settingKey: 'pixian',
        settingValue: settings
      });
      pixianService.updateSettings(settings);
      res.json({ message: 'Pixian AI 설정이 저장되었습니다.' });
    } catch (error) {
      res.status(400).json({ message: 'Pixian AI 설정 저장 실패', error });
    }
  });

  app.post('/api/settings/pixian/test', requireAuth, async (req: any, res) => {
    try {
      const settings = pixianSettingsSchema.parse(req.body);
      const result = await pixianService.testConnection(settings);
      res.json(result);
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: `테스트 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}` 
      });
    }
  });

  app.put('/api/settings/storage', requireAuth, async (req: any, res) => {
    try {
      const settings = storageSettingsSchema.parse(req.body);
      await storage.upsertUserSetting({
        userId: req.user.id,
        settingKey: 'storage',
        settingValue: settings
      });
      res.json({ message: '저장소 설정이 저장되었습니다.' });
    } catch (error) {
      res.status(400).json({ message: '저장소 설정 저장 실패', error });
    }
  });

  app.put('/api/settings/general', requireAuth, async (req: any, res) => {
    try {
      const settings = generalSettingsSchema.parse(req.body);
      await storage.upsertUserSetting({
        userId: req.user.id,
        settingKey: 'general',
        settingValue: settings
      });
      
      // 동시 처리 워커 수 업데이트
      queueManager.setMaxConcurrentWorkers(settings.maxConcurrent);
      
      res.json({ message: '일반 설정이 저장되었습니다.' });
    } catch (error) {
      res.status(400).json({ message: '일반 설정 저장 실패', error });
    }
  });

  // 자동화 API
  app.post('/api/automation/start-full', requireAuth, async (req: any, res) => {
    try {
      const userSettings = await storage.getUserSettings(req.user.id);
      const settingsMap = userSettings.reduce((acc, setting) => {
        acc[setting.settingKey] = setting.settingValue;
        return acc;
      }, {} as any);

      const chromeSettings = chromeSettingsSchema.parse(settingsMap.chrome || {});
      const pixianSettings = pixianSettingsSchema.parse(settingsMap.pixian || {});
      const storageSettings = storageSettingsSchema.parse(settingsMap.storage || {});

      const task = await queueManager.startFullAutomation(
        req.user.id,
        chromeSettings,
        pixianSettings,
        storageSettings
      );

      res.json({ task });
    } catch (error) {
      res.status(500).json({ message: '자동화 시작 실패', error });
    }
  });

  // 인수인계 문서 명세에 따른 /run API 엔드포인트
  app.post('/api/run', requireAuth, async (req: any, res) => {
    try {
      const { filters = ['전체'], options = {} } = req.body;
      
      // 환경변수에서 더망고 로그인 정보 가져오기
      const username = process.env.THEMANGO_USERNAME;
      const password = process.env.THEMANGO_PASSWORD;
      const pixianApiKey = process.env.PIXIAN_API_KEY;

      if (!username || !password) {
        return res.status(400).json({ 
          success: false, 
          message: '더망고 로그인 정보가 설정되지 않았습니다.' 
        });
      }

      if (!pixianApiKey) {
        return res.status(400).json({ 
          success: false, 
          message: 'Pixian AI API 키가 설정되지 않았습니다.' 
        });
      }

      // 자동화 작업 생성
      const task = await storage.createAutomationTask({
        userId: req.user.id,
        name: `필터 자동화: ${filters.join(', ')}`,
        type: 'filter_automation',
        status: 'running',
        config: { filters, options, username, pixianApiKey },
        progress: 0,
        totalItems: 0,
        processedItems: 0
      });

      // 백그라운드에서 자동화 프로세스 시작
      queueManager.startFilterAutomation(task.id, req.user.id, filters, {
        username,
        password,
        pixianApiKey,
        ...options
      }).catch(async (error) => {
        await storage.updateAutomationTask(task.id, { 
          status: 'failed',
          progress: 0 
        });
        await storage.addAutomationLog({
          taskId: task.id,
          level: 'error',
          message: `필터 자동화 실패: ${error.message}`,
          metadata: { error: error.stack }
        });
      });

      res.json({ 
        success: true, 
        task,
        message: '자동화 작업이 시작되었습니다. WebSocket을 통해 진행상황을 확인하세요.' 
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: `자동화 실행 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}` 
      });
    }
  });

  app.get('/api/automation/tasks', requireAuth, async (req: any, res) => {
    try {
      const tasks = await storage.getAutomationTasks(req.user.id);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: '작업 목록 조회 실패', error });
    }
  });

  app.get('/api/automation/queue-status', requireAuth, (req, res) => {
    try {
      const status = queueManager.getQueueStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ message: '큐 상태 조회 실패', error });
    }
  });

  // 이미지 API
  app.get('/api/images', requireAuth, async (req: any, res) => {
    try {
      const { status } = req.query;
      const images = await storage.getProcessedImages(req.user.id, status);
      res.json(images);
    } catch (error) {
      res.status(500).json({ message: '이미지 목록 조회 실패', error });
    }
  });

  // 정적 파일 서빙 (업로드된 이미지)
  app.use('/uploads', (req, res, next) => {
    // 실제 환경에서는 express.static 사용
    res.status(404).json({ message: '파일을 찾을 수 없습니다.' });
  });

  // HTTP 서버 생성
  const httpServer = createServer(app);

  // WebSocket 서버 설정
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws'
  });

  // WebSocket 연결 관리
  const clients = new Map<string, WebSocket>();

  wss.on('connection', (ws: WebSocket, req) => {
    const clientId = `client_${Date.now()}_${Math.random()}`;
    clients.set(clientId, ws);
    
    console.log(`WebSocket 클라이언트 연결: ${clientId}`);

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('WebSocket 메시지 수신:', message);
        
        // 클라이언트 인증 처리 등
        if (message.type === 'auth') {
          // 세션 기반 인증 로직 추가 가능
          ws.send(JSON.stringify({ 
            type: 'auth_success', 
            clientId 
          }));
        }
      } catch (error) {
        console.error('WebSocket 메시지 파싱 오류:', error);
      }
    });

    ws.on('close', () => {
      clients.delete(clientId);
      console.log(`WebSocket 클라이언트 해제: ${clientId}`);
    });

    ws.on('error', (error) => {
      console.error('WebSocket 오류:', error);
      clients.delete(clientId);
    });
  });

  // 큐 매니저 이벤트 리스너
  queueManager.on('automationProgress', (data) => {
    broadcast({
      type: 'automation_progress',
      ...data
    });
  });

  queueManager.on('itemProcessingStarted', (item) => {
    broadcast({
      type: 'item_processing_started',
      item
    });
  });

  queueManager.on('itemProcessingCompleted', (item) => {
    broadcast({
      type: 'item_processing_completed',
      item
    });
  });

  queueManager.on('queueUpdated', (data) => {
    broadcast({
      type: 'queue_updated',
      ...data
    });
  });

  function broadcast(message: any) {
    const messageStr = JSON.stringify(message);
    clients.forEach((ws, clientId) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      } else {
        clients.delete(clientId);
      }
    });
  }

  return httpServer;
}
