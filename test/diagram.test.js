import { test, expect } from '@jest/globals';
import path from 'node:path';
import { rmSync, readFileSync, symlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

import { DiagramService } from '../dist/core/usecases/generateDiagram.js';
import { TypeScriptParser } from '../dist/infrastructure/parsers/typescriptParser.js';
import { MermaidDiagramGenerator } from '../dist/infrastructure/diagram/mermaidGenerator.js';

const sample = path.join('fixtures', 'sample.ts');
const worker = path.join('fixtures', 'worker.ts');
const destruct = path.join('fixtures', 'destruct.ts');
const destructUntyped = path.join('fixtures', 'destructUntyped.ts');

test('generates mermaid diagram with relations and stereotypes', async () => {
  expect.hasAssertions();
  const service = new DiagramService(new TypeScriptParser(), new MermaidDiagramGenerator());
  const diagram = await service.generateFromPaths([sample]);
  expect(diagram).toContain('classDiagram');

  expect(diagram).toContain('namespace fixtures');
  expect(diagram).toContain('<<interface>>');
  expect(diagram).toContain('Greeter <|.. Person');
  expect(diagram).toContain('Person <|-- Employee');
  expect(diagram).toContain('id*: number');
  expect(diagram).toContain('#age: number');
  expect(diagram).toContain('+Person(name: string, age: number, address: Address)');
  expect(diagram).toContain('+calculateSalary(multiplier: number): number');
  expect(diagram).toContain('+greet()*: void');
  expect(diagram).toContain('Person "1" *-- "1" Address : address');
  expect(diagram).toContain('Department "1" o-- "0..*" Employee : employees');
  expect(diagram).toContain('Employee "1" ..> "1" Department : dept');
  expect(diagram).toContain('class Repository~T~');
  expect(diagram).toContain('count$: number');
  expect(diagram).toContain('+reset$(): void');
});

test('prints object for inline property types', async () => {
  expect.hasAssertions();
  const service = new DiagramService(new TypeScriptParser(), new MermaidDiagramGenerator());
  const diagram = await service.generateFromPaths([worker]);
  expect(diagram).toContain('test*: object');
});

test('diagram omits parameter destructuring in constructors', async () => {
  expect.hasAssertions();
  const service = new DiagramService(new TypeScriptParser(), new MermaidDiagramGenerator());
  const diagram = await service.generateFromPaths([destruct]);
  expect(diagram).toContain('+Config(options: Options)');
  expect(diagram.includes('+Config(foo:')).toBe(false);
});

test('diagram falls back to object for untyped destructured constructors', async () => {
  expect.hasAssertions();
  const service = new DiagramService(new TypeScriptParser(), new MermaidDiagramGenerator());
  const diagram = await service.generateFromPaths([destructUntyped]);
  expect(diagram).toContain('+ConfigUntyped(options: object)');
  expect(diagram.includes('+ConfigUntyped(foo:')).toBe(false);
});

test('docs command writes README with diagram', () => {
  expect.hasAssertions();
  const dir = path.join('fixtures');
  const readme = path.join(dir, 'README.md');
  rmSync(readme, { force: true });
  const result = spawnSync('node', ['dist/cli.js', 'docs', dir]);
  expect(result.status).toBe(0);
  const content = readFileSync(readme, 'utf8');
  expect(content).toContain(`# ${path.basename(dir)}`);
  expect(content).toContain('```mermaid');
  rmSync(readme);
});

test('CLI runs correctly when invoked via symlink', () => {
  expect.hasAssertions();
  const symlink = path.join('dist', 'cli-link.js');
  rmSync(symlink, { force: true });
  symlinkSync(path.resolve('dist', 'cli.js'), symlink);
  const result = spawnSync('node', [symlink, '--help'], { encoding: 'utf8' });
  expect(result.status).toBe(0);
  expect(result.stdout).toContain('Usage: docgram');
  rmSync(symlink);
});
