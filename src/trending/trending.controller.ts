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
