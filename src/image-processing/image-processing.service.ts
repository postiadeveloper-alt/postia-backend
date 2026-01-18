import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GcsService } from '../storage/gcs.service';
import { BusinessProfileService } from '../business-profile/business-profile.service';
import * as Jimp from 'jimp';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ImageAsset, ImageAssetType } from './entities/image-asset.entity';

@Injectable()
export class ImageProcessingService {
    private readonly logger = new Logger(ImageProcessingService.name);

    constructor(
        private readonly gcsService: GcsService,
        @InjectRepository(ImageAsset)
        private readonly imageAssetRepository: Repository<ImageAsset>,
        private readonly businessProfileService: BusinessProfileService,
    ) { }

    async uploadLogo(userId: string, file: Express.Multer.File, instagramAccountId: string) {
        this.logger.log(`Uploading logo for user ${userId} and account ${instagramAccountId}`);

        // 1. Process image to remove background
        const image = await Jimp.read(file.buffer);
        const processedImage = await this.removeBackground(image);
        const processedBuffer = await processedImage.getBufferAsync(Jimp.MIME_PNG);

        // 2. Upload to GCS
        const fileName = `logo_${uuidv4()}.png`;
        const folder = `${userId}/logos`;

        const mockFile: Express.Multer.File = {
            buffer: processedBuffer,
            originalname: fileName,
            mimetype: 'image/png',
            size: processedBuffer.length,
        } as any;

        const uploadResult = await this.gcsService.uploadFile(mockFile, folder);

        // 3. Save as asset
        const asset = this.imageAssetRepository.create({
            userId,
            type: ImageAssetType.LOGO,
            originalName: file.originalname,
            gcsPath: uploadResult.path,
            publicUrl: uploadResult.publicUrl,
        });
        await this.imageAssetRepository.save(asset);

        // 4. Update Business Profile
        const profile = await this.businessProfileService.findByAccount(instagramAccountId);
        if (profile) {
            await this.businessProfileService.update(profile.id, userId, {
                logoUrl: uploadResult.publicUrl
            });
        }

        return asset;
    }

    private async removeBackground(image: Jimp): Promise<Jimp> {
        const firstPixelColor = image.getPixelColor(0, 0);
        const bgRGBA = Jimp.intToRGBA(firstPixelColor);

        image.scan(0, 0, image.getWidth(), image.getHeight(), function (x, y, idx) {
            const r = this.bitmap.data[idx + 0];
            const g = this.bitmap.data[idx + 1];
            const b = this.bitmap.data[idx + 2];

            const dist = Math.sqrt(
                Math.pow(r - bgRGBA.r, 2) +
                Math.pow(g - bgRGBA.g, 2) +
                Math.pow(b - bgRGBA.b, 2)
            );

            if (dist < 30) {
                this.bitmap.data[idx + 3] = 0; // Set alpha to 0
            }
        });
        return image;
    }

    async generateAITemplates(userId: string, instagramAccountId: string) {
        this.logger.log(`Generating AI templates for user ${userId} and account ${instagramAccountId}`);

        // 1. Get business profile info
        const profile = await this.businessProfileService.findByAccount(instagramAccountId);
        if (!profile) throw new BadRequestException('Business profile not found');

        const colors = profile.brandColors || ['#6366f1', '#a855f7']; // Default indigo/purple
        const logoUrl = profile.logoUrl;

        let logoImage: Jimp | null = null;
        if (logoUrl) {
            try {
                const logoAsset = await this.imageAssetRepository.findOne({
                    where: { userId, type: ImageAssetType.LOGO, publicUrl: logoUrl }
                });
                if (logoAsset) {
                    const buffer = await this.gcsService.downloadFile(logoAsset.gcsPath);
                    logoImage = await Jimp.read(buffer);
                } else {
                    logoImage = await Jimp.read(logoUrl);
                }
            } catch (e) {
                this.logger.warn(`Could not load logo image: ${e.message}`);
            }
        }

        const primaryColor = colors[0] || '#6366f1';
        const secondaryColor = colors[1] || primaryColor;

        const templates: ImageAsset[] = [];
        const templateConfigs = [
            { name: 'border_frame', type: 'border' },
            { name: 'bottom_bar_gradient', type: 'bottom_gradient' },
            { name: 'modern_glass', type: 'glass' },
            { name: 'geometric_dynamic', type: 'geometric' },
            { name: 'double_offset_frame', type: 'double_frame' },
            { name: 'brand_header_footer', type: 'header_footer' }
        ];

        for (const config of templateConfigs) {
            const template = await this.createTemplate(config.type, primaryColor, secondaryColor, logoImage);
            const buffer = await template.getBufferAsync(Jimp.MIME_PNG);
            const fileName = `generated_template_${config.name}_${uuidv4()}.png`;

            const mockFile: Express.Multer.File = {
                buffer,
                originalname: fileName,
                mimetype: 'image/png',
                size: buffer.length
            } as any;

            const uploadResult = await this.gcsService.uploadFile(mockFile, `${userId}/templates`);

            const asset = this.imageAssetRepository.create({
                userId,
                type: ImageAssetType.TEMPLATE,
                originalName: fileName,
                gcsPath: uploadResult.path,
                publicUrl: uploadResult.publicUrl
            });
            templates.push(await this.imageAssetRepository.save(asset));
        }

        return templates;
    }

