import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { Storage, Bucket } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

export interface UploadResult {
  url: string;
  publicUrl: string;
  path: string;
  size: number;
  contentType: string;
}

@Injectable()
export class GcsService {
  private bucket: Bucket;
  private storage: Storage;
  private readonly logger = new Logger(GcsService.name);

  constructor() {
    try {
      const bucketName = process.env.GCS_BUCKET_NAME;
      const projectId = process.env.GCP_PROJECT_ID;

      if (!bucketName) {
        this.logger.warn('⚠️ GCS_BUCKET_NAME not configured - GCS will not be available');
        return;
      }

      if (!projectId) {
        this.logger.warn('⚠️ GCP_PROJECT_ID not configured - GCS will not be available');
        return;
      }

      this.storage = new Storage({ projectId });
      this.bucket = this.storage.bucket(bucketName);
      this.logger.log(`✅ GCS initialized with bucket: ${bucketName}`);
    } catch (error) {
      this.logger.error('Failed to initialize GCS', error);
      this.logger.warn('⚠️ GCS will not be available');
    }
  }

  /**
   * Upload a file to Google Cloud Storage
   * @param file - Express multer file object
   * @param folder - Folder path in bucket (e.g., 'posts', 'profiles')
   * @returns Upload result with URL and metadata
   */
  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'uploads',
  ): Promise<UploadResult> {
    try {
      if (!this.bucket) {
        throw new BadRequestException('GCS is not configured');
      }

      if (!file) {
        throw new BadRequestException('No file provided');
      }

      const fileExtension = path.extname(file.originalname);
      const fileName = `${uuidv4()}${fileExtension}`;
      const filePath = `${folder}/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${fileName}`;

      const fileRef = this.bucket.file(filePath);

      // Upload with metadata
      await fileRef.save(file.buffer, {
        metadata: {
          contentType: file.mimetype,
          cacheControl: 'public, max-age=31536000', // 1 year cache for immutable assets
          metadata: {
            uploadedAt: new Date().toISOString(),
            originalName: file.originalname,
          },
        },
      });

      // Make file publicly readable
      await fileRef.makePublic();

      const publicUrl = `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${filePath}`;

      this.logger.log(`✅ File uploaded: ${filePath}`);

      return {
        url: publicUrl,
        publicUrl: publicUrl,
        path: filePath,
        size: file.size,
        contentType: file.mimetype,
      };
    } catch (error) {
      this.logger.error(`Failed to upload file: ${error.message}`, error);
      throw new BadRequestException(`Upload failed: ${error.message}`);
    }
  }

  /**
   * Delete a file from GCS
   * @param filePath - Full path to the file in bucket
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      if (!this.bucket) {
        throw new BadRequestException('GCS is not configured');
      }
      await this.bucket.file(filePath).delete({ ignoreNotFound: true });
      this.logger.log(`✅ File deleted: ${filePath}`);
    } catch (error) {
      this.logger.error(`Failed to delete file ${filePath}: ${error.message}`, error);
      throw new BadRequestException(`Delete failed: ${error.message}`);
    }
  }

  /**
   * Generate a signed URL for temporary access to private files
   * @param filePath - Path to the file
   * @param expirationMinutes - How long the URL is valid (default 60 minutes)
   */
  async getSignedUrl(
    filePath: string,
    expirationMinutes: number = 60,
  ): Promise<string> {
    try {
      if (!this.bucket) {
        throw new BadRequestException('GCS is not configured');
      }
      const [signedUrl] = await this.bucket.file(filePath).getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + expirationMinutes * 60 * 1000,
      });
      return signedUrl;
    } catch (error) {
      this.logger.error(`Failed to generate signed URL for ${filePath}`, error);
      throw new BadRequestException(`Signed URL generation failed: ${error.message}`);
    }
  }

  /**
   * Check if a file exists
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      if (!this.bucket) {
        return false;
      }
      const [exists] = await this.bucket.file(filePath).exists();
      return exists;
    } catch (error) {
      this.logger.error(`Failed to check file existence: ${error.message}`);
      return false;
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(filePath: string): Promise<any> {
    try {
      if (!this.bucket) {
        throw new BadRequestException('GCS is not configured');
      }
      const [metadata] = await this.bucket.file(filePath).getMetadata();
      return metadata;
    } catch (error) {
      this.logger.error(`Failed to get file metadata: ${error.message}`);
      throw new BadRequestException(`Failed to retrieve metadata: ${error.message}`);
    }
  }

  /**
   * List files in a folder
   */
  async listFiles(prefix: string = ''): Promise<string[]> {
    try {
      if (!this.bucket) {
        throw new BadRequestException('GCS is not configured');
      }
      const [files] = await this.bucket.getFiles({ prefix });
      return files.map(f => f.name);
    } catch (error) {
      this.logger.error(`Failed to list files: ${error.message}`);
      throw new BadRequestException(`List operation failed: ${error.message}`);
    }
  }
}
