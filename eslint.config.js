// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // Verbatim copies from the web app; kept identical on purpose.
    ignores: ['dist/*', 'src/lib/plan.ts', 'src/lib/plan-reminders.ts', 'src/lib/status.ts', 'src/api/schema.d.ts'],
  },
]);
