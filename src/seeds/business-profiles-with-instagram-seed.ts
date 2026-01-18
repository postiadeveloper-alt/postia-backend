import { DataSource } from 'typeorm';
import { BusinessProfile } from '../business-profile/entities/business-profile.entity';
import { InstagramAccount } from '../instagram/entities/instagram-account.entity';
import { User } from '../users/entities/user.entity';
import dataSource from '../config/typeorm.config';
import { v4 as uuidv4 } from 'uuid';

const businessProfilesData = [
  {
    brandName: 'TechFlow Solutions',
    brandDescription: 'Innovative software solutions for modern businesses. We specialize in cloud computing, AI integration, and digital transformation.',
    industry: 'Technology & Software',
    targetAudience: 'Small to medium businesses, tech entrepreneurs, startup founders aged 28-45',
    brandValues: 'Innovation, Reliability, Customer Success, Transparency',
    brandColors: ['#2563EB', '#1D4ED8', '#3B82F6', '#FFFFFF', '#F8FAFC'],
    logoUrl: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=200&h=200',
    visualStyle: 'modern',
    communicationTone: 'professional',
    contentThemes: ['tech trends', 'business automation', 'productivity tips', 'case studies', 'industry insights'],
    productCategories: ['software', 'consulting', 'cloud services', 'ai solutions'],
    postingSchedule: {
      monday: ['09:00', '15:00'],
      tuesday: ['09:00', '15:00'], 
      wednesday: ['09:00', '15:00'],
      thursday: ['09:00', '15:00'],
      friday: ['09:00', '14:00'],
      frequency: 'daily'
    },
    contentGuidelines: 'Always maintain professional tone, use our brand colors in visuals, focus on value-driven content, include clear call-to-actions',
    prohibitedTopics: ['politics', 'religion', 'controversial social issues']
  },
  {
    brandName: 'Bloom & Bake Café',
    brandDescription: 'Artisanal coffee and freshly baked goods made with love. A cozy neighborhood café where community meets quality.',
    industry: 'Food & Beverage',
    targetAudience: 'Coffee enthusiasts, local community members, remote workers, food lovers aged 22-50',
    brandValues: 'Quality, Community, Sustainability, Authenticity',
    brandColors: ['#8B5A3C', '#D2B48C', '#F5E6D3', '#2D5F3F', '#FFFFFF'],
    logoUrl: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=200&h=200',
    visualStyle: 'cozy',
    communicationTone: 'friendly',
    contentThemes: ['coffee culture', 'baking tips', 'local events', 'seasonal specials', 'behind the scenes'],
    productCategories: ['coffee', 'pastries', 'breakfast', 'lunch', 'catering'],
    postingSchedule: {
      monday: ['07:00', '16:00'],
      tuesday: ['07:00', '16:00'],
      wednesday: ['07:00', '16:00'],
      thursday: ['07:00', '16:00'],
      friday: ['07:00', '16:00'],
      saturday: ['08:00', '15:00'],
      sunday: ['08:00', '14:00'],
      frequency: 'twice_daily'
    },
    contentGuidelines: 'Use warm, inviting imagery, showcase fresh products, engage with local community, share stories behind recipes',
    prohibitedTopics: ['diet culture', 'health claims', 'negative competitor mentions']
  },
  {
    brandName: 'FitLife Studio',
    brandDescription: 'Premium fitness studio offering personalized training, group classes, and wellness coaching. Transform your body and mind.',
    industry: 'Health & Fitness',
    targetAudience: 'Fitness enthusiasts, busy professionals, health-conscious individuals aged 25-55',
    brandValues: 'Health, Motivation, Community, Excellence',
    brandColors: ['#FF6B35', '#F7931E', '#FFE066', '#2C3E50', '#FFFFFF'],
    logoUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&h=200',
    visualStyle: 'energetic',
    communicationTone: 'motivational',
    contentThemes: ['workout routines', 'nutrition tips', 'success stories', 'fitness challenges', 'wellness advice'],
    productCategories: ['personal training', 'group classes', 'nutrition coaching', 'fitness programs'],
    postingSchedule: {
      monday: ['06:00', '18:00'],
      tuesday: ['06:00', '18:00'],
      wednesday: ['06:00', '18:00'],
      thursday: ['06:00', '18:00'],
      friday: ['06:00', '17:00'],
      saturday: ['08:00', '15:00'],
      frequency: 'daily'
    },
    contentGuidelines: 'Show diverse body types, focus on health over appearance, use action shots, include proper form demonstrations',
    prohibitedTopics: ['extreme diets', 'body shaming', 'unrealistic expectations']
  },
  {
    brandName: 'Verde Gardens',
    brandDescription: 'Sustainable landscaping and garden design services. Creating beautiful outdoor spaces that work in harmony with nature.',
    industry: 'Landscaping & Gardening',
    targetAudience: 'Homeowners, property managers, eco-conscious consumers aged 30-65',
    brandValues: 'Sustainability, Beauty, Craftsmanship, Environmental Stewardship',
    brandColors: ['#4A7C59', '#8FBC8F', '#F0F8E8', '#8B4513', '#FFFFFF'],
    logoUrl: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=200&h=200',
    visualStyle: 'natural',
    communicationTone: 'educational',
    contentThemes: ['garden design', 'plant care', 'sustainable practices', 'seasonal gardening', 'before/after transformations'],
    productCategories: ['landscape design', 'garden maintenance', 'plant installation', 'hardscaping'],
    postingSchedule: {
      tuesday: ['10:00', '16:00'],
      thursday: ['10:00', '16:00'],
      saturday: ['09:00', '14:00'],
      frequency: 'three_times_weekly'
    },
    contentGuidelines: 'Showcase natural beauty, provide educational value, highlight eco-friendly practices, use high-quality plant photography',
    prohibitedTopics: ['chemical pesticides promotion', 'non-native invasive species']
  },
  {
    brandName: 'Artisan Jewelry Co.',
    brandDescription: 'Handcrafted jewelry pieces that tell your unique story. Each piece is carefully designed and made with premium materials.',
    industry: 'Fashion & Accessories',
    targetAudience: 'Fashion-forward women, gift buyers, jewelry enthusiasts aged 25-50',
    brandValues: 'Craftsmanship, Uniqueness, Quality, Personal Expression',
    brandColors: ['#D4AF37', '#2C2C54', '#F8F8FF', '#C0C0C0', '#000000'],
    logoUrl: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=200&h=200',
    visualStyle: 'elegant',
    communicationTone: 'sophisticated',
    contentThemes: ['jewelry styling', 'craftsmanship stories', 'new collections', 'styling tips', 'custom designs'],
    productCategories: ['necklaces', 'earrings', 'bracelets', 'rings', 'custom jewelry'],
    postingSchedule: {
      monday: ['11:00', '19:00'],
      wednesday: ['11:00', '19:00'],
      friday: ['11:00', '19:00'],
      sunday: ['14:00'],
      frequency: 'four_times_weekly'
    },
    contentGuidelines: 'Use elegant lighting for product shots, show jewelry being worn, highlight craftsmanship details, maintain luxury aesthetic',
    prohibitedTopics: ['fast fashion', 'mass production']
  },
  {
    brandName: 'Digital Nomad Hub',
    brandDescription: 'Co-working space and community for digital nomads and remote workers. Work, connect, and explore in a vibrant environment.',
    industry: 'Co-working & Community',
    targetAudience: 'Digital nomads, remote workers, freelancers, entrepreneurs aged 24-40',
    brandValues: 'Freedom, Community, Productivity, Adventure',
    brandColors: ['#FF4081', '#00BCD4', '#FFC107', '#4CAF50', '#FFFFFF'],
    logoUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=200&h=200',
    visualStyle: 'vibrant',
    communicationTone: 'casual',
    contentThemes: ['remote work tips', 'community events', 'member spotlights', 'workspace features', 'location highlights'],
    productCategories: ['co-working space', 'event hosting', 'community membership', 'networking'],
    postingSchedule: {
      monday: ['09:00', '17:00'],
      tuesday: ['09:00', '17:00'],
      wednesday: ['09:00', '17:00'],
      thursday: ['09:00', '17:00'],
      friday: ['09:00', '15:00'],
      frequency: 'daily'
    },
    contentGuidelines: 'Show diverse community members, highlight collaborative atmosphere, showcase amenities, promote events actively',
    prohibitedTopics: ['work-life balance myths', 'location discrimination']
  }
];

