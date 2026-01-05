import { Controller, Get, Query } from '@nestjs/common';
import { InstagramService } from './instagram/instagram.service';

@Controller()
export class AppController {
  constructor(private readonly instagramService: InstagramService) { }

  @Get()
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'postia-backend',
    };
  }

  @Get('health')
  getHealthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'postia-backend',
      environment: process.env.NODE_ENV,
    };
  }

  @Get('auth/callback')
  async handleMetaCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Query('error_description') errorDescription: string,
  ) {
    try {
      if (error) {
        return this.instagramService.renderCallbackPage({
          success: false,
          error: errorDescription || 'Authorization failed',
          errorType: 'user_denied'
        });
      }

      const userId = state;
      const accessToken = await this.instagramService.exchangeCodeForToken(code);
      const account = await this.instagramService.connectAccount(userId, accessToken);

      return this.instagramService.renderCallbackPage({
        success: true,
        account: {
          username: account.username,
          followers: account.followersCount
        }
      });
    } catch (e) {
      return this.instagramService.renderCallbackPage({
        success: false,
        error: e.message,
        errorType: 'server_error'
      });
    }
  }
}