    private async createTemplate(type: string, primary: string, secondary: string, logo: Jimp | null): Promise<Jimp> {
        const width = 1080;
        const height = 1350;
        const image = new Jimp(width, height, 0x00000000); // Transparent

        const pColor = Jimp.cssColorToHex(primary);
        const sColor = Jimp.cssColorToHex(secondary);

        if (type === 'border') {
            const thickness = 20;
            this.drawRect(image, 0, 0, width, thickness, pColor);
            this.drawRect(image, 0, height - thickness, width, thickness, pColor);
            this.drawRect(image, 0, 0, thickness, height, pColor);
            this.drawRect(image, width - thickness, 0, thickness, height, pColor);
        } else if (type === 'bottom_gradient') {
            const barHeight = Math.floor(height * 0.15);
            this.drawGradient(image, 0, height - barHeight, width, barHeight, primary, secondary);
            this.drawRect(image, 0, 0, width, 4, pColor);
            this.drawRect(image, 0, 0, 4, height, pColor);
            this.drawRect(image, width - 4, 0, 4, height, pColor);
        } else if (type === 'glass') {
            const panelHeight = Math.floor(height * 0.22);
            const margin = 40;
            // Draw semi-transparent white panel
            this.drawRect(image, margin, height - panelHeight - margin, width - (margin * 2), panelHeight, 0xFFFFFF33); // 20% opacity white
            // Add accent line
            this.drawRect(image, margin + 60, height - panelHeight - margin + 20, width - (margin * 2) - 120, 4, pColor);
        } else if (type === 'geometric') {
            // Circle in bottom left
            this.drawCircle(image, 0, height, Math.floor(width * 0.5), primary, 180);
            // Smaller circle overlapping
            this.drawCircle(image, Math.floor(width * 0.1), Math.floor(height * 0.95), Math.floor(width * 0.3), secondary, 150);
            // Top right triangle
            this.drawRect(image, width - 200, 0, 200, 200, pColor);
        } else if (type === 'double_frame') {
            const m1 = 30;
            const m2 = 60;
            this.drawFrame(image, m1, m1, width - (m1 * 2), height - (m1 * 2), 4, pColor);
            this.drawFrame(image, m2 + 20, m2 - 20, width - (m2 * 2), height - (m2 * 2), 2, sColor);
        } else if (type === 'header_footer') {
            const h = 80;
            this.drawRect(image, 0, 0, width, 5, pColor);
            this.drawRect(image, 0, height - h, width, h, 0x00000028); // Light tint
            this.drawRect(image, 0, height - h, width, 5, pColor);
        }

        if (logo) {
            const logoWidth = Math.floor(width * 0.15);
            const logoResized = logo.clone().resize(logoWidth, Jimp.AUTO);
            const margin = 40;

            let x = margin;
            let y = height - logoResized.getHeight() - margin;

            if (type === 'bottom_gradient' || type === 'glass' || type === 'header_footer') {
                x = width - logoResized.getWidth() - margin;
            }

            if (type === 'header_footer') {
                x = (width - logoResized.getWidth()) / 2;
                y = height - logoResized.getHeight() - margin + 10;
            }

            image.composite(logoResized, x, y);
        }

        return image;
    }

    private drawRect(image: Jimp, x: number, y: number, w: number, h: number, color: number) {
        for (let i = Math.floor(x); i < Math.floor(x + w); i++) {
            for (let j = Math.floor(y); j < Math.floor(y + h); j++) {
                if (i >= 0 && i < image.getWidth() && j >= 0 && j < image.getHeight()) {
                    image.setPixelColor(color, i, j);
                }
            }
        }
    }

    private drawFrame(image: Jimp, x: number, y: number, w: number, h: number, thick: number, color: number) {
        this.drawRect(image, x, y, w, thick, color); // Top
        this.drawRect(image, x, y + h - thick, w, thick, color); // Bottom
        this.drawRect(image, x, y, thick, h, color); // Left
        this.drawRect(image, x + w - thick, y, thick, h, color); // Right
    }

