import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.on('connect', () => {
  console.log('Conexión exitosa a Supabase.');
});

pool.on('error', (err) => {
  console.error('Error inesperado en PostgreSQL:', err);
});