import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImageProcessingController } from './image-processing.controller';
import { ImageProcessingService } from './image-processing.service';
import { StorageModule } from '../storage/storage.module';
import { ImageAsset } from './entities/image-asset.entity';
import { BusinessProfileModule } from '../business-profile/business-profile.module';

@Module({
    imports: [
        StorageModule,
        TypeOrmModule.forFeature([ImageAsset]),
        BusinessProfileModule,
    ],
    controllers: [ImageProcessingController],
    providers: [ImageProcessingService],
    exports: [ImageProcessingService],
})
export class ImageProcessingModule { }

