import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { InstagramService } from '../instagram/instagram.service';
import { BusinessProfileService } from '../business-profile/business-profile.service';
import { BusinessProfile } from '../business-profile/entities/business-profile.entity';

export interface TrendingTopic {
  topic: string;
  relevance: number;
  description: string;
  hashtags: string[];
}

export interface TrendingHashtag {
  hashtag: string;
  count: number;
  trend: 'rising' | 'stable' | 'falling';
}

export interface TrendingKeyword {
  keyword: string;
  searchVolume: number;
  growthRate: number; // percentage
  category: 'term' | 'technique' | 'technology';
  description: string;
}

export interface TrendingTechnique {
  name: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  engagementBoost: number; // percentage
  examples: string[];
  tips: string[];
}

export interface TrendingTechnology {
  name: string;
  category: string;
  description: string;
  useCase: string;
  popularity: number;
  isNew: boolean;
}

export interface InspiringPost {
  id: string;
  type: 'image' | 'video' | 'carousel' | 'reel';
  thumbnailUrl: string;
  caption: string;
  engagement: {
    likes: number;
    comments: number;
    shares: number;
  };
  author: {
    username: string;
    followers: number;
    verified: boolean;
  };
  tags: string[];
  whyItWorks: string;
  contentCategory: string;
}

@Injectable()
export class TrendingService {
  constructor(
    private readonly httpService: HttpService,
    private readonly instagramService: InstagramService,
    private readonly businessProfileService: BusinessProfileService,
  ) { }

  async getTrendingTopics(
    accountId: string,
    limit: number = 10,
  ): Promise<TrendingTopic[]> {
    const account = await this.instagramService.findOne(accountId);
    const profile = await this.businessProfileService.findByAccount(accountId).catch(() => null);

    // Base topics
    let topics: TrendingTopic[] = [
      {
        topic: 'Short-form Video Content',
        relevance: 90,
        description: 'Reels and TikTok are dominating social media engagement',
        hashtags: ['#Reels', '#ShortFormContent', '#VideoMarketing'],
      },
      {
        topic: 'Personal Branding',
        relevance: 85,
        description: 'Building a personal brand is more important than ever',
        hashtags: ['#PersonalBranding', '#ThoughtLeadership', '#PersonalDevelopment'],
      },
    ];

    if (profile) {
      if (profile.industry) {
        topics = [...this.getIndustryTopics(profile.industry), ...topics];
      }
      // Boost relevance if it matches content themes
      if (profile.contentThemes && profile.contentThemes.length > 0) {
        topics = topics.map(t => {
          const matches = profile.contentThemes.some(theme =>
            t.topic.toLowerCase().includes(theme.toLowerCase()) ||
            t.description.toLowerCase().includes(theme.toLowerCase())
          );
          return matches ? { ...t, relevance: Math.min(100, t.relevance + 10) } : t;
        });
      }
    } else {
      // Default fallbacks if no profile
      topics.push(
        {
          topic: 'Local Business Growth',
          relevance: 80,
          description: 'Strategies for growing your local customer base',
          hashtags: ['#LocalBusiness', '#SmallBiz', '#Community'],
        }
      );
    }

    // Sort by relevance
    topics.sort((a, b) => b.relevance - a.relevance);

    return topics.slice(0, limit);
  }

  async getTrendingHashtags(
    accountId: string,
    category: string = 'general',
  ): Promise<TrendingHashtag[]> {
    const profile = await this.businessProfileService.findByAccount(accountId).catch(() => null);

    let mockHashtags: TrendingHashtag[] = [
      { hashtag: '#viral', count: 45000000, trend: 'rising' },
      { hashtag: '#trending', count: 38000000, trend: 'stable' },
    ];

    if (profile && profile.industry) {
      mockHashtags = [...this.getIndustryHashtags(profile.industry), ...mockHashtags];
    } else {
      mockHashtags = [
        { hashtag: '#marketing', count: 45000000, trend: 'stable' },
        { hashtag: '#socialmedia', count: 38000000, trend: 'rising' },
        { hashtag: '#business', count: 52000000, trend: 'stable' },
        ...mockHashtags
      ];
    }

    return mockHashtags;
  }

