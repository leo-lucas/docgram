import { Command } from 'commander';
import { writeFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { DiagramService } from './core/usecases/generateDiagram.js';
import { TypeScriptParser } from './infrastructure/parsers/typescriptParser.js';
import { MermaidDiagramGenerator } from './infrastructure/diagram/mermaidGenerator.js';
import { LspParser } from './infrastructure/parsers/lspParser.js';
import { StdioLanguageClient } from './infrastructure/lsp/stdioClient.js';

const program = new Command();

program.name('doc-graphc').description('Generate diagrams from source code');

function buildService(parserOption: string) {
  const generator = new MermaidDiagramGenerator();
  let parser;
  if (parserOption === 'lsp') {
    const client = new StdioLanguageClient('typescript-language-server', ['--stdio']);
    parser = new LspParser(client);
  } else {
    parser = new TypeScriptParser();
  }
  return new DiagramService(parser, generator);
}

program
  .command('diagram')
  .argument('<path...>', 'File or directory to parse')
  .option('--parser <parser>', 'Parser implementation to use (ts|lsp)', 'ts')
  .action(async (paths: string[], opts) => {
    const service = buildService(opts.parser);
    const diagram = await service.generateFromPaths(paths);
    console.log(diagram);
  });

program
  .command('docs')
  .argument('<path...>', 'File or directory to parse')
  .option('--parser <parser>', 'Parser implementation to use (ts|lsp)', 'ts')
  .action(async (paths: string[], opts) => {
    const service = buildService(opts.parser);
    const diagram = await service.generateFromPaths(paths);
    const target = paths[0];
    const dir = statSync(target).isDirectory() ? target : path.dirname(target);
    const title = path.basename(dir);
    const content = `# ${title}\n\n\`\`\`mermaid\n${diagram}\n\`\`\`\n`;
    const readmePath = path.join(dir, 'README.md');
    writeFileSync(readmePath, content);
    console.log(`README written to ${readmePath}`);
  });

program.parse();
