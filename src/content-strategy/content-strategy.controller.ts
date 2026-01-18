import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ContentStrategyService } from './content-strategy.service';
import { GenerateContentStrategyDto, UpdateContentStrategyDto } from './dto/content-strategy.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('content-strategy')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('content-strategy')
export class ContentStrategyController {
  constructor(private readonly contentStrategyService: ContentStrategyService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate AI content strategy for a month' })
  async generate(
    @Request() req,
    @Body() dto: GenerateContentStrategyDto,
  ) {
    return this.contentStrategyService.generateMonthlyStrategy(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all content strategies for current user' })
  async findAll(@Request() req) {
    return this.contentStrategyService.findAllByUser(req.user.id);
  }

  @Get('month/:monthYear/profile/:businessProfileId')
  @ApiOperation({ summary: 'Get content strategies for a specific month and business profile' })
  async findByMonth(
    @Request() req,
    @Param('monthYear') monthYear: string,
    @Param('businessProfileId') businessProfileId: string,
  ) {
    return this.contentStrategyService.findByMonthAndProfile(
      req.user.id,
      businessProfileId,
      monthYear,
    );
  }

  @Get('range')
  @ApiOperation({ summary: 'Get content strategies for a date range' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  @ApiQuery({ name: 'businessProfileId', required: true })
  async findByRange(
    @Request() req,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('businessProfileId') businessProfileId: string,
  ) {
    return this.contentStrategyService.findByDateRange(
      req.user.id,
      businessProfileId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get content strategy by ID' })
  async findOne(@Param('id') id: string) {
    return this.contentStrategyService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update content strategy' })
  async update(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: UpdateContentStrategyDto,
  ) {
    return this.contentStrategyService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete content strategy' })
  async remove(@Param('id') id: string, @Request() req) {
    return this.contentStrategyService.remove(id, req.user.id);
  }

  @Delete('month/:monthYear/profile/:businessProfileId')
  @ApiOperation({ summary: 'Delete all content strategies for a specific month and profile' })
  async removeByMonth(
    @Request() req,
    @Param('monthYear') monthYear: string,
    @Param('businessProfileId') businessProfileId: string,
  ) {
    const deleted = await this.contentStrategyService.removeByMonthAndProfile(
      req.user.id,
      businessProfileId,
      monthYear,
    );
    return { deleted };
  }

  @Post(':id/convert-to-post')
  @ApiOperation({ summary: 'Convert content strategy to actual post' })
  async convertToPost(@Param('id') id: string, @Request() req) {
    return this.contentStrategyService.convertToPost(id, req.user.id);
  }
}
