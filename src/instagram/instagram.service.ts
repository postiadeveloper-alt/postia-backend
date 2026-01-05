import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { InstagramAccount } from './entities/instagram-account.entity';

@Injectable()
export class InstagramService {
    private readonly instagramApiUrl = 'https://graph.instagram.com';

    constructor(
        @InjectRepository(InstagramAccount)
        private readonly instagramAccountRepository: Repository<InstagramAccount>,
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) { }

    async findAllByUser(userId: string): Promise<InstagramAccount[]> {
        return this.instagramAccountRepository.find({
            where: { userId, isActive: true },
            relations: ['businessProfile'],
        });
    }

    async findOne(id: string): Promise<InstagramAccount> {
        const account = await this.instagramAccountRepository.findOne({
            where: { id },
            relations: ['user', 'businessProfile'],
        });

        if (!account) {
            throw new NotFoundException(`Instagram account with ID ${id} not found`);
        }

        return account;
    }

    async refreshAccountData(id: string): Promise<InstagramAccount> {
        const account = await this.findOne(id);

        try {
            const profileData = await this.getAccountDetails(
                account.instagramUserId,
                account.accessToken,
            );

            account.username = profileData.username;
            account.name = profileData.name;
            account.profilePictureUrl = profileData.profile_picture_url;
            account.biography = profileData.biography;
            account.followersCount = profileData.followers_count;
            account.followsCount = profileData.follows_count;
            account.mediaCount = profileData.media_count;

            return this.instagramAccountRepository.save(account);
        } catch (error) {
            throw new BadRequestException('Failed to refresh account data: ' + error.message);
        }
    }

    async disconnectAccount(id: string): Promise<void> {
        const account = await this.findOne(id);
        account.isActive = false;
        await this.instagramAccountRepository.save(account);
    }

    async remove(id: string): Promise<void> {
        const result = await this.instagramAccountRepository.delete(id);
        if (result.affected === 0) {
            throw new NotFoundException(`Instagram account with ID ${id} not found`);
        }
    }

    private async getAccountDetails(instagramUserId: string, accessToken: string): Promise<any> {
        const { data } = await firstValueFrom(
            this.httpService.get(`${this.instagramApiUrl}/${instagramUserId}`, {
                params: {
                    fields: 'id,username,name,biography,profile_picture_url,followers_count,follows_count,media_count',
                    access_token: accessToken,
                },
            }),
        );

        return data;
    }

    async getAuthUrl(userId: string): Promise<string> {
        const appId = this.configService.get<string>('INSTAGRAM_APP_ID')?.trim();
        const redirectUri = this.configService.get<string>('INSTAGRAM_REDIRECT_URI')?.trim();

        if (!appId || !redirectUri) {
            throw new BadRequestException('Instagram App not configured. Please set INSTAGRAM_APP_ID and INSTAGRAM_REDIRECT_URI in .env file.');
        }

        console.log('🔗 Generating Instagram OAuth URL for user:', userId);

        // Facebook OAuth URL for Instagram permissions
        const authUrl = 'https://www.facebook.com/v18.0/dialog/oauth';
        const scope = [
            'instagram_basic',
            'instagram_content_publish',
            'instagram_manage_insights',
            'pages_show_list',
            'pages_read_engagement',
            'business_management'
        ].join(',');

        const params = new URLSearchParams({
            client_id: appId,
            redirect_uri: redirectUri,
            scope: scope,
            response_type: 'code',
            state: userId, // Pass userId in state to link account after OAuth
            auth_type: 'rerequest',
        });

        return `${authUrl}?${params.toString()}`;
    }

    async exchangeCodeForToken(code: string): Promise<string> {
        const appId = this.configService.get<string>('INSTAGRAM_APP_ID')?.trim();
        const appSecret = this.configService.get<string>('INSTAGRAM_APP_SECRET')?.trim();
        const redirectUri = this.configService.get<string>('INSTAGRAM_REDIRECT_URI')?.trim();

        console.log('🔄 Exchanging code for access token...');

        try {
            const { data } = await firstValueFrom(
                this.httpService.get('https://graph.facebook.com/v18.0/oauth/access_token', {
                    params: {
                        client_id: appId,
                        client_secret: appSecret,
                        redirect_uri: redirectUri,
                        code: code,
                    },
                }),
            );

            console.log('✅ Access token received');
            return data.access_token;
        } catch (error) {
            console.error('❌ Token exchange error:', error.response?.data || error.message);
            throw new BadRequestException('Failed to exchange code for token: ' + (error.response?.data?.error?.message || error.message));
        }
    }

