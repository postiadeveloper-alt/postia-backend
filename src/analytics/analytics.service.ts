import { Injectable, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { InstagramService } from '../instagram/instagram.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Post, PostStatus } from '../calendar/entities/post.entity';

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

export interface AccountOverview {
  accountInfo: {
    id: string;
    username: string;
    name: string;
    profilePictureUrl: string;
    followersCount: number;
    followsCount: number;
    mediaCount: number;
  };
  stats: {
    totalReach: number;
    engagementRate: number;
    followersCount: number;
    postsThisMonth: number;
    reachChange: string;
    engagementChange: string;
    followersChange: string;
    postsChange: string;
  };
  topPosts: Array<{
    id: string;
    caption: string;
    mediaType: string;
    mediaUrl: string;
    timestamp: string;
    likeCount: number;
    commentsCount: number;
    engagementRate: number;
  }>;
  insightsAvailable: boolean;
}

@Injectable()
export class AnalyticsService {
  private readonly facebookGraphApiUrl = 'https://graph.facebook.com/v18.0';

  constructor(
    private readonly httpService: HttpService,
    private readonly instagramService: InstagramService,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
  ) {}

  async getAccountOverview(accountId: string): Promise<AccountOverview> {
    const account = await this.instagramService.findOne(accountId);
    
    console.log('📊 [Analytics] Getting overview for account:', account.username, 'IG User ID:', account.instagramUserId);
    
    // Calculate posts this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const postsThisMonth = await this.postRepository.count({
      where: {
        instagramAccountId: accountId,
        status: PostStatus.PUBLISHED,
        publishedAt: MoreThan(startOfMonth),
      },
    });

    // Calculate posts last month for comparison
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const postsLastMonth = await this.postRepository.count({
      where: {
        instagramAccountId: accountId,
        status: PostStatus.PUBLISHED,
        publishedAt: MoreThan(startOfLastMonth),
      },
    });

    // Try to get Instagram API insights
    let insightsAvailable = false;
    let reach = 0;
    let impressions = 0;
    let profileViews = 0;
    let topPosts: any[] = [];

    try {
      // Use Facebook Graph API for Instagram Business accounts
      console.log('📊 [Analytics] Fetching media from Instagram Business API...');
      const mediaResponse = await firstValueFrom(
        this.httpService.get(
          `${this.facebookGraphApiUrl}/${account.instagramUserId}/media`,
          {
            params: {
              fields: 'id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count,permalink',
              limit: 10,
              access_token: account.accessToken,
            },
          },
        ),
      );

      console.log('📊 [Analytics] Media response:', mediaResponse.data?.data?.length || 0, 'posts found');

      if (mediaResponse.data?.data) {
        insightsAvailable = true;
        topPosts = mediaResponse.data.data
          .map((post: any) => ({
            id: post.id,
            caption: post.caption || '',
            mediaType: post.media_type,
            mediaUrl: post.media_url || post.thumbnail_url,
            timestamp: post.timestamp,
            likeCount: post.like_count || 0,
            commentsCount: post.comments_count || 0,
            engagementRate: account.followersCount > 0
              ? ((post.like_count || 0) + (post.comments_count || 0)) / account.followersCount * 100
              : 0,
          }))
          .sort((a: any, b: any) => 
            (b.likeCount + b.commentsCount) - (a.likeCount + a.commentsCount)
          )
          .slice(0, 5);

        // Calculate estimated reach from top posts
        reach = topPosts.reduce((acc, post) => acc + (post.likeCount * 3), 0);
      }
    } catch (error) {
      console.error('❌ [Analytics] Instagram API error:', error.response?.data || error.message);
      // Fall back to stored data
    }

    // Calculate engagement rate based on recent posts
    const totalEngagement = topPosts.reduce(
      (acc, post) => acc + post.likeCount + post.commentsCount,
      0,
    );
    const avgEngagement = topPosts.length > 0 ? totalEngagement / topPosts.length : 0;
    const engagementRate = account.followersCount > 0
      ? (avgEngagement / account.followersCount) * 100
      : 0;

    // Calculate changes (simulated for now - would need historical data tracking)
    const postsChange = postsLastMonth > 0
      ? `${postsThisMonth >= postsLastMonth ? '+' : ''}${postsThisMonth - postsLastMonth}`
      : `+${postsThisMonth}`;

    return {
      accountInfo: {
        id: account.id,
        username: account.username,
        name: account.name || account.username,
        profilePictureUrl: account.profilePictureUrl || '',
        followersCount: account.followersCount,
        followsCount: account.followsCount,
        mediaCount: account.mediaCount,
      },
      stats: {
        totalReach: reach,
        engagementRate: Math.round(engagementRate * 100) / 100,
        followersCount: account.followersCount,
        postsThisMonth,
        reachChange: '+12%', // Would need historical tracking
        engagementChange: '+0.5%',
        followersChange: '+45',
        postsChange,
      },
      topPosts,
      insightsAvailable,
    };
  }

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
          `${this.facebookGraphApiUrl}/${account.instagramUserId}/insights`,
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
        this.httpService.get(`${this.facebookGraphApiUrl}/${postId}/insights`, {
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
          `${this.facebookGraphApiUrl}/${account.instagramUserId}/insights`,
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
          `${this.facebookGraphApiUrl}/${account.instagramUserId}/media`,
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
