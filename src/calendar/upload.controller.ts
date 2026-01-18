import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  UseGuards,
  Logger,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import * as path from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GcsService } from '../storage/gcs.service';

// File validation constants
const MAX_IMAGE_SIZE = 8 * 1024 * 1024; // 8MB for images
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB for videos
const ALLOWED_IMAGE_TYPES = /jpeg|jpg|png|gif|webp/;
const ALLOWED_VIDEO_TYPES = /mp4|mov|avi|webm/;

@ApiTags('upload')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('upload')
export class UploadController {
  private readonly logger = new Logger(UploadController.name);

  constructor(private readonly gcsService: GcsService) {
    this.logger.log('✅ Upload controller initialized with GCS storage');
  }

  @Post('media')
  @ApiOperation({ summary: 'Upload media file (image or video) to Google Cloud Storage' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: (req, file, callback) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const mimetype = file.mimetype.toLowerCase();

        // Check if it's an image
        if (mimetype.startsWith('image/')) {
          if (ALLOWED_IMAGE_TYPES.test(ext.substring(1))) {
            callback(null, true);
          } else {
            callback(
              new BadRequestException(
                'Invalid image format. Allowed formats: JPEG, PNG, GIF, WebP',
              ),
              false,
            );
          }
        }
        // Check if it's a video
        else if (mimetype.startsWith('video/')) {
          if (ALLOWED_VIDEO_TYPES.test(ext.substring(1))) {
            callback(null, true);
          } else {
            callback(
              new BadRequestException(
                'Invalid video format. Allowed formats: MP4, MOV, AVI, WebM',
              ),
              false,
            );
          }
        } else {
          callback(
            new BadRequestException('Only image and video files are allowed'),
            false,
          );
        }
      },
      limits: {
        fileSize: MAX_VIDEO_SIZE, // Use max video size as overall limit
      },
    }),
  )
  async uploadMedia(@UploadedFile() file: Express.Multer.File, @Request() req) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Additional size validation based on file type
    const isImage = file.mimetype.startsWith('image/');
    const isVideo = file.mimetype.startsWith('video/');

    if (isImage && file.size > MAX_IMAGE_SIZE) {
      throw new BadRequestException('Image size must be less than 8MB');
    }

    if (isVideo && file.size > MAX_VIDEO_SIZE) {
      throw new BadRequestException('Video size must be less than 100MB');
    }

    try {
      // Upload to Google Cloud Storage using user-specific folder
      const userFolder = `${req.user.id}/posts`;
      const result = await this.gcsService.uploadFile(file, userFolder);

      this.logger.log(`✅ File uploaded to GCS: ${result.publicUrl}`);

      // Return file information
      return {
        success: true,
        message: 'File uploaded successfully',
        data: {
          url: result.publicUrl, // Public GCS URL
          path: result.path, // Full path in bucket
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          type: isImage ? 'image' : 'video',
        },
      };
    } catch (error) {
      this.logger.error(`❌ GCS upload error: ${error.message}`, error);
      throw new BadRequestException(
        'Failed to upload file to Cloud Storage: ' + error.message,
      );
    }
  }
}