    async findAllPages(accessToken: string): Promise<any[]> {
        let allPages = [];
        console.log('\n=== SEARCHING FOR PAGES ===');

        // Method 1: Standard me/accounts
        try {
            const { data } = await firstValueFrom(
                this.httpService.get('https://graph.facebook.com/v18.0/me/accounts', {
                    params: {
                        access_token: accessToken,
                        fields: 'id,name,access_token,instagram_business_account',
                    },
                }),
            );
            if (data.data && data.data.length > 0) {
                console.log(`  Found ${data.data.length} pages via me/accounts`);
                allPages.push(...data.data);
            }
        } catch (e) {
            console.log('  me/accounts error:', e.response?.data?.error?.message || e.message);
        }

        // Method 2: Get businesses, then get pages from each business
        try {
            const { data: businessesResponse } = await firstValueFrom(
                this.httpService.get('https://graph.facebook.com/v18.0/me/businesses', {
                    params: {
                        access_token: accessToken,
                        fields: 'id,name',
                    },
                }),
            );

            if (businessesResponse.data && businessesResponse.data.length > 0) {
                console.log(`  Found ${businessesResponse.data.length} businesses`);

                for (const business of businessesResponse.data) {
                    // Owned pages
                    try {
                        const { data: ownedPages } = await firstValueFrom(
                            this.httpService.get(`https://graph.facebook.com/v18.0/${business.id}/owned_pages`, {
                                params: {
                                    access_token: accessToken,
                                    fields: 'id,name,access_token,instagram_business_account',
                                },
                            }),
                        );
                        if (ownedPages.data) {
                            for (const page of ownedPages.data) {
                                if (!allPages.find(p => p.id === page.id)) allPages.push(page);
                            }
                        }
                    } catch (e) { }

                    // Client pages
                    try {
                        const { data: clientPages } = await firstValueFrom(
                            this.httpService.get(`https://graph.facebook.com/v18.0/${business.id}/client_pages`, {
                                params: {
                                    access_token: accessToken,
                                    fields: 'id,name,access_token,instagram_business_account',
                                },
                            }),
                        );
                        if (clientPages.data) {
                            for (const page of clientPages.data) {
                                if (!allPages.find(p => p.id === page.id)) allPages.push(page);
                            }
                        }
                    } catch (e) { }
                }
            }
        } catch (e) { }

        return allPages;
    }

