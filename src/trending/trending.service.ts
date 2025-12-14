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
}
