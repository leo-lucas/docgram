import { test, expect } from '@jest/globals';
import { CSharpParser } from '../src/infrastructure/parsers/csharpParser.js';
import { SymbolKind, DocumentSymbol } from 'vscode-languageserver-types';
import { LanguageClient } from '../src/core/model.js';

class FakeClient implements LanguageClient {
  async initialize(): Promise<void> {}
  async documentSymbols(): Promise<DocumentSymbol[]> {
    return [
      {
        name: 'Foo',
        kind: SymbolKind.Class,
        range: { start: { line: 0, character: 0 }, end: { line: 5, character: 0 } },
        selectionRange: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
        children: [
          {
            name: 'Bar',
            kind: SymbolKind.Field,
            range: { start: { line: 2, character: 0 }, end: { line: 2, character: 0 } },
            selectionRange: { start: { line: 2, character: 0 }, end: { line: 2, character: 0 } },
          },
          {
            name: 'Name',
            kind: SymbolKind.Property,
            range: { start: { line: 3, character: 0 }, end: { line: 3, character: 0 } },
            selectionRange: { start: { line: 3, character: 0 }, end: { line: 3, character: 0 } },
          },
          {
            name: 'Add',
            kind: SymbolKind.Method,
            range: { start: { line: 4, character: 0 }, end: { line: 4, character: 0 } },
            selectionRange: { start: { line: 4, character: 0 }, end: { line: 4, character: 0 } },
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
  expect(entities).toHaveLength(1);
  const foo = entities[0];
  expect(foo.name).toBe('Foo');
  expect(foo.members).toHaveLength(3);
  expect(foo.members.some(m => m.name === 'Bar' && m.type === 'int')).toBe(true);
  expect(foo.members.some(m => m.name === 'Name' && m.type === 'string')).toBe(true);
  const add = foo.members.find(m => m.name === 'Add');
  expect(add).toBeDefined();
  expect(add?.returnType).toBe('int');
  expect(add?.parameters).toEqual([
    { name: 'x', type: 'int' },
    { name: 'y', type: 'int' },
  ]);
  expect(foo.namespace).toBe('fixtures');
});

test('C# parser collects files from directories', async () => {
  expect.hasAssertions();
  const parser = new CSharpParser(new FakeClient());
  const entities = await parser.parse(['fixtures']);
  expect(entities).toHaveLength(1);
  expect(entities[0].name).toBe('Foo');
});
