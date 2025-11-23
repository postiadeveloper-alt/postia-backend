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
  constructor(private readonly instagramService: InstagramService) {}

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
        return this.renderCallbackPage({
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
      
      return this.renderCallbackPage({
        success: true,
        account: {
          id: account.id,
          username: account.username,
          name: account.name,
          profilePicture: account.profilePictureUrl,
          followers: account.followersCount
        }
      });
    } catch (error) {
      console.error('❌ Callback error:', error);
      return this.renderCallbackPage({
        success: false,
        error: error.message || 'An unexpected error occurred while connecting your Instagram account.',
        errorType: 'server_error'
      });
    }
  }

  private renderCallbackPage(result: { success: boolean; account?: any; error?: string; errorType?: string }) {
    if (result.success) {
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Instagram Connected - Postia</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                background: linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                padding: 20px;
              }
              .container {
                background: rgba(255, 255, 255, 0.08);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(238, 62, 201, 0.2);
                border-radius: 20px;
                padding: 40px;
                text-align: center;
                max-width: 500px;
                box-shadow: 0 8px 32px rgba(238, 62, 201, 0.2);
              }
              .icon {
                font-size: 64px;
                margin-bottom: 20px;
                animation: bounce 0.6s ease-in-out;
              }
              @keyframes bounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-10px); }
              }
              h1 {
                color: #ffffff;
                font-size: 28px;
                margin: 0 0 15px 0;
              }
              .account-info {
                background: rgba(0, 255, 255, 0.1);
                border: 1px solid rgba(0, 255, 255, 0.3);
                border-radius: 12px;
                padding: 20px;
                margin: 20px 0;
              }
              .username {
                color: #00ffff;
                font-size: 22px;
                font-weight: bold;
                margin: 10px 0;
              }
              .stats {
                color: #a0a0b0;
                font-size: 14px;
                margin-top: 10px;
              }
              p {
                color: #a0a0b0;
                font-size: 16px;
                line-height: 1.6;
              }
              .spinner {
                display: inline-block;
                width: 20px;
                height: 20px;
                border: 3px solid rgba(238, 62, 201, 0.3);
                border-radius: 50%;
                border-top-color: #ee3ec9;
                animation: spin 1s ease-in-out infinite;
              }
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="icon">✓</div>
              <h1>Instagram Connected!</h1>
              <div class="account-info">
                <div class="username">@${result.account.username}</div>
                <div class="stats">${result.account.followers?.toLocaleString() || 0} followers</div>
              </div>
              <p>Your Instagram account has been successfully connected to Postia.</p>
              <p><span class="spinner"></span> Redirecting you back to the app...</p>
            </div>
            <script>
              // Send success message to parent window
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'instagram-connected', 
                  success: true,
                  account: ${JSON.stringify(result.account)}
                }, '*');
                // Close popup after 2 seconds
                setTimeout(() => window.close(), 2000);
              } else {
                // If no opener, redirect to app
                setTimeout(() => {
                  window.location.href = '/';
                }, 3000);
              }
            </script>
          </body>
        </html>
      `;
    } else {
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Connection Error - Postia</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                background: linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                padding: 20px;
              }
              .container {
                background: rgba(255, 255, 255, 0.08);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(239, 68, 68, 0.3);
                border-radius: 20px;
                padding: 40px;
                text-align: center;
                max-width: 500px;
                box-shadow: 0 8px 32px rgba(239, 68, 68, 0.2);
              }
              .icon {
                font-size: 64px;
                margin-bottom: 20px;
              }
              h1 {
                color: #ffffff;
                font-size: 28px;
                margin: 0 0 15px 0;
              }
              .error-box {
                background: rgba(239, 68, 68, 0.1);
                border: 1px solid rgba(239, 68, 68, 0.3);
                border-radius: 12px;
                padding: 20px;
                margin: 20px 0;
              }
              .error-message {
                color: #fca5a5;
                font-size: 16px;
                line-height: 1.6;
              }
              p {
                color: #a0a0b0;
                font-size: 16px;
                line-height: 1.6;
              }
              .retry-btn {
                display: inline-block;
                margin-top: 20px;
                padding: 12px 30px;
                background: linear-gradient(135deg, #ee3ec9 0%, #ff00ff 100%);
                color: white;
                text-decoration: none;
                border-radius: 10px;
                font-weight: 600;
                transition: transform 0.2s;
              }
              .retry-btn:hover {
                transform: translateY(-2px);
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="icon">⚠️</div>
              <h1>Connection Failed</h1>
              <div class="error-box">
                <div class="error-message">${result.error}</div>
              </div>
              <p>Please close this window and try again.</p>
            </div>
            <script>
              // Send error message to parent window
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'instagram-error',
                  error: '${result.error}',
                  errorType: '${result.errorType}'
                }, '*');
                // Auto-close after 5 seconds
                setTimeout(() => window.close(), 5000);
              }
            </script>
          </body>
        </html>
      `;
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
}
