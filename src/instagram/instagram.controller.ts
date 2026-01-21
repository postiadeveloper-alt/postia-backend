import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { InstagramService } from './instagram.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('instagram')
@Controller('instagram')
export class InstagramController {
  constructor(private readonly instagramService: InstagramService) { }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('accounts')
  @ApiOperation({ summary: 'Get all Instagram accounts for current user' })
  findAll(@Request() req) {
    return this.instagramService.findAllByUser(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('accounts/:id')
  @ApiOperation({ summary: 'Get Instagram account by ID' })
  findOne(@Param('id') id: string) {
    return this.instagramService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('auth-url')
  @ApiOperation({ summary: 'Get Instagram OAuth authorization URL' })
  async getAuthUrl(@Request() req) {
    const authUrl = await this.instagramService.getAuthUrl(req.user.id);
    return { authUrl };
  }

  @Get('callback')
  @ApiOperation({ summary: 'Instagram OAuth callback - handle Facebook authorization' })
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Query('error_description') errorDescription: string
  ) {
    try {
      if (error) {
        console.log('❌ OAuth error:', error, errorDescription);
        return this.instagramService.renderCallbackPage({
          success: false,
          error: errorDescription || 'Authorization was cancelled or failed. Please try again.',
          errorType: 'user_denied'
        });
      }

      if (!code) {
        throw new Error('No authorization code received');
      }

      if (!state) {
        throw new Error('Session expired. Please try connecting again from the app.');
      }

      const userId = state; // state contains the user ID
      console.log('🔄 Processing OAuth callback for user:', userId);

      // Step 1: Exchange code for access token
      const accessToken = await this.instagramService.exchangeCodeForToken(code);

      // Step 2: Connect Instagram account
      const account = await this.instagramService.connectAccount(userId, accessToken);
      console.log('✅ Instagram account connected:', account.username);

      return this.instagramService.renderCallbackPage({
        success: true,
        account: {
          id: account.id,
          username: account.username,
          name: account.name,
          profilePictureUrl: account.profilePictureUrl,
          biography: account.biography,
          followersCount: account.followersCount
        }
      });
    } catch (error) {
      console.error('❌ Callback error:', error);
      return this.instagramService.renderCallbackPage({
        success: false,
        error: error.message || 'An unexpected error occurred while connecting your Instagram account.',
        errorType: 'server_error'
      });
    }
  }


  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('accounts/:id/refresh')
  @ApiOperation({ summary: 'Refresh Instagram account data' })
  refreshAccount(@Param('id') id: string) {
    return this.instagramService.refreshAccountData(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('accounts/:id/disconnect')
  @ApiOperation({ summary: 'Disconnect Instagram account' })
  disconnectAccount(@Param('id') id: string) {
    return this.instagramService.disconnectAccount(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete('accounts/:id')
  @ApiOperation({ summary: 'Delete Instagram account' })
  remove(@Param('id') id: string) {
    return this.instagramService.remove(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('accounts/:id/story')
  @ApiOperation({ summary: 'Post an Instagram Story' })
  async postStory(
    @Param('id') id: string,
    @Body() body: { mediaUrl: string },
  ) {
    return this.instagramService.postStory(id, body.mediaUrl);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('accounts/:id/insights')
  @ApiOperation({ summary: 'Get Instagram account insights/analytics' })
  @ApiQuery({ name: 'metrics', required: false, description: 'Comma-separated list of metrics' })
  @ApiQuery({ name: 'period', required: false, enum: ['day', 'week', 'days_28', 'lifetime'] })
  async getInsights(
    @Param('id') id: string,
    @Query('metrics') metrics?: string,
    @Query('period') period?: 'day' | 'week' | 'days_28' | 'lifetime',
  ) {
    const metricsArray = metrics ? metrics.split(',').map(m => m.trim()) : undefined;
    return this.instagramService.getInsights(id, metricsArray, period);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('accounts/:id/analytics')
  @ApiOperation({ summary: 'Get complete profile analytics' })
  async getProfileAnalytics(@Param('id') id: string) {
    return this.instagramService.getProfileAnalytics(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('accounts/:accountId/media/:mediaId/insights')
  @ApiOperation({ summary: 'Get insights for a specific media post' })
  async getMediaInsights(
    @Param('accountId') accountId: string,
    @Param('mediaId') mediaId: string,
  ) {
    return this.instagramService.getMediaInsights(accountId, mediaId);
  }
}
