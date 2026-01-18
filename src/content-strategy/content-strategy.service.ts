import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ContentStrategy, ContentFormat, ContentStatus } from './entities/content-strategy.entity';
import { GenerateContentStrategyDto, UpdateContentStrategyDto } from './dto/content-strategy.dto';
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

    // Parse month/year
    const [year, month] = dto.monthYear.split('-').map(Number);
    const monthStart = startOfMonth(new Date(year, month - 1));
    const monthEnd = endOfMonth(monthStart);
    
    // Get all days in the month that match selected days of week
    const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const targetDays = allDays.filter(day => dto.selectedDays.includes(getDay(day)));

    this.logger.log(`Generating content for ${targetDays.length} days in ${dto.monthYear}`);

    // Generate content for each day
    const generatedStrategies: ContentStrategy[] = [];

    for (const day of targetDays) {
      try {
        const content = await this.generateContentForDay(businessProfile, day, targetDays.length);
        
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
            promptVersion: '1.0',
            monthYear: dto.monthYear,
            weekNumber: getWeek(day),
          },
        });

        const saved = await this.contentStrategyRepository.save(strategy);
        generatedStrategies.push(saved);
      } catch (error) {
        this.logger.error(`Failed to generate content for ${format(day, 'yyyy-MM-dd')}: ${error.message}`);
      }
    }

    return generatedStrategies;
  }

  private async generateContentForDay(
    businessProfile: any,
    day: Date,
    totalPostsInMonth: number,
  ): Promise<GeneratedContent> {
    const dayName = format(day, 'EEEE', { locale: es });
    const dateStr = format(day, "d 'de' MMMM, yyyy", { locale: es });

    const systemPrompt = `Eres un community manager experto y estratega de redes sociales con más de 10 años de experiencia creando contenido viral y atractivo para marcas. Entiendes la psicología, el storytelling y lo que hace que el contenido resuene con las audiencias hispanohablantes.

Tu tarea es crear una estrategia de contenido detallada para una publicación de Instagram. Piensa estratégicamente sobre:
- Variedad de contenido a lo largo del mes
- Conexión emocional con la audiencia objetivo
- Consistencia de marca mientras se mantiene fresco y atractivo
- Mejores prácticas específicas de Instagram
- La mezcla correcta de contenido educativo, entretenido, inspirador y promocional

IMPORTANTE: 
- TODO EL CONTENIDO DEBE ESTAR EN ESPAÑOL
- Devuelve tu respuesta como un objeto JSON válido con la estructura exacta especificada.`;

    const userPrompt = `Crea una estrategia de contenido detallada para Instagram para la siguiente marca:

## INFORMACIÓN DE LA MARCA
- **Nombre de Marca:** ${businessProfile.brandName}
- **Industria:** ${businessProfile.industry || 'No especificado'}
- **Descripción de Marca:** ${businessProfile.brandDescription || 'No especificado'}
- **Audiencia Objetivo:** ${businessProfile.targetAudience || 'Audiencia general'}
- **Valores de Marca:** ${businessProfile.brandValues || 'No especificado'}
- **Estilo Visual:** ${businessProfile.visualStyle || 'Moderno'}
- **Tono de Comunicación:** ${businessProfile.communicationTone || 'Profesional'}
- **Temas de Contenido:** ${businessProfile.contentThemes?.join(', ') || 'Contenido general'}
- **Categorías de Producto/Servicio:** ${businessProfile.productCategories?.join(', ') || 'No especificado'}
- **Guías de Contenido:** ${businessProfile.contentGuidelines || 'Ninguna especificada'}
- **Temas Prohibidos:** ${businessProfile.prohibitedTopics?.join(', ') || 'Ninguno'}
- **Colores de Marca:** ${businessProfile.brandColors?.join(', ') || 'No especificado'}

## DETALLES DE LA PUBLICACIÓN
- **Día:** ${dayName}
- **Fecha:** ${dateStr}
- **Total de publicaciones planificadas este mes:** ${totalPostsInMonth}

## REQUISITOS
Crea contenido atractivo que:
1. Se alinee perfectamente con la voz y valores de la marca
2. Hable directamente a la audiencia objetivo
3. Use tácticas de engagement probadas (hooks, storytelling, CTAs)
4. Sea apropiado para el día de la semana
5. Contribuya a una mezcla variada de contenido a lo largo del mes

Devuelve un objeto JSON con esta estructura exacta:
{
  "format": "carousel" | "reel" | "static_post" | "story",
  "hook": "Una línea de apertura poderosa (máx 150 caracteres) que detenga el scroll y capture la atención inmediata",
  "mainContent": "El caption/script completo para la publicación (300-500 palabras). Incluir saltos de línea para legibilidad.",
  "frontPageDescription": "Descripción visual para la imagen de portada/primera slide (qué debe mostrarse)",
  "callToAction": "CTA claro diciéndole a la audiencia exactamente qué hacer a continuación",
  "hashtags": ["array", "de", "hashtags", "relevantes", "máximo", "15"],
  "objective": "Qué busca lograr esta publicación (awareness, engagement, conversión, etc.)",
  "targetEmotion": "Emoción principal a evocar (inspiración, curiosidad, FOMO, confianza, etc.)",
  "visualNotes": "Notas detalladas para crear el contenido visual (colores, estilo, elementos a incluir)",
  "contentPillar": "educational" | "entertaining" | "inspiring" | "promotional"
}

IMPORTANTE: Devuelve SOLO el objeto JSON, sin bloques de código markdown ni texto adicional. TODO EN ESPAÑOL.`;

    try {
      const model = this.genAI.getGenerativeModel({ 
        model: this.modelName,
      });

      const generationConfig = {
        temperature: 0.8,
        maxOutputTokens: 2000,
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
      this.logger.error(`Google AI API error: ${error.message}`);
      throw error;
    }
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
