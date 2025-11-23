import { IsString, IsOptional, IsArray, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBusinessProfileDto {
  @ApiProperty({ example: 'My Amazing Brand', required: false })
  @IsOptional()
  @IsString()
  brandName?: string;

  @ApiProperty({ example: 'We create innovative solutions...', required: false })
  @IsOptional()
  @IsString()
  brandDescription?: string;

  @ApiProperty({ example: 'Marketing & Advertising', required: false })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiProperty({ example: 'Small business owners aged 25-45', required: false })
  @IsOptional()
  @IsString()
  targetAudience?: string;

  @ApiProperty({ example: 'Innovation, Quality, Trust', required: false })
  @IsOptional()
  @IsString()
  brandValues?: string;

  @ApiProperty({ example: ['#3B82F6', '#1E40AF', '#FFFFFF'], required: false })
  @IsOptional()
  @IsArray()
  brandColors?: string[];

  @ApiProperty({ example: 'https://example.com/logo.png', required: false })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiProperty({ example: 'modern', required: false })
  @IsOptional()
  @IsString()
  visualStyle?: string;

  @ApiProperty({ example: 'professional', required: false })
  @IsOptional()
  @IsString()
  communicationTone?: string;

  @ApiProperty({ example: ['marketing tips', 'industry news'], required: false })
  @IsOptional()
  @IsArray()
  contentThemes?: string[];

  @ApiProperty({ example: ['software', 'consulting'], required: false })
  @IsOptional()
  @IsArray()
  productCategories?: string[];

  @ApiProperty({ example: { monday: ['09:00', '18:00'], tuesday: ['09:00', '18:00'] }, required: false })
  @IsOptional()
  @IsObject()
  postingSchedule?: any;

  @ApiProperty({ example: 'Always use our brand colors...', required: false })
  @IsOptional()
  @IsString()
  contentGuidelines?: string;

  @ApiProperty({ example: ['politics', 'religion'], required: false })
  @IsOptional()
  @IsArray()
  prohibitedTopics?: string[];

  @ApiProperty({ example: 'uuid-of-instagram-account' })
  @IsString()
  instagramAccountId: string;
}

export class UpdateBusinessProfileDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  brandName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  brandDescription?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  targetAudience?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  brandValues?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  brandColors?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  visualStyle?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  communicationTone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  contentThemes?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  productCategories?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  postingSchedule?: any;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  contentGuidelines?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  prohibitedTopics?: string[];
}
