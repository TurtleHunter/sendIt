// ─── App Config ──────────────────────────────────────────────────────────────

export interface AppConfig {
	from_address: string;
	from_name: string;
	logo_url: string | null;
	base_url: string;
}

// ─── Templates ───────────────────────────────────────────────────────────────

/** Template variable shapes - enforced when using convenience methods */
export interface TemplateData {
	invite: {
		inviteUrl: string;
		invitedBy?: string;
		expiresIn?: string;
		message?: string;
	};
	'access-application-received': {
		name?: string;
		requestedRoles?: string;
		reason?: string;
	};
	'access-application-approved': {
		name?: string;
		grantedRoles?: string;
		grantedGroups?: string;
		reviewerNote?: string;
	};
	'access-application-denied': {
		name?: string;
		reviewerNote?: string;
	};
	'role-changed': {
		name?: string;
		rolesAdded?: string;
		rolesRemoved?: string;
		groupsAdded?: string;
		groupsRemoved?: string;
	};
}

export type TemplateName = keyof TemplateData;

// ─── Request / Response ───────────────────────────────────────────────────────

/**
 * The raw POST /send request body.
 * Callers using SendItClient never construct this directly -
 * the typed convenience methods do it for them.
 */
export interface SendRequest {
	to: string | string[];
	template: TemplateName | (string & {}); // allows custom templates outside the union
	data?: Record<string, unknown>;
	appId?: string;
}

export interface SendResponse {
	ok: true;
	messageId: string;
}

export interface SendErrorResponse {
	ok?: false;
	error: string;
}

export type SendResult = SendResponse | SendErrorResponse;

// ─── Client Config ────────────────────────────────────────────────────────────

export interface SendItClientConfig {
	/** Base URL of the sendIt service, e.g. 'http://sendit-service:3000' */
	url?: string;
	/** API key - one of the comma-separated values in the sendit-secrets */
	apiKey?: string;
	/** Default appId sent with every request from this client instance */
	appId?: string;
}

// ─── Convenience method param types ──────────────────────────────────────────

type WithRecipient<T> = T & {
	to: string | string[];
	/** Override the instance-level appId for this send */
	appId?: string;
};

export type InviteParams = WithRecipient<TemplateData['invite']>;
export type ApplicationReceivedParams = WithRecipient<
	TemplateData['access-application-received']
>;
export type ApplicationApprovedParams = WithRecipient<
	TemplateData['access-application-approved']
>;
export type ApplicationDeniedParams = WithRecipient<
	TemplateData['access-application-denied']
>;
export type RoleChangedParams = WithRecipient<TemplateData['role-changed']>;
