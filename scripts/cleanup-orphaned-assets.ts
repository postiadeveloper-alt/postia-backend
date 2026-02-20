/**
 * Cleanup script: Deletes all image assets (DB records + GCS files) that are NOT
 * associated to any business profile (businessProfileId IS NULL).
 *
 * These are leftover assets from before the per-business-profile implementation.
 *
 * Usage:
 *   cd backend
 *   npx ts-node scripts/cleanup-orphaned-assets.ts [--dry-run]
 *
 * Options:
 *   --dry-run   List what would be deleted without actually deleting anything.
 */

import { DataSource } from 'typeorm';
import { Storage } from '@google-cloud/storage';
import { config as dotenvConfig } from 'dotenv';
import * as path from 'path';

// Load env from backend/.env
dotenvConfig({ path: path.resolve(__dirname, '..', '.env') });

// ── Config ──────────────────────────────────────────────────────────────────
const DB_URL = process.env.DATABASE_URL;
const BUCKET_NAME = process.env.GCS_BUCKET_NAME;
const PROJECT_ID = process.env.GCP_PROJECT_ID;
const DRY_RUN = process.argv.includes('--dry-run');

if (!DB_URL) {
  console.error('❌ DATABASE_URL is not set in .env');
  process.exit(1);
}
if (!BUCKET_NAME) {
  console.error('❌ GCS_BUCKET_NAME is not set in .env');
  process.exit(1);
}
if (!PROJECT_ID) {
  console.error('❌ GCP_PROJECT_ID is not set in .env');
  process.exit(1);
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('='.repeat(60));
  console.log(DRY_RUN ? '🔍  DRY RUN — nothing will be deleted' : '🗑️   LIVE RUN — assets will be permanently deleted');
  console.log('='.repeat(60));
  console.log(`Database : ${DB_URL!.replace(/\/\/.*:.*@/, '//***:***@')}`);
  console.log(`Bucket   : ${BUCKET_NAME}`);
  console.log();

  // 1. Connect to database
  const dataSource = new DataSource({
    type: 'postgres',
    url: DB_URL,
    ssl: { rejectUnauthorized: false },
    logging: false,
  });

  await dataSource.initialize();
  console.log('✅ Connected to database');

  // 2. Query orphaned TEMPLATE and CONTENT assets (no businessProfileId)
  //    OUTPUT assets are kept — they can exist without a profile.
  const rows: Array<{ id: string; gcsPath: string; type: string; originalName: string; createdAt: string }> =
    await dataSource.query(
      `SELECT id, "gcsPath", type, "originalName", "createdAt"
       FROM image_assets
       WHERE "businessProfileId" IS NULL
         AND type IN ('TEMPLATE', 'CONTENT')
       ORDER BY "createdAt" ASC`,
    );

  console.log(`\n📦 Found ${rows.length} orphaned template/content asset(s) without a business profile.\n`);

  if (rows.length === 0) {
    console.log('Nothing to do. Exiting.');
    await dataSource.destroy();
    return;
  }

  // Print summary table
  const typeCounts: Record<string, number> = {};
  for (const row of rows) {
    typeCounts[row.type] = (typeCounts[row.type] || 0) + 1;
  }
  console.log('By type:');
  for (const [type, count] of Object.entries(typeCounts)) {
    console.log(`  ${type.padEnd(12)} ${count}`);
  }
  console.log();

  // 3. Initialize GCS
  const storage = new Storage({ projectId: PROJECT_ID });
  const bucket = storage.bucket(BUCKET_NAME!);

  let deletedGcs = 0;
  let failedGcs = 0;
  let deletedDb = 0;

  for (const row of rows) {
    const label = `[${row.type}] ${row.gcsPath} (${row.originalName})`;

    if (DRY_RUN) {
      console.log(`  Would delete: ${label}`);
      continue;
    }

    // Delete from GCS
    try {
      if (row.gcsPath) {
        await bucket.file(row.gcsPath).delete({ ignoreNotFound: true });
        deletedGcs++;
      }
    } catch (err: any) {
      console.warn(`  ⚠️  GCS delete failed for ${row.gcsPath}: ${err.message}`);
      failedGcs++;
    }

    // Delete DB record
    try {
      await dataSource.query(`DELETE FROM image_assets WHERE id = $1`, [row.id]);
      deletedDb++;
      console.log(`  ✅ Deleted: ${label}`);
    } catch (err: any) {
      console.error(`  ❌ DB delete failed for ${row.id}: ${err.message}`);
    }
  }

  // 4. Summary
  console.log('\n' + '='.repeat(60));
  if (DRY_RUN) {
    console.log(`🔍 DRY RUN complete — ${rows.length} asset(s) would be deleted.`);
    console.log('   Re-run without --dry-run to actually delete them.');
  } else {
    console.log(`🗑️  Cleanup complete:`);
    console.log(`   GCS files deleted : ${deletedGcs}`);
    console.log(`   GCS failures      : ${failedGcs}`);
    console.log(`   DB records deleted : ${deletedDb}`);
  }
  console.log('='.repeat(60));

  await dataSource.destroy();
}

main().catch((err) => {
  console.error('💥 Script failed:', err);
  process.exit(1);
});
