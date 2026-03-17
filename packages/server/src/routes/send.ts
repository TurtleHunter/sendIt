import express, { type Request } from 'express';
import getAppConfig, { type AppConfig } from '../appConfig';
import transporter from '../mailer';
import renderTemplate from '../templates';

const router = express.Router();

type ResponseBody = { ok: boolean; messageId: string } | { error: string };

type SendBody = {
	to: string | string[];
	template: string;
	data?: Record<string, unknown>;
	appId?: string;
};

/**
 * POST /send
 *
 * Body:
 * {
 *   to:       string | string[],   // recipient(s)
 *   template: string,              // template name, e.g. "invite"
 *   data:     object,              // template variables
 *   appId:    string               // which app is sending (for branding)
 * }
 */
router.post('/', async (req: Request<unknown, ResponseBody, SendBody>, res) => {
	const { to, template, data = {}, appId } = req.body;

	if (!to || !template) {
		return res
			.status(400)
			.json({ error: '`to` and `template` are required' });
	}

	let appConfig: AppConfig;
	try {
		appConfig = await getAppConfig(appId);
	} catch (err) {
		console.error('getAppConfig error:', err);
		return res.status(500).json({ error: 'Failed to load app config' });
	}

	let html: string;
	try {
		html = renderTemplate(template, { ...data, app: appConfig });
	} catch (err) {
		console.error('Template render error:', err);
		return res.status(400).json({ error: err instanceof Error ? err.message : 'Template error' });
	}

	// Subject line: let callers pass one, otherwise derive from template name
	const subject: string = data.subject as string || subjectFromTemplate(template, appConfig);

	try {
		const info = await transporter.sendMail({
			from: `"${appConfig.from_name}" <${appConfig.from_address}>`,
			to: Array.isArray(to) ? to.join(', ') : to,
			subject,
			html,
		});

		console.log(
			`[sendIt] sent ${template} → ${to} (messageId: ${info.messageId})`,
		);
		res.json({ ok: true, messageId: info.messageId });
	} catch (err) {
		console.error('SMTP send error:', err);
		res.status(502).json({ error: 'Failed to send email' });
	}
});

const subjectFromTemplate = (template: string, appConfig: AppConfig): string => {
	const subjects = {
		'access-application-received': `Your access request has been received - ${appConfig.from_name}`,
		'access-application-approved': `Your access request was approved - ${appConfig.from_name}`,
		'access-application-denied': `Your access request was denied - ${appConfig.from_name}`,
		invite: `You've been invited to ${appConfig.from_name}`,
		'role-changed': `Your permissions have been updated - ${appConfig.from_name}`,
	};
	return subjects[template as keyof typeof subjects] || `Notification from ${appConfig.from_name}`;
};

export default router;
