# LifeLogs

A calm, private tracker for your day — starting with **Lift**: body weight, gym workouts, strength
stats and progress photos. More logs (water, meals, expenses, distance, screen time, thoughts,
tasks) will be added one at a time.

Live: https://ritesh-dhekane.github.io/lifelogs-web/ — install it from Settings, or the browser
menu ("Install app" / "Add to Home screen"). It works offline.

## Your data

Everything is stored on your device, in the browser. Nothing is sent to a server.

- **Backup file:** export everything (including photos) to one file and restore it on any device.
- **Folder copy** (desktop Chrome/Edge): pick a folder once and a backup is saved there after
  every change, keeping the last 7 days. A synced folder (Google Drive, OneDrive) works well.
- **Google Drive** backup from phones is coming next.

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
