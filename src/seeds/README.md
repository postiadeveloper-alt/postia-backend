# Business Profiles Seeding Scripts

This directory contains scripts to populate the `business_profiles` table with example data for testing and development purposes.

## Available Scripts

### 1. Complete Seeding Script (`business-profiles-seed.ts`)
This script creates complete business profiles with associated users and Instagram accounts.

**Features:**
- Creates dummy users if none exist
- Creates dummy Instagram accounts
- Links business profiles to Instagram accounts
- Comprehensive data with realistic examples

**Usage:**
```bash
npm run seed:business-profiles
```

Or run directly:
```bash
npx ts-node -r tsconfig-paths/register src/seeds/business-profiles-seed.ts
```

### 2. Simple Seeding Script (`business-profiles-simple-seed.ts`)  
This script only creates business profiles with placeholder Instagram account IDs.

**Features:**
- Creates only business profiles
- Uses placeholder Instagram account IDs
- Faster execution
- Good for testing business profile structure

**Usage:**
```bash
npm run seed:business-profiles-simple
```

Or run directly:
```bash
npx ts-node -r tsconfig-paths/register src/seeds/business-profiles-simple-seed.ts
```

### 3. SQL Script (`business-profiles-seed.sql`)
Direct SQL script for database insertion.

**Features:**
- Pure SQL approach
- Can be run directly in database client
- Requires manual replacement of Instagram account IDs

**Usage:**
1. Replace placeholder Instagram account IDs with real ones
2. Run in your PostgreSQL client:
```sql
\i src/seeds/business-profiles-seed.sql
```

## Sample Data Included

The scripts create 6 diverse business profiles:

1. **TechFlow Solutions** - Technology & Software company
2. **Bloom & Bake Café** - Food & Beverage business  
3. **FitLife Studio** - Health & Fitness studio
4. **Verde Gardens** - Landscaping & Gardening service
5. **Artisan Jewelry Co.** - Fashion & Accessories brand
6. **Digital Nomad Hub** - Co-working & Community space

Each profile includes:
- Brand information (name, description, values)
- Visual identity (colors, style, tone)
- Content strategy (themes, guidelines, prohibited topics)
- Posting schedules
- Target audience details
- Product/service categories

## Prerequisites

- Database connection configured in `.env`
- TypeORM properly set up
- Required dependencies installed (`typeorm`, `uuid`, etc.)

## Environment Setup

Make sure your `.env` file includes:
```
DATABASE_URL=your_postgres_connection_string
# OR individual connection params:
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=your_username
DB_PASSWORD=your_password
DB_DATABASE=your_database_name
```

## Notes

- Scripts check for existing data to avoid duplicates
- All timestamps are automatically set to current time
- Brand colors are stored as JSON arrays
- Posting schedules use a flexible JSON structure
- Content themes and product categories use simple arrays

## Customization

To add your own business profiles:

1. Edit the `businessProfilesData` array in any of the TypeScript files
2. Follow the existing data structure
3. Ensure Instagram account IDs are valid (for production use)
4. Run the seeding script

## Troubleshooting

**Database Connection Issues:**
- Verify your `.env` configuration
- Ensure PostgreSQL is running
- Check network connectivity

**TypeScript Errors:**
- Run `npm install` to ensure all dependencies
- Verify TypeScript configuration
- Check import paths

**Data Validation Errors:**
- Ensure required fields are present
- Verify data types match entity definitions
- Check foreign key relationships