import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('account/:accountId')
  @ApiOperation({ summary: 'Get account insights' })
  @ApiQuery({ name: 'period', required: false })
  @ApiQuery({ name: 'since', required: false })
  @ApiQuery({ name: 'until', required: false })
  getAccountInsights(
    @Param('accountId') accountId: string,
    @Query('period') period?: string,
    @Query('since') since?: string,
    @Query('until') until?: string,
  ) {
    return this.analyticsService.getAccountInsights(
      accountId,
      period,
      since ? new Date(since) : undefined,
      until ? new Date(until) : undefined,
    );
  }

  @Get('account/:accountId/engagement-rate')
  @ApiOperation({ summary: 'Get engagement rate' })
  getEngagementRate(@Param('accountId') accountId: string) {
    return this.analyticsService.getEngagementRate(accountId);
  }

  @Get('account/:accountId/demographics')
  @ApiOperation({ summary: 'Get follower demographics' })
  getFollowerDemographics(@Param('accountId') accountId: string) {
    return this.analyticsService.getFollowerDemographics(accountId);
  }

  @Get('account/:accountId/top-posts')
  @ApiOperation({ summary: 'Get top performing posts' })
  @ApiQuery({ name: 'limit', required: false })
  getTopPosts(
    @Param('accountId') accountId: string,
    @Query('limit') limit?: number,
  ) {
    return this.analyticsService.getTopPosts(accountId, limit);
  }

  @Get('post/:accountId/:postId')
  @ApiOperation({ summary: 'Get post insights' })
  getPostInsights(
    @Param('accountId') accountId: string,
    @Param('postId') postId: string,
  ) {
    return this.analyticsService.getPostInsights(accountId, postId);
  }
}