  async getContentSuggestions(
    accountId: string,
    limit: number = 5,
  ): Promise<any[]> {
    const profile = await this.businessProfileService.findByAccount(accountId).catch(() => null);
    const topics = await this.getTrendingTopics(accountId, limit);

    // Generate content suggestions based on trending topics and profile
    const suggestions = topics.map((topic) => ({
      topic: topic.topic,
      contentIdeas: this.generateContentIdeas(topic, profile),
      suggestedHashtags: topic.hashtags,
      bestTimeToPost: this.getBestPostingTime(profile),
    }));

    return suggestions;
  }

  async getCompetitorAnalysis(
    accountId: string,
    competitorUsername: string,
  ): Promise<any> {
    return {
      username: competitorUsername,
      followers: 0,
      avgEngagementRate: 0,
      postingFrequency: '3x per day',
      topHashtags: [],
      contentTypes: {
        images: 60,
        videos: 30,
        carousels: 10,
      },
    };
  }

  async getTrendingKeywords(accountId: string): Promise<TrendingKeyword[]> {
    const profile = await this.businessProfileService.findByAccount(accountId).catch(() => null);
    const industry = profile?.industry?.toLowerCase() || 'general';
    
    const baseKeywords: TrendingKeyword[] = [
      { keyword: 'Contenido generado con IA', searchVolume: 890000, growthRate: 156, category: 'technology', description: 'Contenido creado con herramientas de inteligencia artificial' },
      { keyword: 'Micro-influencer', searchVolume: 720000, growthRate: 89, category: 'term', description: 'Influencers con 1K-100K seguidores que muestran mayor engagement' },
      { keyword: 'Social commerce', searchVolume: 650000, growthRate: 124, category: 'technique', description: 'Experiencia de compra directa dentro de plataformas sociales' },
      { keyword: 'Autenticidad', searchVolume: 580000, growthRate: 67, category: 'term', description: 'Contenido real y sin filtros que conecta con las audiencias' },
      { keyword: 'Creadores UGC', searchVolume: 540000, growthRate: 203, category: 'term', description: 'Creación de contenido generado por usuarios como profesión' },
    ];

    const industryKeywords = this.getIndustryKeywords(industry);
    return [...industryKeywords, ...baseKeywords].slice(0, 10);
  }

  async getTrendingTechniques(accountId: string): Promise<TrendingTechnique[]> {
    const profile = await this.businessProfileService.findByAccount(accountId).catch(() => null);
    const industry = profile?.industry?.toLowerCase() || 'general';

    const baseTechniques: TrendingTechnique[] = [
      {
        name: 'Gancho-Historia-Oferta',
        description: 'Comienza con un gancho llamativo, cuenta una historia con la que se identifiquen, luego presenta tu oferta o CTA',
        difficulty: 'beginner',
        engagementBoost: 45,
        examples: ['¡Deja de scrollear! Te cuento por qué...', 'Cometí este error para que tú no lo hagas...'],
        tips: ['Mantén los ganchos en menos de 3 segundos', 'Haz las historias personales', 'Los CTAs deben ser claros y simples']
      },
      {
        name: 'Interrupción de Patrón',
        description: 'Rompe el patrón esperado del scroll con visuales o declaraciones inesperadas',
        difficulty: 'intermediate',
        engagementBoost: 62,
        examples: ['Transiciones con zoom', 'Ángulos de cámara inesperados', 'Romper la cuarta pared'],
        tips: ['Úsalo en los primeros 0.5 segundos', 'No abuses - se vuelve esperado', 'Combina con el tono de tu marca']
      },
      {
        name: 'Carrusel Educativo',
        description: 'Contenido educativo en múltiples slides que aporta valor y fomenta los guardados',
        difficulty: 'beginner',
        engagementBoost: 78,
        examples: ['5 tips para...', 'Guía paso a paso', 'Errores comunes en...'],
        tips: ['El primer slide debe enganchar', 'Usa diseño consistente', 'Termina con CTA para guardar/compartir']
      },
      {
        name: 'Detrás de Cámaras',
        description: 'Muestra el proceso real detrás de tu trabajo/producto para construir autenticidad',
        difficulty: 'beginner',
        engagementBoost: 53,
        examples: ['Un día en mi vida', 'Cómo hacemos...', 'Tour de la oficina/estudio'],
        tips: ['Mantenlo crudo y real', 'Muestra también los fracasos', 'Humaniza tu marca']
      },
      {
        name: 'Subirse a la Tendencia',
        description: 'Adapta tendencias virales para que encajen con tu marca e industria',
        difficulty: 'intermediate',
        engagementBoost: 89,
        examples: ['Audios virales', 'Formatos de memes', 'Participación en challenges'],
        tips: ['Actúa rápido - las tendencias mueren pronto', 'Hazlo relevante para tu nicho', 'Ponle tu toque único']
      },
      {
        name: 'Stories Interactivas',
        description: 'Usa encuestas, quizzes y preguntas para aumentar el engagement',
        difficulty: 'beginner',
        engagementBoost: 67,
        examples: ['Encuestas Esto o Aquello', 'Stickers de quiz', 'Pregúntame lo que quieras'],
        tips: ['Usa 2-3 elementos interactivos por serie de stories', 'Responde públicamente a las interacciones', 'Crea highlights de las mejores Q&As']
      }
    ];

    const industryTechniques = this.getIndustryTechniques(industry);
    return [...industryTechniques, ...baseTechniques];
  }

