import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Post } from '../../calendar/entities/post.entity';
import { BusinessProfile } from '../../business-profile/entities/business-profile.entity';

@Entity('instagram_accounts')
export class InstagramAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  instagramUserId: string;

  @Column()
  username: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  profilePictureUrl: string;

  @Column({ nullable: true })
  biography: string;

  @Column({ type: 'int', default: 0 })
  followersCount: number;

  @Column({ type: 'int', default: 0 })
  followsCount: number;

  @Column({ type: 'int', default: 0 })
  mediaCount: number;

  @Column()
  accessToken: string;

  @Column({ type: 'timestamp', nullable: true })
  tokenExpiresAt: Date;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ManyToOne(() => User, (user) => user.instagramAccounts, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: string;

  @OneToMany(() => Post, (post) => post.instagramAccount)
  posts: Post[];

  @OneToOne(() => BusinessProfile, (profile) => profile.instagramAccount)
  businessProfile: BusinessProfile;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
