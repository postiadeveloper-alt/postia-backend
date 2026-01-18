import { IsString, IsArray, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ContentFormat, ContentStatus } from '../entities/content-strategy.entity';

export class GenerateContentStrategyDto {
  @ApiProperty({ example: 'uuid-of-business-profile' })
  @IsString()
  businessProfileId: string;

  @ApiProperty({ 
    example: [1, 3, 5], 
    description: 'Days of week to generate content for (0=Sunday, 1=Monday, etc.)' 
  })
  @IsArray()
  selectedDays: number[];

  @ApiProperty({ example: '2026-01' })
  @IsString()
  monthYear: string; // Format: YYYY-MM

  @ApiProperty({ example: 4, required: false })
  @IsOptional()
  weeksToGenerate?: number; // Default to 4 weeks
}

export class UpdateContentStrategyDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsEnum(ContentFormat)
  format?: ContentFormat;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  hook?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  mainContent?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  frontPageDescription?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  callToAction?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  hashtags?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  objective?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  targetEmotion?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  visualNotes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  contentPillar?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;
}

export class ContentStrategyResponseDto {
  id: string;
  scheduledDate: Date;
  dayOfWeek: number;
  format: ContentFormat;
  hook: string;
  mainContent: string;
  frontPageDescription: string;
  callToAction: string;
  hashtags: string[];
  objective: string;
  targetEmotion: string;
  visualNotes: string;
  contentPillar: string;
  status: ContentStatus;
  businessProfileId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}
