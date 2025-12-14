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
        const authUrl = 'https://www.facebook.com/v21.0/dialog/oauth';
        const scope = [
            'instagram_basic',
            'instagram_content_publish',
            'pages_show_list',
            'pages_read_engagement',
        ].join(',');

        const params = new URLSearchParams({
            client_id: appId,
            redirect_uri: redirectUri,
            scope: scope,
            response_type: 'code',
            state: userId, // Pass userId in state to link account after OAuth
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
                this.httpService.get('https://graph.facebook.com/v21.0/oauth/access_token', {
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

    async connectAccount(userId: string, accessToken: string): Promise<InstagramAccount> {
        try {
            console.log('🔗 Connecting Instagram account for user:', userId);

            // Step 1: Get user's Facebook Pages
            const { data: pagesData } = await firstValueFrom(
                this.httpService.get('https://graph.facebook.com/v21.0/me/accounts', {
                    params: {
                        access_token: accessToken,
                        fields: 'id,name,access_token,instagram_business_account',
                    },
                }),
            );

            console.log('📄 Facebook Pages found:', pagesData.data?.length || 0);

            if (!pagesData.data || pagesData.data.length === 0) {
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

            for (const page of pagesData.data) {
                if (page.instagram_business_account) {
                    selectedPage = page;
                    igAccountId = page.instagram_business_account.id;
                    break;
                }
            }

            // If no direct IG account found, try fetching it for each page
            if (!selectedPage) {
                console.log('⚠️ No Instagram account found directly, checking each page...');
                for (const page of pagesData.data) {
                    try {
                        const { data: igData } = await firstValueFrom(
                            this.httpService.get(`https://graph.facebook.com/v21.0/${page.id}`, {
                                params: {
                                    fields: 'instagram_business_account',
                                    access_token: page.access_token,
                                },
                            }),
                        );

                        if (igData.instagram_business_account) {
                            selectedPage = page;
                            igAccountId = igData.instagram_business_account.id;
                            break;
                        }
                    } catch (err) {
                        console.log(`Page ${page.name} has no Instagram account`);
                    }
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
            const { data: profileData } = await firstValueFrom(
                this.httpService.get(`https://graph.facebook.com/v21.0/${igAccountId}`, {
                    params: {
                        fields: 'id,username,name,profile_picture_url,biography,followers_count,follows_count,media_count',
                        access_token: selectedPage.access_token,
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
                existingAccount.accessToken = selectedPage.access_token;
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
                accessToken: selectedPage.access_token,
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
                    `https://graph.facebook.com/v21.0/${igUserId}/media`,
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
                    `https://graph.facebook.com/v21.0/${igUserId}/media`,
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
                        `https://graph.facebook.com/v21.0/${containerId}`,
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
                    `https://graph.facebook.com/v21.0/${igUserId}/media_publish`,
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
}
