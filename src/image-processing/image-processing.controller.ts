import { Controller, Post, UseGuards, UseInterceptors, UploadedFile, Req, Get, Body, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ImageProcessingService } from './image-processing.service';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';

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
            },
        },
    })
    @ApiOperation({ summary: 'Upload a template image' })
    async uploadTemplate(@Req() req, @UploadedFile() file: Express.Multer.File) {
        if (!file) throw new BadRequestException('File is required');
        return this.imageProcessingService.uploadTemplate(req.user.id, file);
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
            },
        },
    })
    @ApiOperation({ summary: 'Upload a content image' })
    async uploadContent(@Req() req, @UploadedFile() file: Express.Multer.File) {
        if (!file) throw new BadRequestException('File is required');
        return this.imageProcessingService.uploadContent(req.user.id, file);
    }

    @Post('generate')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                templatePath: { type: 'string' },
                contentPath: { type: 'string' }
            }
        }
    })
    @ApiOperation({ summary: 'Generate a combined image' })
    async generateImage(@Req() req, @Body() body: { templatePath: string; contentPath: string }) {
        if (!body.templatePath || !body.contentPath) {
            throw new BadRequestException('Template path and content path are required');
        }
        return this.imageProcessingService.generateImage(req.user.id, body.templatePath, body.contentPath);
    }

    @Get('templates')
    @ApiOperation({ summary: 'List uploaded templates' })
    async listTemplates(@Req() req) {
        return this.imageProcessingService.listTemplates(req.user.id);
    }

    @Get('content')
    @ApiOperation({ summary: 'List uploaded content' })
    async listContent(@Req() req) {
        return this.imageProcessingService.listContent(req.user.id);
    }

    @Get('outputs')
    @ApiOperation({ summary: 'List generated outputs' })
    async listOutputs(@Req() req) {
        return this.imageProcessingService.listOutputs(req.user.id);
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
                instagramAccountId: { type: 'string' }
            },
        },
    })
    @ApiOperation({ summary: 'Upload a business logo with background removal' })
    async uploadLogo(@Req() req, @UploadedFile() file: Express.Multer.File, @Body('instagramAccountId') instagramAccountId: string) {
        if (!file) throw new BadRequestException('File is required');
        if (!instagramAccountId) throw new BadRequestException('instagramAccountId is required');
        return this.imageProcessingService.uploadLogo(req.user.id, file, instagramAccountId);
    }

    @Post('generate-ai-templates')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                instagramAccountId: { type: 'string' }
            }
        }
    })
    @ApiOperation({ summary: 'Generate AI templates using business colors and logo' })
    async generateAITemplates(@Req() req, @Body('instagramAccountId') instagramAccountId: string) {
        if (!instagramAccountId) throw new BadRequestException('instagramAccountId is required');
        return this.imageProcessingService.generateAITemplates(req.user.id, instagramAccountId);
    }
}
