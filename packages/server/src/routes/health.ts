import express from 'express';
import pool from '../db';
import transporter from '../mailer';

const router = express.Router();

router.get('/', async (_req, res) => {
	const checks = { smtp: false, db: false };

	try {
		await transporter.verify();
		checks.smtp = true;
	} catch (_) {}

	try {
		await pool.query('SELECT 1');
		checks.db = true;
	} catch (_) {}

	const healthy = Object.values(checks).every(Boolean);
	res.status(healthy ? 200 : 503).json({ ok: healthy, checks });
});

export default router;
