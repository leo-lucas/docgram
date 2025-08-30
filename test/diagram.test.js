import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import path from 'node:path';
import { DiagramService } from '../dist/core/usecases/generateDiagram.js';
import { TypeScriptParser } from '../dist/infrastructure/parsers/typescriptParser.js';
import { MermaidDiagramGenerator } from '../dist/infrastructure/diagram/mermaidGenerator.js';

const sample = path.join('fixtures', 'sample.ts');
const worker = path.join('fixtures', 'worker.ts');

test('generates mermaid diagram with relations and stereotypes', async () => {
  const service = new DiagramService(new TypeScriptParser(), new MermaidDiagramGenerator());
  const diagram = await service.generateFromPaths([sample]);
  assert.ok(diagram.includes('classDiagram'));
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
