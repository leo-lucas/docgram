import fs from 'node:fs';
import { Parser, EntityInfo, MemberInfo, LanguageClient } from '../../core/model.js';
import { DocumentSymbol, SymbolKind } from 'vscode-languageserver-protocol';

export class LspParser implements Parser {
  constructor(private client: LanguageClient) {}

  async parse(paths: string[]): Promise<EntityInfo[]> {
    await this.client.initialize(process.cwd());
    const entities: EntityInfo[] = [];
    for (const p of paths) {
      const content = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
      const symbols = await this.client.documentSymbols(p, content);
      for (const sym of symbols) {
        const ent = this.symbolToEntity(sym);
        if (ent) entities.push(ent);
      }
    }
    await this.client.shutdown();
    return entities;
  }

  private symbolToEntity(sym: DocumentSymbol): EntityInfo | null {
    if (sym.kind === SymbolKind.Class) {
      return {
        name: sym.name,
        kind: 'class',
        members: this.membersFrom(sym),
        relations: [],
      };
    }
    if (sym.kind === SymbolKind.Interface) {
      return {
        name: sym.name,
        kind: 'interface',
        members: this.membersFrom(sym),
        relations: [],
      };
    }
    if (sym.kind === SymbolKind.Enum) {
      return {
        name: sym.name,
        kind: 'enum',
        members: this.membersFrom(sym),
        relations: [],
      };
    }
    return null;
  }

  private membersFrom(sym: DocumentSymbol): MemberInfo[] {
    const members: MemberInfo[] = [];
    for (const child of sym.children || []) {
      if (child.kind === SymbolKind.Field || child.kind === SymbolKind.Property) {
        members.push({ name: child.name, kind: 'property', visibility: 'public' });
      } else if (child.kind === SymbolKind.Method || child.kind === SymbolKind.Function) {
        members.push({ name: child.name, kind: 'method', visibility: 'public' });
      }
    }
    return members;
  }
}
