import { Controller, Post, Get, HttpCode, BadRequestException, Logger, OnModuleInit, Param } from '@nestjs/common';
import { CalendarService } from '../calendar/calendar.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('scheduler')
@Controller('scheduler')
export class SchedulerController implements OnModuleInit {
  private readonly logger = new Logger(SchedulerController.name);
  private lastRun: Date = null;
  private runCount: number = 0;

  constructor(private readonly calendarService: CalendarService) { }

  onModuleInit() {
    // In development, simulate Cloud Scheduler by running every minute
    // This allows testing scheduled posts without deploying or setting up external triggers
    if (process.env.NODE_ENV !== 'production') {
      this.logger.log('🔧 Development mode detected: Starting local scheduler simulation (every 60s)');

      // Run immediately on startup
      this.checkScheduledPosts().catch(err =>
        this.logger.error('Initial scheduler check failed', err)
      );

      // Then run every minute
      setInterval(() => {
        this.checkScheduledPosts().catch(err =>
          this.logger.error('Local scheduler interval failed', err)
        );
      }, 60000);
    }
  }

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
      this.runCount++;
      this.lastRun = now;

      this.logger.log(`⏰ Scheduler triggered at: ${now.toISOString()} (Run #${this.runCount})`);

      const result = await this.calendarService.checkScheduledPosts();

      this.logger.log(
        `📊 Scheduler result: ${result.postsPublished} published, ${result.postsFailed} failed out of ${result.postsChecked} checked`,
      );

      return {
        success: true,
        message: 'Scheduled posts checked successfully',
        data: result,
        timestamp: now.toISOString(),
        runCount: this.runCount,
      };
    } catch (error) {
      this.logger.error(`❌ Scheduler error: ${error.message}`, error);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Debug endpoint to check scheduler status
   */
  @Get('status')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get scheduler status and recent activity' })
  async getStatus() {
    return {
      status: 'running',
      lastRun: this.lastRun,
      runCount: this.runCount,
      currentTime: new Date().toISOString(),
      message: this.lastRun
        ? `Last run was ${Math.round((Date.now() - this.lastRun.getTime()) / 1000)} seconds ago`
        : 'Scheduler has not run yet since server start',
    };
  }

  /**
   * Publish a specific post - called by Google Cloud Tasks
   * Each scheduled post has its own Cloud Task that triggers this endpoint
   * at the exact scheduled time
   */
  @Post('publish-post/:postId')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Publish a specific scheduled post',
    description:
      'This endpoint is triggered by Google Cloud Tasks at the exact scheduled time. ' +
      'Each post gets its own task scheduled for its publication time.',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully published the post',
    schema: {
      example: {
        success: true,
        postId: 'uuid',
        message: 'Post published successfully',
        timestamp: '2025-01-19T19:00:00.000Z',
      },
    },
  })
  async publishScheduledPost(@Param('postId') postId: string) {
    const now = new Date();
    this.logger.log(`📤 Cloud Task triggered: Publishing post ${postId} at ${now.toISOString()}`);

    try {
      const result = await this.calendarService.publish(postId);

      this.logger.log(`✅ Post ${postId} published successfully via Cloud Tasks`);

      return {
        success: true,
        postId,
        message: 'Post published successfully',
        instagramPostId: result.instagramPostId,
        timestamp: now.toISOString(),
      };
    } catch (error) {
      this.logger.error(`❌ Failed to publish post ${postId}: ${error.message}`, error);

      // Return 200 to prevent Cloud Tasks from retrying
      // The post status is already marked as FAILED in the database
      return {
        success: false,
        postId,
        message: `Failed to publish: ${error.message}`,
        timestamp: now.toISOString(),
      };
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
