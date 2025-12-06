import { Controller, Post, HttpCode, BadRequestException, Logger } from '@nestjs/common';
import { CalendarService } from '../calendar/calendar.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('scheduler')
@Controller('scheduler')
export class SchedulerController {
  private readonly logger = new Logger(SchedulerController.name);

  constructor(private readonly calendarService: CalendarService) {}

  /**
   * Check and publish scheduled posts
   * This endpoint is called by Google Cloud Scheduler every minute
   * Cloud Scheduler uses OpenID Connect tokens to authenticate
   */
  @Post('check-scheduled-posts')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Check and publish scheduled posts',
    description:
      'This endpoint is triggered by Google Cloud Scheduler every minute. ' +
      'It queries the database for posts scheduled before the current time and publishes them to Instagram.',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully checked scheduled posts',
    schema: {
      example: {
        success: true,
        message: 'Scheduled posts checked successfully',
        data: {
          postsChecked: 5,
          postsPublished: 3,
          postsFailed: 2,
        },
        timestamp: '2025-12-06T10:30:00.000Z',
      },
    },
  })
  async checkScheduledPosts() {
    try {
      const now = new Date();
      this.logger.log(`⏰ Scheduler triggered at: ${now.toISOString()}`);

      const result = await this.calendarService.checkScheduledPosts();

      this.logger.log(
        `📊 Scheduler result: ${result.postsPublished} published, ${result.postsFailed} failed`,
      );

      return {
        success: true,
        message: 'Scheduled posts checked successfully',
        data: result,
        timestamp: now.toISOString(),
      };
    } catch (error) {
      this.logger.error(`❌ Scheduler error: ${error.message}`, error);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Health check endpoint for monitoring
   */
  @Post('health')
  @HttpCode(200)
  @ApiOperation({ summary: 'Health check for scheduler service' })
  async health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
