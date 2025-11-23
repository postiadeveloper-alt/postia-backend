import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { InstagramAccount } from '../../instagram/entities/instagram-account.entity';

export enum UserRole {
  AGENCY_ADMIN = 'agency_admin',
  TEAM_MEMBER = 'team_member',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude()
  password: string;

  @Column()
  fullName: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.AGENCY_ADMIN,
  })
  role: UserRole;

  @Column({ nullable: true })
  agencyName: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => InstagramAccount, (account) => account.user)
  instagramAccounts: InstagramAccount[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