    private drawGradient(image: Jimp, x: number, y: number, w: number, h: number, color1: string, color2: string) {
        const c1 = Jimp.intToRGBA(Jimp.cssColorToHex(color1));
        const c2 = Jimp.intToRGBA(Jimp.cssColorToHex(color2));

        for (let i = Math.floor(x); i < Math.floor(x + w); i++) {
            const ratio = (i - x) / w;
            const r = Math.floor(c1.r + (c2.r - c1.r) * ratio);
            const g = Math.floor(c1.g + (c2.g - c1.g) * ratio);
            const b = Math.floor(c1.b + (c2.b - c1.b) * ratio);
            const color = Jimp.rgbaToInt(r, g, b, 255);

            for (let j = Math.floor(y); j < Math.floor(y + h); j++) {
                if (i >= 0 && i < image.getWidth() && j >= 0 && j < image.getHeight()) {
                    image.setPixelColor(color, i, j);
                }
            }
        }
    }

    private drawCircle(image: Jimp, cx: number, cy: number, radius: number, colorHex: string, alpha: number) {
        const c = Jimp.intToRGBA(Jimp.cssColorToHex(colorHex));
        const color = Jimp.rgbaToInt(c.r, c.g, c.b, alpha);

        for (let i = Math.floor(cx - radius); i < Math.floor(cx + radius); i++) {
            for (let j = Math.floor(cy - radius); j < Math.floor(cy + radius); j++) {
                if (i >= 0 && i < image.getWidth() && j >= 0 && j < image.getHeight()) {
                    const dist = Math.sqrt(Math.pow(i - cx, 2) + Math.pow(j - cy, 2));
                    if (dist <= radius) {
                        image.setPixelColor(color, i, j);
                    }
                }
            }
        }
    }

    async uploadTemplate(userId: string, file: Express.Multer.File) {
        const folder = `${userId}/templates`;
        const uploadResult = await this.gcsService.uploadFile(file, folder);

        const asset = this.imageAssetRepository.create({
            userId,
            type: ImageAssetType.TEMPLATE,
            originalName: file.originalname,
            gcsPath: uploadResult.path,
            publicUrl: uploadResult.publicUrl,
        });

        return this.imageAssetRepository.save(asset);
    }

    async uploadContent(userId: string, file: Express.Multer.File) {
        const folder = `${userId}/content`;
        const uploadResult = await this.gcsService.uploadFile(file, folder);

        const asset = this.imageAssetRepository.create({
            userId,
            type: ImageAssetType.CONTENT,
            originalName: file.originalname,
            gcsPath: uploadResult.path,
            publicUrl: uploadResult.publicUrl,
        });

        return this.imageAssetRepository.save(asset);
    }

    async listTemplates(userId: string) {
        return this.imageAssetRepository.find({
            where: { userId, type: ImageAssetType.TEMPLATE },
            order: { createdAt: 'DESC' },
        });
    }

    async listContent(userId: string) {
        return this.imageAssetRepository.find({
            where: { userId, type: ImageAssetType.CONTENT },
            order: { createdAt: 'DESC' },
        });
    }

    async listOutputs(userId: string) {
        return this.imageAssetRepository.find({
            where: { userId, type: ImageAssetType.OUTPUT },
            order: { createdAt: 'DESC' },
        });
    }

    async generateImage(userId: string, templatePath: string, contentPath: string) {
        this.logger.log(`Generating image for user ${userId} with template ${templatePath} and content ${contentPath}`);

        try {
            // 1. Download images
            const [templateBuffer, contentBuffer] = await Promise.all([
                this.gcsService.downloadFile(templatePath),
                this.gcsService.downloadFile(contentPath),
            ]);

            // 2. Process images with Jimp
            const templateImage = await Jimp.read(templateBuffer);
            const contentImage = await Jimp.read(contentBuffer);

            // Resize content to cover template dimensions
            contentImage.cover(templateImage.getWidth(), templateImage.getHeight());

            // Composite template over content
            // Logic: Content is background, Template is overlay (with transparency)
            contentImage.composite(templateImage, 0, 0);

            const outputBuffer = await contentImage.getBufferAsync(Jimp.MIME_PNG);

            // 3. Upload result
            const fileName = `generated_${uuidv4()}.png`;
            const outputFolder = `${userId}/output`;

            // Mock a multer file object to reuse uploadFile
            const file: Express.Multer.File = {
                buffer: outputBuffer,
                originalname: fileName,
                mimetype: 'image/png',
                size: outputBuffer.length,
            } as any;

            const uploadResult = await this.gcsService.uploadFile(file, outputFolder);

            // 4. Save metadata
            const asset = this.imageAssetRepository.create({
                userId,
                type: ImageAssetType.OUTPUT,
                originalName: fileName,
                gcsPath: uploadResult.path,
                publicUrl: uploadResult.publicUrl,
            });

            return this.imageAssetRepository.save(asset);

        } catch (error) {
            this.logger.error(`Failed to generate image: ${error.message}`, error.stack);
            throw new BadRequestException(`Image generation failed: ${error.message}`);
        }
    }
}


