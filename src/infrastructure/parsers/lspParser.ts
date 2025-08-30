import fs from 'node:fs';
import path from 'node:path';
import { Parser, EntityInfo, MemberInfo, LanguageClient } from '../../core/model.js';
import { DocumentSymbol, SymbolKind } from 'vscode-languageserver-protocol';

export class LspParser implements Parser {
  constructor(private client: LanguageClient) {}

  async parse(paths: string[]): Promise<EntityInfo[]> {
    await this.client.initialize(process.cwd());
    const entities: EntityInfo[] = [];
    const files: string[] = [];
    for (const p of paths) this.collectFiles(p, files);

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split(/\r?\n/);
      const symbols = await this.client.documentSymbols(file, content);
      for (const sym of symbols) {
        const ent = this.symbolToEntity(sym, lines);
        if (ent) entities.push(ent);
      }
    }

    await this.client.shutdown();

    const names = new Set(entities.map(e => e.name));
    for (const e of entities) {
      if (e.extends) e.extends.forEach(p => e.relations.push({ type: 'inheritance', target: p }));
      if (e.implements) e.implements.forEach(i => e.relations.push({ type: 'implementation', target: i }));
      e.relations = e.relations.filter(r => names.has(r.target));
    }

    return entities;
  }

  private symbolToEntity(sym: DocumentSymbol, lines: string[]): EntityInfo | null {
    if (sym.kind === SymbolKind.Class) {
      const header = this.lineAt(lines, sym.range.start.line);
      const entity: EntityInfo = {
        name: sym.name,
        kind: 'class',
        isAbstract: /\babstract\b/.test(header),
        extends: this.parseExtends(header),
        implements: this.parseImplements(header),
        members: [],
        relations: [],
      };
      entity.members = this.membersFrom(sym, lines, entity);
      return entity;
    }
    if (sym.kind === SymbolKind.Interface) {
      const header = this.lineAt(lines, sym.range.start.line);
      const entity: EntityInfo = {
        name: sym.name,
        kind: 'interface',
        extends: this.parseExtends(header),
        members: [],
        relations: [],
      };
      entity.members = this.membersFrom(sym, lines, entity);
      return entity;
    }
    if (sym.kind === SymbolKind.Enum) {
      const entity: EntityInfo = {
        name: sym.name,
        kind: 'enum',
        members: [],
        relations: [],
      };
      entity.members = this.membersFrom(sym, lines, entity);
      return entity;
    }
    if (sym.kind === SymbolKind.Variable) {
      const entity: EntityInfo = {
        name: sym.name,
        kind: 'type',
        members: [],
        relations: [],
      };
      const members: MemberInfo[] = [];
      for (let i = sym.range.start.line + 1; i < sym.range.end.line; i++) {
        const line = this.lineAt(lines, i).trim();
        const m = line.match(/^([A-Za-z0-9_]+)/);
        if (!m) continue;
        members.push({ name: m[1], kind: 'property', visibility: 'public' });
        const typeMatch = line.match(/:\s*([A-Za-z0-9_\.]+)/);
        if (typeMatch) entity.relations.push({ type: 'association', target: typeMatch[1] });
      }
      entity.members = members;
      return entity;
    }
    return null;
  }

  private membersFrom(sym: DocumentSymbol, lines: string[], entity: EntityInfo): MemberInfo[] {
    const members: MemberInfo[] = [];
    for (const child of sym.children || []) {
      const line = this.lineAt(lines, child.range.start.line).trim();
      let visibility: 'public' | 'protected' | 'private' = 'public';
      if (/\bprivate\b/.test(line)) visibility = 'private';
      else if (/\bprotected\b/.test(line)) visibility = 'protected';

      if (child.kind === SymbolKind.Field || child.kind === SymbolKind.Property) {
        members.push({ name: child.name, kind: 'property', visibility });
        const typeMatch = line.match(/:\s*([A-Za-z0-9_\.]+)/);
        if (typeMatch) entity.relations.push({ type: 'association', target: typeMatch[1] });
      } else if (child.kind === SymbolKind.Method || child.kind === SymbolKind.Function) {
        let kind: MemberInfo['kind'] = 'method';
        if (/^get\s+/.test(line)) kind = 'getter';
        else if (/^set\s+/.test(line)) kind = 'setter';
        members.push({ name: child.name, kind, visibility });
      } else if (child.kind === SymbolKind.EnumMember) {
        members.push({ name: child.name, kind: 'property', visibility: 'public' });
      }
    }
    return members;
  }

  private lineAt(lines: string[], line: number): string {
    return lines[line] ?? '';
  }

  private parseExtends(header: string): string[] {
    const m = header.match(/extends\s+([^\{]+)/);
    if (m) return m[1].split(',').map(s => s.trim()).filter(Boolean);
    return [];
  }

  private parseImplements(header: string): string[] {
    const m = header.match(/implements\s+([^\{]+)/);
    if (m) return m[1].split(',').map(s => s.trim()).filter(Boolean);
    return [];
  }

  private collectFiles(target: string, files: string[]) {
    if (!fs.existsSync(target)) return;
    const stat = fs.statSync(target);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(target)) {
        this.collectFiles(path.join(target, entry), files);
      }
    } else if (target.endsWith('.ts')) {
      files.push(target);
    }
  }
}
