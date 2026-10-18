# Production deployment

This guide runs Top Cloud on a single Linux host with HTTPS. It takes about ten minutes.

Top Cloud needs **Node.js 20.11+** and a writable directory for its SQLite database. It does not need
PostgreSQL, Docker, Redis or any external service.

---

## 1. Create an unprivileged user and install

```bash
sudo adduser --disabled-password --gecos "" topcloud
sudo mkdir -p /opt/topcloud
sudo chown topcloud:topcloud /opt/topcloud

sudo -iu topcloud
git clone <your-repository-url> /opt/topcloud
cd /opt/topcloud
npm run topcloud
```

The installer creates `.env` (`600`), installs dependencies, migrates the database, seeds the owner
and starter form **once**, builds the app and prints a security summary. Re-running it is safe and
never resets the owner.

---

## 2. Configure production values

Edit `/opt/topcloud/.env`:

```dotenv
DATABASE_URL="file:/opt/topcloud/data/topcloud.db"
APP_URL="https://panel.example.com"
COOKIE_SECURE="true"
SESSION_TTL_DAYS="7"
OWNER_USERNAME="admin"
OWNER_INITIAL_PASSWORD="admin"   # ignored once the owner exists
OWNER_EMAIL="you@example.com"    # used for the owner's profile at first init only

SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="..."
SMTP_PASSWORD="..."
EMAIL_FROM="Top Cloud <no-reply@example.com>"
```

- `APP_URL` must be the exact public origin, **without a trailing slash**. Verification and reset
  links are built from it.
- `COOKIE_SECURE="true"` is mandatory over HTTPS. If you enable it while testing over plain HTTP,
  the session cookie will not persist.
- `OWNER_*` values are only read when **no owner exists**. Changing them later does nothing.
- Keep the absolute `DATABASE_URL`. A relative path resolves differently for the Next.js server and
  the CLI scripts.

Lock the file down:

```bash
chmod 600 /opt/topcloud/.env
chmod 700 /opt/topcloud/data
```

---

## 3. First login

1. Open `https://panel.example.com/admin/login`.
2. Sign in with `admin` / `admin`.
3. You are forced to `/admin/change-password`. Choose a long, unique password (10+ characters).
4. Optionally update the owner username and email, branding and the form in `/admin/settings`.

> The panel refuses all admin pages and APIs until the temporary password is replaced. The seeded
> password is never restored by redeploying, migrating or re-seeding.

---

## 4. Run it as a service

`/etc/systemd/system/topcloud.service`:

```ini
[Unit]
Description=Top Cloud staff panel
After=network.target

[Service]
Type=simple
User=topcloud
Group=topcloud
WorkingDirectory=/opt/topcloud
Environment=NODE_ENV=production
EnvironmentFile=/opt/topcloud/.env
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=3
KillSignal=SIGINT
TimeoutStopSec=20
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/topcloud/data /opt/topcloud/.next

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now topcloud
sudo systemctl status topcloud
sudo journalctl -u topcloud -f
```

The server binds `0.0.0.0:3000`. Keep that port closed at the firewall and expose it only through
the reverse proxy.

---

## 5. HTTPS reverse proxy

### Caddy (simplest — automatic certificates)

`/etc/caddy/Caddyfile`:

```caddyfile
panel.example.com {
    encode zstd gzip

    # Caddy sets/appends X-Forwarded-For with the client address.
    reverse_proxy 127.0.0.1:3000
}
```

```bash
sudo systemctl reload caddy
```

### Nginx

```nginx
server {
    listen 443 ssl http2;
    server_name panel.example.com;

    ssl_certificate     /etc/letsencrypt/live/panel.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/panel.example.com/privkey.pem;

    client_max_body_size 1m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

server {
    listen 80;
    server_name panel.example.com;
    return 301 https://$host$request_uri;
}
```

`proxy_add_x_forwarded_for` appends the real client address. Top Cloud deliberately reads the **last**
hop of `X-Forwarded-For`, so client-supplied header spoofing cannot bypass IP throttling.

Then:

```bash
sudo ufw allow 80,443/tcp
sudo ufw deny 3000/tcp
```

---

## 6. Backups

```bash
sudo -iu topcloud
cd /opt/topcloud
npm run db:backup
```

Creates `data/backups/topcloud-<UTC timestamp>.db` with `600` permissions using `VACUUM INTO`, which
is consistent while the panel is running.

Nightly cron for the `topcloud` user:

```cron
15 3 * * * cd /opt/topcloud && npm run db:backup >> data/backups/backup.log 2>&1
```

Retention and off-site copies are your responsibility. A backup on the same disk does not survive
disk loss:

```bash
# Example: keep 14 days locally and copy off-site
find /opt/topcloud/data/backups -name 'topcloud-*.db' -mtime +14 -delete
rclone copy /opt/topcloud/data/backups remote:topcloud-backups
```

Back up `.env` separately in your secret manager — it is not in Git.

### Restore

```bash
sudo systemctl stop topcloud
cd /opt/topcloud
cp data/backups/topcloud-<timestamp>.db data/topcloud.db
chmod 600 data/topcloud.db
rm -f data/topcloud.db-wal data/topcloud.db-shm
npm run db:migrate
sudo systemctl start topcloud
```

Check `GET /api/health` afterwards.

---

## 7. Upgrades

```bash
sudo systemctl stop topcloud
sudo -iu topcloud
cd /opt/topcloud
git pull --ff-only
npm run topcloud          # install, migrate, seed (owner preserved), build
exit
sudo systemctl start topcloud
```

`npm run topcloud -- --skip-build` is available when you want to run the build separately.

Migrations are transactional and checksum-tracked. Never edit an applied migration file; add a new
one instead.

---

## 8. Monitoring

| Check | Expected |
| --- | --- |
| `curl -fsS https://panel.example.com/api/health` | `200` with `{"status":"ok","database":"ok"}` |
| Database reachable | `GET /api/health` returns `503` if the DB is unavailable |
| Disk | `data/` grows slowly; watch free space for backups |
| Logs | `journalctl -u topcloud` — JSON-free, human-readable errors |
| Process | systemd restarts automatically on crash |

Health payload:

```json
{ "status": "ok", "database": "ok", "service": "top-cloud", "timestamp": "..." }
```

---

## 9. Troubleshooting

| Symptom | Fix |
| --- | --- |
| `EADDRINUSE` on 3000 | Another process (often a stale `next dev`) owns the port: `sudo lsof -i :3000` |
| Login appears to succeed but you are signed out | `COOKIE_SECURE="true"` while not using HTTPS, or a proxy that strips `Set-Cookie` |
| Reset/verification links point to localhost | `APP_URL` is wrong or has a trailing slash |
| `SQLITE_BUSY` | Another process is holding a long write transaction; restart and avoid running maintenance during peak use |
| Permission denied on the database | `data/` and `topcloud.db` must be owned by the service user |
| Owner locked out | `sudo -iu topcloud && cd /opt/topcloud && npm run owner:recover` (prints a one-time temporary password) |
| Emails not arriving | SMTP is not configured or credentials are wrong; use `DEV_EMAIL_TOKENS` only in local development |

---

## 10. Scaling notes

This deployment assumes **one application instance**. SQLite is a single-writer database; do not
share one file across containers or hosts. If you need multiple instances or high write concurrency,
either:

- point `DATABASE_URL` at a managed libSQL/Turso database **not supported by the bundled file
  setup** without review, or
- port the Drizzle schema to PostgreSQL (the schema and queries are standard; the migration runner
  and PRAGMAs are SQLite-specific).

For a staff recruitment panel, a single small VPS is comfortably sufficient.
