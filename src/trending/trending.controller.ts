import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TrendingService } from './trending.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('trending')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('trending')
export class TrendingController {
  constructor(private readonly trendingService: TrendingService) {}

  @Get('topics/:accountId')
  @ApiOperation({ summary: 'Get trending topics relevant to account' })
  @ApiQuery({ name: 'limit', required: false })
  getTrendingTopics(
    @Param('accountId') accountId: string,
    @Query('limit') limit?: number,
  ) {
    return this.trendingService.getTrendingTopics(accountId, limit);
  }

  @Get('hashtags/:accountId')
  @ApiOperation({ summary: 'Get trending hashtags' })
  @ApiQuery({ name: 'category', required: false })
  getTrendingHashtags(
    @Param('accountId') accountId: string,
    @Query('category') category?: string,
  ) {
    return this.trendingService.getTrendingHashtags(accountId, category);
  }

  @Get('suggestions/:accountId')
  @ApiOperation({ summary: 'Get content suggestions based on trends' })
  @ApiQuery({ name: 'limit', required: false })
  getContentSuggestions(
    @Param('accountId') accountId: string,
    @Query('limit') limit?: number,
  ) {
    return this.trendingService.getContentSuggestions(accountId, limit);
  }

  @Get('keywords/:accountId')
  @ApiOperation({ summary: 'Get trending keywords, terms, and technologies for the industry' })
  getTrendingKeywords(@Param('accountId') accountId: string) {
    return this.trendingService.getTrendingKeywords(accountId);
  }

  @Get('techniques/:accountId')
  @ApiOperation({ summary: 'Get trending content techniques and strategies' })
  getTrendingTechniques(@Param('accountId') accountId: string) {
    return this.trendingService.getTrendingTechniques(accountId);
  }

  @Get('technologies/:accountId')
  @ApiOperation({ summary: 'Get trending tools and technologies for content creation' })
  getTrendingTechnologies(@Param('accountId') accountId: string) {
    return this.trendingService.getTrendingTechnologies(accountId);
  }

  @Get('inspiring-posts/:accountId')
  @ApiOperation({ summary: 'Get inspiring posts from the industry for inspiration' })
  getInspiringPosts(@Param('accountId') accountId: string) {
    return this.trendingService.getInspiringPosts(accountId);
  }

  @Get('competitor/:accountId')
  @ApiOperation({ summary: 'Analyze competitor account' })
  @ApiQuery({ name: 'username', required: true })
  getCompetitorAnalysis(
    @Param('accountId') accountId: string,
    @Query('username') username: string,
  ) {
    return this.trendingService.getCompetitorAnalysis(accountId, username);
  }
}
