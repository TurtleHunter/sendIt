# @sendit/client

Type-safe client for the [@sendIt/server](../server/README.md) email service. Provides a `SendItClient` class with convenience methods for every built-in template, plus full TypeScript types for building your own.

---

## Installation

`@sendit/client` is an internal workspace package. Add it to any app in the monorepo:

```json
// your-app/package.json
"dependencies": {
  "@sendit/client": "*"
}
```

Then `npm install` from the repo root.

---

## Configuration

The client reads connection details from constructor options or environment variables. Environment variables are the recommended approach for deployed services.

| Option   | Env var           | Description                                              |
|----------|-------------------|----------------------------------------------------------|
| `url`    | `SENDIT_URL`      | Base URL of the sendIt service, e.g. `http://sendit-service:3000` |
| `apiKey` | `SENDIT_API_KEY`  | API key from `sendit-secrets`                            |
| `appId`  | `SENDIT_APP_ID`   | Default app ID for branding (see [Per-app branding](#per-app-branding)) |

```ts
import { SendItClient } from '@sendit/client';

// From env vars (recommended in deployed services)
const email = new SendItClient();

// Or explicitly
const email = new SendItClient({
  url:    'http://sendit-service:3000',
  apiKey: process.env.SENDIT_API_KEY,
  appId:  'my-app',
});
```

Both `url` and `apiKey` are required - the constructor throws if either is missing.

---

## Usage

### Convenience methods

Each built-in template has a dedicated method with a fully typed parameter object.

```ts
// Invite a new user (CN unknown - sends a registration link)
await email.invite({
  to:        'alice@example.com',
  inviteUrl: 'https://my-app.example.com/register?token=abc123',
  invitedBy: 'bob',           // optional
  expiresIn: '48 hours',      // optional, default shown in template
  message:   'Welcome to the team!', // optional
});

// Confirm an access request was received
await email.applicationReceived({
  to:             'alice@example.com',
  name:           'Alice',         // optional
  requestedRoles: 'editor, viewer', // optional
  reason:         'Need access for Q3 project', // optional
});

// Notify a user their request was approved
await email.applicationApproved({
  to:            'alice@example.com',
  name:          'Alice',
  grantedRoles:  'editor',
  grantedGroups: 'engineering',    // optional
  reviewerNote:  'Approved for Q3 project access', // optional
});

// Notify a user their request was denied
await email.applicationDenied({
  to:           'alice@example.com',
  name:         'Alice',
  reviewerNote: 'Access not required for your current role.', // optional
});

// Notify a user their roles or groups changed
await email.roleChanged({
  to:            'alice@example.com',
  name:          'Alice',
  rolesAdded:    'admin',          // optional
  rolesRemoved:  'viewer',         // optional
  groupsAdded:   'ops',            // optional
  groupsRemoved: 'engineering',    // optional
});
```

All methods return `Promise<SendResult>` - see [Handling results](#handling-results).

### Raw send

Use `send()` directly for custom templates or when you need full control:

```ts
await email.send({
  to:       'alice@example.com',
  template: 'my-custom-template',
  data:     { foo: 'bar' },
  appId:    'my-app',             // overrides the instance-level appId
});
```

### Sending to multiple recipients

All methods accept an array for `to`:

```ts
await email.invite({
  to:        ['alice@example.com', 'bob@example.com'],
  inviteUrl: '...',
});
```

---

## Handling results

Every method returns `Promise<SendResult>`, a discriminated union:

```ts
import type { SendResult } from '@sendit/client';

const result = await email.invite({ to: '...', inviteUrl: '...' });

if (result.ok) {
  console.log('Sent, messageId:', result.messageId);
} else {
  console.error('Failed:', result.error);
}
```

The client never throws on send failure - network errors and non-2xx responses are returned as `{ ok: false, error: string }`. Constructor errors (missing `url` or `apiKey`) do throw, so those are caught at startup rather than at send time.

---

## Per-app branding

The `appId` tells the server which branding to use (from address, display name, logo, base URL). It can be set at the instance level or overridden per-send:

```ts
// Instance-level - all sends from this client use 'my-app' branding
const email = new SendItClient({ appId: 'my-app' });

// Per-send override
await email.invite({ to: '...', inviteUrl: '...', appId: 'other-app' });
```

If `appId` is omitted entirely, the server falls back to its `DEFAULT_FROM_*` environment variables. App configs are managed in the `sendit_app_configs` table - see the [server README](../server/README.md).

---

## Custom templates

Apps can define additional templates by augmenting the `TemplateData` interface. This extends `TemplateName` automatically so the types stay in sync.

Create a declaration file in your app (e.g. `src/sendit.d.ts`):

```ts
import '@sendit/client';

declare module '@sendit/client' {
  interface TemplateData {
    'welcome-email': {
      name: string;
      loginUrl: string;
    };
    'password-reset': {
      resetUrl: string;
      expiresIn: string;
    };
  }
}
```

After that, your custom template names appear in autocomplete and are type-checked by `send()`:

```ts
await email.send({
  to:       'alice@example.com',
  template: 'welcome-email',           // autocomplete includes custom templates
  data:     { name: 'Alice', loginUrl: '...' }, // TS errors if loginUrl is missing
});
```

> **Note:** Declaration merging is compile-time only. The corresponding `.hbs` files still need to exist in the server's `templates/` directory at runtime.

---

## Exported types

```ts
import type {
  // Client
  SendItClientConfig,

  // Request / response
  SendRequest,
  SendResponse,
  SendErrorResponse,
  SendResult,

  // Templates
  TemplateName,
  TemplateData,
  AppConfig,

  // Convenience method params
  InviteParams,
  ApplicationReceivedParams,
  ApplicationApprovedParams,
  ApplicationDeniedParams,
  RoleChangedParams,
} from '@sendit/client';
```