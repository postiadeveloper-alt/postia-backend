import { Controller, Post, UseGuards, UseInterceptors, UploadedFile, Req, Get, Body, BadRequestException, Query } from '@nestjs/common';
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
        return this.imageProcessingService.generateImageWithFormat(
            req.user.id,
            body.templatePath,
            body.contentPath,
            {
                format: body.format || 'story',
                width: body.width || 1080,
                height: body.height || 1920,
                cropX: body.cropX || 0,
                cropY: body.cropY || 0,
                scale: body.scale || 1
            },
            body.businessProfileId,
        );
    }
}
