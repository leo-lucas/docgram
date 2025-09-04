import { promises as fs } from 'node:fs';
import {
  Parser,
  EntityInfo,
  MemberInfo,
  LanguageClient,
  ParameterInfo,
  RelationInfo,
} from '../../core/model.js';
import { DocumentSymbol, SymbolKind } from 'vscode-languageserver-protocol';
import { collectFiles, namespaceOf } from './utils.js';

export class LspParser implements Parser {
  constructor(private client: LanguageClient) {}

  async parse(paths: string[]): Promise<EntityInfo[]> {
    await this.client.initialize(process.cwd());
    const files = await collectFiles(paths);
    const entities: EntityInfo[] = [];
    for (const file of files) {
      const parsed = await this.parseFile(file);
      entities.push(...parsed);
    }
    await this.client.shutdown();
    this.finalizeRelations(entities);
    return entities;
  }

  private async parseFile(file: string): Promise<EntityInfo[]> {
    try {
      const namespace = namespaceOf(file);
      const content = await fs.readFile(file, 'utf8');
      const lines = content.split(/\r?\n/);
      const symbols = await this.client.documentSymbols(file, content);
      return symbols
        .map(symbol => this.symbolToEntity(symbol, lines, namespace))
        .filter((entity): entity is EntityInfo => !!entity);
    } catch (err) {
      console.error(`Failed to parse ${file}:`, err);
      return [];
    }
  }

  private finalizeRelations(entities: EntityInfo[]): void {
    const entityNames = new Set(entities.map(entity => entity.name));
    for (const entity of entities) {
      entity.extends?.forEach(parent =>
        entity.relations.push({ type: 'inheritance', target: parent })
      );
      entity.implements?.forEach(implemented =>
        entity.relations.push({ type: 'implementation', target: implemented })
      );
      entity.relations = entity.relations.filter(relation =>
        entityNames.has(relation.target)
      );
    }
  }

  private symbolToEntity(
    symbol: DocumentSymbol,
    lines: string[],
    namespace: string | undefined
  ): EntityInfo | null {
    switch (symbol.kind) {
      case SymbolKind.Class:
        return this.classEntity(symbol, lines, namespace);
      case SymbolKind.Interface:
        return this.interfaceEntity(symbol, lines, namespace);
      case SymbolKind.Enum:
        return this.enumEntity(symbol, lines, namespace);
      case SymbolKind.Variable:
        return this.typeEntity(symbol, lines, namespace);
      default:
        return null;
    }
  }

  private classEntity(
    symbol: DocumentSymbol,
    lines: string[],
    namespace?: string
  ): EntityInfo {
    const header = this.lineAt(lines, symbol.range.start.line);
    const entity: EntityInfo = {
      name: symbol.name,
      kind: 'class',
      isAbstract: /\babstract\b/.test(header),
      typeParameters: this.parseGenerics(header),
      extends: this.parseExtends(header),
      implements: this.parseImplements(header),
      namespace,
      members: [],
      relations: [],
    };
    entity.members = this.membersFrom(symbol, lines, entity);
    return entity;
  }

  private interfaceEntity(
    symbol: DocumentSymbol,
    lines: string[],
    namespace?: string
  ): EntityInfo {
    const header = this.lineAt(lines, symbol.range.start.line);
    const entity: EntityInfo = {
      name: symbol.name,
      kind: 'interface',
      typeParameters: this.parseGenerics(header),
      extends: this.parseExtends(header),
      namespace,
      members: [],
      relations: [],
    };
    entity.members = this.membersFrom(symbol, lines, entity);
    return entity;
  }

  private enumEntity(
    symbol: DocumentSymbol,
    lines: string[],
    namespace?: string
  ): EntityInfo {
    const entity: EntityInfo = {
      name: symbol.name,
      kind: 'enum',
      namespace,
      members: [],
      relations: [],
    };
    entity.members = this.membersFrom(symbol, lines, entity);
    return entity;
  }

