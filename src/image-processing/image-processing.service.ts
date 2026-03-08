import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GcsService } from '../storage/gcs.service';
import { BusinessProfileService } from '../business-profile/business-profile.service';
import * as Jimp from 'jimp';
import * as sharp from 'sharp';
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

    /**
     * Convert a buffer to PNG if it's in a format Jimp can't handle (WebP, AVIF, etc.).
     * Returns the original buffer if it's already a Jimp-compatible format.
     */
    private async ensureJimpCompatible(buffer: Buffer): Promise<Buffer> {
        // Check for WebP (RIFF....WEBP) or AVIF signatures
        const isWebP = buffer.length > 12 &&
            buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
            buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;

        const isAVIF = buffer.length > 12 &&
            buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70;

        if (isWebP || isAVIF) {
            this.logger.log(`Converting ${isWebP ? 'WebP' : 'AVIF'} image to PNG for Jimp compatibility`);
            return sharp(buffer).png().toBuffer();
        }
        return buffer;
    }

    async uploadLogo(userId: string, file: Express.Multer.File, instagramAccountId: string, businessProfileId?: string) {
        this.logger.log(`Uploading logo for user ${userId} and account ${instagramAccountId}`);

        // 1. Process image to remove background
        const compatibleBuffer = await this.ensureJimpCompatible(file.buffer);
        const image = await Jimp.read(compatibleBuffer);
        const processedImage = await this.removeBackground(image);
        const processedBuffer = await processedImage.getBufferAsync(Jimp.MIME_PNG);

        // 2. Upload to GCS
        const fileName = `logo_${uuidv4()}.png`;
        const folder = businessProfileId ? `${userId}/${businessProfileId}/logos` : `${userId}/logos`;

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
            businessProfileId: businessProfileId || null,
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

    async generateAITemplates(userId: string, instagramAccountId: string, businessProfileId?: string) {
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
                    logoImage = await Jimp.read(await this.ensureJimpCompatible(buffer));
                } else {
                    // Download from URL first, then ensure compatibility
                    const axios = require('axios');
                    const response = await axios.get(logoUrl, { responseType: 'arraybuffer' });
                    const urlBuffer = Buffer.from(response.data);
                    logoImage = await Jimp.read(await this.ensureJimpCompatible(urlBuffer));
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

            const templateFolder = businessProfileId ? `${userId}/${businessProfileId}/templates` : `${userId}/templates`;
            const uploadResult = await this.gcsService.uploadFile(mockFile, templateFolder);

            const asset = this.imageAssetRepository.create({
                userId,
                businessProfileId: businessProfileId || null,
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

    async uploadTemplate(userId: string, file: Express.Multer.File, businessProfileId?: string) {
        const folder = businessProfileId ? `${userId}/${businessProfileId}/templates` : `${userId}/templates`;
        const uploadResult = await this.gcsService.uploadFile(file, folder);

        const asset = this.imageAssetRepository.create({
            userId,
            businessProfileId: businessProfileId || null,
            type: ImageAssetType.TEMPLATE,
            originalName: file.originalname,
            gcsPath: uploadResult.path,
            publicUrl: uploadResult.publicUrl,
        });

        return this.imageAssetRepository.save(asset);
    }

    async uploadContent(userId: string, file: Express.Multer.File, businessProfileId?: string) {
        const folder = businessProfileId ? `${userId}/${businessProfileId}/content` : `${userId}/content`;
        const uploadResult = await this.gcsService.uploadFile(file, folder);

        const asset = this.imageAssetRepository.create({
            userId,
            businessProfileId: businessProfileId || null,
            type: ImageAssetType.CONTENT,
            originalName: file.originalname,
            gcsPath: uploadResult.path,
            publicUrl: uploadResult.publicUrl,
        });

        return this.imageAssetRepository.save(asset);
    }

    async listTemplates(userId: string, businessProfileId?: string) {
        const where: any = { userId, type: ImageAssetType.TEMPLATE };
        if (businessProfileId) where.businessProfileId = businessProfileId;
        return this.imageAssetRepository.find({
            where,
            order: { createdAt: 'DESC' },
        });
    }

    async listContent(userId: string, businessProfileId?: string) {
        const where: any = { userId, type: ImageAssetType.CONTENT };
        if (businessProfileId) where.businessProfileId = businessProfileId;
        return this.imageAssetRepository.find({
            where,
            order: { createdAt: 'DESC' },
        });
    }

    async listOutputs(userId: string, businessProfileId?: string) {
        const where: any = { userId, type: ImageAssetType.OUTPUT };
        if (businessProfileId) where.businessProfileId = businessProfileId;
        return this.imageAssetRepository.find({
            where,
            order: { createdAt: 'DESC' },
        });
    }

    async updateAssetEmotion(userId: string, assetId: string, targetEmotion: string): Promise<ImageAsset> {
        const asset = await this.imageAssetRepository.findOne({ where: { id: assetId, userId } });
        if (!asset) throw new NotFoundException('Asset not found');
        asset.targetEmotion = targetEmotion || null;
        return this.imageAssetRepository.save(asset);
    }

    async generateImage(userId: string, templatePath: string, contentPath: string, businessProfileId?: string) {
        this.logger.log(`Generating image for user ${userId} with template ${templatePath} and content ${contentPath}`);

        try {
            // 1. Download images
            const [templateBuffer, contentBuffer] = await Promise.all([
                this.gcsService.downloadFile(templatePath),
                this.gcsService.downloadFile(contentPath),
            ]);

            // 2. Process images with Jimp (convert WebP/AVIF if needed)
            const templateImage = await Jimp.read(await this.ensureJimpCompatible(templateBuffer));
            const contentImage = await Jimp.read(await this.ensureJimpCompatible(contentBuffer));

            // Resize content to cover template dimensions
            contentImage.cover(templateImage.getWidth(), templateImage.getHeight());

            // Composite template over content
            // Logic: Content is background, Template is overlay (with transparency)
            contentImage.composite(templateImage, 0, 0);

            const outputBuffer = await contentImage.getBufferAsync(Jimp.MIME_PNG);

            // 3. Upload result
            const fileName = `generated_${uuidv4()}.png`;
            const outputFolder = businessProfileId ? `${userId}/${businessProfileId}/output` : `${userId}/output`;

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
                businessProfileId: businessProfileId || null,
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

    // ─── Core compositing pipeline (shared by GCS-path and inline-buffer flows) ──
    private async doCompositeWithFormat(
        contentBuffer: Buffer,
        templateBuffer: Buffer,
        formatSettings: {
            format: string;
            width: number;
            height: number;
            cropX: number;
            cropY: number;
            scale: number;
            overlayText?: string;
            overlayFont?: string;
            overlayColor?: string;
            overlaySize?: number;
            overlayX?: number;
            overlayY?: number;
        },
        userId: string,
        businessProfileId?: string,
    ): Promise<ImageAsset> {
        this.logger.log('='.repeat(60));
        this.logger.log(`[doComposite] RECEIVED: format=${formatSettings.format} target=${formatSettings.width}x${formatSettings.height} cropX=${formatSettings.cropX} cropY=${formatSettings.cropY} scale=${formatSettings.scale}`);
        this.logger.log(`[doComposite] types: cropX=${typeof formatSettings.cropX} cropY=${typeof formatSettings.cropY} scale=${typeof formatSettings.scale}`);
        if (formatSettings.overlayText) {
            this.logger.log(`[doComposite] TEXT: "${formatSettings.overlayText}" font=${formatSettings.overlayFont} size=${formatSettings.overlaySize} color=${formatSettings.overlayColor} x=${formatSettings.overlayX} y=${formatSettings.overlayY}`);
        }

        const targetWidth = formatSettings.width;
        const targetHeight = formatSettings.height;

        // Get content dimensions
        const contentMeta = await sharp(contentBuffer).metadata();
        const contentOrigWidth = contentMeta.width!;
        const contentOrigHeight = contentMeta.height!;
        this.logger.log(`[doComposite] Content original: ${contentOrigWidth}x${contentOrigHeight}`);

        // Cover-fit ratio then apply user scale — mirrors getImageDisplaySize() in the frontend
        const coverRatio = Math.max(targetWidth / contentOrigWidth, targetHeight / contentOrigHeight);
        const scaledWidth  = Math.max(1, Math.round(contentOrigWidth  * coverRatio * formatSettings.scale));
        const scaledHeight = Math.max(1, Math.round(contentOrigHeight * coverRatio * formatSettings.scale));

        this.logger.log(`[doComposite] coverRatio=${coverRatio.toFixed(4)} scaledContent=${scaledWidth}x${scaledHeight}`);

        // Resize content
        const contentResizedBuf = await sharp(contentBuffer)
            .resize(scaledWidth, scaledHeight, { fit: 'fill' })
            .ensureAlpha()
            .toBuffer();

        // Position: centered, then offset by user crop
        //   cropX = -dragX * scaleRatio  ← set by FormatEditorModal handleConfirm
        const centerX = Math.round((targetWidth  - scaledWidth)  / 2);
        const centerY = Math.round((targetHeight - scaledHeight) / 2);
        let compositeLeft = centerX - formatSettings.cropX;
        let compositeTop  = centerY - formatSettings.cropY;

        this.logger.log(`[doComposite] centerX=${centerX} centerY=${centerY} → compositeLeft=${compositeLeft} compositeTop=${compositeTop}`);

        // Sharp requires left/top >= 0: extract the visible slice when content hangs off top-left
        let contentForComposite = contentResizedBuf;
        if (compositeLeft < 0 || compositeTop < 0) {
            const exLeft = Math.max(0, -compositeLeft);
            const exTop  = Math.max(0, -compositeTop);
            const exW    = Math.min(scaledWidth  - exLeft, targetWidth);
            const exH    = Math.min(scaledHeight - exTop,  targetHeight);

            this.logger.log(`[doComposite] Extracting visible slice: left=${exLeft} top=${exTop} w=${exW} h=${exH}`);

            if (exW > 0 && exH > 0) {
                contentForComposite = await sharp(contentResizedBuf)
                    .extract({ left: exLeft, top: exTop, width: exW, height: exH })
                    .toBuffer();
            }
            compositeLeft = Math.max(0, compositeLeft);
            compositeTop  = Math.max(0, compositeTop);
        }

        // Template: cover-fit to frame, preserve alpha
        const templateResizedBuf = await sharp(templateBuffer)
            .resize(targetWidth, targetHeight, { fit: 'cover', position: 'centre' })
            .ensureAlpha()
            .toBuffer();

        // Build composite layers: canvas → content → template → text
        const compositeLayers: sharp.OverlayOptions[] = [
            { input: contentForComposite, left: compositeLeft, top: compositeTop },
            { input: templateResizedBuf, left: 0, top: 0 },
        ];

        // ── Text overlay (SVG-based) — on top of everything ──────────
        if (formatSettings.overlayText?.trim()) {
            const textSvg = this.buildTextOverlaySvg(
                formatSettings.overlayText.trim(),
                targetWidth,
                targetHeight,
                formatSettings.overlayFont || 'Inter',
                formatSettings.overlaySize || 72,
                formatSettings.overlayColor || '#ffffff',
                formatSettings.overlayX ?? Math.round(targetWidth / 2),
                formatSettings.overlayY ?? Math.round(targetHeight * 0.85),
            );
            const textBuffer = await sharp(Buffer.from(textSvg))
                .resize(targetWidth, targetHeight)
                .ensureAlpha()
                .toBuffer();
            compositeLayers.push({ input: textBuffer, left: 0, top: 0 });
        }

        // Black canvas → composite all layers
        const outputBuffer = await sharp({
            create: {
                width: targetWidth, height: targetHeight,
                channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 1 },
            },
        })
        .composite(compositeLayers)
        .png()
        .toBuffer();

        this.logger.log(`[doComposite] Output: ${outputBuffer.length} bytes (compositeLeft=${compositeLeft} compositeTop=${compositeTop})`);
        this.logger.log('='.repeat(60));

        const fileName = `generated_${formatSettings.format}_${uuidv4()}.png`;
        const outputFolder = businessProfileId ? `${userId}/${businessProfileId}/output` : `${userId}/output`;

        const file: Express.Multer.File = {
            buffer: outputBuffer,
            originalname: fileName,
            mimetype: 'image/png',
            size: outputBuffer.length,
        } as any;

        const uploadResult = await this.gcsService.uploadFile(file, outputFolder);

        const asset = this.imageAssetRepository.create({
            userId,
            businessProfileId: businessProfileId || null,
            type: ImageAssetType.OUTPUT,
            originalName: fileName,
            gcsPath: uploadResult.path,
            publicUrl: uploadResult.publicUrl,
            targetEmotion: (formatSettings as any).targetEmotion || null,
        });

        return this.imageAssetRepository.save(asset);
    }

    // ─── Generate from two GCS paths (original flow) ────────────────────────
    async generateImageWithFormat(
        userId: string,
        templatePath: string,
        contentPath: string,
        formatSettings: {
            format: 'story' | 'reel' | 'post' | 'carousel';
            width: number;
            height: number;
            cropX: number;
            cropY: number;
            scale: number;
            overlayText?: string;
            overlayFont?: string;
            overlayColor?: string;
            overlaySize?: number;
            overlayX?: number;
            overlayY?: number;
            targetEmotion?: string;
        },
        businessProfileId?: string,
    ) {
        this.logger.log(`[generateWithFormat] user=${userId} format=${formatSettings.format} ${formatSettings.width}x${formatSettings.height} cropX=${formatSettings.cropX} cropY=${formatSettings.cropY} scale=${formatSettings.scale}`);
        try {
            const [templateBuffer, contentBuffer] = await Promise.all([
                this.gcsService.downloadFile(templatePath),
                this.gcsService.downloadFile(contentPath),
            ]);
            return this.doCompositeWithFormat(contentBuffer, templateBuffer, formatSettings, userId, businessProfileId);
        } catch (error) {
            this.logger.error(`Failed to generate image with format: ${error.message}`, error.stack);
            throw new BadRequestException(`Image generation failed: ${error.message}`);
        }
    }

    // ─── Generate from inline template buffer + GCS content path ────────────
    //     Used when a locally-generated preview template is selected in the UI
    async generateImageWithFormatInline(
        userId: string,
        templateFile: Express.Multer.File,
        contentPath: string,
        formatSettings: {
            format: 'story' | 'reel' | 'post' | 'carousel';
            width: number;
            height: number;
            cropX: number;
            cropY: number;
            scale: number;
            overlayText?: string;
            overlayFont?: string;
            overlayColor?: string;
            overlaySize?: number;
            overlayX?: number;
            overlayY?: number;
            targetEmotion?: string;
        },
        businessProfileId?: string,
    ) {
        this.logger.log(`[generateWithFormatInline] user=${userId} format=${formatSettings.format} ${formatSettings.width}x${formatSettings.height}`);
        try {
            const contentBuffer = await this.gcsService.downloadFile(contentPath);
            return this.doCompositeWithFormat(contentBuffer, templateFile.buffer, formatSettings, userId, businessProfileId);
        } catch (error) {
            this.logger.error(`Failed to generate image with format (inline): ${error.message}`, error.stack);
            throw new BadRequestException(`Image generation failed: ${error.message}`);
        }
    }

    // ─── Build SVG text overlay for compositing ─────────────────────────────
    private buildTextOverlaySvg(
        text: string,
        width: number,
        height: number,
        fontFamily: string,
        fontSize: number,
        color: string,
        posX: number,
        posY: number,
    ): string {
        // Escape XML entities
        const escaped = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');

        // Split into lines on newline characters
        const lines = escaped.split(/\n/);

        // Build tspan chain for a given anchor x,y
        // Each text element must get its own tspan chain because dy values are relative
        const lineHeight = Math.round(fontSize * 1.15);
        const blockOffset = -((lines.length - 1) * lineHeight) / 2;

        const makeTspans = (ax: number) =>
            lines.map((line, i) => {
                const dy = i === 0 ? blockOffset : lineHeight;
                return `<tspan x="${ax}" dy="${dy}">${line || ' '}</tspan>`;
            }).join('');

        const commonAttrs = (ax: number, ay: number) =>
            `x="${ax}" y="${ay}" text-anchor="middle" dominant-baseline="central" ` +
            `font-family="${fontFamily}, sans-serif" font-size="${fontSize}" font-weight="700"`;

        // Shadow layer: offset copies — avoids feDropShadow which is unsupported in older librsvg
        const shadowOffsets = [[3, 3], [-3, 3], [3, -3], [-3, -3], [0, 4], [0, -2]];
        const shadowLayers = shadowOffsets
            .map(([dx, dy]) =>
                `<text ${commonAttrs(posX + dx, posY + dy)} fill="black" fill-opacity="0.45">${makeTspans(posX + dx)}</text>`,
            )
            .join('\n  ');

        return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  ${shadowLayers}
  <text ${commonAttrs(posX, posY)} fill="${color}">${makeTspans(posX)}</text>
</svg>`;
    }

    // ─── Return base64 preview PNGs for all 6 template types ────────────────
    //     Returns instantly — no GCS upload, no DB record
    async getTemplatesPreviews(primary: string, secondary: string): Promise<Array<{ name: string; label: string; dataUrl: string }>> {
        const configs = [
            { name: 'border',          label: 'Borde' },
            { name: 'bottom_gradient', label: 'Degradado Inferior' },
            { name: 'glass',           label: 'Panel Glass' },
            { name: 'geometric',       label: 'Geométrico' },
            { name: 'double_frame',    label: 'Marco Doble' },
            { name: 'header_footer',   label: 'Encabezado / Pie' },
        ];

        const results = await Promise.all(
            configs.map(async ({ name, label }) => {
                const template = await this.createTemplate(name, primary, secondary, null);
                const buffer = await template.getBufferAsync(Jimp.MIME_PNG);
                return { name, label, dataUrl: `data:image/png;base64,${buffer.toString('base64')}` };
            })
        );
        return results;
    }
}


