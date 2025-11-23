import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Post, PostStatus } from './entities/post.entity';
import { CreatePostDto, UpdatePostDto } from './dto/post.dto';
import { InstagramService } from '../instagram/instagram.service';

@Injectable()
export class CalendarService {
  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    private readonly instagramService: InstagramService,
  ) {}

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
    
    // Here you would implement the actual Instagram API publishing logic
    // For now, we'll just update the status
    post.status = PostStatus.PUBLISHED;
    post.publishedAt = new Date();
    
    return this.postRepository.save(post);
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
