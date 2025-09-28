import { spawn, ChildProcess } from 'node:child_process';
import { MessageConnection, StreamMessageReader, StreamMessageWriter, createMessageConnection } from 'vscode-jsonrpc/node.js';
import { InitializeParams, TextDocumentItem, DocumentSymbol } from 'vscode-languageserver-protocol';
import { LanguageClient } from '../../core/model.js';
import { pathToFileURL } from 'node:url';

export class StdioLanguageClient implements LanguageClient {
  private proc?: ChildProcess;
  private connection?: MessageConnection;

  constructor(
    private command: string,
    private args: string[] = [],
    private languageId = 'typescript'
  ) {}

  async initialize(rootUri: string): Promise<void> {
    this.proc = spawn(this.command, this.args, { stdio: 'pipe' });
    const reader = new StreamMessageReader(this.proc.stdout!);
    const writer = new StreamMessageWriter(this.proc.stdin!);
    this.connection = createMessageConnection(reader, writer);
    this.connection.listen();
    const params: InitializeParams = {
      processId: process.pid,
      rootUri: pathToFileURL(rootUri).toString(),
      capabilities: {
        textDocument: {
          documentSymbol: {
            hierarchicalDocumentSymbolSupport: true,
          },
        },
      },
    };
    await this.connection.sendRequest('initialize', params);
    await this.connection.sendNotification('initialized', {});
  }

  async documentSymbols(filePath: string, content: string): Promise<DocumentSymbol[]> {
    if (!this.connection) throw new Error('LSP not initialized');
    const uri = pathToFileURL(filePath).toString();
    const textDoc: TextDocumentItem = {
      uri,
      languageId: this.languageId,
      version: 1,
      text: content,
    };
    await this.connection.sendNotification('textDocument/didOpen', { textDocument: textDoc });
    const result = await this.connection.sendRequest('textDocument/documentSymbol', { textDocument: { uri } });
    return (result as DocumentSymbol[]) || [];
  }

  async shutdown(): Promise<void> {
    this.connection?.dispose();
    this.proc?.kill();
  }
}