    renderCallbackPage(result: { success: boolean; account?: any; error?: string; errorType?: string }) {
        if (result.success) {
            return `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Instagram Connected - Postia</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                background: linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                padding: 20px;
              }
              .container {
                background: rgba(255, 255, 255, 0.08);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(238, 62, 201, 0.2);
                border-radius: 20px;
                padding: 40px;
                text-align: center;
                max-width: 500px;
                box-shadow: 0 8px 32px rgba(238, 62, 201, 0.2);
              }
              .icon {
                font-size: 64px;
                margin-bottom: 20px;
                animation: bounce 0.6s ease-in-out;
              }
              @keyframes bounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-10px); }
              }
              h1 { color: #ffffff; font-size: 28px; margin: 0 0 15px 0; }
              .account-info {
                background: rgba(0, 255, 255, 0.1);
                border: 1px solid rgba(0, 255, 255, 0.3);
                border-radius: 12px;
                padding: 20px;
                margin: 20px 0;
              }
              .username { color: #00ffff; font-size: 22px; font-weight: bold; margin: 10px 0; }
              .stats { color: #a0a0b0; font-size: 14px; margin-top: 10px; }
              p { color: #a0a0b0; font-size: 16px; line-height: 1.6; }
              .spinner {
                display: inline-block;
                width: 20px;
                height: 20px;
                border: 3px solid rgba(238, 62, 201, 0.3);
                border-radius: 50%;
                border-top-color: #ee3ec9;
                animation: spin 1s ease-in-out infinite;
              }
              @keyframes spin { to { transform: rotate(360deg); } }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="icon">✓</div>
              <h1>Instagram Connected!</h1>
              <div class="account-info">
                <div class="username">@${result.account.username}</div>
                <div class="stats">${result.account.followers?.toLocaleString() || 0} followers</div>
              </div>
              <p>Your Instagram account has been successfully connected to Postia.</p>
              <p><span class="spinner"></span> Redirecting you back to the app...</p>
            </div>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'instagram-connected', 
                  success: true,
                  account: ${JSON.stringify(result.account)}
                }, '*');
                setTimeout(() => window.close(), 2000);
              } else {
                setTimeout(() => { window.location.href = '/'; }, 3000);
              }
            </script>
          </body>
        </html>
      `;
        } else {
            return `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Connection Error - Postia</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                background: linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                padding: 20px;
              }
              .container {
                background: rgba(255, 255, 255, 0.08);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(239, 68, 68, 0.3);
                border-radius: 20px;
                padding: 40px;
                text-align: center;
                max-width: 500px;
                box-shadow: 0 8px 32px rgba(239, 68, 68, 0.2);
              }
              .icon { font-size: 64px; margin-bottom: 20px; }
              h1 { color: #ffffff; font-size: 28px; margin: 0 0 15px 0; }
              .error-box {
                background: rgba(239, 68, 68, 0.1);
                border: 1px solid rgba(239, 68, 68, 0.3);
                border-radius: 12px;
                padding: 20px;
                margin: 20px 0;
              }
              .error-message { color: #fca5a5; font-size: 16px; line-height: 1.6; }
              p { color: #a0a0b0; font-size: 16px; line-height: 1.6; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="icon">⚠️</div>
              <h1>Connection Failed</h1>
              <div class="error-box">
                <div class="error-message">${result.error}</div>
              </div>
              <p>Please close this window and try again.</p>
            </div>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'instagram-error',
                  error: '${result.error}',
                  errorType: '${result.errorType}'
                }, '*');
                setTimeout(() => window.close(), 5000);
              }
            </script>
          </body>
        </html>
      `;
        }
    }

