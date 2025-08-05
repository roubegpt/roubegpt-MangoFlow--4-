import fs from 'fs/promises';
import path from 'path';
import { StorageSettings } from '@shared/schema';

export class ImageProcessor {
  async saveProcessedImage(
    imageDataUrl: string,
    filename: string,
    settings: StorageSettings
  ): Promise<string> {
    try {
      // Base64 데이터에서 실제 이미지 데이터 추출
      const matches = imageDataUrl.match(/^data:image\/([A-Za-z-+/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        throw new Error('유효하지 않은 이미지 데이터 형식');
      }

      const imageBuffer = Buffer.from(matches[2], 'base64');

      switch (settings.type) {
        case 'local':
          return await this.saveToLocal(imageBuffer, filename, settings.path);
        
        case 's3':
          return await this.saveToS3(imageBuffer, filename, settings);
        
        case 'ftp':
          return await this.saveToFTP(imageBuffer, filename, settings);
        
        default:
          throw new Error(`지원하지 않는 저장소 타입: ${settings.type}`);
      }
    } catch (error) {
      throw new Error(`이미지 저장 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  private async saveToLocal(
    imageBuffer: Buffer,
    filename: string,
    basePath: string = './uploads'
  ): Promise<string> {
    // 업로드 디렉토리 생성
    const uploadsDir = path.resolve(basePath);
    await fs.mkdir(uploadsDir, { recursive: true });

    // 파일명 중복 방지
    const timestamp = Date.now();
    const safeFilename = this.sanitizeFilename(filename);
    const uniqueFilename = `${timestamp}_${safeFilename}`;
    
    const filePath = path.join(uploadsDir, uniqueFilename);
    
    // 파일 저장
    await fs.writeFile(filePath, imageBuffer);
    
    // 상대 경로 반환 (웹에서 접근 가능한 URL)
    return `/uploads/${uniqueFilename}`;
  }

  private async saveToS3(
    imageBuffer: Buffer,
    filename: string,
    settings: StorageSettings
  ): Promise<string> {
    if (!settings.s3Bucket || !settings.s3Region) {
      throw new Error('S3 설정이 불완전합니다 (bucket, region 필요)');
    }

    // AWS SDK를 사용한 S3 업로드 (실제 구현시 aws-sdk 패키지 필요)
    // 여기서는 기본 구현만 제공
    const key = `processed-images/${Date.now()}_${this.sanitizeFilename(filename)}`;
    
    try {
      // TODO: 실제 S3 업로드 구현
      // const AWS = require('aws-sdk');
      // const s3 = new AWS.S3({ region: settings.s3Region });
      // const result = await s3.upload({
      //   Bucket: settings.s3Bucket,
      //   Key: key,
      //   Body: imageBuffer,
      //   ContentType: 'image/png'
      // }).promise();
      // return result.Location;
      
      // 임시 구현: 로컬에 저장하고 S3 형태의 URL 반환
      await this.saveToLocal(imageBuffer, filename, './uploads/s3-temp');
      return `https://${settings.s3Bucket}.s3.${settings.s3Region}.amazonaws.com/${key}`;
      
    } catch (error) {
      throw new Error(`S3 업로드 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  private async saveToFTP(
    imageBuffer: Buffer,
    filename: string,
    settings: StorageSettings
  ): Promise<string> {
    if (!settings.ftpHost || !settings.ftpUser || !settings.ftpPassword) {
      throw new Error('FTP 설정이 불완전합니다 (host, user, password 필요)');
    }

    try {
      // TODO: FTP 업로드 구현 (ftp 패키지 필요)
      // const ftp = require('basic-ftp');
      // const client = new ftp.Client();
      // await client.access({
      //   host: settings.ftpHost,
      //   user: settings.ftpUser,
      //   password: settings.ftpPassword
      // });
      // const remotePath = `/processed-images/${Date.now()}_${this.sanitizeFilename(filename)}`;
      // await client.uploadFrom(imageBuffer, remotePath);
      // client.close();
      // return `ftp://${settings.ftpHost}${remotePath}`;

      // 임시 구현: 로컬에 저장하고 FTP 형태의 URL 반환
      await this.saveToLocal(imageBuffer, filename, './uploads/ftp-temp');
      return `ftp://${settings.ftpHost}/processed-images/${Date.now()}_${this.sanitizeFilename(filename)}`;
      
    } catch (error) {
      throw new Error(`FTP 업로드 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  private sanitizeFilename(filename: string): string {
    // 파일명에서 위험한 문자 제거
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_')
      .substring(0, 100); // 최대 길이 제한
  }

  async createThumbnail(
    imageBuffer: Buffer,
    width: number = 200,
    height: number = 200
  ): Promise<Buffer> {
    // Sharp 라이브러리를 사용한 썸네일 생성 (실제 구현시 sharp 패키지 필요)
    // 여기서는 원본 이미지를 그대로 반환
    // TODO: 실제 썸네일 생성 구현
    // const sharp = require('sharp');
    // return await sharp(imageBuffer)
    //   .resize(width, height, { fit: 'inside', withoutEnlargement: true })
    //   .png()
    //   .toBuffer();
    
    return imageBuffer;
  }

  async getImageMetadata(imageBuffer: Buffer): Promise<{
    width: number;
    height: number;
    format: string;
    size: number;
  }> {
    // 기본 메타데이터 반환 (실제로는 sharp나 다른 라이브러리 사용)
    return {
      width: 800,
      height: 600,
      format: 'png',
      size: imageBuffer.length
    };
  }
}

export const imageProcessor = new ImageProcessor();
