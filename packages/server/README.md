# @sendit/server

The sendIt email service. Accepts `POST /send` from trusted internal services, renders a Handlebars template, and dispatches via SMTP. Per-app branding is resolved from Postgres so one instance serves all your apps.

---

## Architecture

```
webapp-a    ────┐
                │  POST /send  (X-API-Key)
webapp-b    ────┼─────────────► @sendit/server ──► SMTP
                │                     │
webapp-c    ────┘                     └──► Postgres (sendit_app_configs)
```

The server is **ClusterIP only** - never exposed outside the cluster. Callers authenticate with a shared API key in the `X-API-Key` header. The `NetworkPolicy` restricts inbound traffic to pods labelled `sendit-client: "true"`.

For the typed client used by calling services, see [`@sendit/client`](../client/README.md).

---

## Development

```bash
# From the repo root
npm install

# Run the server in watch mode
npm run dev --workspace=packages/server

# Type check without building
npm run typecheck --workspace=packages/server
```

The `dev` script runs `tsup --watch` and `node --watch dist/index.js` in parallel - tsup recompiles on source changes, Node restarts on dist changes.

---

## Environment variables

| Variable               | Required | Description                                              |
|------------------------|----------|----------------------------------------------------------|
| `SMTP_HOST`            | Yes      | SMTP server hostname                                     |
| `SMTP_USER`            | Yes      | SMTP username                                            |
| `SMTP_PASS`            | Yes      | SMTP password                                            |
| `DATABASE_URL`         | Yes      | Postgres connection string                               |
| `API_KEYS`             | Yes      | Comma-separated valid API keys (supports rotation)       |
| `PORT`                 | No       | HTTP port (default: `3000`)                              |
| `SMTP_PORT`            | No       | SMTP port (default: `587`)                               |
| `SMTP_SECURE`          | No       | Use TLS - set to `"true"` for port 465 (default: `false`) |
| `DEFAULT_FROM_ADDRESS` | No       | Fallback from address when `appId` isn't in the DB      |
| `DEFAULT_FROM_NAME`    | No       | Fallback display name (default: `"System"`)              |
| `DEFAULT_LOGO_URL`     | No       | Fallback logo URL for email templates                    |
| `DEFAULT_BASE_URL`     | No       | Fallback base URL used in email links                    |

Sensitive variables (`SMTP_*`, `DATABASE_URL`, `API_KEYS`) are injected from the `sendit-secrets` Kubernetes secret - never set them in `values.yaml`.

---

## API

### `POST /send`

Requires `X-API-Key` header.

**Request body:**

```ts
{
  to:       string | string[],  // recipient address(es)
  template: string,             // template name, e.g. "invite"
  data?:    object,             // template variables
  appId?:   string              // selects branding from sendit_app_configs
}
```

**Response:**

```ts
// 200
{ ok: true, messageId: string }

// 400 - missing fields or unknown template
{ error: string }

// 401 - missing or invalid API key
{ error: string }

// 502 - SMTP delivery failed
{ error: string }
```

### `GET /health`

No authentication required. Used by Helm liveness and readiness probes.

```ts
// 200 - all checks passing
{ ok: true,  checks: { smtp: true,  db: true  } }

// 503 - one or more checks failing
{ ok: false, checks: { smtp: false, db: true  } }
```

---

## Templates

Built-in templates live in `templates/`. Each is a standalone Handlebars file - there is no layout inheritance, so each template is self-contained HTML.

| Template name                     | Sent when                            |
|-----------------------------------|--------------------------------------|
| `invite`                          | Admin sends an invite link           |
| `access-application-received`     | User submits an access request       |
| `access-application-approved`     | Admin approves a request             |
| `access-application-denied`       | Admin denies a request               |
| `role-changed`                    | Admin updates a user's roles/groups  |

Every template receives an `app` object alongside its own variables:

```ts
app.from_name    // e.g. "Webapp A"
app.from_address // e.g. "no-reply@webapp-a.example.com"
app.logo_url     // nullable
app.base_url     // e.g. "https://webapp-a.example.com"
```

### Adding a custom template

1. Add the `.hbs` file to `templates/`:

```handlebars
<!-- templates/my-custom-template.hbs -->
<!DOCTYPE html>
<html>
  ...
  <p>Hello {{name}}, here is your <a href="{{link}}">link</a>.</p>
  ...
</html>
```

2. Declare the template's data shape in the calling app so `@sendit/client` enforces it at compile time - see [Custom templates](../client/README.md#custom-templates) in the client README.

---

## Per-app branding

Run the migration, then insert one row per app:

```bash
psql $DATABASE_URL -f migrations/001_sendit_app_configs.sql
```

```sql
INSERT INTO sendit_app_configs (app_id, from_address, from_name, base_url, logo_url)
VALUES
  ('webapp-a', 'no-reply@webapp-a.example.com', 'Webapp A', 'https://webapp-a.example.com', 'https://cdn.example.com/logo.png'),
  ('webapp-b', 'no-reply@webapp-b.example.com', 'Webapp B', 'https://webapp-b.example.com', NULL);
```

If a request arrives with an `appId` that isn't in the table, the server falls back to `DEFAULT_FROM_*` env vars silently.

---

## Deployment

### Secrets

Create this before running `helm install`. Never put these values in `values.yaml`.

```bash
kubectl create secret generic sendit-secrets \
  --from-literal=smtp-host="smtp.example.com" \
  --from-literal=smtp-user="sendit@example.com" \
  --from-literal=smtp-pass="..." \
  --from-literal=database-url="postgres://user:pass@host:5432/dbname" \
  --from-literal=default-from-address="no-reply@example.com" \
  --from-literal=api-keys="$(openssl rand -base64 24),$(openssl rand -base64 24)"
```

Two keys are generated above - distribute one per calling service. This means you can rotate a single service's key without updating all callers at once.

### Helm

```bash
helm install sendit ./charts/sendit \
  --set image.repository=your-registry/sendit \
  --set image.tag=1.0.0
```

To allow a service to reach sendIt, add this label to its pod template:

```yaml
# In the calling service's Deployment
labels:
  sendit-client: "true"
```

The `NetworkPolicy` only permits inbound traffic from pods with this label.

### Docker

The image is built from `packages/server/`. Build from the repo root so the workspace context is available:

```bash
docker build -f packages/server/Dockerfile -t your-registry/sendit:1.0.0 .
```

---

## API key rotation

`API_KEYS` is comma-separated so you can rotate without downtime:

1. Add the new key to the secret: `api-keys: "old-key,new-key"`
2. Roll the new key out to callers one by one
3. Once all callers are updated, remove the old key: `api-keys: "new-key"`