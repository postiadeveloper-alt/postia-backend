import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { InstagramAccount } from '../../instagram/entities/instagram-account.entity';

@Entity('business_profiles')
export class BusinessProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  brandName: string;

  @Column({ type: 'text', nullable: true })
  brandDescription: string;

  @Column({ nullable: true })
  industry: string;

  @Column({ type: 'text', nullable: true })
  targetAudience: string;

  @Column({ type: 'text', nullable: true })
  brandValues: string;

  @Column({ type: 'jsonb', nullable: true })
  brandColors: string[];

  @Column({ nullable: true })
  logoUrl: string;

  @Column({ nullable: true })
  visualStyle: string; // modern, minimalist, bold, elegant, etc.

  @Column({ nullable: true })
  communicationTone: string; // professional, casual, friendly, formal, etc.

  @Column({ type: 'simple-array', nullable: true })
  contentThemes: string[]; // Array of preferred content themes

  @Column({ type: 'simple-array', nullable: true })
  productCategories: string[];

  @Column({ type: 'jsonb', nullable: true })
  postingSchedule: any; // Preferred posting times and frequency

  @Column({ type: 'text', nullable: true })
  contentGuidelines: string;

  @Column({ type: 'simple-array', nullable: true })
  prohibitedTopics: string[];

  @OneToOne(() => InstagramAccount, (account) => account.businessProfile, { onDelete: 'CASCADE' })
  @JoinColumn()
  instagramAccount: InstagramAccount;

  @Column()
  instagramAccountId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