  async getTrendingTechnologies(accountId: string): Promise<TrendingTechnology[]> {
    const profile = await this.businessProfileService.findByAccount(accountId).catch(() => null);
    const industry = profile?.industry?.toLowerCase() || 'general';

    const baseTechnologies: TrendingTechnology[] = [
      { name: 'CapCut', category: 'Edición de Video', description: 'Editor de video gratuito con plantillas y efectos en tendencia', useCase: 'Crear Reels y TikToks profesionales rápidamente', popularity: 95, isNew: false },
      { name: 'ChatGPT', category: 'Escritura con IA', description: 'Asistente de IA para captions, guiones e ideas de contenido', useCase: 'Generar variaciones de captions y lluvia de ideas', popularity: 98, isNew: false },
      { name: 'Canva AI', category: 'Diseño', description: 'Herramienta de diseño con funciones Magic potenciadas por IA', useCase: 'Crear gráficos profesionales sin saber diseñar', popularity: 92, isNew: false },
      { name: 'Opus Clip', category: 'Video con IA', description: 'Herramienta de IA que crea clips virales de videos largos', useCase: 'Reutilizar contenido de podcasts/YouTube en shorts', popularity: 78, isNew: true },
      { name: 'Descript', category: 'Video/Audio', description: 'Edita videos editando la transcripción de texto', useCase: 'Edición rápida de video y producción de podcasts', popularity: 75, isNew: false },
      { name: 'Midjourney', category: 'Imágenes con IA', description: 'Generación de imágenes con IA para visuales únicos', useCase: 'Crear imágenes originales y conceptos de marca', popularity: 88, isNew: false },
      { name: 'ElevenLabs', category: 'Voz con IA', description: 'Generación de voz realista con IA', useCase: 'Locuciones para Reels sin necesidad de grabar', popularity: 72, isNew: true },
      { name: 'Metricool', category: 'Analíticas', description: 'Plataforma de gestión y analíticas para redes sociales', useCase: 'Programar publicaciones y hacer seguimiento del rendimiento', popularity: 70, isNew: false }
    ];

    const industryTech = this.getIndustryTechnologies(industry);
    return [...industryTech, ...baseTechnologies];
  }

  async getInspiringPosts(accountId: string): Promise<InspiringPost[]> {
    const profile = await this.businessProfileService.findByAccount(accountId).catch(() => null);
    const industry = profile?.industry?.toLowerCase() || 'general';

    // In a real implementation, this would fetch from an API or database
    // For now, returning curated examples based on industry
    return this.getIndustryInspiringPosts(industry);
  }

