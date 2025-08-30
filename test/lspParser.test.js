import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { LspParser } from '../dist/infrastructure/parsers/lspParser.js';
import { SymbolKind } from 'vscode-languageserver-types';
import path from 'node:path';
import { StdioLanguageClient } from '../dist/infrastructure/lsp/stdioClient.js';

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
  const entities = await parser.parse(['fixtures/sample.ts']);
  assert.equal(entities.length, 1);
  assert.equal(entities[0].name, 'Foo');
  assert.equal(entities[0].members.length, 2);
});

test('LSP parser collects files from directories', async () => {
  const parser = new LspParser(new FakeClient());
  const entities = await parser.parse(['fixtures']);
  assert.equal(entities.length, 1);
  assert.equal(entities[0].name, 'Foo');
});

test('Stdio client parses real files with properties', async () => {
  const client = new StdioLanguageClient(path.join('node_modules', '.bin', 'typescript-language-server'), ['--stdio']);
  const parser = new LspParser(client);
  const entities = await parser.parse(['fixtures/sample.ts']);
  const person = entities.find(e => e.name === 'Person');
  assert.ok(person);
  assert.ok(person.members.some(m => m.name === '_name'));
});
