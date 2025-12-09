import { IsString, IsEnum, IsOptional, IsArray, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PostType, PostStatus } from '../entities/post.entity';

export class CreatePostDto {
  @ApiProperty({ example: 'New product launch!' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Check out our amazing new product...' })
  @IsString()
  content: string;

  @ApiProperty({ example: '#marketing #business #newproduct', required: false })
  @IsOptional()
  @IsString()
  hashtags?: string;

  @ApiProperty({ enum: PostType, example: PostType.IMAGE })
  @IsEnum(PostType)
  type: PostType;

  @ApiProperty({ enum: PostStatus, example: PostStatus.DRAFT, required: false })
  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;

  @ApiProperty({ example: ['https://example.com/image.jpg'], required: false })
  @IsOptional()
  @IsArray()
  mediaUrls?: string[];

  @ApiProperty({ example: '2024-12-25T10:00:00Z' })
  @IsDateString()
  scheduledAt: Date;

  @ApiProperty({ example: 'uuid-of-instagram-account' })
  @IsString()
  instagramAccountId: string;
}

export class UpdatePostDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  hashtags?: string;

  @ApiProperty({ enum: PostType, required: false })
  @IsOptional()
  @IsEnum(PostType)
  type?: PostType;

  @ApiProperty({ enum: PostStatus, required: false })
  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  mediaUrls?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  scheduledAt?: Date;
}