async function seedBusinessProfilesWithInstagramCheck() {
  try {
    await dataSource.initialize();
    console.log('Data Source has been initialized!');

    const businessProfileRepository = dataSource.getRepository(BusinessProfile);
    const instagramAccountRepository = dataSource.getRepository(InstagramAccount);
    const userRepository = dataSource.getRepository(User);

    // Check if there are existing Instagram accounts
    const existingInstagramAccounts = await instagramAccountRepository.find({
      relations: ['businessProfile']
    });
    console.log(`Found ${existingInstagramAccounts.length} existing Instagram accounts`);

    // Filter out Instagram accounts that already have business profiles
    const availableInstagramAccounts = existingInstagramAccounts.filter(
      account => !account.businessProfile
    );
    console.log(`Found ${availableInstagramAccounts.length} available Instagram accounts (without business profiles)`);

    let instagramAccountsToUse = availableInstagramAccounts;

    if (instagramAccountsToUse.length < businessProfilesData.length) {
      console.log(`⚠️  Need ${businessProfilesData.length - instagramAccountsToUse.length} more Instagram accounts. Creating additional placeholder accounts...`);
      
      // First, let's check if there are users, if not create one
      let users = await userRepository.find();
      if (users.length === 0) {
        console.log('Creating a dummy user for Instagram accounts...');
        const dummyUser = userRepository.create({
          email: 'dummy@example.com',
          password: 'password123', // In real app, this should be hashed
          fullName: 'Demo User'
        });
        const savedUser = await userRepository.save(dummyUser);
        users = [savedUser];
      }

      // Create additional placeholder Instagram accounts
      const accountNames = ['techflow_solutions', 'bloomandbake_cafe', 'fitlife_studio', 'verde_gardens', 'artisan_jewelry_co', 'digitalnomad_hub'];
      const startIndex = instagramAccountsToUse.length;
      
      for (let i = startIndex; i < businessProfilesData.length; i++) {
        const account = instagramAccountRepository.create({
          instagramUserId: `placeholder_${Date.now()}_${i + 1}`,
          username: `${accountNames[i]}_${Date.now()}`,
          name: businessProfilesData[i].brandName,
          profilePictureUrl: businessProfilesData[i].logoUrl,
          accessToken: `placeholder_token_${Date.now()}_${i + 1}`,
          tokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          isActive: false, // Set to false since these are placeholder accounts
          user: users[0], // Use the first available user
          userId: users[0].id
        });
        
        const savedAccount = await instagramAccountRepository.save(account);
        instagramAccountsToUse.push(savedAccount);
        console.log(`✅ Created placeholder Instagram account: ${savedAccount.username}`);
      }
    }

    console.log('Creating business profiles...');

    const businessProfiles = [];
    for (let i = 0; i < businessProfilesData.length; i++) {
      const profileData = businessProfilesData[i];
      
      // Check if business profile with this brand name already exists
      const existingProfile = await businessProfileRepository.findOne({
        where: { brandName: profileData.brandName }
      });

      if (!existingProfile) {
        // Use available Instagram account
        const instagramAccount = instagramAccountsToUse[i];
        
        const businessProfile = businessProfileRepository.create({
          ...profileData,
          instagramAccountId: instagramAccount.id,
          instagramAccount: instagramAccount
        });

        const savedProfile = await businessProfileRepository.save(businessProfile);
        businessProfiles.push(savedProfile);
        console.log(`✅ Created business profile for ${profileData.brandName} linked to Instagram account ${instagramAccount.username}`);
      } else {
        console.log(`⚠️  Business profile already exists for ${profileData.brandName}`);
        businessProfiles.push(existingProfile);
      }
    }

    console.log(`\n🎉 Successfully created/verified ${businessProfiles.length} business profiles!`);
    
    // Display summary
    console.log('\n📊 Business Profiles Summary:');
    for (const profile of businessProfiles) {
      const instagramAccount = await instagramAccountRepository.findOne({
        where: { id: profile.instagramAccountId }
      });
      console.log(`${businessProfiles.indexOf(profile) + 1}. ${profile.brandName} (${profile.industry}) → @${instagramAccount?.username || 'unknown'}`);
    }

    return businessProfiles;

  } catch (error) {
    console.error('Error during seeding:', error);
    throw error;
  } finally {
    await dataSource.destroy();
    console.log('\n🔌 Database connection closed.');
  }
}

// Run the seeding function
if (require.main === module) {
  seedBusinessProfilesWithInstagramCheck().catch(console.error);
}

export { seedBusinessProfilesWithInstagramCheck, businessProfilesData };