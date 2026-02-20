import { IsString, IsOptional } from 'class-validator';

export class GenerateImageDto {
    @IsString()
    templatePath: string;

    @IsString()
    contentPath: string;

    @IsOptional()
    @IsString()
    businessProfileId?: string;
}
