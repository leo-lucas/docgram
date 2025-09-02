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
  assert.equal(entities[0].namespace, 'fixtures');

});

test('LSP parser collects files from directories', async () => {
  const parser = new LspParser(new FakeClient());
  const entities = await parser.parse(['fixtures']);
  assert.equal(entities.length, 4);
  assert.equal(entities[0].name, 'Foo');
  assert.ok(entities.every(e => e.namespace === 'fixtures'));
});

test('Stdio client parses real files with visibility and relations', async () => {
  const client = new StdioLanguageClient(path.join('node_modules', '.bin', 'typescript-language-server'), ['--stdio']);
  const parser = new LspParser(client);
  const entities = await parser.parse(['fixtures/sample.ts']);
  const person = entities.find(e => e.name === 'Person');
  assert.ok(person);
  assert.equal(person?.namespace, 'fixtures');

  assert.ok(person.implements?.includes('Greeter'));
  assert.ok(person.members.some(m => m.name === 'age' && m.visibility === 'protected' && m.type === 'number'));
  assert.ok(person.members.some(m => m.name === '_name' && m.visibility === 'private' && m.type === 'string'));
  assert.ok(person.members.some(m => m.name === 'id' && m.isAbstract));
  assert.ok(person.members.some(m => m.kind === 'constructor' && m.parameters?.some(p => p.name === 'address' && p.type === 'Address')));
  assert.ok(person.members.some(m => m.name === 'greet' && m.returnType === 'void'));
  assert.ok(person.members.some(m => m.name === 'calculateSalary' && m.returnType === 'number' && m.parameters?.some(p => p.name === 'multiplier' && p.type === 'number')));
  assert.ok(person.relations.some(r => r.type === 'composition' && r.target === 'Address' && r.label === 'address' && r.sourceCardinality === '1' && r.targetCardinality === '1'));
  assert.ok(person.members.some(m => m.name === 'greet' && m.isAbstract));
  const employee = entities.find(e => e.name === 'Employee');
  assert.ok(employee);
  assert.ok(employee.extends?.includes('Person'));
  assert.ok(employee.relations.some(r => r.type === 'inheritance' && r.target === 'Person'));
  assert.ok(employee.relations.some(r => r.type === 'composition' && r.target === 'Role' && r.label === 'role'));
  assert.ok(employee.relations.some(r => r.type === 'dependency' && r.target === 'Department' && r.label === 'dept'));
  const dept = entities.find(e => e.name === 'Department');
  assert.ok(dept);
  assert.ok(dept.relations.some(r => r.type === 'aggregation' && r.target === 'Employee' && r.label === 'employees' && r.targetCardinality === '0..*'));
  const address = entities.find(e => e.name === 'Address');
  assert.ok(address);
  assert.ok(address.members.some(m => m.name === 'street'));
  const role = entities.find(e => e.name === 'Role');
  assert.ok(role);
  assert.ok(role.members.some(m => m.name === 'Admin'));
  const repo = entities.find(e => e.name === 'Repository');
  assert.ok(repo);
  assert.ok(repo.typeParameters?.includes('T'));
  assert.ok(repo.members.some(m => m.name === 'count' && m.isStatic));
  assert.ok(repo.members.some(m => m.name === 'reset' && m.isStatic));
});

test('LSP parser falls back to object for inline property types', async () => {
  const client = new StdioLanguageClient(path.join('node_modules', '.bin', 'typescript-language-server'), ['--stdio']);
  const parser = new LspParser(client);
  const entities = await parser.parse(['fixtures/worker.ts']);
  const worker = entities.find(e => e.name === 'Worker');
  assert.ok(worker);
  assert.ok(worker.members.some(m => m.name === 'test' && m.type === 'object'));
  assert.equal(worker.namespace, 'fixtures');
});


test('LSP parser handles object destructuring in constructors', async () => {
  const client = new StdioLanguageClient(path.join('node_modules', '.bin', 'typescript-language-server'), ['--stdio']);
  const parser = new LspParser(client);
  const entities = await parser.parse(['fixtures/destruct.ts']);
  const config = entities.find(e => e.name === 'Config');
  assert.ok(config);
  assert.ok(config.members.some(m => m.kind === 'constructor' && m.name === 'constructor'));
  const ctor = config.members.find(m => m.kind === 'constructor');
  assert.deepEqual(ctor?.parameters, [{ name: 'options', type: 'Options' }]);
});

test('LSP parser falls back to object for untyped destructuring in constructors', async () => {
  const client = new StdioLanguageClient(path.join('node_modules', '.bin', 'typescript-language-server'), ['--stdio']);
  const parser = new LspParser(client);
  const entities = await parser.parse(['fixtures/destructUntyped.ts']);
  const config = entities.find(e => e.name === 'ConfigUntyped');
  assert.ok(config);
  const ctor = config.members.find(m => m.kind === 'constructor');
  assert.deepEqual(ctor?.parameters, [{ name: 'options', type: 'object' }]);
});

