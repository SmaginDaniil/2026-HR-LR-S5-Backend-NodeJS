# Express middleware homework

## Run

```bash
npm ci
npm start
```

The server listens on port `3000` by default. Set `PORT` to change it.
Protected routes use `Authorization: Bearer secret-token`; set `AUTH_TOKEN`
to override the default token.

## Routes

- `GET /api/data` — protected
- `POST /api/users` — protected; expects `name` (at least 2 characters),
  `age` (0–120), and a valid `email`
- `GET /public/info` — public