  private generateContentIdeas(topic: TrendingTopic, profile: BusinessProfile | null): string[] {
    const ideas = [
      `Share your thoughts on ${topic.topic}`,
      `Create a carousel about ${topic.topic}`,
      `5 tips for implementing ${topic.topic}`,
    ];

    if (profile) {
      if (profile.brandName) {
        ideas.push(`How ${profile.brandName} approaches ${topic.topic}`);
      }
      if (profile.targetAudience) {
        ideas.push(`Why ${topic.topic} matters for ${profile.targetAudience}`);
      }
      if (profile.visualStyle) {
        ideas.push(`Create a ${profile.visualStyle} style post about ${topic.topic}`);
      }
    }

    return ideas;
  }

  private getBestPostingTime(profile: BusinessProfile | null): string {
    if (profile && profile.postingSchedule) {
      // Try to pick a time from the schedule if it exists and is in a compatible format
      // Simplified handling:
      const days = Object.keys(profile.postingSchedule);
      if (days.length > 0) {
        const times = profile.postingSchedule[days[0]];
        if (Array.isArray(times) && times.length > 0) return times[0];
      }
    }
    const times = ['9:00 AM', '12:00 PM', '3:00 PM', '6:00 PM', '8:00 PM'];
    return times[Math.floor(Math.random() * times.length)];
  }

  private getIndustryTopics(industry: string): TrendingTopic[] {
    const lowerInd = industry.toLowerCase();
    if (lowerInd.includes('fashion') || lowerInd.includes('clothing')) {
      return [
        { topic: 'Seasonal Trends', relevance: 95, description: 'Latest seasonal fashion trends', hashtags: ['#FashionTrends', '#StyleInspo'] },
        { topic: 'Sustainable Fashion', relevance: 88, description: 'Eco-friendly clothing', hashtags: ['#SustainableFashion', '#SlowFashion'] }
      ];
    }
    if (lowerInd.includes('tech') || lowerInd.includes('software')) {
      return [
        { topic: 'AI Tools', relevance: 98, description: 'New AI tools for productivity', hashtags: ['#AITools', '#TechTrends'] },
        { topic: 'Cybersecurity', relevance: 85, description: 'Keeping data safe', hashtags: ['#CyberSecurity', '#DataPrivacy'] }
      ];
    }
    if (lowerInd.includes('food') || lowerInd.includes('restaurant')) {
      return [
        { topic: 'Plant-Based Diet', relevance: 92, description: 'Rising popularity of plant-based foods', hashtags: ['#PlantBased', '#Vegan'] },
        { topic: 'Food Photography', relevance: 85, description: 'Aesthetics in food presentation', hashtags: ['#FoodPorn', '#Foodie'] }
      ];
    }
    if (lowerInd.includes('fitness') || lowerInd.includes('health')) {
      return [
        { topic: 'Holistic Health', relevance: 94, description: 'Mind-body connection', hashtags: ['#Wellness', '#MentalHealth'] },
        { topic: 'Home Workouts', relevance: 89, description: 'Fitness from home', hashtags: ['#HomeWorkout', '#FitnessMotivation'] }
      ];
    }
    // Generic industry fallback
    return [
      { topic: `${industry} Trends`, relevance: 90, description: `Latest trends in ${industry}`, hashtags: [`#${industry.replace(/\s/g, '')}`, `#${industry}Life`] }
    ];
  }

  private getIndustryHashtags(industry: string): TrendingHashtag[] {
    const base = [
      { hashtag: `#${industry.replace(/\s/g, '').toLowerCase()}`, count: 1000000, trend: 'rising' as const },
      { hashtag: `#${industry.replace(/\s/g, '').toLowerCase()}tips`, count: 500000, trend: 'stable' as const },
    ];
    return base;
  }

