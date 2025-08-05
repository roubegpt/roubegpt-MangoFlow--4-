import fetch from 'node-fetch';
import FormData from 'form-data';
import { PixianSettings } from '@shared/schema';

export interface PixianResult {
  success: boolean;
  processedImageUrl?: string;
  error?: string;
  processingTime: number;
  originalSize: number;
  processedSize: number;
  quality: number;
}

export class PixianService {
  private settings: PixianSettings | null = null;

  updateSettings(settings: PixianSettings): void {
    this.settings = settings;
  }

  async testConnection(settings: PixianSettings): Promise<{ success: boolean; message: string }> {
    try {
      // Pixian API 연결 테스트용 더미 이미지 생성
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        'base64'
      );

      const result = await this.removeBackground(testImageBuffer, 'test.png', settings);
      
      return {
        success: result.success,
        message: result.success ? 'Pixian AI 연결 성공' : `연결 실패: ${result.error}`
      };
    } catch (error) {
      return {
        success: false,
        message: `연결 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      };
    }
  }

  async removeBackground(
    imageBuffer: Buffer,
    filename: string,
    customSettings?: PixianSettings
  ): Promise<PixianResult> {
    const settings = customSettings || this.settings;
    
    if (!settings || !settings.apiKey) {
      throw new Error('Pixian AI 설정이 필요합니다');
    }

    const startTime = Date.now();
    
    try {
      const formData = new FormData();
      formData.append('image', imageBuffer, {
        filename,
        contentType: this.getContentType(filename)
      });

      const response = await fetch('https://api.pixian.ai/api/v2/remove-background', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.apiKey}`,
          ...formData.getHeaders()
        },
        body: formData
      });

      const processingTime = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Pixian API 오류 (${response.status}): ${errorText}`,
          processingTime,
          originalSize: imageBuffer.length,
          processedSize: 0,
          quality: 0
        };
      }

      const processedBuffer = await response.buffer();
      
      // 처리된 이미지를 Base64로 변환하여 반환 (실제 환경에서는 파일 저장 후 URL 반환)
      const processedImageUrl = `data:image/${settings.format};base64,${processedBuffer.toString('base64')}`;
      
      // 품질 점수 계산 (실제로는 더 정교한 알고리즘 필요)
      const quality = this.calculateQuality(imageBuffer, processedBuffer);

      return {
        success: true,
        processedImageUrl,
        processingTime,
        originalSize: imageBuffer.length,
        processedSize: processedBuffer.length,
        quality
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      return {
        success: false,
        error: `처리 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        processingTime,
        originalSize: imageBuffer.length,
        processedSize: 0,
        quality: 0
      };
    }
  }

  async downloadImage(url: string): Promise<Buffer> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`이미지 다운로드 실패: ${response.status} ${response.statusText}`);
      }

      return await response.buffer();
    } catch (error) {
      throw new Error(`이미지 다운로드 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  private getContentType(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop();
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'webp':
        return 'image/webp';
      default:
        return 'image/jpeg';
    }
  }

  private calculateQuality(originalBuffer: Buffer, processedBuffer: Buffer): number {
    // 간단한 품질 점수 계산 (실제로는 더 정교한 알고리즘 필요)
    const sizeRatio = processedBuffer.length / originalBuffer.length;
    const baseQuality = Math.min(100, 70 + (30 * sizeRatio));
    
    // 무작위 변동 추가 (실제 품질 분석 알고리즘으로 대체 필요)
    const randomFactor = (Math.random() - 0.5) * 10;
    
    return Math.max(50, Math.min(100, Math.round(baseQuality + randomFactor)));
  }
}

export const pixianService = new PixianService();
