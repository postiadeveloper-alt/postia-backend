import { IsString, IsArray, IsOptional, IsEnum, IsDateString, IsNumber, ValidateNested, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ContentFormat, ContentStatus } from '../entities/content-strategy.entity';

/**
 * Distribution of content formats per day of week.
 * User specifies how many of each format they want for each selected day.
 */
export class FormatDistributionDto {
  @ApiProperty({ example: 1, description: 'Number of Reels to generate per occurrence of this day' })
  @IsNumber()
  @Min(0)
  reels: number;

  @ApiProperty({ example: 2, description: 'Number of Stories to generate per occurrence of this day' })
  @IsNumber()
  @Min(0)
  stories: number;

  @ApiProperty({ example: 1, description: 'Number of Carousels to generate per occurrence of this day' })
  @IsNumber()
  @Min(0)
  carousels: number;

  @ApiProperty({ example: 0, description: 'Number of Static Posts to generate per occurrence of this day' })
  @IsNumber()
  @Min(0)
  staticPosts: number;
}

export class GenerateContentStrategyDto {
  @ApiProperty({ example: 'uuid-of-business-profile' })
  @IsString()
  businessProfileId: string;

  @ApiProperty({ 
    example: ['2026-01-05', '2026-01-12', '2026-01-19'], 
    description: 'Specific dates to generate content for (YYYY-MM-DD format)' 
  })
  @IsArray()
  @IsString({ each: true })
  selectedDates: string[];

  @ApiProperty({ example: '2026-01' })
  @IsString()
  monthYear: string; // Format: YYYY-MM

  @ApiProperty({ 
    description: 'Distribution of content formats. Specifies how many of each format to generate per selected date.',
    example: { reels: 1, stories: 2, carousels: 1, staticPosts: 0 },
    required: false 
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => FormatDistributionDto)
  formatDistribution?: FormatDistributionDto;
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
