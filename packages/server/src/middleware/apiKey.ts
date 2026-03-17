import type { RequestHandler } from 'express';

/**
 * Validates the X-API-Key header against API_KEYS env var.
 * API_KEYS is a comma-separated list to support key rotation:
 *   API_KEYS=key-abc123,key-def456
 */
const requireApiKey: RequestHandler = (req, res, next) => {
	const provided = req.headers['x-api-key'];
	if (!provided) {
		return res.status(401).json({ error: 'Missing API key' });
	}

	const validKeys = (process.env.API_KEYS || '')
		.split(',')
		.map((k) => k.trim())
		.filter(Boolean);
	if (Array.isArray(provided) || !validKeys.includes(provided)) {
		return res.status(401).json({ error: 'Invalid API key' });
	}

	next();
};

export default requireApiKey;
