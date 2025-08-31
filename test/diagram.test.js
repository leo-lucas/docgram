import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import path from 'node:path';
import { rmSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

import { DiagramService } from '../dist/core/usecases/generateDiagram.js';
import { TypeScriptParser } from '../dist/infrastructure/parsers/typescriptParser.js';
import { MermaidDiagramGenerator } from '../dist/infrastructure/diagram/mermaidGenerator.js';

const sample = path.join('fixtures', 'sample.ts');
const worker = path.join('fixtures', 'worker.ts');

test('generates mermaid diagram with relations and stereotypes', async () => {
  const service = new DiagramService(new TypeScriptParser(), new MermaidDiagramGenerator());
  const diagram = await service.generateFromPaths([sample]);
  assert.ok(diagram.includes('classDiagram'));

  assert.ok(diagram.includes('namespace fixtures'));
  assert.ok(diagram.includes('<<interface>>'));
  assert.ok(diagram.includes('Greeter <|.. Person'));
  assert.ok(diagram.includes('Person <|-- Employee'));
  assert.ok(diagram.includes('#age: number'));
  assert.ok(diagram.includes('+Person(name: string, age: number, address: Address)'));
  assert.ok(diagram.includes('+calculateSalary(multiplier: number): number'));
  assert.ok(diagram.includes('+greet(): void'));
  assert.ok(diagram.includes('Person --> Address'));
});

test('prints object for inline property types', async () => {
  const service = new DiagramService(new TypeScriptParser(), new MermaidDiagramGenerator());
  const diagram = await service.generateFromPaths([worker]);
  assert.ok(diagram.includes('+test: object'));
});

test('docs command writes README with diagram', () => {
  const dir = path.join('fixtures');
  const readme = path.join(dir, 'README.md');
  rmSync(readme, { force: true });
  const result = spawnSync('node', ['dist/index.js', 'docs', dir]);
  assert.equal(result.status, 0);
  const content = readFileSync(readme, 'utf8');
  assert.ok(content.includes(`# ${path.basename(dir)}`));
  assert.ok(content.includes('```mermaid'));
  rmSync(readme);
});
