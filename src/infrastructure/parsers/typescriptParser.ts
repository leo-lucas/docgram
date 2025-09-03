import {
  Project,
  SourceFile,
  ClassDeclaration,
  InterfaceDeclaration,
  EnumDeclaration,
  TypeAliasDeclaration,
  ParameterDeclaration,
  SyntaxKind,
  Type,
  Node,
} from 'ts-morph';
import {
  EntityInfo,
  Parser,
  ParameterInfo,
  RelationInfo,
} from '../../core/model.js';
import { collectFiles, namespaceOf } from './utils.js';

export class TypeScriptParser implements Parser {
  async parse(paths: string[]): Promise<EntityInfo[]> {
    const files = await collectFiles(paths);
    const project = new Project();
    project.addSourceFilesAtPaths(files);
    const entities: EntityInfo[] = [];
    project.getSourceFiles().forEach(sf => this.parseFile(sf, entities));
    this.finalizeRelations(entities);
    return entities;
  }

  private parseFile(sourceFile: SourceFile, entities: EntityInfo[]): void {
    const namespace = namespaceOf(sourceFile.getFilePath());
    sourceFile.getClasses().forEach(c => entities.push(this.parseClass(c, namespace)));
    sourceFile.getInterfaces().forEach(i => entities.push(this.parseInterface(i, namespace)));
    sourceFile.getEnums().forEach(e => entities.push(this.parseEnum(e, namespace)));
    sourceFile.getTypeAliases().forEach(t => {
      const ent = this.parseTypeAlias(t, namespace);
      if (ent) entities.push(ent);
    });
  }

  private parseClass(c: ClassDeclaration, namespace?: string): EntityInfo {
    const entity: EntityInfo = {
      name: c.getName() ?? 'Anonymous',
      kind: 'class',
      isAbstract: c.isAbstract(),
      typeParameters: c.getTypeParameters().map(tp => tp.getText()),
      extends: c.getExtends()?.getExpression().getText()
        ? [c.getExtends()!.getExpression().getText()]
        : [],
      implements: c.getImplements().map(i => i.getExpression().getText()),
      namespace,
      members: [],
      relations: [],
    };
    this.classProperties(c, entity);
    this.classConstructors(c, entity);
    this.classMethods(c, entity);
    this.classAccessors(c, entity);
    return entity;
  }

  private classProperties(c: ClassDeclaration, entity: EntityInfo): void {
    c.getProperties().forEach(p => {
      const type = p.getType();
      entity.members.push({
        name: p.getName(),
        kind: 'property',
        visibility: p.getScope() ?? 'public',
        type: this.formatType(type),
        isStatic: p.isStatic?.() ?? false,
        isAbstract: p.isAbstract?.() ?? false,
      });
      this.addFieldRelation(entity, type, p.getName());
    });
  }

  private classConstructors(c: ClassDeclaration, entity: EntityInfo): void {
    c.getConstructors().forEach(cons => {
      const params = cons.getParameters().map(p => this.paramEntry(p));
      entity.members.push({
        name: 'constructor',
        kind: 'constructor',
        visibility: cons.getScope() ?? 'public',
        parameters: params.map(p => p.info),
      });
      params.forEach(p => this.addParamRelation(entity, p.type, p.info.name));
    });
  }

  private classMethods(c: ClassDeclaration, entity: EntityInfo): void {
    c.getMethods().forEach(m => {
      const params = m.getParameters().map(prm => this.paramEntry(prm));
      entity.members.push({
        name: m.getName(),
        kind: 'method',
        visibility: m.getScope() ?? 'public',
        returnType: this.formatType(m.getReturnType()),
        parameters: params.map(p => p.info),
        isStatic: m.isStatic?.() ?? false,
        isAbstract: m.isAbstract?.() ?? false,
        typeParameters: m.getTypeParameters().map(tp => tp.getText()),
      });
      params.forEach(p => this.addParamRelation(entity, p.type, p.info.name));
      this.addReturnRelation(entity, m.getReturnType());
    });
  }

  private classAccessors(c: ClassDeclaration, entity: EntityInfo): void {
    c.getGetAccessors().forEach(g => {
      entity.members.push({
        name: g.getName(),
        kind: 'getter',
        visibility: g.getScope() ?? 'public',
        returnType: this.formatType(g.getReturnType()),
        isStatic: g.isStatic?.() ?? false,
      });
    });
    c.getSetAccessors().forEach(s => {
      const parameters: ParameterInfo[] = s.getParameters().map(prm => ({
        name: prm.getName(),
        type: this.formatType(prm.getType()),
      }));
      entity.members.push({
        name: s.getName(),
        kind: 'setter',
        visibility: s.getScope() ?? 'public',
        parameters,
        isStatic: s.isStatic?.() ?? false,
      });
    });
  }

  private parseInterface(i: InterfaceDeclaration, namespace?: string): EntityInfo {
    const entity: EntityInfo = {
      name: i.getName() ?? 'Anonymous',
      kind: 'interface',
      typeParameters: i.getTypeParameters().map(tp => tp.getText()),
      extends: i.getExtends().map(e => e.getExpression().getText()),
      namespace,
      members: [],
      relations: [],
    };
    this.interfaceProperties(i, entity);
    this.interfaceMethods(i, entity);
    return entity;
  }

