import { IsString, IsNumber, IsEnum, IsOptional } from 'class-validator';

export class GenerateWithFormatDto {
    @IsString()
    templatePath: string;

    @IsString()
    contentPath: string;

    @IsEnum(['story', 'reel', 'post', 'carousel'])
    format: 'story' | 'reel' | 'post' | 'carousel';

    @IsNumber()
    width: number;

    @IsNumber()
    height: number;

    @IsNumber()
    cropX: number;

    @IsNumber()
    cropY: number;

    @IsNumber()
    scale: number;

    @IsOptional()
    @IsString()
    businessProfileId?: string;
}
