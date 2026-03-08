import { Controller, Post, UseGuards, UseInterceptors, UploadedFile, Req, Get, Body, BadRequestException, Query, Patch, Param } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ImageProcessingService } from './image-processing.service';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { GenerateImageDto } from './dto/generate-image.dto';
import { GenerateWithFormatDto } from './dto/generate-with-format.dto';
import { GenerateAITemplatesDto } from './dto/generate-ai-templates.dto';

@ApiTags('image-processing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('image-processing')
export class ImageProcessingController {
    constructor(private readonly imageProcessingService: ImageProcessingService) { }

    @Post('upload/template')
    @UseInterceptors(FileInterceptor('file'))
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
                businessProfileId: { type: 'string' },
            },
        },
    })
    @ApiOperation({ summary: 'Upload a template image' })
    async uploadTemplate(@Req() req, @UploadedFile() file: Express.Multer.File, @Body('businessProfileId') businessProfileId?: string) {
        if (!file) throw new BadRequestException('File is required');
        return this.imageProcessingService.uploadTemplate(req.user.id, file, businessProfileId);
    }

    @Post('upload/content')
    @UseInterceptors(FileInterceptor('file'))
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
                businessProfileId: { type: 'string' },
            },
        },
    })
    @ApiOperation({ summary: 'Upload a content image' })
    async uploadContent(@Req() req, @UploadedFile() file: Express.Multer.File, @Body('businessProfileId') businessProfileId?: string) {
        if (!file) throw new BadRequestException('File is required');
        return this.imageProcessingService.uploadContent(req.user.id, file, businessProfileId);
    }

    @Post('generate')
    @ApiOperation({ summary: 'Generate a combined image' })
    async generateImage(@Req() req, @Body() body: GenerateImageDto) {
        return this.imageProcessingService.generateImage(req.user.id, body.templatePath, body.contentPath, body.businessProfileId);
    }

    @Get('templates')
    @ApiOperation({ summary: 'List uploaded templates' })
    async listTemplates(@Req() req, @Query('businessProfileId') businessProfileId?: string) {
        return this.imageProcessingService.listTemplates(req.user.id, businessProfileId);
    }

    @Get('content')
    @ApiOperation({ summary: 'List uploaded content' })
    async listContent(@Req() req, @Query('businessProfileId') businessProfileId?: string) {
        return this.imageProcessingService.listContent(req.user.id, businessProfileId);
    }

    @Get('outputs')
    @ApiOperation({ summary: 'List generated outputs' })
    async listOutputs(@Req() req, @Query('businessProfileId') businessProfileId?: string) {
        return this.imageProcessingService.listOutputs(req.user.id, businessProfileId);
    }

    @Patch(':id/emotion')
    @ApiOperation({ summary: 'Update the targetEmotion of an image asset' })
    async updateAssetEmotion(
        @Req() req,
        @Param('id') id: string,
        @Body('targetEmotion') targetEmotion: string,
    ) {
        return this.imageProcessingService.updateAssetEmotion(req.user.id, id, targetEmotion);
    }

    @Post('upload/logo')
    @UseInterceptors(FileInterceptor('file'))
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
                instagramAccountId: { type: 'string' },
                businessProfileId: { type: 'string' }
            },
        },
    })
    @ApiOperation({ summary: 'Upload a business logo with background removal' })
    async uploadLogo(@Req() req, @UploadedFile() file: Express.Multer.File, @Body('instagramAccountId') instagramAccountId: string, @Body('businessProfileId') businessProfileId?: string) {
        if (!file) throw new BadRequestException('File is required');
        if (!instagramAccountId) throw new BadRequestException('instagramAccountId is required');
        return this.imageProcessingService.uploadLogo(req.user.id, file, instagramAccountId, businessProfileId);
    }

    @Post('generate-ai-templates')
    @ApiOperation({ summary: 'Generate AI templates using business colors and logo' })
    async generateAITemplates(@Req() req, @Body() body: GenerateAITemplatesDto) {
        return this.imageProcessingService.generateAITemplates(req.user.id, body.instagramAccountId, body.businessProfileId);
    }

    @Post('generate-with-format')
    @ApiOperation({ summary: 'Generate a combined image with custom format and positioning' })
    async generateImageWithFormat(
        @Req() req,
        @Body() body: GenerateWithFormatDto,
    ) {
        console.log('[Controller] generate-with-format body:', JSON.stringify({
            format: body.format, width: body.width, height: body.height,
            cropX: body.cropX, cropY: body.cropY, scale: body.scale,
            templatePath: body.templatePath?.substring(0, 40),
        }));

        return this.imageProcessingService.generateImageWithFormat(
            req.user.id,
            body.templatePath,
            body.contentPath,
            {
                format: body.format ?? 'story',
                width: body.width ?? 1080,
                height: body.height ?? 1920,
                cropX: body.cropX ?? 0,
                cropY: body.cropY ?? 0,
                scale: body.scale ?? 1,
                overlayText: body.overlayText,
                overlayFont: body.overlayFont,
                overlayColor: body.overlayColor,
                overlaySize: body.overlaySize,
                overlayX: body.overlayX,
                overlayY: body.overlayY,
                targetEmotion: body.targetEmotion,
            },
            body.businessProfileId,
        );
    }

    @Post('generate-with-format-inline')
    @UseInterceptors(FileInterceptor('templateFile'))
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Generate with an inline template buffer (no GCS path required for template)' })
    async generateImageWithFormatInline(
        @Req() req,
        @UploadedFile() templateFile: Express.Multer.File,
    ) {
        // Read body fields directly from req.body to bypass ValidationPipe whitelisting
        // (with whitelist:true + forbidNonWhitelisted:true, @Body() body:any would strip all fields)
        const body = req.body;

        if (!templateFile) throw new BadRequestException('templateFile is required');
        if (!body.contentPath) throw new BadRequestException('contentPath is required');

        // Multipart form values arrive as strings — parse to numbers explicitly
        const cropX  = Number(body.cropX);
        const cropY  = Number(body.cropY);
        const scale  = Number(body.scale);
        const width  = Number(body.width);
        const height = Number(body.height);

        console.log('[Controller] generate-with-format-inline body:', JSON.stringify({
            format: body.format, width, height, cropX, cropY, scale,
            rawCropX: body.cropX, rawScale: body.scale,
            contentPath: body.contentPath?.substring(0, 40),
        }));

        return this.imageProcessingService.generateImageWithFormatInline(
            req.user.id,
            templateFile,
            body.contentPath,
            {
                format: body.format || 'post',
                width:  isFinite(width)  ? width  : 1080,
                height: isFinite(height) ? height : 1080,
                cropX:  isFinite(cropX)  ? cropX  : 0,
                cropY:  isFinite(cropY)  ? cropY  : 0,
                scale:  isFinite(scale)  ? scale  : 1,
                overlayText: body.overlayText,
                overlayFont: body.overlayFont,
                overlayColor: body.overlayColor,
                overlaySize: body.overlaySize ? Number(body.overlaySize) : undefined,
                overlayX: body.overlayX ? Number(body.overlayX) : undefined,
                overlayY: body.overlayY ? Number(body.overlayY) : undefined,
                targetEmotion: body.targetEmotion,
            },
            body.businessProfileId,
        );
    }

    @Get('templates/preview')
    @ApiOperation({ summary: 'Get base64 preview PNGs for all 6 template types (no GCS storage)' })
    async getTemplatesPreviews(
        @Query('primary') primary: string,
        @Query('secondary') secondary: string,
    ) {
        return this.imageProcessingService.getTemplatesPreviews(
            primary || '#ee3ec9',
            secondary || '#9b2c82',
        );
    }
}
