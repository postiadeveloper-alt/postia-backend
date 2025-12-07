import { DataSource, DataSourceOptions } from 'typeorm';
import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

export const typeOrmConfig: DataSourceOptions = {
  type: 'postgres',
  // Use DATABASE_URL if available (Cloud Run), otherwise use individual params
  ...(process.env.DATABASE_URL 
    ? { url: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT, 10) || 5432,
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
      }
  ),
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  synchronize: process.env.NODE_ENV === 'development', // Only for development
  ssl: process.env.DB_SSL === 'true', // Use SSL based on env var
  extra: process.env.DB_SSL === 'true' ? {
    ssl: {
      rejectUnauthorized: false,
    },
  } : {},
  logging: process.env.NODE_ENV === 'development', // Log in development only
  connectTimeoutMS: 10000, // 10 second connection timeout
  maxQueryExecutionTime: 5000, // Log queries taking more than 5 seconds
};

const dataSource = new DataSource(typeOrmConfig);
export default dataSource;
