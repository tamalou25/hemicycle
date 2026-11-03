// Vitest : uniquement les tests du moteur (les tests navigateur sont dans e2e/, lancés par Playwright).
import { defineConfig } from 'vitest/config';

export default defineConfig({ test: { include: ['tests/**/*.test.js'] } });