  private typeEntity(
    symbol: DocumentSymbol,
    lines: string[],
    namespace?: string
  ): EntityInfo {
    const entity: EntityInfo = {
      name: symbol.name,
      kind: 'type',
      namespace,
      members: [],
      relations: [],
    };
    const members: MemberInfo[] = [];
    for (let lineNumber = symbol.range.start.line + 1; lineNumber < symbol.range.end.line; lineNumber++) {
      const line = this.lineAt(lines, lineNumber).trim();
      const memberMatch = line.match(/^([A-Za-z0-9_]+)/);
      if (!memberMatch) continue;
      const typeMatch = line.match(/:\s*([A-Za-z0-9_.]+)/);
      members.push({
        name: memberMatch[1],
        kind: 'property',
        visibility: 'public',
        type: typeMatch?.[1],
      });
      if (typeMatch) entity.relations.push({ type: 'association', target: typeMatch[1] });
    }
    entity.members = members;
    return entity;
  }

  private membersFrom(
    symbol: DocumentSymbol,
    lines: string[],
    entity: EntityInfo
  ): MemberInfo[] {
    const members: MemberInfo[] = [];
    for (const child of symbol.children || []) {
      const line = this.lineAt(lines, child.range.start.line).trim();
      const member = this.memberFrom(child, line, entity);
      if (member) members.push(member);
    }
    return members;
  }

  private memberFrom(
    child: DocumentSymbol,
    line: string,
    entity: EntityInfo
  ): MemberInfo | null {
    const visibility = this.visibilityFrom(line);
    const isStatic = /\bstatic\b/.test(line);
    const isAbstract = /\babstract\b/.test(line);

    if (this.isPropertySymbol(child)) {
      return this.propertyMember(child, line, visibility, isStatic, isAbstract, entity);
    }
    if (this.isCallableSymbol(child, line)) {
      return this.callableMember(child, line, visibility, isStatic, isAbstract, entity);
    }
    if (this.isEnumSymbol(child)) {
      return { name: child.name, kind: 'property', visibility: 'public' };
    }
    return null;
  }

  private isPropertySymbol(child: DocumentSymbol): boolean {
    return child.kind === SymbolKind.Field || child.kind === SymbolKind.Property;
  }

  private isCallableSymbol(child: DocumentSymbol, line: string): boolean {
    return (
      child.kind === SymbolKind.Constructor ||
      child.kind === SymbolKind.Method ||
      child.kind === SymbolKind.Function ||
      /^constructor\b/.test(line)
    );
  }

  private isEnumSymbol(child: DocumentSymbol): boolean {
    return child.kind === SymbolKind.EnumMember || child.kind === SymbolKind.Constant;
  }

  private visibilityFrom(line: string): 'public' | 'protected' | 'private' {
    if (/\bprivate\b/.test(line)) return 'private';
    if (/\bprotected\b/.test(line)) return 'protected';
    return 'public';
  }

  private propertyMember(
    child: DocumentSymbol,
    line: string,
    visibility: 'public' | 'protected' | 'private',
    isStatic: boolean,
    isAbstract: boolean,
    entity: EntityInfo
  ): MemberInfo {
    const type = this.parsePropertyType(line);
    if (type) this.addFieldRelation(entity, type, child.name);
    return { name: child.name, kind: 'property', visibility, type, isStatic, isAbstract };
  }

  private addFieldRelation(entity: EntityInfo, type: string, label: string): void {
    const isCollection = this.isCollection(type);
    let relationType: RelationInfo['type'] = 'association';
    let targetCardinality = '1';
    if (isCollection) {
      relationType = 'aggregation';
      targetCardinality = '0..*';
    } else if (entity.kind === 'class') {
      relationType = 'composition';
    }
    entity.relations.push({
      type: relationType,
      target: this.baseType(type),
      label,
      sourceCardinality: '1',
      targetCardinality,
    });
  }

  private callableMember(
    child: DocumentSymbol,
    line: string,
    visibility: 'public' | 'protected' | 'private',
    isStatic: boolean,
    isAbstract: boolean,
    entity: EntityInfo
  ): MemberInfo {
    if (child.kind === SymbolKind.Constructor || /^constructor\b/.test(line)) {
      const parameters = this.parseParams(line);
      this.addParamRelations(entity, parameters);
      return { name: 'constructor', kind: 'constructor', visibility, parameters, isStatic };
    }
    const parameters = this.parseParams(line);
    const returnType = this.parseReturn(line);
    const typeParameters = this.parseGenerics(line);
    this.addParamRelations(entity, parameters);
    this.addReturnRelation(entity, returnType);
    return {
      name: child.name,
      kind: this.methodKind(line),
      visibility,
      parameters: parameters.length ? parameters : undefined,
      returnType,
      isStatic,
      isAbstract,
      typeParameters: typeParameters.length ? typeParameters : undefined,
    };
  }

