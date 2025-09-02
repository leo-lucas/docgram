import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { TypeScriptParser } from '../dist/infrastructure/parsers/typescriptParser.js';

test('TypeScript parser handles object destructuring in constructors', async () => {
  const parser = new TypeScriptParser();
  const entities = await parser.parse(['fixtures/destruct.ts']);
  const config = entities.find(e => e.name === 'Config');
  assert.ok(config);
  assert.ok(config.members.some(m => m.kind === 'constructor' && m.name === 'constructor'));
  const ctor = config.members.find(m => m.kind === 'constructor');
  assert.ok(ctor?.parameters?.some(p => p.name === 'foo'));
  assert.ok(ctor?.parameters?.some(p => p.name === 'bar'));
});
