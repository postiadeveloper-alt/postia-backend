import { IsString, IsNumber, IsEnum, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class GenerateWithFormatDto {
    @IsString()
    templatePath: string;

    @IsString()
    contentPath: string;

    @IsEnum(['story', 'reel', 'post', 'carousel'])
    format: 'story' | 'reel' | 'post' | 'carousel';

    @Type(() => Number)
    @IsNumber()
    width: number;

    @Type(() => Number)
    @IsNumber()
    height: number;

    @Type(() => Number)
    @IsNumber()
    cropX: number;

    @Type(() => Number)
    @IsNumber()
    cropY: number;

    @Type(() => Number)
    @IsNumber()
    scale: number;

    @IsOptional()
    @IsString()
    businessProfileId?: string;

    // Text overlay fields
    @IsOptional()
    @IsString()
    overlayText?: string;

    @IsOptional()
    @IsString()
    overlayFont?: string;

    @IsOptional()
    @IsString()
    overlayColor?: string;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    overlaySize?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    overlayX?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    overlayY?: number;

    @IsOptional()
    @IsString()
    targetEmotion?: string;
}
