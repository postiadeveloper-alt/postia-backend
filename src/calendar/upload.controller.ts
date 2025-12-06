import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import type { File } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { v2 as cloudinary } from 'cloudinary';
import * as streamifier from 'streamifier';

// File validation constants
const MAX_IMAGE_SIZE = 8 * 1024 * 1024; // 8MB for images
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB for videos
const ALLOWED_IMAGE_TYPES = /jpeg|jpg|png|gif/;
const ALLOWED_VIDEO_TYPES = /mp4|mov/;

@ApiTags('upload')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('upload')
export class UploadController {
  constructor() {
    // Configure Cloudinary explicitly
    cloudinary.config({
      cloud_name: 'dypxxjwqe',
      api_key: '567828275976586',
      api_secret: 'yjNSe1_t_uS5sCsmPkUOpObtj_g',
      secure: true,
    });
    console.log('✅ Cloudinary configured');
  }

  private uploadToCloudinary(file: Buffer, folder: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          resource_type: 'auto', // Automatically detect if image or video
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        },
      );

      streamifier.createReadStream(file).pipe(uploadStream);
    });
  }

  @Post('media')
  @ApiOperation({ summary: 'Upload media file (image or video) to Cloudinary' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: (req, file, callback) => {
        const ext = extname(file.originalname).toLowerCase();
        const mimetype = file.mimetype.toLowerCase();

        // Check if it's an image
        if (mimetype.startsWith('image/')) {
          if (ALLOWED_IMAGE_TYPES.test(ext.substring(1))) {
            callback(null, true);
          } else {
            callback(
              new BadRequestException(
                'Invalid image format. Allowed formats: JPEG, PNG, GIF',
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
                'Invalid video format. Allowed formats: MP4, MOV',
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
  async uploadMedia(@UploadedFile() file: File) {
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
      // Upload to Cloudinary
      const result = await this.uploadToCloudinary(
        file.buffer,
        'postia/media',
      );

      console.log('✅ File uploaded to Cloudinary:', result.secure_url);

      // Return file information
      return {
        url: result.secure_url, // Public Cloudinary URL
        filename: result.public_id,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        type: isImage ? 'image' : 'video',
        cloudinaryId: result.public_id,
      };
    } catch (error) {
      console.error('❌ Cloudinary upload error:', error);
      throw new BadRequestException(
        'Failed to upload file to Cloudinary: ' + error.message,
      );
    }
  }
}
