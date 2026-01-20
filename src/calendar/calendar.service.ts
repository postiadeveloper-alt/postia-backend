import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Post, PostStatus, PostType } from './entities/post.entity';
import { CreatePostDto, UpdatePostDto } from './dto/post.dto';
import { InstagramService } from '../instagram/instagram.service';
import { CloudTasksService } from '../cloud-tasks/cloud-tasks.service';

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    private readonly instagramService: InstagramService,
    private readonly cloudTasksService: CloudTasksService,
  ) { }

  /**
   * Check for scheduled posts and publish them if their scheduled time has passed
   * This method is designed to be called by Cloud Scheduler via HTTP endpoint
   * REMOVED: @Cron decorator - now triggered externally via Cloud Scheduler
   */
  async checkScheduledPosts(): Promise<{
    success: boolean;
    postsChecked: number;
    postsPublished: number;
    postsFailed: number;
    details?: any[];
  }> {
    const now = new Date();
    this.logger.log(`🔍 Checking for scheduled posts at: ${now.toISOString()}`);

    let postsPublished = 0;
    let postsFailed = 0;
    const details = [];

    // First, log all scheduled posts for debugging
    const allScheduledPosts = await this.postRepository.find({
      where: { status: PostStatus.SCHEDULED },
      relations: ['instagramAccount'],
      order: { scheduledAt: 'ASC' },
    });

    this.logger.log(`📋 Total scheduled posts in DB: ${allScheduledPosts.length}`);
    allScheduledPosts.forEach(post => {
      const isPast = new Date(post.scheduledAt) <= now;
      this.logger.log(`  - Post ${post.id}: scheduled for ${post.scheduledAt} (${isPast ? 'READY' : 'FUTURE'})`);
    });

    const scheduledPosts = await this.postRepository.find({
      where: {
        status: PostStatus.SCHEDULED,
        scheduledAt: Between(new Date(0), now),
      },
      relations: ['instagramAccount'],
    });

    this.logger.log(`📊 Found ${scheduledPosts.length} posts ready to publish`);

    for (const post of scheduledPosts) {
      try {
        this.logger.log(`📤 Publishing post ${post.id}...`);
        this.logger.log(`   Title: ${post.title}`);
        this.logger.log(`   Media URLs: ${post.mediaUrls?.length || 0}`);
        this.logger.log(`   Account: @${post.instagramAccount?.username || 'UNKNOWN'}`);

        await this.publish(post.id);
        this.logger.log(`✅ Post ${post.id} published successfully`);
        postsPublished++;
        details.push({
          id: post.id,
          title: post.title,
          status: 'published',
        });
      } catch (error) {
        this.logger.error(`❌ Failed to publish post ${post.id}: ${error.message}`);
        this.logger.error(error.stack);
        post.status = PostStatus.FAILED;
        await this.postRepository.save(post);
        postsFailed++;
        details.push({
          id: post.id,
          title: post.title,
          status: 'failed',
          error: error.message,
        });
      }
    }

    return {
      success: true,
      postsChecked: scheduledPosts.length,
      postsPublished,
      postsFailed,
      details,
    };
  }

  async create(createPostDto: CreatePostDto): Promise<Post> {
    // Verify Instagram account exists
    await this.instagramService.findOne(createPostDto.instagramAccountId);

    const post = this.postRepository.create(createPostDto);
    const savedPost = await this.postRepository.save(post);

    // If the post is scheduled, create a Cloud Task for it
    if (savedPost.status === PostStatus.SCHEDULED && savedPost.scheduledAt) {
      try {
        const taskId = await this.cloudTasksService.schedulePostPublication(
          savedPost.id,
          new Date(savedPost.scheduledAt),
        );
        if (taskId) {
          savedPost.cloudTaskId = taskId;
          await this.postRepository.save(savedPost);
          this.logger.log(`📅 Scheduled Cloud Task for post ${savedPost.id}`);
        }
      } catch (error) {
        this.logger.error(`Failed to schedule Cloud Task for post ${savedPost.id}: ${error.message}`);
        // Don't fail the post creation, just log the error
      }
    }

    return savedPost;
  }

  async findAll(userId: string): Promise<Post[]> {
    const accounts = await this.instagramService.findAllByUser(userId);

    if (!accounts || accounts.length === 0) {
      return [];
    }

    const accountIds = accounts.map(acc => acc.id);

    return this.postRepository.find({
      where: accountIds.map(id => ({ instagramAccountId: id })),
      relations: ['instagramAccount'],
      order: { scheduledAt: 'ASC' },
    });
  }

  async findByAccount(accountId: string, userId: string): Promise<Post[]> {
    // Verify account ownership
    const account = await this.instagramService.findOne(accountId);
    if (account.userId !== userId) {
      throw new ForbiddenException('Access to this account is denied');
    }

    return this.postRepository.find({
      where: { instagramAccountId: accountId },
      relations: ['instagramAccount'],
      order: { scheduledAt: 'ASC' },
    });
  }

  async findByDateRange(
    accountId: string,
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Post[]> {
    // Verify account ownership
    const account = await this.instagramService.findOne(accountId);
    if (account.userId !== userId) {
      throw new ForbiddenException('Access to this account is denied');
    }

    return this.postRepository.find({
      where: {
        instagramAccountId: accountId,
        scheduledAt: Between(startDate, endDate),
      },
      relations: ['instagramAccount'],
      order: { scheduledAt: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Post> {
    const post = await this.postRepository.findOne({
      where: { id },
      relations: ['instagramAccount'],
    });

    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    return post;
  }

  async update(id: string, userId: string, updatePostDto: UpdatePostDto): Promise<Post> {
    const post = await this.findOne(id);
    const oldScheduledAt = post.scheduledAt;
    const oldStatus = post.status;

    // Verify user owns this Instagram account
    const account = await this.instagramService.findOne(post.instagramAccountId);
    if (account.userId !== userId) {
      throw new ForbiddenException('You do not have permission to update this post');
    }

    Object.assign(post, updatePostDto);
    const savedPost = await this.postRepository.save(post);

    // Handle Cloud Task updates
    try {
      const newScheduledAt = savedPost.scheduledAt;
      const newStatus = savedPost.status;

      // If status changed from scheduled to something else, cancel the task
      if (oldStatus === PostStatus.SCHEDULED && newStatus !== PostStatus.SCHEDULED) {
        await this.cloudTasksService.cancelScheduledTask(id);
        savedPost.cloudTaskId = null;
        await this.postRepository.save(savedPost);
        this.logger.log(`🗑️ Cancelled Cloud Task for post ${id} (status changed)`);
      }
      // If status changed to scheduled, create a new task
      else if (oldStatus !== PostStatus.SCHEDULED && newStatus === PostStatus.SCHEDULED) {
        const taskId = await this.cloudTasksService.schedulePostPublication(id, new Date(newScheduledAt));
        if (taskId) {
          savedPost.cloudTaskId = taskId;
          await this.postRepository.save(savedPost);
          this.logger.log(`📅 Created Cloud Task for post ${id}`);
        }
      }
      // If scheduled time changed, reschedule the task
      else if (
        newStatus === PostStatus.SCHEDULED &&
        new Date(oldScheduledAt).getTime() !== new Date(newScheduledAt).getTime()
      ) {
        const taskId = await this.cloudTasksService.reschedulePostPublication(id, new Date(newScheduledAt));
        if (taskId) {
          savedPost.cloudTaskId = taskId;
          await this.postRepository.save(savedPost);
          this.logger.log(`🔄 Rescheduled Cloud Task for post ${id}`);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to update Cloud Task for post ${id}: ${error.message}`);
    }

    return savedPost;
  }

  async remove(id: string, userId: string): Promise<void> {
    const post = await this.findOne(id);

    // Verify user owns this Instagram account
    const account = await this.instagramService.findOne(post.instagramAccountId);
    if (account.userId !== userId) {
      throw new ForbiddenException('You do not have permission to delete this post');
    }

    // Cancel any scheduled Cloud Task for this post
    if (post.status === PostStatus.SCHEDULED) {
      try {
        await this.cloudTasksService.cancelScheduledTask(id);
        this.logger.log(`🗑️ Cancelled Cloud Task for deleted post ${id}`);
      } catch (error) {
        this.logger.error(`Failed to cancel Cloud Task for post ${id}: ${error.message}`);
      }
    }

    await this.postRepository.remove(post);
  }

  async publish(id: string): Promise<Post> {
    const post = await this.findOne(id);

    try {
      // Only publish if there are media URLs
      if (!post.mediaUrls || post.mediaUrls.length === 0) {
        throw new Error('Post has no media to publish');
      }

      const caption = `${post.content || ''}\n\n${post.hashtags || ''}`.trim();
      let containerId: string;

      console.log(`📸 Publishing ${post.type} to Instagram...`);
      console.log('Account:', post.instagramAccount.username);

      if (post.type === PostType.CAROUSEL) {
        const childrenIds: string[] = [];

        for (const url of post.mediaUrls) {
          const isVideo = url.toLowerCase().match(/\.(mp4|mov|avi|wmv)$/);

          const childId = await this.instagramService.createMediaContainer(
            post.instagramAccount.accessToken,
            post.instagramAccount.instagramUserId,
            {
              imageUrl: isVideo ? undefined : url,
              videoUrl: isVideo ? url : undefined,
              mediaType: isVideo ? 'VIDEO' : 'IMAGE',
              isCarouselItem: true,
            }
          );
          childrenIds.push(childId);
        }

        containerId = await this.instagramService.createCarouselContainer(
          post.instagramAccount.accessToken,
          post.instagramAccount.instagramUserId,
          childrenIds,
          caption
        );

      } else if (post.type === PostType.STORY) {
        const url = post.mediaUrls[0];
        const isVideo = url.toLowerCase().match(/\.(mp4|mov|avi|wmv)$/);

        containerId = await this.instagramService.createMediaContainer(
          post.instagramAccount.accessToken,
          post.instagramAccount.instagramUserId,
          {
            imageUrl: isVideo ? undefined : url,
            videoUrl: isVideo ? url : undefined,
            mediaType: 'STORIES'
          }
        );

      } else if (post.type === PostType.REEL || post.type === PostType.VIDEO) {
        const url = post.mediaUrls[0];
        containerId = await this.instagramService.createMediaContainer(
          post.instagramAccount.accessToken,
          post.instagramAccount.instagramUserId,
          {
            videoUrl: url,
            caption: caption,
            mediaType: 'REELS'
          }
        );

      } else {
        // IMAGE (Default)
        const url = post.mediaUrls[0];
        containerId = await this.instagramService.createMediaContainer(
          post.instagramAccount.accessToken,
          post.instagramAccount.instagramUserId,
          {
            imageUrl: url,
            caption: caption,
            mediaType: 'IMAGE'
          }
        );
      }

      // Step 2: Wait for Instagram to process the media
      console.log('⏳ Waiting 10 seconds for Instagram to process the media...');
      await new Promise(resolve => setTimeout(resolve, 10000)); // Increased wait time for videos/carousels

      // Step 3: Publish the container
      const instagramPostId = await this.instagramService.publishMediaContainer(
        post.instagramAccount.accessToken,
        post.instagramAccount.instagramUserId,
        containerId,
      );

      console.log('✅ Successfully published to Instagram!');

      // Update post status
      post.status = PostStatus.PUBLISHED;
      post.publishedAt = new Date();
      post.instagramPostId = instagramPostId;

      return this.postRepository.save(post);
    } catch (error) {
      console.error('❌ Failed to publish to Instagram:', error.message);

      // Mark as failed
      post.status = PostStatus.FAILED;
      await this.postRepository.save(post);

      throw error;
    }
  }

  async publishNow(id: string): Promise<Post> {
    this.logger.log(`🚀 Publish Now requested for post: ${id}`);
    const post = await this.findOne(id);

    this.logger.log(`📝 Post found: ${post.title}`);
    this.logger.log(`📷 Media URLs: ${JSON.stringify(post.mediaUrls)}`);
    this.logger.log(`👤 Instagram Account: @${post.instagramAccount?.username || 'UNKNOWN'}`);

    // Set the scheduled time to now
    post.scheduledAt = new Date();
    await this.postRepository.save(post);

    // Use the publish method which now has real Instagram integration
    return this.publish(id);
  }

  async getUpcoming(accountId: string, userId: string, limit: number = 10): Promise<Post[]> {
    // Verify account ownership
    const account = await this.instagramService.findOne(accountId);
    if (account.userId !== userId) {
      throw new ForbiddenException('Access to this account is denied');
    }

    return this.postRepository.find({
      where: {
        instagramAccountId: accountId,
        status: PostStatus.SCHEDULED,
      },
      order: { scheduledAt: 'ASC' },
      take: limit,
    });
  }
}
