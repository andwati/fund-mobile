# Fund (mobile + web)

Savings planner for iOS, Android and the web, built with Expo (SDK 58), Expo Router and Uniwind (Tailwind).
It talks to the Go API in `../fund-backend`.

## Run

```sh
pnpm install
cp .env.example .env        # EXPO_PUBLIC_API_URL, default http://localhost:4000
npx expo run:android        # first time (and after adding native modules): builds the dev client
npx expo start --dev-client # then open the dev client
```

Android emulator: `adb reverse tcp:4000 tcp:4000` (API) and `adb reverse tcp:8081 tcp:8081` (Metro), so `localhost` works.

Local backend (from `../fund-backend`): see its README. With no `RESEND_API_KEY` the backend logs emails, so the
verification and invite links can be copied from its log and opened as deep links
(`adb shell am start -a android.intent.action.VIEW -d "fundmobile:/verify-email?token=..."`).

## Checks (what CI runs)

```sh
pnpm exec expo lint
pnpm typecheck      # starts the dev server briefly to emit typed routes, then tsc
```

## Layout

- `src/app` routes: `(auth)` sign-in/up and password reset, `(app)` the signed-in app (tabs: Overview, Items,
  Money, Schedule, Settings; sheets for items, contributions, paydays, sharing, account), public `verify-email`,
  `reset-password` and `invite/[token]` for email links.
- `src/api` typed client generated from the backend's OpenAPI spec: `pnpm gen:api` (needs `../fund-backend`).
- `src/fund` fund state, the offline queue (deposits made without a connection sync later), onboarding.
- `src/lib/plan.ts`, `plan-reminders.ts`, `status.ts` are **verbatim copies** of the web app's planning code
  (the backend is tested against that exact code). Do not edit them here.
- `src/components/ui` the UI kit on the Uniwind tokens in `src/global.css`.

## Gotchas

- Do not add dev tools (e.g. `openapi-typescript`) as dependencies: one pulled `supports-color@10`, pnpm then resolved a
  second copy of `react-native`, and the app crashed at startup ("property is not writable"). Run them with `pnpm dlx`.
- `expo-secure-store` has no web implementation; `src/lib/storage.ts` falls back to `localStorage` on the web.