  private getIndustryKeywords(industry: string): TrendingKeyword[] {
    if (industry.includes('fashion') || industry.includes('clothing') || industry.includes('moda')) {
      return [
        { keyword: 'Lujo silencioso', searchVolume: 1200000, growthRate: 234, category: 'term', description: 'Moda discreta y de alta calidad sin logos visibles' },
        { keyword: 'Armario cápsula', searchVolume: 890000, growthRate: 78, category: 'technique', description: 'Guardarropa minimalista con piezas versátiles' },
        { keyword: 'Moda sostenible', searchVolume: 1500000, growthRate: 145, category: 'term', description: 'Elecciones de moda ecológicas y éticas' },
      ];
    }
    if (industry.includes('tech') || industry.includes('software') || industry.includes('tecnología')) {
      return [
        { keyword: 'IA generativa', searchVolume: 2100000, growthRate: 567, category: 'technology', description: 'IA que crea nuevo contenido y código' },
        { keyword: 'Herramientas no-code', searchVolume: 980000, growthRate: 123, category: 'technology', description: 'Construye apps sin programar' },
        { keyword: 'Automatización', searchVolume: 1800000, growthRate: 89, category: 'technique', description: 'Automatizar tareas repetitivas y flujos de trabajo' },
      ];
    }
    if (industry.includes('food') || industry.includes('restaurant') || industry.includes('restaurante') || industry.includes('comida')) {
      return [
        { keyword: 'ASMR de comida', searchVolume: 890000, growthRate: 156, category: 'technique', description: 'Sonidos satisfactorios de comida en videos' },
        { keyword: 'Reels de recetas', searchVolume: 1200000, growthRate: 189, category: 'technique', description: 'Videos de recetas rápidas en menos de 60 segundos' },
        { keyword: 'Del campo a la mesa', searchVolume: 670000, growthRate: 67, category: 'term', description: 'Ingredientes locales y frescos' },
      ];
    }
    if (industry.includes('fitness') || industry.includes('health') || industry.includes('salud') || industry.includes('gimnasio')) {
      return [
        { keyword: 'Rutinas de entrenamiento', searchVolume: 1100000, growthRate: 134, category: 'technique', description: 'Programas de entrenamiento optimizados' },
        { keyword: 'Tecnología wearable', searchVolume: 890000, growthRate: 98, category: 'technology', description: 'Rastreadores de fitness y dispositivos inteligentes' },
        { keyword: 'Conexión mente-músculo', searchVolume: 560000, growthRate: 78, category: 'technique', description: 'Activación muscular enfocada durante el ejercicio' },
      ];
    }
    if (industry.includes('beauty') || industry.includes('cosmetic') || industry.includes('belleza') || industry.includes('maquillaje')) {
      return [
        { keyword: 'Glass skin', searchVolume: 1400000, growthRate: 189, category: 'technique', description: 'Rutina para piel luminosa y húmeda' },
        { keyword: 'Belleza limpia', searchVolume: 980000, growthRate: 134, category: 'term', description: 'Productos de belleza naturales y no tóxicos' },
        { keyword: 'Skinimalismo', searchVolume: 670000, growthRate: 167, category: 'technique', description: 'Rutina mínima de skincare para máximos resultados' },
      ];
    }
    return [
      { keyword: `Tendencias en ${industry}`, searchVolume: 500000, growthRate: 45, category: 'term', description: `Últimos desarrollos en ${industry}` },
    ];
  }

