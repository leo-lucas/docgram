import { test, expect } from '@jest/globals';
import { CSharpParser } from '../src/infrastructure/parsers/csharpParser.js';
import { SymbolKind, DocumentSymbol } from 'vscode-languageserver-types';
import { LanguageClient } from '../src/core/model.js';

class FakeClient implements LanguageClient {
  async initialize(): Promise<void> {}
  async documentSymbols(): Promise<DocumentSymbol[]> {
    return [
      {
        name: 'Bar',
        kind: SymbolKind.Class,
        range: { start: { line: 0, character: 0 }, end: { line: 2, character: 0 } },
        selectionRange: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
      },
      {
        name: 'Foo',
        kind: SymbolKind.Class,
        range: { start: { line: 4, character: 0 }, end: { line: 9, character: 0 } },
        selectionRange: { start: { line: 4, character: 0 }, end: { line: 4, character: 0 } },
        children: [
          {
            name: 'Bar',
            kind: SymbolKind.Property,
            range: { start: { line: 6, character: 0 }, end: { line: 6, character: 0 } },
            selectionRange: { start: { line: 6, character: 0 }, end: { line: 6, character: 0 } },
          },
          {
            name: 'Name',
            kind: SymbolKind.Property,
            range: { start: { line: 7, character: 0 }, end: { line: 7, character: 0 } },
            selectionRange: { start: { line: 7, character: 0 }, end: { line: 7, character: 0 } },
          },
          {
            name: 'Add',
            kind: SymbolKind.Method,
            range: { start: { line: 8, character: 0 }, end: { line: 8, character: 0 } },
            selectionRange: { start: { line: 8, character: 0 }, end: { line: 8, character: 0 } },
          },
        ],
      },
    ];
  }
  async shutdown(): Promise<void> {}
}

test('C# parser builds entities from document symbols', async () => {
  expect.hasAssertions();
  const parser = new CSharpParser(new FakeClient());
  const entities = await parser.parse(['fixtures/sample.cs']);
  expect(entities).toHaveLength(2);
  const foo = entities.find(e => e.name === 'Foo')!;
  expect(foo.members).toHaveLength(3);
  expect(foo.members.some(m => m.name === 'Bar' && m.type === 'Bar')).toBe(true);
  expect(foo.members.some(m => m.name === 'Name' && m.type === 'string')).toBe(true);
  const add = foo.members.find(m => m.name === 'Add');
  expect(add).toBeDefined();
  expect(add?.returnType).toBe('int');
  expect(add?.parameters).toEqual([
    { name: 'x', type: 'int' },
    { name: 'y', type: 'int' },
  ]);
  expect(foo.namespace).toBe('fixtures');
  expect(foo.relations.some(r => r.type === 'composition' && r.target === 'Bar')).toBe(true);
});

test('C# parser collects files from directories', async () => {
  expect.hasAssertions();
  const parser = new CSharpParser(new FakeClient());
  const entities = await parser.parse(['fixtures']);
  expect(entities).toHaveLength(2);
  expect(entities.map(e => e.name).sort()).toEqual(['Bar', 'Foo']);
});
