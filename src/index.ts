import { DiagramService } from './core/usecases/generateDiagram.js';
import { TypeScriptParser } from './infrastructure/parsers/typescriptParser.js';
import { MermaidDiagramGenerator } from './infrastructure/diagram/mermaidGenerator.js';
import { LspParser } from './infrastructure/parsers/lspParser.js';
import { StdioLanguageClient } from './infrastructure/lsp/stdioClient.js';

export function buildService(parserOption: string) {
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

export {
  DiagramService,
  TypeScriptParser,
  MermaidDiagramGenerator,
  LspParser,
  StdioLanguageClient,
};

