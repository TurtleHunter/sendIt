import pool from './db';

export type AppConfig = {
	from_address: string;
	from_name: string;
	logo_url: string | null;
	base_url: string;
};

/**
 * Resolves branding/config for a given appId.
 * Falls back to env-configured defaults if the app isn't in the DB.
 *
 * Expected DB table:
 *   CREATE TABLE sendit_app_configs (
 *     app_id      TEXT PRIMARY KEY,
 *     from_address TEXT NOT NULL,
 *     from_name    TEXT NOT NULL,
 *     logo_url     TEXT,
 *     base_url     TEXT NOT NULL
 *   );
 */
const getAppConfig = async (appId: string | undefined): Promise<AppConfig> => {
	if (!appId) return defaultConfig();

	try {
		const result = await pool.query(
			'SELECT from_address, from_name, logo_url, base_url FROM sendit_app_configs WHERE app_id = $1',
			[appId],
		);
		if (result.rows.length) return result.rows[0];
	} catch (err) {
		console.error(
			'Failed to load app config from DB, using defaults:',
			err,
		);
	}

	return defaultConfig();
};

const defaultConfig = (): AppConfig => ({
	from_address: process.env.DEFAULT_FROM_ADDRESS || 'no-reply@example.com',
	from_name: process.env.DEFAULT_FROM_NAME || 'System',
	logo_url: process.env.DEFAULT_LOGO_URL || null,
	base_url: process.env.DEFAULT_BASE_URL || 'https://example.com',
});

export default getAppConfig;
