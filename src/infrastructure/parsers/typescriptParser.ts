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
    sourceFile.getClasses().forEach(classDecl =>
      entities.push(this.parseClass(classDecl, namespace))
    );
    sourceFile.getInterfaces().forEach(interfaceDecl =>
      entities.push(this.parseInterface(interfaceDecl, namespace))
    );
    sourceFile.getEnums().forEach(enumDecl =>
      entities.push(this.parseEnum(enumDecl, namespace))
    );
    sourceFile.getTypeAliases().forEach(typeAliasDecl => {
      const entity = this.parseTypeAlias(typeAliasDecl, namespace);
      if (entity) entities.push(entity);
    });
  }

  private parseClass(classDecl: ClassDeclaration, namespace?: string): EntityInfo {
    const entity: EntityInfo = {
      name: classDecl.getName() ?? 'Anonymous',
      kind: 'class',
      isAbstract: classDecl.isAbstract(),
      typeParameters: classDecl.getTypeParameters().map(tp => tp.getText()),
      extends: classDecl.getExtends()?.getExpression().getText()
        ? [classDecl.getExtends()!.getExpression().getText()]
        : [],
      implements: classDecl.getImplements().map(impl => impl.getExpression().getText()),
      namespace,
      members: [],
      relations: [],
    };
    this.classProperties(classDecl, entity);
    this.classConstructors(classDecl, entity);
    this.classMethods(classDecl, entity);
    this.classAccessors(classDecl, entity);
    return entity;
  }

  private classProperties(classDecl: ClassDeclaration, entity: EntityInfo): void {
    classDecl.getProperties().forEach(propertyDecl => {
      const propertyType = propertyDecl.getType();
      entity.members.push({
        name: propertyDecl.getName(),
        kind: 'property',
        visibility: propertyDecl.getScope() ?? 'public',
        type: this.formatType(propertyType),
        isStatic: propertyDecl.isStatic?.() ?? false,
        isAbstract: propertyDecl.isAbstract?.() ?? false,
      });
      this.addFieldRelation(entity, propertyType, propertyDecl.getName());
    });
  }

  private classConstructors(classDecl: ClassDeclaration, entity: EntityInfo): void {
    classDecl.getConstructors().forEach(constructorDecl => {
      const parameters = constructorDecl
        .getParameters()
        .map(parameterDecl => this.paramEntry(parameterDecl));
      entity.members.push({
        name: 'constructor',
        kind: 'constructor',
        visibility: constructorDecl.getScope() ?? 'public',
        parameters: parameters.map(param => param.info),
      });
      parameters.forEach(param =>
        this.addParamRelation(entity, param.type, param.info.name)
      );
    });
  }

  private classMethods(classDecl: ClassDeclaration, entity: EntityInfo): void {
    classDecl.getMethods().forEach(methodDecl => {
      const parameters = methodDecl
        .getParameters()
        .map(parameterDecl => this.paramEntry(parameterDecl));
      entity.members.push({
        name: methodDecl.getName(),
        kind: 'method',
        visibility: methodDecl.getScope() ?? 'public',
        returnType: this.formatType(methodDecl.getReturnType()),
        parameters: parameters.map(param => param.info),
        isStatic: methodDecl.isStatic?.() ?? false,
        isAbstract: methodDecl.isAbstract?.() ?? false,
        typeParameters: methodDecl.getTypeParameters().map(tp => tp.getText()),
      });
      parameters.forEach(param =>
        this.addParamRelation(entity, param.type, param.info.name)
      );
      this.addReturnRelation(entity, methodDecl.getReturnType());
    });
  }

  private classAccessors(classDecl: ClassDeclaration, entity: EntityInfo): void {
    classDecl.getGetAccessors().forEach(getter => {
      entity.members.push({
        name: getter.getName(),
        kind: 'getter',
        visibility: getter.getScope() ?? 'public',
        returnType: this.formatType(getter.getReturnType()),
        isStatic: getter.isStatic?.() ?? false,
      });
    });
    classDecl.getSetAccessors().forEach(setter => {
      const parameters: ParameterInfo[] = setter.getParameters().map(paramDecl => ({
        name: paramDecl.getName(),
        type: this.formatType(paramDecl.getType()),
      }));
      entity.members.push({
        name: setter.getName(),
        kind: 'setter',
        visibility: setter.getScope() ?? 'public',
        parameters,
        isStatic: setter.isStatic?.() ?? false,
      });
    });
  }

  private parseInterface(
    interfaceDecl: InterfaceDeclaration,
    namespace?: string
  ): EntityInfo {
    const entity: EntityInfo = {
      name: interfaceDecl.getName() ?? 'Anonymous',
      kind: 'interface',
      typeParameters: interfaceDecl.getTypeParameters().map(tp => tp.getText()),
      extends: interfaceDecl.getExtends().map(ext => ext.getExpression().getText()),
      namespace,
      members: [],
      relations: [],
    };
    this.interfaceProperties(interfaceDecl, entity);
    this.interfaceMethods(interfaceDecl, entity);
    return entity;
  }

  private interfaceProperties(
    interfaceDecl: InterfaceDeclaration,
    entity: EntityInfo
  ): void {
    interfaceDecl.getProperties().forEach(propertyDecl => {
      const propertyType = propertyDecl.getType();
      entity.members.push({
        name: propertyDecl.getName(),
        kind: 'property',
        visibility: 'public',
        type: this.formatType(propertyType),
        isAbstract: true,
      });
      this.addFieldRelation(entity, propertyType, propertyDecl.getName());
    });
  }

  private interfaceMethods(
    interfaceDecl: InterfaceDeclaration,
    entity: EntityInfo
  ): void {
    interfaceDecl.getMethods().forEach(methodDecl => {
      const parameters = methodDecl
        .getParameters()
        .map(parameterDecl => this.paramEntry(parameterDecl));
      entity.members.push({
        name: methodDecl.getName(),
        kind: 'method',
        visibility: 'public',
        returnType: this.formatType(methodDecl.getReturnType()),
        parameters: parameters.map(param => param.info),
        isAbstract: true,
        typeParameters: methodDecl.getTypeParameters().map(tp => tp.getText()),
      });
      parameters.forEach(param =>
        this.addParamRelation(entity, param.type, param.info.name)
      );
      this.addReturnRelation(entity, methodDecl.getReturnType());
    });
  }

  private parseEnum(enumDecl: EnumDeclaration, namespace?: string): EntityInfo {
    const entity: EntityInfo = {
      name: enumDecl.getName() ?? 'Anonymous',
      kind: 'enum',
      namespace,
      members: [],
      relations: [],
    };
    enumDecl.getMembers().forEach(memberDecl => {
      entity.members.push({
        name: memberDecl.getName() ?? '',
        kind: 'property',
        visibility: 'public',
      });
    });
    return entity;
  }

  private parseTypeAlias(
    typeAliasDecl: TypeAliasDeclaration,
    namespace?: string
  ): EntityInfo | null {
    const node = typeAliasDecl.getTypeNode();
    if (!node || node.getKind() !== SyntaxKind.TypeLiteral) return null;
    const entity: EntityInfo = {
      name: typeAliasDecl.getName(),
      kind: 'type',
      namespace,
      members: [],
      relations: [],
    };
    typeAliasDecl
      .getType()
      .getProperties()
      .forEach(symbol => {
        const declaration = symbol.getDeclarations()[0];
        entity.members.push({
          name: symbol.getName(),
          kind: 'property',
          visibility: 'public',
          type: this.formatType(declaration.getType()),
        });
      });
    return entity;
  }

  private paramEntry(
    parameterDecl: ParameterDeclaration
  ): { info: ParameterInfo; type: Type } {
    const nameNode = parameterDecl.getNameNode();
    if (nameNode && Node.isObjectBindingPattern(nameNode)) {
      const type = parameterDecl.getType();
      return { info: { name: 'options', type: this.formatType(type) }, type };
    }
    const type = parameterDecl.getType();
    return {
      info: { name: parameterDecl.getName(), type: this.formatType(type) },
      type,
    };
  }

  private addFieldRelation(entity: EntityInfo, type: Type, label: string): void {
    const target = this.typeName(type);
    if (!target) return;
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
      target,
      label,
      sourceCardinality: '1',
      targetCardinality,
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

  private typeName(type: Type): string | undefined {
    const relationType = this.elementType(type);
    const symbol = relationType.getAliasSymbol() || relationType.getSymbol();
    if (!symbol) return undefined;
    const name = symbol.getName();
    return name.startsWith('__') ? undefined : name;
  }

  private elementType(type: Type): Type {
    if (!this.isCollection(type)) return type;
    return type.getArrayElementType() || type.getTypeArguments()[0];
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

  private isCollection(type: Type): boolean {
    const text = type.getText();
    return (
      type.isArray() ||
      /^Array<.+>$/i.test(text) ||
      /^Set<.+>$/i.test(text) ||
      /^Map<.+>$/i.test(text)
    );
  }

  private formatType(type: Type): string {
    if (/^\s*\{/.test(type.getText())) return 'object';
    if (type.isArray()) {
      const element = type.getArrayElementType();
      return `${this.formatType(element!)}[]`;
    }
    const symbolName = type.getSymbol()?.getName();
    const raw =
      symbolName && !symbolName.startsWith('__') ? symbolName : type.getText();
    return raw.replace(/import\([^)]+\)\./g, '');
  }
}

