import type {
	ApplicationApprovedParams,
	ApplicationDeniedParams,
	ApplicationReceivedParams,
	InviteParams,
	RoleChangedParams,
	SendItClientConfig,
	SendRequest,
	SendResult,
} from './types';

export class SendItClient {
	private readonly url: string;
	private readonly apiKey: string;
	private readonly appId: string;

	constructor(config: SendItClientConfig = {}) {
		this.url = (config.url ?? process.env.SENDIT_URL ?? '').replace(
			/\/$/,
			'',
		);
		this.apiKey = config.apiKey ?? process.env.SENDIT_API_KEY ?? '';
		this.appId = config.appId ?? process.env.SENDIT_APP_ID ?? '';

		if (!this.url)
			throw new Error('SendItClient: url or SENDIT_URL is required');
		if (!this.apiKey)
			throw new Error(
				'SendItClient: apiKey or SENDIT_API_KEY is required',
			);
	}

	// ── Core send ──────────────────────────────────────────────────────────────

	async send(req: SendRequest): Promise<SendResult> {
		const body: SendRequest = {
			...req,
			appId: req.appId ?? this.appId,
		};

		let res: Response;
		try {
			res = await fetch(`${this.url}/send`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-API-Key': this.apiKey,
				},
				body: JSON.stringify(body),
			});
		} catch (err) {
			const message =
				err instanceof Error ? err.message : 'unknown error';
			console.error('[sendit] Network error:', message);
			return { ok: false, error: 'network_error' };
		}

		if (!res.ok) {
			const text = await res.text().catch(() => '');
			console.error(`[sendit] Send failed (${res.status}):`, text);
			return { ok: false, error: text };
		}

		return res.json() as Promise<SendResult>;
	}

	// ── Convenience methods ────────────────────────────────────────────────────

	invite({ to, appId, ...data }: InviteParams): Promise<SendResult> {
		return this.send({ to, appId, template: 'invite', data });
	}

	applicationReceived({
		to,
		appId,
		...data
	}: ApplicationReceivedParams): Promise<SendResult> {
		return this.send({
			to,
			appId,
			template: 'access-application-received',
			data,
		});
	}

	applicationApproved({
		to,
		appId,
		...data
	}: ApplicationApprovedParams): Promise<SendResult> {
		return this.send({
			to,
			appId,
			template: 'access-application-approved',
			data,
		});
	}

	applicationDenied({
		to,
		appId,
		...data
	}: ApplicationDeniedParams): Promise<SendResult> {
		return this.send({
			to,
			appId,
			template: 'access-application-denied',
			data,
		});
	}

	roleChanged({
		to,
		appId,
		...data
	}: RoleChangedParams): Promise<SendResult> {
		return this.send({ to, appId, template: 'role-changed', data });
	}
}