    async connectAccount(userId: string, accessToken: string): Promise<InstagramAccount> {
        try {
            console.log('🔗 Connecting Instagram account for user:', userId);

            // Use the comprehensive page finder
            const foundPages = await this.findAllPages(accessToken);
            console.log('📄 Total pages found:', foundPages.length);

            if (foundPages.length === 0) {
                throw new BadRequestException(
                    'No Facebook Page found. To connect Instagram, you need:\n' +
                    '1. A Facebook Page\n' +
                    '2. An Instagram Business or Creator account\n' +
                    '3. Both linked together in Instagram settings'
                );
            }

            // Find a page with an Instagram Business account
            let selectedPage = null;
            let igAccountId = null;

            for (const page of foundPages) {
                if (page.instagram_business_account) {
                    selectedPage = page;
                    igAccountId = page.instagram_business_account.id;
                    break;
                }
            }

            // If no direct IG account found, try fetching it for each page (fallback)
            if (!selectedPage) {
                console.log('⚠️ No Instagram account found directly, checking each page fallback...');
                for (const page of foundPages) {
                    try {
                        const { data: igData } = await firstValueFrom(
                            this.httpService.get(`https://graph.facebook.com/v18.0/${page.id}`, {
                                params: {
                                    fields: 'instagram_business_account',
                                    access_token: page.access_token || accessToken,
                                },
                            }),
                        );

                        if (igData.instagram_business_account) {
                            selectedPage = page;
                            igAccountId = igData.instagram_business_account.id;
                            break;
                        }
                    } catch (err) { }
                }
            }

            if (!selectedPage || !igAccountId) {
                throw new BadRequestException(
                    'No Instagram Business account found on your Facebook Pages.\n\n' +
                    'To connect:\n' +
                    '1. Convert your Instagram account to a Business or Creator account\n' +
                    '2. Link it to a Facebook Page in Instagram settings\n' +
                    '3. Try connecting again'
                );
            }

            console.log('✅ Using Facebook Page:', selectedPage.name);
            console.log('📸 Instagram account ID:', igAccountId);

            // Step 2: Get Instagram account details
            const pageAccessToken = selectedPage.access_token || accessToken;
            const { data: profileData } = await firstValueFrom(
                this.httpService.get(`https://graph.facebook.com/v18.0/${igAccountId}`, {
                    params: {
                        fields: 'id,username,name,profile_picture_url,biography,followers_count,follows_count,media_count',
                        access_token: pageAccessToken,
                    },
                }),
            );

            console.log('👤 Instagram profile:', profileData.username);

            // Check if account already exists for this user
            const existingAccount = await this.instagramAccountRepository.findOne({
                where: {
                    instagramUserId: igAccountId,
                    userId: userId
                },
            });

            if (existingAccount) {
                console.log('♻️ Updating existing account');
                existingAccount.accessToken = pageAccessToken;
                existingAccount.username = profileData.username;
                existingAccount.name = profileData.name || profileData.username;
                existingAccount.profilePictureUrl = profileData.profile_picture_url;
                existingAccount.biography = profileData.biography || '';
                existingAccount.followersCount = profileData.followers_count || 0;
                existingAccount.followsCount = profileData.follows_count || 0;
                existingAccount.mediaCount = profileData.media_count || 0;
                existingAccount.tokenExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
                existingAccount.isActive = true;
                return this.instagramAccountRepository.save(existingAccount);
            }

            // Check if another user has this account
            const accountOwnedByOther = await this.instagramAccountRepository.findOne({
                where: { instagramUserId: igAccountId },
            });

            if (accountOwnedByOther && accountOwnedByOther.userId !== userId) {
                throw new BadRequestException(
                    `This Instagram account (@${profileData.username}) is already connected to another Postia account.`
                );
            }

            console.log('🆕 Creating new account connection');
            const newAccount = this.instagramAccountRepository.create({
                userId,
                instagramUserId: igAccountId,
                username: profileData.username,
                name: profileData.name || profileData.username,
                profilePictureUrl: profileData.profile_picture_url,
                biography: profileData.biography || '',
                followersCount: profileData.followers_count || 0,
                followsCount: profileData.follows_count || 0,
                mediaCount: profileData.media_count || 0,
                accessToken: pageAccessToken,
                tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
            });

            const savedAccount = await this.instagramAccountRepository.save(newAccount);
            console.log('🎉 Successfully connected @' + savedAccount.username);

            return savedAccount;
        } catch (error) {
            console.error('❌ Connect account error:', error.response?.data || error.message);

            const errorMessage = error.response?.data?.error?.message || error.message;

            if (errorMessage.includes('OAuthException')) {
                throw new BadRequestException(
                    'Instagram authorization failed. Please try again and make sure to accept all permissions.'
                );
            }

            if (errorMessage.includes('permissions')) {
                throw new BadRequestException(
                    'Missing required permissions. Please authorize all requested permissions to connect your Instagram account.'
                );
            }

            throw new BadRequestException(
                error instanceof BadRequestException ? error.message :
                    'Failed to connect Instagram account: ' + errorMessage
            );
        }
    }

    async createMediaContainer(
        accessToken: string,
        igUserId: string,
        mediaData: {
            imageUrl?: string;
            videoUrl?: string;
            caption?: string;
            mediaType?: 'IMAGE' | 'VIDEO' | 'REELS' | 'STORIES' | 'CAROUSEL_ITEM';
            isCarouselItem?: boolean;
            coverUrl?: string;
        },
    ): Promise<string> {
        console.log('📸 Creating media container for IG user:', igUserId);
        console.log('📝 Type:', mediaData.mediaType);

        const params: any = {
            access_token: accessToken,
        };

        if (mediaData.caption && mediaData.mediaType !== 'STORIES') {
            params.caption = mediaData.caption;
        }

        if (mediaData.isCarouselItem) {
            params.is_carousel_item = true;
        }

        if (mediaData.mediaType === 'VIDEO' || mediaData.mediaType === 'REELS') {
            params.media_type = 'REELS'; // Graph API uses REELS for both now usually, or VIDEO
            if (mediaData.videoUrl) params.video_url = mediaData.videoUrl;
            if (mediaData.coverUrl) params.cover_url = mediaData.coverUrl;
        } else if (mediaData.mediaType === 'STORIES') {
            params.media_type = 'STORIES';
            if (mediaData.videoUrl) params.video_url = mediaData.videoUrl;
            if (mediaData.imageUrl) params.image_url = mediaData.imageUrl;
        } else {
            // IMAGE or CAROUSEL_ITEM (image)
            if (mediaData.imageUrl) params.image_url = mediaData.imageUrl;
            if (mediaData.videoUrl) {
                // Carousel item can be video
                params.media_type = 'VIDEO';
                params.video_url = mediaData.videoUrl;
            }
        }

        try {
            const { data } = await firstValueFrom(
                this.httpService.post(
                    `https://graph.facebook.com/v18.0/${igUserId}/media`,
                    null,
                    { params },
                ),
            );

            console.log('✅ Media container created:', data.id);
            return data.id;
        } catch (error) {
            console.error('❌ Create container error:', error.response?.data || error.message);
            throw new BadRequestException(
                'Failed to create media container: ' +
                (error.response?.data?.error?.message || error.message),
            );
        }
    }

