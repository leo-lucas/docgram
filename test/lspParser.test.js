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
      range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
      children: [
        { name: 'bar', kind: SymbolKind.Property, range: { start: { line: 1, character: 0 }, end: { line: 1, character: 0 } } },
        { name: 'baz', kind: SymbolKind.Method, range: { start: { line: 2, character: 0 }, end: { line: 2, character: 0 } } },
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

test('Stdio client parses real files with visibility and relations', async () => {
  const client = new StdioLanguageClient(path.join('node_modules', '.bin', 'typescript-language-server'), ['--stdio']);
  const parser = new LspParser(client);
  const entities = await parser.parse(['fixtures/sample.ts']);
  const person = entities.find(e => e.name === 'Person');
  assert.ok(person);
  assert.ok(person.implements?.includes('Greeter'));
  assert.ok(person.members.some(m => m.name === 'age' && m.visibility === 'protected'));
  assert.ok(person.members.some(m => m.name === '_name' && m.visibility === 'private'));
  assert.ok(person.relations.some(r => r.type === 'association' && r.target === 'Address'));
  const employee = entities.find(e => e.name === 'Employee');
  assert.ok(employee);
  assert.ok(employee.extends?.includes('Person'));
  assert.ok(employee.relations.some(r => r.type === 'inheritance' && r.target === 'Person'));
  assert.ok(employee.relations.some(r => r.type === 'association' && r.target === 'Role'));
  const address = entities.find(e => e.name === 'Address');
  assert.ok(address);
  assert.ok(address.members.some(m => m.name === 'street'));
});
