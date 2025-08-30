import { Command } from 'commander';
import { DiagramService } from './core/usecases/generateDiagram.js';
import { TypeScriptParser } from './infrastructure/parsers/typescriptParser.js';
import { MermaidDiagramGenerator } from './infrastructure/diagram/mermaidGenerator.js';
import { LspParser } from './infrastructure/parsers/lspParser.js';
import { StdioLanguageClient } from './infrastructure/lsp/stdioClient.js';

const program = new Command();

program
  .name('doc-graphc')
  .description('Generate diagrams from source code')
  .argument('<path...>', 'File or directory to parse')
  .option('--parser <parser>', 'Parser implementation to use (ts|lsp)', 'ts')
  .action(async (paths: string[], opts) => {
    const generator = new MermaidDiagramGenerator();
    let parser;
    if (opts.parser === 'lsp') {
      const client = new StdioLanguageClient('typescript-language-server', ['--stdio']);
      parser = new LspParser(client);
    } else {
      parser = new TypeScriptParser();
    }
    const service = new DiagramService(parser, generator);
    const diagram = await service.generateFromPaths(paths);
    console.log(diagram);
  });

program.parse();