    async createCarouselContainer(
        accessToken: string,
        igUserId: string,
        childrenIds: string[],
        caption: string,
    ): Promise<string> {
        console.log('🎡 Creating carousel container with children:', childrenIds);

        try {
            const { data } = await firstValueFrom(
                this.httpService.post(
                    `https://graph.facebook.com/v18.0/${igUserId}/media`,
                    null,
                    {
                        params: {
                            access_token: accessToken,
                            media_type: 'CAROUSEL',
                            children: childrenIds.join(','),
                            caption: caption,
                        },
                    },
                ),
            );

            console.log('✅ Carousel container created:', data.id);
            return data.id;
        } catch (error) {
            console.error('❌ Create carousel error:', error.response?.data || error.message);
            throw new BadRequestException(
                'Failed to create carousel container: ' +
                (error.response?.data?.error?.message || error.message),
            );
        }
    }

    async waitForMediaContainer(
        accessToken: string,
        containerId: string,
    ): Promise<void> {
        console.log('⏳ Waiting for media container to be ready:', containerId);
        const maxRetries = 20; // 20 * 3s = 60s max wait
        const delay = 3000;

        for (let i = 0; i < maxRetries; i++) {
            try {
                const { data } = await firstValueFrom(
                    this.httpService.get(
                        `https://graph.facebook.com/v18.0/${containerId}`,
                        {
                            params: {
                                fields: 'status_code,status',
                                access_token: accessToken,
                            },
                        },
                    ),
                );

                console.log(`🔄 Check ${i + 1}/${maxRetries}: Status ${data.status_code} (${data.status})`);

                if (data.status_code === 'FINISHED') {
                    console.log('✅ Media container is ready!');
                    return;
                }

                if (data.status_code === 'ERROR') {
                    throw new Error(`Media container failed with status: ${data.status}`);
                }
            } catch (error) {
                console.warn(`⚠️ Error checking status: ${error.message}`);
            }

            await new Promise(resolve => setTimeout(resolve, delay));
        }

        throw new Error('Media container timed out processing.');
    }

    async publishMediaContainer(
        accessToken: string,
        igUserId: string,
        containerId: string,
    ): Promise<string> {
        console.log('📤 Publishing container:', containerId);

        // Wait for container to be ready before publishing
        await this.waitForMediaContainer(accessToken, containerId);

        try {
            const { data } = await firstValueFrom(
                this.httpService.post(
                    `https://graph.facebook.com/v18.0/${igUserId}/media_publish`,
                    null,
                    {
                        params: {
                            creation_id: containerId,
                            access_token: accessToken,
                        },
                    },
                ),
            );

            console.log('🎉 Post published! Instagram post ID:', data.id);
            return data.id;
        } catch (error) {
            console.error('❌ Publish error:', error.response?.data || error.message);
            throw new BadRequestException(
                'Failed to publish media: ' +
                (error.response?.data?.error?.message || error.message),
            );
        }
    }

    /**
     * Post an Instagram Story
     * @param accountId - Instagram account ID from database
     * @param mediaUrl - URL to the image or video (must be publicly accessible)
     * @returns Story media ID
     */
    async postStory(accountId: string, mediaUrl: string): Promise<{ id: string; permalink?: string }> {
        const account = await this.findOne(accountId);

        console.log('📸 Posting story to @' + account.username);

        try {
            // Step 1: Create story container
            const containerId = await this.createMediaContainer(
                account.accessToken,
                account.instagramUserId,
                {
                    imageUrl: mediaUrl,
                    mediaType: 'STORIES',
                }
            );

            // Step 2: Publish the story
            const mediaId = await this.publishMediaContainer(
                account.accessToken,
                account.instagramUserId,
                containerId
            );

            console.log('✅ Story posted successfully:', mediaId);

            return { id: mediaId };
        } catch (error) {
            console.error('❌ Story posting failed:', error.message);
            throw new BadRequestException(
                'Failed to post story: ' + error.message
            );
        }
    }