  private methodKind(line: string): MemberInfo['kind'] {
    if (/^get\s+/.test(line)) return 'getter';
    if (/^set\s+/.test(line)) return 'setter';
    return 'method';
  }

  private addParamRelations(entity: EntityInfo, parameters: ParameterInfo[]): void {
    parameters.forEach(parameter => {
      const relation: RelationInfo = {
        type: 'dependency',
        target: this.baseType(parameter.type),
        label: parameter.name,
        sourceCardinality: '1',
        targetCardinality: this.isCollection(parameter.type) ? '0..*' : '1',
      };
      entity.relations.push(relation);
    });
  }

  private addReturnRelation(entity: EntityInfo, returnType?: string): void {
    if (!returnType) return;
    const relation: RelationInfo = {
      type: 'dependency',
      target: this.baseType(returnType),
      sourceCardinality: '1',
      targetCardinality: this.isCollection(returnType) ? '0..*' : '1',
    };
    entity.relations.push(relation);
  }

  private lineAt(lines: string[], line: number): string {
    return lines[line] ?? '';
  }

  private parseParams(line: string): ParameterInfo[] {
    const section = this.paramSection(line);
    if (!section) return [];
    return this.splitParams(section).map(param => this.paramFrom(param));
  }

  private paramSection(line: string): string | null {
    const matchResult = line.match(/\(([^)]*)\)/);
    return matchResult ? matchResult[1] : null;
  }

  private splitParams(inside: string): string[] {
    const parts: string[] = [];
    let depth = 0;
    let current = '';
    for (const char of inside) {
      if (this.isParamSeparator(char, depth)) {
        parts.push(current.trim());
        current = '';
        continue;
      }
      depth += this.deltaFor(char);
      current += char;
    }
    if (current.trim()) parts.push(current.trim());
    return parts;
  }

  private isParamSeparator(char: string, depth: number): boolean {
    return char === ',' && depth === 0;
  }

  private deltaFor(char: string): number {
    if (char === '{') return 1;
    if (char === '}') return -1;
    return 0;
  }

  private paramFrom(part: string): ParameterInfo {
    if (part.startsWith('{')) {
      const typeMatch = part.match(/}:\s*([^,]+)/);
      const type = typeMatch ? typeMatch[1].trim() : 'object';
      return { name: 'options', type };
    }
    const paramMatch = part.match(/([A-Za-z0-9_]+)\s*:\s*([^,]+)/);
    if (paramMatch) return { name: paramMatch[1], type: paramMatch[2].trim() };
    return { name: part, type: 'any' };
  }

  private parseReturn(line: string): string | undefined {
    const matchResult = line.match(/\)\s*:\s*([^{;]+)/);
    return matchResult ? matchResult[1].trim() : undefined;
  }

  private parsePropertyType(line: string): string | undefined {
    const matchResult = line.match(/:\s*([^;=]+)/);
    if (!matchResult) return undefined;
    const type = matchResult[1].trim();
    return type === '{' ? 'object' : type;
  }

  private parseGenerics(header: string): string[] {
    const matchResult = header.match(/<([^>]+)>/);
    return matchResult
      ? matchResult[1].split(',').map(s => s.trim()).filter(Boolean)
      : [];
  }

  private isCollection(type: string): boolean {
    return /(\[\]|^Array<.+>|^Set<.+>|^Map<.+>)/.test(type);
  }

  private baseType(type: string): string {
    return type.replace(/<[^>]+>/, '').replace(/\[\]$/, '').trim();
  }

  private parseExtends(header: string): string[] {
    const matchResult = header.match(/extends\s+([^{]+)/);
    return matchResult
      ? matchResult[1].split(',').map(s => s.trim()).filter(Boolean)
      : [];
  }

  private parseImplements(header: string): string[] {
    const matchResult = header.match(/implements\s+([^{]+)/);
    return matchResult
      ? matchResult[1].split(',').map(s => s.trim()).filter(Boolean)
      : [];
  }
}

