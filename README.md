# Postia Backend - NestJS API

Content planning and scheduler backend for marketing agencies managing multiple Instagram accounts.

## 🚀 Features

- **Authentication**: JWT-based auth with role-based access control
- **Instagram Integration**: Connect and manage multiple Instagram accounts
- **Content Calendar**: Schedule and manage posts across accounts
- **Analytics**: Track Instagram engagement, reach, and insights
- **Trending Topics**: Discover relevant trending topics and hashtags
- **Business Profiles**: Manage brand guidelines and preferences per account

## 📋 Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (NeonDB recommended)
- Instagram Business/Creator Account
- Instagram App credentials (App ID & Secret)

## 🛠️ Installation

1. **Install dependencies:**
```powershell
npm install
```

2. **Setup environment variables:**
```powershell
copy .env.example .env
```

Edit `.env` and configure:
- Database connection (NeonDB PostgreSQL)
- JWT secret
- Instagram API credentials
- OpenAI API key (optional, for AI features)

3. **Run database migrations:**
```powershell
npm run migration:run
```

4. **Start development server:**
```powershell
npm run start:dev
```

The API will be available at `http://localhost:3000`
Swagger documentation at `http://localhost:3000/api/docs`

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Instagram Accounts
- `GET /api/instagram/accounts` - Get all connected accounts
- `GET /api/instagram/auth-url` - Get Instagram OAuth URL
- `POST /api/instagram/connect` - Connect Instagram account
- `POST /api/instagram/accounts/:id/refresh` - Refresh account data
- `DELETE /api/instagram/accounts/:id` - Disconnect account

### Calendar
- `POST /api/calendar/posts` - Create new post
- `GET /api/calendar/posts` - Get all posts
- `GET /api/calendar/posts/account/:accountId` - Get posts by account
- `GET /api/calendar/posts/account/:accountId/range` - Get posts by date range
- `PATCH /api/calendar/posts/:id` - Update post
- `POST /api/calendar/posts/:id/publish` - Publish post to Instagram
- `DELETE /api/calendar/posts/:id` - Delete post

### Analytics
- `GET /api/analytics/account/:accountId` - Get account insights
- `GET /api/analytics/account/:accountId/engagement-rate` - Get engagement rate
- `GET /api/analytics/account/:accountId/demographics` - Get follower demographics
- `GET /api/analytics/account/:accountId/top-posts` - Get top performing posts
- `GET /api/analytics/post/:accountId/:postId` - Get post insights

### Trending
- `GET /api/trending/topics/:accountId` - Get trending topics
- `GET /api/trending/hashtags/:accountId` - Get trending hashtags
- `GET /api/trending/suggestions/:accountId` - Get content suggestions
- `GET /api/trending/competitor/:accountId` - Analyze competitor

### Business Profile
- `POST /api/business-profile` - Create business profile
- `GET /api/business-profile/account/:accountId` - Get profile by account
- `PATCH /api/business-profile/:id` - Update profile
- `DELETE /api/business-profile/:id` - Delete profile

## 🗄️ Database Schema

### Users
- `id` (UUID)
- `email` (unique)
- `password` (hashed)
- `fullName`
- `role` (agency_admin | team_member)
- `agencyName`
- `isActive`

### Instagram Accounts
- `id` (UUID)
- `instagramUserId`
- `username`
- `name`
- `accessToken` (encrypted)
- `followersCount`
- `userId` (FK to users)

### Posts
- `id` (UUID)
- `title`
- `content`
- `hashtags`
- `type` (image | video | carousel | reel | story)
- `status` (draft | scheduled | published | failed)
- `scheduledAt`
- `instagramAccountId` (FK)

### Business Profiles
- `id` (UUID)
- `brandName`
- `industry`
- `targetAudience`
- `brandValues`
- `brandColors`
- `visualStyle`
- `communicationTone`
- `contentThemes`
- `instagramAccountId` (FK)

## 🔐 Authentication Flow

1. User registers/logs in → receives JWT token
2. Include token in Authorization header: `Bearer <token>`
3. All protected routes verify JWT and user permissions

## 📱 Instagram API Integration

### Setup Instagram App
1. Create Facebook App at developers.facebook.com
2. Add Instagram Basic Display product
3. Configure OAuth redirect URI
4. Get App ID and App Secret
5. Add test users or submit for review

### Authentication Flow
1. Get auth URL: `GET /api/instagram/auth-url`
2. Redirect user to Instagram OAuth
3. Instagram redirects back with code
4. Exchange code for token: `POST /api/instagram/callback?code=<code>`
5. Account connected and stored

## 🔧 Scripts

```powershell
# Development
npm run start:dev

# Production build
npm run build
npm run start:prod

# Testing
npm run test
npm run test:e2e
npm run test:cov

# Linting
npm run lint
npm run format

# Database
npm run migration:generate
npm run migration:run
npm run migration:revert
```

## 📊 NeonDB Setup

1. Create account at neon.tech
2. Create new project
3. Copy connection string
4. Update `.env` with database credentials
5. Run migrations

## 🚢 Deployment

### Environment Variables Required
- `NODE_ENV=production`
- `DATABASE_URL` (NeonDB connection string)
- `JWT_SECRET`
- `INSTAGRAM_APP_ID`
- `INSTAGRAM_APP_SECRET`
- `INSTAGRAM_REDIRECT_URI`

### Deploy to Vercel/Railway/Render
```powershell
npm run build
# Follow platform-specific deployment instructions
```

## 🔒 Security Features

- Password hashing with bcrypt
- JWT token authentication
- SQL injection protection (TypeORM)
- CORS configuration
- Input validation with class-validator
- Rate limiting (recommended for production)

## 📝 License

MIT

## 👥 Team

Postia Development Team

---

For frontend integration, see `/frontend/README.md`
