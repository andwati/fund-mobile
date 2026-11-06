// Expo Router writes typed-route declarations (.expo/types/router.d.ts) when the dev server starts.
// `tsc` needs them, so start the server just long enough to emit them (used by `pnpm typecheck` and CI).
import { spawn } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';

const target = '.expo/types/router.d.ts';
if (process.argv.includes('--force')) rmSync(target, { force: true });
if (existsSync(target) && !process.argv.includes('--force')) process.exit(0);

const child = spawn('npx', ['expo', 'start', '--offline', '--port', '8099'], {
  stdio: 'ignore',
  detached: true,
  env: { ...process.env, CI: '1', EXPO_NO_TELEMETRY: '1' },
});

const deadline = Date.now() + 90_000;
const timer = setInterval(() => {
  if (existsSync(target) || Date.now() > deadline) {
    clearInterval(timer);
    try {
      process.kill(-child.pid, 'SIGTERM'); // the whole process group
    } catch {}
    if (!existsSync(target)) {
      console.error('Timed out waiting for typed routes to be generated.');
      process.exit(1);
    }
    process.exit(0);
  }
}, 500);
