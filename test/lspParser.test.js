import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { LspParser } from '../dist/infrastructure/parsers/lspParser.js';
import { SymbolKind } from 'vscode-languageserver-types';

class FakeClient {
  async initialize() {}
  async documentSymbols(_p, _c) {
    return [{
      name: 'Foo',
      kind: SymbolKind.Class,
      children: [
        { name: 'bar', kind: SymbolKind.Property },
        { name: 'baz', kind: SymbolKind.Method },
      ],
    }];
  }
  async shutdown() {}
}

test('LSP parser builds entities from document symbols', async () => {
  const parser = new LspParser(new FakeClient());
  const entities = await parser.parse(['dummy.ts']);
  assert.equal(entities.length, 1);
  assert.equal(entities[0].name, 'Foo');
  assert.equal(entities[0].members.length, 2);
});
