import { EventEmitter } from 'events';
import { storage } from '../storage';
import { chromeAutomationService } from './chrome-automation';
import { pixianService } from './pixian-service';
import { imageProcessor } from './image-processor';
import { 
  AutomationTask, 
  ProcessedImage, 
  ChromeSettings,
  PixianSettings,
  StorageSettings 
} from '@shared/schema';

export interface QueueItem {
  id: string;
  taskId: string;
  userId: string;
  imageUrl: string;
  productName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  priority: number;
  retries: number;
  maxRetries: number;
}

export class QueueManager extends EventEmitter {
  private queue: QueueItem[] = [];
  private isProcessing = false;
  private concurrentWorkers = 0;
  private maxConcurrentWorkers = 3;

  constructor() {
    super();
    this.startQueueProcessor();
  }

  async addToQueue(item: QueueItem): Promise<void> {
    this.queue.push(item);
    this.queue.sort((a, b) => b.priority - a.priority);
    
    this.emit('queueUpdated', {
      queueSize: this.queue.length,
      item: item
    });

    if (!this.isProcessing) {
      this.processNextItem();
    }
  }

  async startFullAutomation(
    userId: string,
    chromeSettings: ChromeSettings,
    pixianSettings: PixianSettings,
    storageSettings: StorageSettings
  ): Promise<AutomationTask> {
    // 자동화 작업 생성
    const task = await storage.createAutomationTask({
      userId,
      name: '완전 자동화 작업',
      type: 'full_automation',
      status: 'running',
      config: { chromeSettings, pixianSettings, storageSettings },
      progress: 0,
      totalItems: 0,
      processedItems: 0
    });

    await storage.addAutomationLog({
      taskId: task.id,
      level: 'info',
      message: '완전 자동화 작업 시작',
      metadata: { userId, taskId: task.id }
    });

    // 백그라운드에서 처리 시작
    this.processFullAutomation(task.id, userId, chromeSettings, pixianSettings, storageSettings)
      .catch(async (error) => {
        await storage.updateAutomationTask(task.id, { 
          status: 'failed',
          progress: 0 
        });
        await storage.addAutomationLog({
          taskId: task.id,
          level: 'error',
          message: `자동화 작업 실패: ${error.message}`,
          metadata: { error: error.stack }
        });
      });

    return task;
  }

