import { Pool } from 'pg';

const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
	max: 5,
});

pool.on('error', (err) => console.error('Postgres pool error:', err));

export default pool;
