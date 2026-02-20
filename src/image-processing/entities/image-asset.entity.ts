import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { BusinessProfile } from '../../business-profile/entities/business-profile.entity';

export enum ImageAssetType {
    TEMPLATE = 'TEMPLATE',
    CONTENT = 'CONTENT',
    OUTPUT = 'OUTPUT',
    LOGO = 'LOGO'
}

@Entity('image_assets')
export class ImageAsset {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    userId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column({ nullable: true })
    businessProfileId: string;

    @ManyToOne(() => BusinessProfile, { nullable: true, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'businessProfileId' })
    businessProfile: BusinessProfile;

    @Column({
        type: 'enum',
        enum: ImageAssetType,
    })
    type: ImageAssetType;

    @Column()
    originalName: string;

    @Column()
    gcsPath: string; // The path within the bucket

    @Column()
    publicUrl: string; // The accessible URL

    @CreateDateColumn()
    createdAt: Date;
}
