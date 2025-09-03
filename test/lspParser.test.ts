import { test, expect, jest } from '@jest/globals';
import { LspParser } from '../src/infrastructure/parsers/lspParser';
import { SymbolKind, DocumentSymbol } from 'vscode-languageserver-types';
import path from 'node:path';
import { StdioLanguageClient } from '../src/infrastructure/lsp/stdioClient';
import { LanguageClient } from '../src/core/model';

jest.setTimeout(20000);
class FakeClient implements LanguageClient {
  async initialize(): Promise<void> {}
  async documentSymbols(): Promise<DocumentSymbol[]> {
    return [
      {
        name: 'Foo',
        kind: SymbolKind.Class,
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
        selectionRange: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
        children: [
          {
            name: 'bar',
            kind: SymbolKind.Property,
            range: { start: { line: 1, character: 0 }, end: { line: 1, character: 0 } },
            selectionRange: { start: { line: 1, character: 0 }, end: { line: 1, character: 0 } },
          },
          {
            name: 'baz',
            kind: SymbolKind.Method,
            range: { start: { line: 2, character: 0 }, end: { line: 2, character: 0 } },
            selectionRange: { start: { line: 2, character: 0 }, end: { line: 2, character: 0 } },
          },
        ],
      },
    ];
  }
  async shutdown(): Promise<void> {}
}

test('LSP parser builds entities from document symbols', async () => {
  expect.hasAssertions();
  const parser = new LspParser(new FakeClient());
  const entities = await parser.parse(['fixtures/sample.ts']);
  expect(entities).toHaveLength(1);
  expect(entities[0].name).toBe('Foo');
  expect(entities[0].members).toHaveLength(2);
  expect(entities[0].namespace).toBe('fixtures');
});

test('LSP parser collects files from directories', async () => {
  expect.hasAssertions();
  const parser = new LspParser(new FakeClient());
  const entities = await parser.parse(['fixtures']);
  expect(entities).toHaveLength(4);
  expect(entities[0].name).toBe('Foo');
  expect(entities.every(e => e.namespace === 'fixtures')).toBe(true);
});

test('Stdio client parses real files with visibility and relations', async () => {
  expect.hasAssertions();
  const client = new StdioLanguageClient(path.join('node_modules', '.bin', 'typescript-language-server'), ['--stdio']);
  const parser = new LspParser(client);
  const entities = await parser.parse(['fixtures/sample.ts']);
  const person = entities.find(e => e.name === 'Person');
  expect(person).toBeDefined();
  expect(person?.namespace).toBe('fixtures');

  expect(person?.implements?.includes('Greeter')).toBe(true);
  expect(person?.members.some(m => m.name === 'age' && m.visibility === 'protected' && m.type === 'number')).toBe(true);
  expect(person?.members.some(m => m.name === '_name' && m.visibility === 'private' && m.type === 'string')).toBe(true);
  expect(person?.members.some(m => m.name === 'id' && m.isAbstract)).toBe(true);
  expect(person?.members.some(m => m.kind === 'constructor' && m.parameters?.some(p => p.name === 'address' && p.type === 'Address'))).toBe(true);
  expect(person?.members.some(m => m.name === 'greet' && m.returnType === 'void')).toBe(true);
  expect(person?.members.some(m => m.name === 'calculateSalary' && m.returnType === 'number' && m.parameters?.some(p => p.name === 'multiplier' && p.type === 'number'))).toBe(true);
  expect(person?.relations.some(r => r.type === 'composition' && r.target === 'Address' && r.label === 'address' && r.sourceCardinality === '1' && r.targetCardinality === '1')).toBe(true);
  expect(person?.members.some(m => m.name === 'greet' && m.isAbstract)).toBe(true);
  const employee = entities.find(e => e.name === 'Employee');
  expect(employee).toBeDefined();
  expect(employee?.extends?.includes('Person')).toBe(true);
  expect(employee?.relations.some(r => r.type === 'inheritance' && r.target === 'Person')).toBe(true);
  expect(employee?.relations.some(r => r.type === 'composition' && r.target === 'Role' && r.label === 'role')).toBe(true);
  expect(employee?.relations.some(r => r.type === 'dependency' && r.target === 'Department' && r.label === 'dept')).toBe(true);
  const dept = entities.find(e => e.name === 'Department');
  expect(dept).toBeDefined();
  expect(dept?.relations.some(r => r.type === 'aggregation' && r.target === 'Employee' && r.label === 'employees' && r.targetCardinality === '0..*')).toBe(true);
  const address = entities.find(e => e.name === 'Address');
  expect(address).toBeDefined();
  expect(address?.members.some(m => m.name === 'street')).toBe(true);
  const role = entities.find(e => e.name === 'Role');
  expect(role).toBeDefined();
  expect(role?.members.some(m => m.name === 'Admin')).toBe(true);
  const repo = entities.find(e => e.name === 'Repository');
  expect(repo).toBeDefined();
  expect(repo?.typeParameters?.includes('T')).toBe(true);
  expect(repo?.members.some(m => m.name === 'count' && m.isStatic)).toBe(true);
  expect(repo?.members.some(m => m.name === 'reset' && m.isStatic)).toBe(true);
});

