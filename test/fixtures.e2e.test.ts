import { describe, expect, test } from '@jest/globals';
import path from 'node:path';
import { readFileSync } from 'node:fs';

import { DiagramService } from '../src/core/usecases/generateDiagram';
import { Parser, LanguageClient } from '../src/core/model.js';
import { TypeScriptParser } from '../src/infrastructure/parsers/typescriptParser';
import { CSharpParser } from '../src/infrastructure/parsers/csharpParser.js';
import { MermaidDiagramGenerator } from '../src/infrastructure/diagram/mermaidGenerator';
import { DocumentSymbol, SymbolKind } from 'vscode-languageserver-types';

type Case = {
  readonly name: string;
  readonly paths: string[];
  readonly expectedFile: string;
  readonly createParser?: () => Parser;
};

const cases: Case[] = [
  {
    name: 'sample.ts fixture',
    paths: [path.join('fixtures', 'sample.ts')],
    expectedFile: 'sample-ts.mmd',
  },
  {
    name: 'worker.ts fixture',
    paths: [path.join('fixtures', 'worker.ts')],
    expectedFile: 'worker.mmd',
  },
  {
    name: 'destruct.ts fixture',
    paths: [path.join('fixtures', 'destruct.ts')],
    expectedFile: 'destruct.mmd',
  },
  {
    name: 'destructUntyped.ts fixture',
    paths: [path.join('fixtures', 'destructUntyped.ts')],
    expectedFile: 'destruct-untyped.mmd',
  },
  {
    name: 'relations.ts fixture',
    paths: [path.join('fixtures', 'relations.ts')],
    expectedFile: 'relations.mmd',
  },
  {
    name: 'fixtures directory',
    paths: ['fixtures'],
    expectedFile: 'fixtures-directory.mmd',
  },
  {
    name: 'sample.cs fixture',
    paths: [path.join('fixtures', 'sample.cs')],
    expectedFile: 'sample-cs.mmd',
    createParser: () => new CSharpParser(new FakeCSharpLanguageClient()),
  },
];

describe('diagram generation e2e', () => {
  const generator = new MermaidDiagramGenerator();

  test.each(cases)('matches expected output for $name', async ({ paths, expectedFile, createParser }) => {
    expect.hasAssertions();
    const parser = createParser ? createParser() : new TypeScriptParser();
    const service = new DiagramService(parser, generator);
    const diagram = await service.generateFromPaths(paths);
    const expected = normalize(
      readFileSync(path.join('test', 'expected', expectedFile), 'utf8')
    );
    expect(normalize(diagram)).toBe(expected);
  });
});

function normalize(value: string): string {
  return value.replace(/\r\n/g, '\n').trim();
}

class FakeCSharpLanguageClient implements LanguageClient {
  async initialize(rootUri: string): Promise<void> {
    void rootUri;
  }

  async documentSymbols(filePath: string, content: string): Promise<DocumentSymbol[]> {
    void filePath;
    void content;
    return [
      {
        name: 'Bar',
        kind: SymbolKind.Class,
        range: { start: { line: 0, character: 0 }, end: { line: 2, character: 0 } },
        selectionRange: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
        children: [],
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