  private interfaceProperties(i: InterfaceDeclaration, entity: EntityInfo): void {
    i.getProperties().forEach(p => {
      const type = p.getType();
      entity.members.push({
        name: p.getName(),
        kind: 'property',
        visibility: 'public',
        type: this.formatType(type),
        isAbstract: true,
      });
      this.addFieldRelation(entity, type, p.getName());
    });
  }

  private interfaceMethods(i: InterfaceDeclaration, entity: EntityInfo): void {
    i.getMethods().forEach(m => {
      const params = m.getParameters().map(prm => this.paramEntry(prm));
      entity.members.push({
        name: m.getName(),
        kind: 'method',
        visibility: 'public',
        returnType: this.formatType(m.getReturnType()),
        parameters: params.map(p => p.info),
        isAbstract: true,
        typeParameters: m.getTypeParameters().map(tp => tp.getText()),
      });
      params.forEach(p => this.addParamRelation(entity, p.type, p.info.name));
      this.addReturnRelation(entity, m.getReturnType());
    });
  }

  private parseEnum(e: EnumDeclaration, namespace?: string): EntityInfo {
    const entity: EntityInfo = {
      name: e.getName() ?? 'Anonymous',
      kind: 'enum',
      namespace,
      members: [],
      relations: [],
    };
    e.getMembers().forEach(m => {
      entity.members.push({
        name: m.getName() ?? '',
        kind: 'property',
        visibility: 'public',
      });
    });
    return entity;
  }

  private parseTypeAlias(t: TypeAliasDeclaration, namespace?: string): EntityInfo | null {
    const node = t.getTypeNode();
    if (!node || node.getKind() !== SyntaxKind.TypeLiteral) return null;
    const entity: EntityInfo = {
      name: t.getName(),
      kind: 'type',
      namespace,
      members: [],
      relations: [],
    };
    t
      .getType()
      .getProperties()
      .forEach(sym => {
        const decl = sym.getDeclarations()[0];
        entity.members.push({
          name: sym.getName(),
          kind: 'property',
          visibility: 'public',
          type: this.formatType(decl.getType()),
        });
      });
    return entity;
  }

  private paramEntry(prm: ParameterDeclaration): { info: ParameterInfo; type: Type } {
    const nameNode = prm.getNameNode();
    if (nameNode && Node.isObjectBindingPattern(nameNode)) {
      const t = prm.getType();
      return { info: { name: 'options', type: this.formatType(t) }, type: t };
    }
    const t = prm.getType();
    return { info: { name: prm.getName(), type: this.formatType(t) }, type: t };
  }

  private addFieldRelation(entity: EntityInfo, type: Type, label: string): void {
    const target = this.typeName(type);
    if (!target) return;
    const isColl = this.isCollection(type);
    let relType: RelationInfo['type'] = 'association';
    let targetCard = '1';
    if (isColl) {
      relType = 'aggregation';
      targetCard = '0..*';
    } else if (entity.kind === 'class') {
      relType = 'composition';
    }
    entity.relations.push({
      type: relType,
      target,
      label,
      sourceCardinality: '1',
      targetCardinality: targetCard,
    });
  }

  private addParamRelation(entity: EntityInfo, type: Type, label: string): void {
    const target = this.typeName(type);
    if (!target) return;
    entity.relations.push({
      type: 'dependency',
      target,
      label,
      sourceCardinality: '1',
      targetCardinality: this.isCollection(type) ? '0..*' : '1',
    });
  }

  private addReturnRelation(entity: EntityInfo, type: Type): void {
    const target = this.typeName(type);
    if (!target) return;
    entity.relations.push({
      type: 'dependency',
      target,
      sourceCardinality: '1',
      targetCardinality: this.isCollection(type) ? '0..*' : '1',
    });
  }

  private typeName(t: Type): string | undefined {
    const relType = this.elementType(t);
    const symbol = relType.getAliasSymbol() || relType.getSymbol();
    if (!symbol) return undefined;
    const name = symbol.getName();
    return name.startsWith('__') ? undefined : name;
  }

  private elementType(t: Type): Type {
    if (!this.isCollection(t)) return t;
    return t.getArrayElementType() || t.getTypeArguments()[0];
  }

  private finalizeRelations(entities: EntityInfo[]): void {
    const names = new Set(entities.map(e => e.name));
    for (const e of entities) {
      e.extends?.forEach(p => e.relations.push({ type: 'inheritance', target: p }));
      e.implements?.forEach(i => e.relations.push({ type: 'implementation', target: i }));
      e.relations = e.relations.filter(r => names.has(r.target));
    }
  }

  private isCollection(t: Type): boolean {
    const text = t.getText();
    return (
      t.isArray() ||
      /^Array<.+>$/i.test(text) ||
      /^Set<.+>$/i.test(text) ||
      /^Map<.+>$/i.test(text)
    );
  }

  private formatType(t: Type): string {
    if (/^\s*\{/.test(t.getText())) return 'object';
    if (t.isArray()) {
      const elem = t.getArrayElementType();
      return `${this.formatType(elem!)}[]`;
      }
    const symName = t.getSymbol()?.getName();
    const raw = symName && !symName.startsWith('__') ? symName : t.getText();
    return raw.replace(/import\([^)]+\)\./g, '');
  }
}

