import { IsString, IsOptional } from 'class-validator';

export class GenerateAITemplatesDto {
    @IsString()
    instagramAccountId: string;

    @IsOptional()
    @IsString()
    businessProfileId?: string;
}
