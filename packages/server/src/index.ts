import express from 'express';
import pool from './db';
import requireApiKey from './middleware/apiKey';
import healthRouter from './routes/health';
import sendRouter from './routes/send';

const app = express();

app.use(express.json());

app.use('/health', healthRouter);
app.use('/send', requireApiKey, sendRouter);

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () =>
	console.log(`sendIt listening on :${PORT}`),
);

const shutdown = async (signal: string) => {
	console.log(`${signal} received, shutting down gracefully`);

	// Stop the server from accepting new connections
	server.close(async (err) => {
		if (err) {
			console.error('Error closing HTTP server:', err);
			process.exit(1);
		}
		console.log('HTTP server closed');

		// Now that no more requests are coming in, drain the pool
		try {
			await pool.end();
			console.log('Database pool drained');
			process.exit(0);
		} catch (dbErr) {
			console.error('Error closing database pool:', dbErr);
			process.exit(1);
		}
	});

	// Force exit if the above takes too long (10s)
	setTimeout(() => {
		console.error('Forcing shutdown after timeout');
		process.exit(1);
	}, 10_000).unref(); // .unref() lets the process exit even if the timer is active
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
