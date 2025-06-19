import { defineConfig } from 'cypress';

export default defineConfig({
  video: false,
  responseTimeout: 60000,
  pageLoadTimeout: 120000,
  e2e: {
    supportFile: false,
    baseUrl: 'http://localhost:4200',
    excludeSpecPattern: ['**/plugins/**.js', '**/tsconfig.json']
  }
});
