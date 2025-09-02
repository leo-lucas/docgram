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
  assert.deepEqual(ctor?.parameters, [{ name: 'options', type: 'Options' }]);
});

test('TypeScript parser falls back to object for untyped destructuring', async () => {
  const parser = new TypeScriptParser();
  const entities = await parser.parse(['fixtures/destructUntyped.ts']);
  const config = entities.find(e => e.name === 'ConfigUntyped');
  assert.ok(config);
  const ctor = config.members.find(m => m.kind === 'constructor');
  assert.deepEqual(ctor?.parameters, [{ name: 'options', type: 'object' }]);
});
