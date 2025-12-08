import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Post, PostStatus } from './entities/post.entity';
import { CreatePostDto, UpdatePostDto } from './dto/post.dto';
import { InstagramService } from '../instagram/instagram.service';

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    private readonly instagramService: InstagramService,
  ) {}

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
    return this.postRepository.save(post);
  }

  async findAll(userId: string): Promise<Post[]> {
    const accounts = await this.instagramService.findAllByUser(userId);
    const accountIds = accounts.map(acc => acc.id);

    return this.postRepository.find({
      where: accountIds.map(id => ({ instagramAccountId: id })),
      relations: ['instagramAccount'],
      order: { scheduledAt: 'ASC' },
    });
  }

  async findByAccount(accountId: string): Promise<Post[]> {
    return this.postRepository.find({
      where: { instagramAccountId: accountId },
      relations: ['instagramAccount'],
      order: { scheduledAt: 'ASC' },
    });
  }

  async findByDateRange(
    accountId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Post[]> {
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

    // Verify user owns this Instagram account
    const account = await this.instagramService.findOne(post.instagramAccountId);
    if (account.userId !== userId) {
      throw new ForbiddenException('You do not have permission to update this post');
    }

    Object.assign(post, updatePostDto);
    return this.postRepository.save(post);
  }

  async remove(id: string, userId: string): Promise<void> {
    const post = await this.findOne(id);

    // Verify user owns this Instagram account
    const account = await this.instagramService.findOne(post.instagramAccountId);
    if (account.userId !== userId) {
      throw new ForbiddenException('You do not have permission to delete this post');
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

      // Get the first media URL (Instagram single post requirement)
      const imageUrl = post.mediaUrls[0];

      // Prepare caption with content and hashtags
      const caption = `${post.content}\n\n${post.hashtags || ''}`.trim();

      console.log('📸 Publishing to Instagram...');
      console.log('Account:', post.instagramAccount.username);
      console.log('Image URL:', imageUrl);

      // Step 1: Create media container
      const containerId = await this.instagramService.createMediaContainer(
        post.instagramAccount.accessToken,
        post.instagramAccount.instagramUserId,
        imageUrl,
        caption,
      );

      // Step 2: Wait for Instagram to process the media (required by Instagram API)
      console.log('⏳ Waiting 5 seconds for Instagram to process the media...');
      await new Promise(resolve => setTimeout(resolve, 5000));

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
    const post = await this.findOne(id);

    // Set the scheduled time to now
    post.scheduledAt = new Date();
    await this.postRepository.save(post);

    // Use the publish method which now has real Instagram integration
    return this.publish(id);
  }

  async getUpcoming(accountId: string, limit: number = 10): Promise<Post[]> {
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
