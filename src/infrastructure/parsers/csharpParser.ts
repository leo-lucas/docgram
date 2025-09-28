import { Parser, EntityInfo, LanguageClient } from '../../core/model.js';
import { LspParser } from './lspParser.js';
import { StdioLanguageClient } from '../lsp/stdioClient.js';

export class CSharpParser implements Parser {
  private parser: LspParser;

  constructor(client?: LanguageClient) {
    const lspClient =
      client ?? new StdioLanguageClient('csharp-ls', ['--stdio'], 'csharp');
    this.parser = new LspParser(lspClient, '.cs');
  }

  parse(paths: string[]): Promise<EntityInfo[]> {
    return this.parser.parse(paths);
  }
}
