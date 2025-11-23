import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { InstagramAccount } from '../../instagram/entities/instagram-account.entity';

export enum PostStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  PUBLISHED = 'published',
  FAILED = 'failed',
}

export enum PostType {
  IMAGE = 'image',
  VIDEO = 'video',
  CAROUSEL = 'carousel',
  REEL = 'reel',
  STORY = 'story',
}

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'text', nullable: true })
  hashtags: string;

  @Column({
    type: 'enum',
    enum: PostType,
    default: PostType.IMAGE,
  })
  type: PostType;

  @Column({
    type: 'enum',
    enum: PostStatus,
    default: PostStatus.DRAFT,
  })
  status: PostStatus;

  @Column({ type: 'jsonb', nullable: true })
  mediaUrls: string[];

  @Column({ type: 'timestamp' })
  scheduledAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt: Date;

  @Column({ nullable: true })
  instagramPostId: string;

  @Column({ type: 'jsonb', nullable: true })
  insights: any;

  @ManyToOne(() => InstagramAccount, (account) => account.posts, { onDelete: 'CASCADE' })
  instagramAccount: InstagramAccount;

  @Column()
  instagramAccountId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
