import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Post, PostStatus } from './entities/post.entity';
import { CreatePostDto, UpdatePostDto } from './dto/post.dto';
import { InstagramService } from '../instagram/instagram.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class CalendarService {
  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    private readonly instagramService: InstagramService,
  ) { }

  @Cron(CronExpression.EVERY_MINUTE)
  async checkScheduledPosts() {
    const now = new Date();
    console.log('Checking for scheduled posts at:', now.toISOString());

    const scheduledPosts = await this.postRepository.find({
      where: {
        status: PostStatus.SCHEDULED,
        scheduledAt: Between(new Date(0), now), // Find posts scheduled in the past that are still 'scheduled'
      },
      relations: ['instagramAccount'],
    });

    console.log(`Found ${scheduledPosts.length} posts to publish`);

    for (const post of scheduledPosts) {
      try {
        console.log(`Publishing post ${post.id}...`);
        await this.publish(post.id);
        console.log(`Post ${post.id} published successfully`);
      } catch (error) {
        console.error(`Failed to publish post ${post.id}:`, error);
        // Optionally update status to FAILED
        post.status = PostStatus.FAILED;
        await this.postRepository.save(post);
      }
    }
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
