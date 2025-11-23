import { Injectable, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { InstagramService } from '../instagram/instagram.service';

export interface InstagramInsights {
  impressions: number;
  reach: number;
  engagement: number;
  follower_count: number;
  profile_views: number;
  website_clicks: number;
}

export interface PostInsights {
  impressions: number;
  reach: number;
  engagement: number;
  saved: number;
  comments: number;
  likes: number;
}

@Injectable()
export class AnalyticsService {
  private readonly instagramApiUrl = 'https://graph.instagram.com';

  constructor(
    private readonly httpService: HttpService,
    private readonly instagramService: InstagramService,
  ) {}

  async getAccountInsights(
    accountId: string,
    period: string = 'day',
    since?: Date,
    until?: Date,
  ): Promise<InstagramInsights> {
    const account = await this.instagramService.findOne(accountId);

    try {
      const params: any = {
        metric: 'impressions,reach,profile_views,website_clicks,follower_count',
        period,
        access_token: account.accessToken,
      };

      if (since) params.since = Math.floor(since.getTime() / 1000);
      if (until) params.until = Math.floor(until.getTime() / 1000);

      const { data } = await firstValueFrom(
        this.httpService.get(
          `${this.instagramApiUrl}/${account.instagramUserId}/insights`,
          { params },
        ),
      );

      // Process and format insights
      const insights: InstagramInsights = {
        impressions: this.getMetricValue(data.data, 'impressions'),
        reach: this.getMetricValue(data.data, 'reach'),
        engagement: this.calculateEngagement(data.data),
        follower_count: this.getMetricValue(data.data, 'follower_count'),
        profile_views: this.getMetricValue(data.data, 'profile_views'),
        website_clicks: this.getMetricValue(data.data, 'website_clicks'),
      };

      return insights;
    } catch (error) {
      throw new BadRequestException(
        'Failed to fetch Instagram insights: ' + error.message,
      );
    }
  }

  async getPostInsights(accountId: string, postId: string): Promise<PostInsights> {
    const account = await this.instagramService.findOne(accountId);

    try {
      const { data } = await firstValueFrom(
        this.httpService.get(`${this.instagramApiUrl}/${postId}/insights`, {
          params: {
            metric: 'impressions,reach,engagement,saved,comments,likes',
            access_token: account.accessToken,
          },
        }),
      );

      const insights: PostInsights = {
        impressions: this.getMetricValue(data.data, 'impressions'),
        reach: this.getMetricValue(data.data, 'reach'),
        engagement: this.getMetricValue(data.data, 'engagement'),
        saved: this.getMetricValue(data.data, 'saved'),
        comments: this.getMetricValue(data.data, 'comments'),
        likes: this.getMetricValue(data.data, 'likes'),
      };

      return insights;
    } catch (error) {
      throw new BadRequestException(
        'Failed to fetch post insights: ' + error.message,
      );
    }
  }

  async getFollowerDemographics(accountId: string): Promise<any> {
    const account = await this.instagramService.findOne(accountId);

    try {
      const { data } = await firstValueFrom(
        this.httpService.get(
          `${this.instagramApiUrl}/${account.instagramUserId}/insights`,
          {
            params: {
              metric:
                'audience_city,audience_country,audience_gender_age',
              period: 'lifetime',
              access_token: account.accessToken,
            },
          },
        ),
      );

      return data.data;
    } catch (error) {
      throw new BadRequestException(
        'Failed to fetch follower demographics: ' + error.message,
      );
    }
  }

  async getTopPosts(accountId: string, limit: number = 10): Promise<any[]> {
    const account = await this.instagramService.findOne(accountId);

    try {
      const { data } = await firstValueFrom(
        this.httpService.get(
          `${this.instagramApiUrl}/${account.instagramUserId}/media`,
          {
            params: {
              fields: 'id,caption,media_type,media_url,timestamp,like_count,comments_count',
              limit,
              access_token: account.accessToken,
            },
          },
        ),
      );

      // Sort by engagement (likes + comments)
      const sortedPosts = data.data.sort((a: any, b: any) => {
        const engagementA = (a.like_count || 0) + (a.comments_count || 0);
        const engagementB = (b.like_count || 0) + (b.comments_count || 0);
        return engagementB - engagementA;
      });

      return sortedPosts;
    } catch (error) {
      throw new BadRequestException(
        'Failed to fetch top posts: ' + error.message,
      );
    }
  }

  async getEngagementRate(accountId: string): Promise<number> {
    const account = await this.instagramService.findOne(accountId);
    const insights = await this.getAccountInsights(accountId, 'day');

    if (account.followersCount === 0) return 0;

    const engagementRate =
      (insights.engagement / account.followersCount) * 100;
    return Math.round(engagementRate * 100) / 100;
  }

  private getMetricValue(data: any[], metricName: string): number {
    const metric = data.find((item) => item.name === metricName);
    if (!metric || !metric.values || metric.values.length === 0) {
      return 0;
    }
    return metric.values[0].value || 0;
  }

  private calculateEngagement(data: any[]): number {
    // Calculate total engagement from available metrics
    const likes = this.getMetricValue(data, 'likes');
    const comments = this.getMetricValue(data, 'comments');
    const saved = this.getMetricValue(data, 'saved');
    
    return likes + comments + saved;
  }
}