    /**
     * Get Instagram account insights/analytics
     * @param accountId - Instagram account ID from database
     * @param metrics - Array of metrics to fetch
     * @param period - Time period (day, week, days_28, lifetime)
     * @returns Analytics data
     */
    async getInsights(
        accountId: string,
        metrics?: string[],
        period: 'day' | 'week' | 'days_28' | 'lifetime' = 'day'
    ): Promise<any> {
        const account = await this.findOne(accountId);

        const defaultMetrics = [
            'impressions',
            'reach',
            'profile_views',
            'follower_count',
        ];

        const metricsToFetch = metrics || defaultMetrics;

        console.log(`📊 Fetching insights for @${account.username}:`, metricsToFetch.join(', '));

        try {
            const { data } = await firstValueFrom(
                this.httpService.get(
                    `https://graph.facebook.com/v18.0/${account.instagramUserId}/insights`,
                    {
                        params: {
                            metric: metricsToFetch.join(','),
                            period: period,
                            access_token: account.accessToken,
                        },
                    },
                ),
            );

            console.log('✅ Insights fetched successfully');
            return data;
        } catch (error) {
            console.error('❌ Insights fetch error:', error.response?.data || error.message);
            throw new BadRequestException(
                'Failed to fetch insights: ' +
                (error.response?.data?.error?.message || error.message),
            );
        }
    }

    /**
     * Get detailed profile analytics including demographics
     * @param accountId - Instagram account ID from database
     * @returns Complete profile analytics
     */
    async getProfileAnalytics(accountId: string): Promise<any> {
        const account = await this.findOne(accountId);

        console.log(`📈 Fetching complete analytics for @${account.username}`);

        try {
            // Get account insights
            const insightsMetrics = [
                'impressions',
                'reach',
                'profile_views',
                'follower_count',
                'email_contacts',
                'phone_call_clicks',
                'text_message_clicks',
                'get_directions_clicks',
                'website_clicks',
            ];

            const { data: insightsData } = await firstValueFrom(
                this.httpService.get(
                    `https://graph.facebook.com/v18.0/${account.instagramUserId}/insights`,
                    {
                        params: {
                            metric: insightsMetrics.join(','),
                            period: 'day',
                            access_token: account.accessToken,
                        },
                    },
                ),
            );

            // Get profile info
            const { data: profileData } = await firstValueFrom(
                this.httpService.get(
                    `https://graph.facebook.com/v18.0/${account.instagramUserId}`,
                    {
                        params: {
                            fields: 'username,followers_count,follows_count,media_count,profile_picture_url,biography',
                            access_token: account.accessToken,
                        },
                    },
                ),
            );

            console.log('✅ Complete analytics fetched');

            return {
                profile: profileData,
                insights: insightsData.data,
                timestamp: new Date().toISOString(),
            };
        } catch (error) {
            console.error('❌ Profile analytics error:', error.response?.data || error.message);
            throw new BadRequestException(
                'Failed to fetch profile analytics: ' +
                (error.response?.data?.error?.message || error.message),
            );
        }
    }

    /**
     * Get insights for a specific media (post/story)
     * @param accountId - Instagram account ID from database
     * @param mediaId - Instagram media ID
     * @returns Media insights
     */
    async getMediaInsights(accountId: string, mediaId: string): Promise<any> {
        const account = await this.findOne(accountId);

        console.log(`📊 Fetching media insights for media ID: ${mediaId}`);

        try {
            const { data } = await firstValueFrom(
                this.httpService.get(
                    `https://graph.facebook.com/v18.0/${mediaId}/insights`,
                    {
                        params: {
                            metric: 'impressions,reach,engagement,saved,likes,comments,shares',
                            access_token: account.accessToken,
                        },
                    },
                ),
            );

            console.log('✅ Media insights fetched');
            return data;
        } catch (error) {
            console.error('❌ Media insights error:', error.response?.data || error.message);
            throw new BadRequestException(
                'Failed to fetch media insights: ' +
                (error.response?.data?.error?.message || error.message),
            );
        }
    }
}
