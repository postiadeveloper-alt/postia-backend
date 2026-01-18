import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BusinessProfile } from '../../business-profile/entities/business-profile.entity';
import { User } from '../../users/entities/user.entity';

export enum ContentFormat {
  CAROUSEL = 'carousel',
  REEL = 'reel',
  STATIC_POST = 'static_post',
  STORY = 'story',
  LIVE = 'live',
}

export enum ContentStatus {
  DRAFT = 'draft',
  APPROVED = 'approved',
  SCHEDULED = 'scheduled',
  PUBLISHED = 'published',
}

@Entity('content_strategies')
export class ContentStrategy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date' })
  scheduledDate: Date;

  @Column({ type: 'int' })
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.

  @Column({
    type: 'enum',
    enum: ContentFormat,
    default: ContentFormat.STATIC_POST,
  })
  format: ContentFormat;

  @Column({ type: 'text' })
  hook: string; // Opening hook to capture attention

  @Column({ type: 'text' })
  mainContent: string; // Main content/script

  @Column({ type: 'text', nullable: true })
  frontPageDescription: string; // Visual description for front page

  @Column({ type: 'text', nullable: true })
  callToAction: string;

  @Column({ type: 'simple-array', nullable: true })
  hashtags: string[];

  @Column({ type: 'text', nullable: true })
  objective: string; // What this post aims to achieve

  @Column({ type: 'text', nullable: true })
  targetEmotion: string; // Emotion to evoke in audience

  @Column({ type: 'text', nullable: true })
  visualNotes: string; // Notes for visual content creation

  @Column({ type: 'text', nullable: true })
  contentPillar: string; // Educational, Entertaining, Inspiring, Promotional

  @Column({
    type: 'enum',
    enum: ContentStatus,
    default: ContentStatus.DRAFT,
  })
  status: ContentStatus;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    generatedAt: Date;
    model: string;
    promptVersion: string;
    monthYear: string;
    weekNumber: number;
  };

  @ManyToOne(() => BusinessProfile, { onDelete: 'CASCADE' })
  @JoinColumn()
  businessProfile: BusinessProfile;

  @Column()
  businessProfileId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