  async startFilterAutomation(
    taskId: string,
    userId: string,
    filters: string[],
    options: {
      username: string;
      password: string;
      pixianApiKey: string;
      [key: string]: any;
    }
  ): Promise<void> {
    try {
      await storage.addAutomationLog({
        taskId,
        level: 'info',
        message: `필터 자동화 시작: ${filters.join(', ')}`,
        metadata: { filters, userId }
      });

      // Chrome 초기화
      await chromeAutomationService.initialize({
        headless: true,
        url: 'https://tmg1202.cafe24.com/mall/admin/admin_login.php',
        category: '전체',
        limit: 100,
        delay: 1000
      });

      const browser = chromeAutomationService['browser'];
      if (!browser) {
        throw new Error('Chrome 브라우저 초기화 실패');
      }

      const page = await browser.newPage();
      
      // 1단계: 더망고 로그인
      await storage.updateAutomationTask(taskId, { progress: 10 });
      this.emitProgress(taskId, 10, '더망고 관리자 로그인 중...');
      
      const loginSuccess = await chromeAutomationService.loginToMango(page, options.username, options.password);
      
      if (!loginSuccess) {
        throw new Error('더망고 로그인 실패');
      }

      let totalProcessed = 0;
      const allProducts: any[] = [];

      // 2단계: 필터별 썸네일 추출
      for (let i = 0; i < filters.length; i++) {
        const filter = filters[i];
        const filterProgress = 20 + (i / filters.length) * 40; // 20-60%
        
        this.emitProgress(taskId, filterProgress, `필터 "${filter}" 처리 중...`);
        
        const products = await chromeAutomationService.extractThumbnailsByFilter(
          page,
          filter,
          (progress, message) => {
            const adjustedProgress = filterProgress + (progress / 100) * (40 / filters.length);
            this.emitProgress(taskId, adjustedProgress, message);
          }
        );

        allProducts.push(...products);
        totalProcessed += products.length;

        await storage.addAutomationLog({
          taskId,
          level: 'info',
          message: `필터 "${filter}": ${products.length}개 썸네일 추출 완료`,
          metadata: { filter, productCount: products.length }
        });
      }

      await page.close();

      // 3단계: Pixian AI 배경 제거
      await storage.updateAutomationTask(taskId, { 
        progress: 60,
        totalItems: allProducts.length 
      });
      
      const pixianSettings = {
        apiKey: options.pixianApiKey,
        quality: 95,
        format: 'png' as const,
        timeout: 30000
      };

      for (let i = 0; i < allProducts.length; i++) {
        const product = allProducts[i];
        const processProgress = 60 + (i / allProducts.length) * 35; // 60-95%
        
        this.emitProgress(taskId, processProgress, `${product.name} 배경 제거 중... (${i + 1}/${allProducts.length})`);

        try {
          // 이미지 다운로드
          const imageBuffer = await pixianService.downloadImage(product.imageUrl);
          
          // 배경 제거
          const result = await pixianService.removeBackground(
            imageBuffer,
            `${product.name}_${Date.now()}.png`,
            pixianSettings
          );

          if (result.success && result.processedImageUrl) {
            // 처리된 이미지 저장
            const storageSettings = {
              type: 'local' as const,
              path: './uploads'
            };
            const savedUrl = await imageProcessor.saveProcessedImage(
              result.processedImageUrl,
              `${product.name}_processed.png`,
              storageSettings
            );

            // 데이터베이스에 저장
            await storage.createProcessedImage({
              userId,
              taskId,
              originalUrl: product.imageUrl,
              processedUrl: savedUrl,
              productName: product.name,
              category: product.category,
              status: 'completed',
              processingTime: result.processingTime,
              fileSize: result.processedSize,
              quality: result.quality
            });

            await storage.addAutomationLog({
              taskId,
              level: 'info',
              message: `"${product.name}" 배경 제거 완료`,
              metadata: { 
                productName: product.name,
                processingTime: result.processingTime,
                quality: result.quality 
              }
            });
          } else {
            await storage.addAutomationLog({
              taskId,
              level: 'warning',
              message: `"${product.name}" 배경 제거 실패: ${result.error}`,
              metadata: { productName: product.name, error: result.error }
            });
          }
        } catch (error) {
          await storage.addAutomationLog({
            taskId,
            level: 'error',
            message: `"${product.name}" 처리 중 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
            metadata: { productName: product.name, error }
          });
        }

        await storage.updateAutomationTask(taskId, { 
          processedItems: i + 1 
        });
      }

      // 완료
      await storage.updateAutomationTask(taskId, { 
        status: 'completed',
        progress: 100 
      });

      this.emitProgress(taskId, 100, `자동화 완료! 총 ${allProducts.length}개 이미지 처리`);

      await storage.addAutomationLog({
        taskId,
        level: 'info',
        message: `필터 자동화 완료: 총 ${allProducts.length}개 이미지 처리`,
        metadata: { 
          totalProducts: allProducts.length,
          filters,
          completionTime: new Date().toISOString()
        }
      });

    } catch (error) {
      await storage.updateAutomationTask(taskId, { 
        status: 'failed',
        progress: 0 
      });
      
      await storage.addAutomationLog({
        taskId,
        level: 'error',
        message: `필터 자동화 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        metadata: { error: error instanceof Error ? error.stack : error }
      });

      throw error;
    }
  }

  private emitProgress(taskId: string, progress: number, message: string): void {
    this.emit('automationProgress', {
      taskId,
      progress: Math.floor(progress),
      message,
      timestamp: new Date().toISOString()
    });
  }

  private async processFullAutomation(
    taskId: string,
    userId: string,
    chromeSettings: ChromeSettings,
    pixianSettings: PixianSettings,
    storageSettings: StorageSettings
  ): Promise<void> {
    try {
      // 1단계: 상품 이미지 수집
      await storage.addAutomationLog({
        taskId,
        level: 'info',
        message: '망고몰 상품 이미지 수집 시작',
        metadata: { stage: 'scraping' }
      });

      const products = await chromeAutomationService.scrapeProducts(
        chromeSettings,
        async (progress, message) => {
          await storage.updateAutomationTask(taskId, { 
            progress: Math.floor(progress * 0.3) // 30%까지는 크롤링
          });
          
          this.emit('automationProgress', {
            taskId,
            progress: Math.floor(progress * 0.3),
            message,
            stage: 'scraping'
          });
        }
      );

      await storage.updateAutomationTask(taskId, { 
        totalItems: products.length,
        progress: 30
      });

      // 2단계: 이미지 처리 큐에 추가
      await storage.addAutomationLog({
        taskId,
        level: 'info',
        message: `${products.length}개 상품 이미지를 처리 큐에 추가`,
        metadata: { stage: 'queuing', productCount: products.length }
      });

      for (const [index, product] of products.entries()) {
        const processedImage = await storage.createProcessedImage({
          userId,
          taskId,
          originalUrl: product.imageUrl,
          status: 'pending',
          metadata: {
            productName: product.name,
            productUrl: product.productUrl,
            category: product.category,
            price: product.price
          }
        });

        await this.addToQueue({
          id: processedImage.id,
          taskId,
          userId,
          imageUrl: product.imageUrl,
          productName: product.name,
          status: 'pending',
          priority: 1,
          retries: 0,
          maxRetries: 3
        });
      }

      await storage.updateAutomationTask(taskId, { 
        progress: 40,
        status: 'running'
      });

      await storage.addAutomationLog({
        taskId,
        level: 'success',
        message: '모든 이미지가 처리 큐에 추가되었습니다',
        metadata: { stage: 'queued', queueSize: this.queue.length }
      });

    } catch (error) {
      throw error;
    }
  }

  private startQueueProcessor(): void {
    setInterval(() => {
      if (this.concurrentWorkers < this.maxConcurrentWorkers && this.queue.length > 0) {
        this.processNextItem();
      }
    }, 1000);
  }

  private async processNextItem(): Promise<void> {
    if (this.concurrentWorkers >= this.maxConcurrentWorkers || this.queue.length === 0) {
      return;
    }

    const item = this.queue.find(i => i.status === 'pending');
    if (!item) return;

    this.concurrentWorkers++;
    item.status = 'processing';

    this.emit('itemProcessingStarted', item);

    try {
      await this.processQueueItem(item);
      
      // 큐에서 제거
      this.queue = this.queue.filter(i => i.id !== item.id);
      
      this.emit('itemProcessingCompleted', item);
      
    } catch (error) {
      await this.handleProcessingError(item, error as Error);
    } finally {
      this.concurrentWorkers--;
    }
  }

  private async processQueueItem(item: QueueItem): Promise<void> {
    const startTime = Date.now();

    try {
      // 이미지 다운로드
      await storage.addAutomationLog({
        taskId: item.taskId,
        level: 'info',
        message: `이미지 다운로드 시작: ${item.productName}`,
        metadata: { imageUrl: item.imageUrl, queueItemId: item.id }
      });

      const imageBuffer = await pixianService.downloadImage(item.imageUrl);

      // 배경 제거 처리
      await storage.addAutomationLog({
        taskId: item.taskId,
        level: 'info',
        message: `배경 제거 처리 시작: ${item.productName}`,
        metadata: { originalSize: imageBuffer.length, queueItemId: item.id }
      });

      const pixianSettings = await this.getPixianSettings(item.userId);
      const result = await pixianService.removeBackground(
        imageBuffer, 
        `${item.productName}.jpg`,
        pixianSettings
      );

      if (!result.success) {
        throw new Error(result.error || '배경 제거 실패');
      }

      // 처리된 이미지 저장
      const storageSettings = await this.getStorageSettings(item.userId);
      const savedUrl = await imageProcessor.saveProcessedImage(
        result.processedImageUrl!,
        `processed_${item.id}.png`,
        storageSettings
      );

      // 데이터베이스 업데이트
      await storage.updateProcessedImage(item.id, {
        processedUrl: savedUrl,
        status: 'completed',
        processingTime: result.processingTime,
        fileSize: result.originalSize,
        processedFileSize: result.processedSize,
        quality: result.quality
      });

      // 작업 진행률 업데이트
      const task = await storage.getAutomationTask(item.taskId);
      if (task) {
        const newProcessedCount = task.processedItems + 1;
        const progress = task.totalItems > 0 
          ? 40 + Math.floor((newProcessedCount / task.totalItems) * 60) 
          : 100;

        await storage.updateAutomationTask(item.taskId, {
          processedItems: newProcessedCount,
          progress: Math.min(progress, 100),
          status: newProcessedCount >= task.totalItems ? 'completed' : 'running'
        });

        this.emit('automationProgress', {
          taskId: item.taskId,
          progress,
          message: `이미지 처리 완료: ${item.productName} (${newProcessedCount}/${task.totalItems})`,
          stage: 'processing'
        });
      }

      await storage.addAutomationLog({
        taskId: item.taskId,
        level: 'success',
        message: `이미지 처리 완료: ${item.productName}`,
        metadata: {
          processingTime: result.processingTime,
          quality: result.quality,
          originalSize: result.originalSize,
          processedSize: result.processedSize,
          queueItemId: item.id
        }
      });

      item.status = 'completed';

    } catch (error) {
      throw error;
    }
  }

  private async handleProcessingError(item: QueueItem, error: Error): Promise<void> {
    item.retries++;
    
    await storage.addAutomationLog({
      taskId: item.taskId,
      level: 'error',
      message: `이미지 처리 실패: ${item.productName} (시도 ${item.retries}/${item.maxRetries})`,
      metadata: {
        error: error.message,
        queueItemId: item.id,
        retries: item.retries
      }
    });

    if (item.retries >= item.maxRetries) {
      item.status = 'failed';
      
      await storage.updateProcessedImage(item.id, {
        status: 'failed',
        metadata: { error: error.message, retries: item.retries }
      });

      // 큐에서 제거
      this.queue = this.queue.filter(i => i.id !== item.id);
      
      this.emit('itemProcessingFailed', item);
    } else {
      // 재시도를 위해 상태를 pending으로 변경
      item.status = 'pending';
      item.priority = Math.max(0, item.priority - 1); // 우선순위 낮춤
    }
  }

  private async getPixianSettings(userId: string): Promise<PixianSettings> {
    const setting = await storage.getUserSetting(userId, 'pixian');
    return setting?.settingValue || {
      apiKey: process.env.PIXIAN_API_KEY || '',
      quality: 90,
      format: 'png',
      timeout: 30000
    };
  }

  private async getStorageSettings(userId: string): Promise<StorageSettings> {
    const setting = await storage.getUserSetting(userId, 'storage');
    return setting?.settingValue || {
      type: 'local',
      path: './uploads'
    };
  }

  getQueueStatus() {
    return {
      totalItems: this.queue.length,
      pendingItems: this.queue.filter(i => i.status === 'pending').length,
      processingItems: this.queue.filter(i => i.status === 'processing').length,
      isProcessing: this.concurrentWorkers > 0,
      workers: this.concurrentWorkers,
      maxWorkers: this.maxConcurrentWorkers
    };
  }

  setMaxConcurrentWorkers(max: number): void {
    this.maxConcurrentWorkers = Math.max(1, Math.min(10, max));
  }
}

export const queueManager = new QueueManager();