test('LSP parser falls back to object for inline property types', async () => {
  expect.hasAssertions();
  const client = new StdioLanguageClient(path.join('node_modules', '.bin', 'typescript-language-server'), ['--stdio']);
  const parser = new LspParser(client);
  const entities = await parser.parse(['fixtures/worker.ts']);
  const worker = entities.find(e => e.name === 'Worker');
  expect(worker).toBeDefined();
  expect(worker?.members.some(m => m.name === 'test' && m.type === 'object')).toBe(true);
  expect(worker?.namespace).toBe('fixtures');
});


test('LSP parser handles object destructuring in constructors', async () => {
  expect.hasAssertions();
  const client = new StdioLanguageClient(path.join('node_modules', '.bin', 'typescript-language-server'), ['--stdio']);
  const parser = new LspParser(client);
  const entities = await parser.parse(['fixtures/destruct.ts']);
  const config = entities.find(e => e.name === 'Config');
  expect(config).toBeDefined();
  expect(config?.members.some(m => m.kind === 'constructor' && m.name === 'constructor')).toBe(true);
  const ctor = config?.members.find(m => m.kind === 'constructor');
  expect(ctor?.parameters).toEqual([{ name: 'options', type: 'Options' }]);
});

test('LSP parser falls back to object for untyped destructuring in constructors', async () => {
  expect.hasAssertions();
  const client = new StdioLanguageClient(path.join('node_modules', '.bin', 'typescript-language-server'), ['--stdio']);
  const parser = new LspParser(client);
  const entities = await parser.parse(['fixtures/destructUntyped.ts']);
  const config = entities.find(e => e.name === 'ConfigUntyped');
  expect(config).toBeDefined();
  const ctor = config?.members.find(m => m.kind === 'constructor');
  expect(ctor?.parameters).toEqual([{ name: 'options', type: 'object' }]);
});

test('LSP parser handles object destructuring in methods', async () => {
  expect.hasAssertions();
  const client = new StdioLanguageClient(path.join('node_modules', '.bin', 'typescript-language-server'), ['--stdio']);
  const parser = new LspParser(client);
  const entities = await parser.parse(['fixtures/destruct.ts']);
  const config = entities.find(e => e.name === 'Config');
  expect(config).toBeDefined();
  const method = config?.members.find(m => m.kind === 'method' && m.name === 'update');
  expect(method?.parameters).toEqual([{ name: 'options', type: 'Options' }]);
});

test('LSP parser falls back to object for untyped destructured methods', async () => {
  expect.hasAssertions();
  const client = new StdioLanguageClient(path.join('node_modules', '.bin', 'typescript-language-server'), ['--stdio']);
  const parser = new LspParser(client);
  const entities = await parser.parse(['fixtures/destructUntyped.ts']);
  const config = entities.find(e => e.name === 'ConfigUntyped');
  expect(config).toBeDefined();
  const method = config?.members.find(m => m.kind === 'method' && m.name === 'update');
  expect(method?.parameters).toEqual([{ name: 'options', type: 'object' }]);
});

