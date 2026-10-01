# LifeLogs

A calm, private tracker for your day — starting with **Lift**: body weight, gym workouts, strength
stats and progress photos. More logs (water, meals, expenses, distance, screen time, thoughts,
tasks) will be added one at a time.

Live: https://ritesh-dhekane.github.io/lifelogs-web/ — install it from the browser menu
("Install app" / "Add to Home screen"). It works offline.

## Your data

Everything is stored on your device, in the browser. Nothing is sent to a server. Backups (to a
file, and to your own Google Drive) are coming soon.

## Development

Requires Node 20+ and npm 11 (`npx -y npm@11 install` if your npm is older).

```bash
npm install
npm run dev
```

| Command          | What it does                    |
| ---------------- | ------------------------------- |
| `npm run dev`    | Dev server                      |
| `npm run build`  | Type-check and build to `dist/` |
| `npm test`       | Unit tests (Vitest)             |
| `npm run lint`   | Lint (oxlint)                   |
| `npm run format` | Format (Prettier)               |

Every push to `main` is checked and deployed to GitHub Pages by `.github/workflows/deploy.yml`.

## License

[MIT](LICENSE) © 2026 Ritesh Dhekane
