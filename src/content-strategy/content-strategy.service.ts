import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ContentStrategy, ContentFormat, ContentStatus } from './entities/content-strategy.entity';
import { GenerateContentStrategyDto, UpdateContentStrategyDto, FormatDistributionDto } from './dto/content-strategy.dto';
import { BusinessProfileService } from '../business-profile/business-profile.service';
import { 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  getDay, 
  format, 
  addWeeks,
  startOfWeek,
  getWeek
} from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  PromptContext, 
  ContentFormatType,
  getSystemPromptByFormat,
  getUserPromptByFormat 
} from './prompts/content-prompts';

interface GeneratedContent {
  format: string;
  hook: string;
  mainContent: string;
  frontPageDescription: string;
  callToAction: string;
  hashtags: string[];
  objective: string;
  targetEmotion: string;
  visualNotes: string;
  contentPillar: string;
}

@Injectable()
export class ContentStrategyService {
  private readonly logger = new Logger(ContentStrategyService.name);
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor(
    @InjectRepository(ContentStrategy)
    private readonly contentStrategyRepository: Repository<ContentStrategy>,
    private readonly businessProfileService: BusinessProfileService,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('GOOGLE_API_KEY');
    this.modelName = this.configService.get<string>('GOOGLE_MODEL') || 'gemini-2.0-flash';
    
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.logger.log(`Initialized Google AI with model: ${this.modelName}`);
    } else {
      this.logger.warn('GOOGLE_API_KEY not set. AI content generation will not work.');
    }
  }

  async generateMonthlyStrategy(
    userId: string,
    dto: GenerateContentStrategyDto,
  ): Promise<ContentStrategy[]> {
    // Check if Google AI is configured
    if (!this.genAI) {
      throw new ForbiddenException('Google API key not configured. Please set GOOGLE_API_KEY environment variable.');
    }

    // Get business profile with all details
    const businessProfile = await this.businessProfileService.findOne(dto.businessProfileId);
    
    if (!businessProfile) {
      throw new NotFoundException('Business profile not found');
    }

    // Parse selected dates from strings to Date objects
    const targetDays = dto.selectedDates.map(dateStr => new Date(dateStr));

    // Build format queue based on distribution
    const formatQueue = this.buildFormatQueue(dto.formatDistribution);
    const totalFormats = formatQueue.length;

    this.logger.log(`Generating ${totalFormats} total content pieces distributed across ${targetDays.length} dates`);

    // Generate content by distributing formats across dates
    const generatedStrategies: ContentStrategy[] = [];

    for (let i = 0; i < formatQueue.length; i++) {
      const contentFormat = formatQueue[i];
      // Use modulo to cycle through dates if we have more formats than dates
      const day = targetDays[i % targetDays.length];
      
      try {
        const content = await this.generateContentForDayWithFormat(
          businessProfile, 
          day, 
          totalFormats,
          contentFormat
        );
          
          const strategy = this.contentStrategyRepository.create({
            scheduledDate: day,
            dayOfWeek: getDay(day),
            format: this.mapFormat(content.format),
            hook: content.hook,
            mainContent: content.mainContent,
            frontPageDescription: content.frontPageDescription,
            callToAction: content.callToAction,
            hashtags: content.hashtags,
            objective: content.objective,
            targetEmotion: content.targetEmotion,
            visualNotes: content.visualNotes,
            contentPillar: content.contentPillar,
            status: ContentStatus.DRAFT,
            businessProfileId: dto.businessProfileId,
            userId: userId,
            metadata: {
              generatedAt: new Date(),
              model: this.modelName,
              promptVersion: '2.0',
              monthYear: dto.monthYear,
              weekNumber: getWeek(day),
              formatRequested: contentFormat,
            },
          });

          const saved = await this.contentStrategyRepository.save(strategy);
          generatedStrategies.push(saved);
      } catch (error) {
        this.logger.error(`Failed to generate ${contentFormat} for ${format(day, 'yyyy-MM-dd')}: ${error.message}`);
      }
    }

    return generatedStrategies;
  }

  /**
   * Build an array of formats to generate based on the distribution.
   * E.g., { reels: 1, stories: 2, carousels: 1, staticPosts: 0 } => ['reel', 'story', 'story', 'carousel']
   */
  private buildFormatQueue(distribution?: FormatDistributionDto): ContentFormatType[] {
    if (!distribution) {
      // Default: 1 of each main type if no distribution provided
      return ['static_post'];
    }

    const queue: ContentFormatType[] = [];
    
    for (let i = 0; i < (distribution.reels || 0); i++) {
      queue.push('reel');
    }
    for (let i = 0; i < (distribution.stories || 0); i++) {
      queue.push('story');
    }
    for (let i = 0; i < (distribution.carousels || 0); i++) {
      queue.push('carousel');
    }
    for (let i = 0; i < (distribution.staticPosts || 0); i++) {
      queue.push('static_post');
    }

    // If nothing selected, default to one static post
    if (queue.length === 0) {
      queue.push('static_post');
    }

    return queue;
  }

  private async generateContentForDayWithFormat(
    businessProfile: any,
    day: Date,
    totalPostsInMonth: number,
    contentFormat: ContentFormatType,
  ): Promise<GeneratedContent> {
    const dayName = format(day, 'EEEE', { locale: es });
    const dateStr = format(day, "d 'de' MMMM, yyyy", { locale: es });

    // Build prompt context
    const ctx: PromptContext = {
      brandName: businessProfile.brandName,
      industry: businessProfile.industry || 'No especificado',
      brandDescription: businessProfile.brandDescription || 'No especificado',
      targetAudience: businessProfile.targetAudience || 'Audiencia general',
      brandValues: businessProfile.brandValues || 'No especificado',
      visualStyle: businessProfile.visualStyle || 'Moderno',
      communicationTone: businessProfile.communicationTone || 'Profesional',
      contentThemes: businessProfile.contentThemes?.join(', ') || 'Contenido general',
      productCategories: businessProfile.productCategories?.join(', ') || 'No especificado',
      contentGuidelines: businessProfile.contentGuidelines || 'Ninguna especificada',
      prohibitedTopics: businessProfile.prohibitedTopics?.join(', ') || 'Ninguno',
      brandColors: businessProfile.brandColors?.join(', ') || 'No especificado',
      dayName,
      dateStr,
      totalPostsInMonth,
    };

    // Get format-specific prompts
    const systemPrompt = getSystemPromptByFormat(contentFormat);
    const userPrompt = getUserPromptByFormat(contentFormat, ctx);

    try {
      const model = this.genAI.getGenerativeModel({ 
        model: this.modelName,
      });

      const generationConfig = {
        temperature: 0.8,
        maxOutputTokens: 2500,
      };

      const prompt = `${systemPrompt}\n\n${userPrompt}`;
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig,
      });
      
      const response = result.response;
      let text = response.text();
      
      // Clean up the response - remove markdown code blocks if present
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Parse the JSON response
      const content = JSON.parse(text);
      return content as GeneratedContent;
    } catch (error) {
      this.logger.error(`Google AI API error for ${contentFormat}: ${error.message}`);
      throw error;
    }
  }

  // Keep the old method for backwards compatibility
  private async generateContentForDay(
    businessProfile: any,
    day: Date,
    totalPostsInMonth: number,
  ): Promise<GeneratedContent> {
    return this.generateContentForDayWithFormat(businessProfile, day, totalPostsInMonth, 'static_post');
  }

  private mapFormat(format: string): ContentFormat {
    const formatMap: Record<string, ContentFormat> = {
      carousel: ContentFormat.CAROUSEL,
      reel: ContentFormat.REEL,
      static_post: ContentFormat.STATIC_POST,
      story: ContentFormat.STORY,
      live: ContentFormat.LIVE,
    };
    return formatMap[format.toLowerCase()] || ContentFormat.STATIC_POST;
  }

  async findByMonthAndProfile(
    userId: string,
    businessProfileId: string,
    monthYear: string,
  ): Promise<ContentStrategy[]> {
    const [year, month] = monthYear.split('-').map(Number);
    const monthStart = startOfMonth(new Date(year, month - 1));
    const monthEnd = endOfMonth(monthStart);

    return this.contentStrategyRepository.find({
      where: {
        userId,
        businessProfileId,
        scheduledDate: Between(monthStart, monthEnd),
      },
      order: { scheduledDate: 'ASC' },
    });
  }

  async findByDateRange(
    userId: string,
    businessProfileId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ContentStrategy[]> {
    return this.contentStrategyRepository.find({
      where: {
        userId,
        businessProfileId,
        scheduledDate: Between(startDate, endDate),
      },
      order: { scheduledDate: 'ASC' },
    });
  }

  async findAllByUser(userId: string): Promise<ContentStrategy[]> {
    return this.contentStrategyRepository.find({
      where: { userId },
      relations: ['businessProfile'],
      order: { scheduledDate: 'ASC' },
    });
  }

  async findOne(id: string): Promise<ContentStrategy> {
    const strategy = await this.contentStrategyRepository.findOne({
      where: { id },
      relations: ['businessProfile'],
    });

    if (!strategy) {
      throw new NotFoundException(`Content strategy with ID ${id} not found`);
    }

    return strategy;
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateContentStrategyDto,
  ): Promise<ContentStrategy> {
    const strategy = await this.findOne(id);
    
    if (strategy.userId !== userId) {
      throw new ForbiddenException('You do not have permission to update this content strategy');
    }

    Object.assign(strategy, dto);
    return this.contentStrategyRepository.save(strategy);
  }

  async remove(id: string, userId: string): Promise<void> {
    const strategy = await this.findOne(id);
    
    if (strategy.userId !== userId) {
      throw new ForbiddenException('You do not have permission to delete this content strategy');
    }

    await this.contentStrategyRepository.remove(strategy);
  }

  async removeByMonthAndProfile(
    userId: string,
    businessProfileId: string,
    monthYear: string,
  ): Promise<number> {
    const [year, month] = monthYear.split('-').map(Number);
    const monthStart = startOfMonth(new Date(year, month - 1));
    const monthEnd = endOfMonth(monthStart);

    const result = await this.contentStrategyRepository.delete({
      userId,
      businessProfileId,
      scheduledDate: Between(monthStart, monthEnd),
    });

    return result.affected || 0;
  }

  async convertToPost(id: string, userId: string): Promise<ContentStrategy> {
    const strategy = await this.findOne(id);
    
    if (strategy.userId !== userId) {
      throw new ForbiddenException('You do not have permission to convert this content strategy');
    }

    strategy.status = ContentStatus.APPROVED;
    return this.contentStrategyRepository.save(strategy);
  }
}