  private getIndustryTechniques(industry: string): TrendingTechnique[] {
    if (industry.includes('fashion') || industry.includes('moda')) {
      return [
        {
          name: 'GRWM (Arréglate Conmigo)',
          description: 'Grábate mientras te arreglas mostrando outfits y productos',
          difficulty: 'beginner',
          engagementBoost: 85,
          examples: ['Rutina de mañana + outfit', 'Preparación para evento', 'Styling de outfit de trabajo'],
          tips: ['La buena iluminación es esencial', 'Habla a la cámara de forma natural', 'Muestra el outfit completo al final']
        },
        {
          name: 'Transición de Outfits',
          description: 'Transiciones rápidas entre múltiples cambios de ropa',
          difficulty: 'intermediate',
          engagementBoost: 92,
          examples: ['Outfits de la semana', 'Una prenda de 5 formas', 'Transformaciones de dress code'],
          tips: ['Usa audios en tendencia', 'Las transiciones suaves son clave', 'Termina con tu mejor look']
        }
      ];
    }
    if (industry.includes('food') || industry.includes('restaurant') || industry.includes('comida')) {
      return [
        {
          name: 'Receta en POV',
          description: 'Vista en primera persona cocinando con sonidos satisfactorios',
          difficulty: 'intermediate',
          engagementBoost: 88,
          examples: ['Tomas cenitales cocinando', 'ASMR preparando ingredientes', 'Secuencias de emplatado'],
          tips: ['El audio natural es importante', 'Muestra las texturas de cerca', 'Termina con el plato terminado']
        },
        {
          name: 'Reacción de Prueba',
          description: 'Reacciones genuinas mientras pruebas comida',
          difficulty: 'beginner',
          engagementBoost: 76,
          examples: ['Reacciones al primer bocado', 'Probando recetas virales', 'Degustaciones del menú'],
          tips: ['Sé auténtico en las reacciones', 'Describe los sabores verbalmente', 'Muestra la comida claramente']
        }
      ];
    }
    return [];
  }

  private getIndustryTechnologies(industry: string): TrendingTechnology[] {
    if (industry.includes('fashion') || industry.includes('moda')) {
      return [
        { name: 'ZEPETO', category: 'Prueba Virtual', description: 'Crea avatares virtuales para mostrar moda', useCase: 'Previews virtuales de outfits y lookbooks', popularity: 65, isNew: true },
        { name: 'StyleSnap', category: 'Moda con IA', description: 'Encuentra prendas similares desde fotos', useCase: 'Ayuda a tus seguidores a encontrar las prendas', popularity: 58, isNew: true },
      ];
    }
    if (industry.includes('food') || industry.includes('comida')) {
      return [
        { name: 'Recipe Card Maker', category: 'Contenido', description: 'Crea tarjetas de recetas bonitas y compartibles', useCase: 'Convierte recetas en posts carrusel guardables', popularity: 72, isNew: false },
        { name: 'Food Styling AI', category: 'IA', description: 'Sugerencias de IA para presentación de comida', useCase: 'Mejorar la composición de fotografía de comida', popularity: 55, isNew: true },
      ];
    }
    return [];
  }

