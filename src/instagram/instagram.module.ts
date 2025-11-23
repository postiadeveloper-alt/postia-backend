import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { InstagramService } from './instagram.service';
import { InstagramController } from './instagram.controller';
import { InstagramAccount } from './entities/instagram-account.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([InstagramAccount]),
    HttpModule,
  ],
  controllers: [InstagramController],
  providers: [InstagramService],
  exports: [InstagramService],
})
export class InstagramModule {}
