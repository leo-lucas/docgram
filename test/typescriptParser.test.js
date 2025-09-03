import { test, expect } from '@jest/globals';
import { TypeScriptParser } from '../dist/infrastructure/parsers/typescriptParser.js';

test('TypeScript parser handles object destructuring in constructors', async () => {
  expect.hasAssertions();
  const parser = new TypeScriptParser();
  const entities = await parser.parse(['fixtures/destruct.ts']);
  const config = entities.find(e => e.name === 'Config');
  expect(config).toBeDefined();
  expect(config?.members.some(m => m.kind === 'constructor' && m.name === 'constructor')).toBe(true);
  const ctor = config?.members.find(m => m.kind === 'constructor');
  expect(ctor?.parameters).toEqual([{ name: 'options', type: 'Options' }]);
});

test('TypeScript parser falls back to object for untyped destructuring', async () => {
  expect.hasAssertions();
  const parser = new TypeScriptParser();
  const entities = await parser.parse(['fixtures/destructUntyped.ts']);
  const config = entities.find(e => e.name === 'ConfigUntyped');
  expect(config).toBeDefined();
  const ctor = config?.members.find(m => m.kind === 'constructor');
  expect(ctor?.parameters).toEqual([{ name: 'options', type: 'object' }]);
});