  private getIndustryInspiringPosts(industry: string): InspiringPost[] {
    const baseInspo: InspiringPost[] = [
      {
        id: 'inspo-1',
        type: 'reel',
        thumbnailUrl: 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=400&h=400&fit=crop',
        caption: 'POV: Por fin entendiste el algoritmo 📈✨ Esto es lo que cambió todo...',
        engagement: { likes: 45200, comments: 892, shares: 2340 },
        author: { username: 'socialgrowthhacks', followers: 245000, verified: true },
        tags: ['#crecimiento', '#algoritmo', '#creadordecontenido'],
        whyItWorks: 'Gancho fuerte con un punto de dolor con el que todos se identifican, promete información valiosa',
        contentCategory: 'Educativo'
      },
      {
        id: 'inspo-2',
        type: 'carousel',
        thumbnailUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=400&fit=crop',
        caption: '5 cosas que me hubiera gustado saber antes de empezar mi negocio 🧵 (guarda para después)',
        engagement: { likes: 32100, comments: 456, shares: 1890 },
        author: { username: 'entrepreneurmindset', followers: 189000, verified: false },
        tags: ['#tipsdenegocios', '#emprendedor', '#startup'],
        whyItWorks: 'El formato de lista incentiva los guardados, el ángulo personal genera confianza',
        contentCategory: 'Storytelling'
      },
      {
        id: 'inspo-3',
        type: 'reel',
        thumbnailUrl: 'https://images.unsplash.com/photo-1533750349088-cd871a92f312?w=400&h=400&fit=crop',
        caption: 'Mi rutina de mañana que multiplicó x10 mi productividad ☀️ (no es lo que piensas)',
        engagement: { likes: 67800, comments: 1230, shares: 4560 },
        author: { username: 'productivitypro', followers: 567000, verified: true },
        tags: ['#rutinamañanera', '#productividad', '#mentalidad'],
        whyItWorks: 'Vacío de curiosidad en el caption, contenido lifestyle aspiracional',
        contentCategory: 'Lifestyle'
      }
    ];

    if (industry.includes('fashion') || industry.includes('moda')) {
      return [
        {
          id: 'fashion-1',
          type: 'reel',
          thumbnailUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&h=400&fit=crop',
          caption: 'Cómo combinar un blazer de 7 formas diferentes 🖤 ¿Cuál es tu favorita?',
          engagement: { likes: 89300, comments: 2340, shares: 5670 },
          author: { username: 'stylishhacks', followers: 890000, verified: true },
          tags: ['#ootd', '#tipsdemoda', '#armariocapsula'],
          whyItWorks: 'Valor práctico, incentiva comentarios, muestra versatilidad',
          contentCategory: 'Tips de Moda'
        },
        {
          id: 'fashion-2',
          type: 'carousel',
          thumbnailUrl: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400&h=400&fit=crop',
          caption: 'Tendencias primavera 2026 que realmente vas a querer usar 🌸 (hilo)',
          engagement: { likes: 56700, comments: 890, shares: 3240 },
          author: { username: 'fashionforecast', followers: 456000, verified: true },
          tags: ['#modaprimavera', '#tendencias2026', '#styleinspo'],
          whyItWorks: 'Contenido de tendencias oportuno, el carrusel incentiva el swipe',
          contentCategory: 'Reporte de Tendencias'
        },
        ...baseInspo
      ];
    }

    if (industry.includes('food') || industry.includes('restaurant') || industry.includes('comida')) {
      return [
        {
          id: 'food-1',
          type: 'reel',
          thumbnailUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=400&fit=crop',
          caption: 'Pasta en 30 segundos que sabe como si tardara horas 🍝 ¡Receta en comentarios!',
          engagement: { likes: 234000, comments: 4560, shares: 12300 },
          author: { username: 'recetasrapidas', followers: 1200000, verified: true },
          tags: ['#recetafacil', '#pasta', '#ideasparacena'],
          whyItWorks: 'Promete solución rápida, atractivo visual, la receta en comentarios genera engagement',
          contentCategory: 'Receta Rápida'
        },
        {
          id: 'food-2',
          type: 'video',
          thumbnailUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=400&fit=crop',
          caption: 'El sonido de esta pizza... 🔊🍕 ¿la probarías?',
          engagement: { likes: 178000, comments: 3450, shares: 8900 },
          author: { username: 'foodievibes', followers: 890000, verified: true },
          tags: ['#pizza', '#foodasmr', '#comida'],
          whyItWorks: 'Atractivo ASMR, la pregunta genera comentarios, corto y satisfactorio',
          contentCategory: 'ASMR de Comida'
        },
        ...baseInspo
      ];
    }

    if (industry.includes('fitness') || industry.includes('health') || industry.includes('gimnasio')) {
      return [
        {
          id: 'fitness-1',
          type: 'reel',
          thumbnailUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&h=400&fit=crop',
          caption: '3 ejercicios que cambiaron mi postura para siempre 🧘‍♀️ ¡Guarda esto!',
          engagement: { likes: 156000, comments: 2890, shares: 9800 },
          author: { username: 'fitnesstips', followers: 780000, verified: true },
          tags: ['#postura', '#fitness', '#entrenamiento'],
          whyItWorks: 'Resuelve un problema común, incentiva guardados, propuesta de valor clara',
          contentCategory: 'Tips de Ejercicio'
        },
        {
          id: 'fitness-2',
          type: 'carousel',
          thumbnailUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=400&fit=crop',
          caption: 'Mi transformación de 12 semanas 💪 (lo que comí + rutina de entrenamiento)',
          engagement: { likes: 89000, comments: 1670, shares: 4500 },
          author: { username: 'transformationjourney', followers: 345000, verified: false },
          tags: ['#transformacion', '#motivacionfitness', '#rutina'],
          whyItWorks: 'Atractivo del antes/después, promete información completa',
          contentCategory: 'Transformación'
        },
        ...baseInspo
      ];
    }

    return baseInspo;
  }
}
