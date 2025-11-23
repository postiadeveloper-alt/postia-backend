import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessProfile } from './entities/business-profile.entity';
import { CreateBusinessProfileDto, UpdateBusinessProfileDto } from './dto/business-profile.dto';
import { InstagramService } from '../instagram/instagram.service';

@Injectable()
export class BusinessProfileService {
  constructor(
    @InjectRepository(BusinessProfile)
    private readonly businessProfileRepository: Repository<BusinessProfile>,
    private readonly instagramService: InstagramService,
  ) {}

  async create(createBusinessProfileDto: CreateBusinessProfileDto): Promise<BusinessProfile> {
    // Verify Instagram account exists
    await this.instagramService.findOne(createBusinessProfileDto.instagramAccountId);

    // Check if profile already exists for this account
    const existing = await this.businessProfileRepository.findOne({
      where: { instagramAccountId: createBusinessProfileDto.instagramAccountId },
    });

    if (existing) {
      throw new ConflictException('Business profile already exists for this Instagram account');
    }

    const profile = this.businessProfileRepository.create(createBusinessProfileDto);
    return this.businessProfileRepository.save(profile);
  }

  async findByAccount(accountId: string): Promise<BusinessProfile | null> {
    return this.businessProfileRepository.findOne({
      where: { instagramAccountId: accountId },
      relations: ['instagramAccount'],
    });
  }

  async findOne(id: string): Promise<BusinessProfile> {
    const profile = await this.businessProfileRepository.findOne({
      where: { id },
      relations: ['instagramAccount'],
    });

    if (!profile) {
      throw new NotFoundException(`Business profile with ID ${id} not found`);
    }

    return profile;
  }

  async update(
    id: string,
    userId: string,
    updateBusinessProfileDto: UpdateBusinessProfileDto,
  ): Promise<BusinessProfile> {
    const profile = await this.findOne(id);
    
    // Verify user owns this Instagram account
    const account = await this.instagramService.findOne(profile.instagramAccountId);
    if (account.userId !== userId) {
      throw new ForbiddenException('You do not have permission to update this profile');
    }

    Object.assign(profile, updateBusinessProfileDto);
    return this.businessProfileRepository.save(profile);
  }

  async remove(id: string, userId: string): Promise<void> {
    const profile = await this.findOne(id);
    
    // Verify user owns this Instagram account
    const account = await this.instagramService.findOne(profile.instagramAccountId);
    if (account.userId !== userId) {
      throw new ForbiddenException('You do not have permission to delete this profile');
    }

    await this.businessProfileRepository.remove(profile);
  }
}
