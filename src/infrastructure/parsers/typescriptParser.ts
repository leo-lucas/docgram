import { Project, SyntaxKind, Type, Node } from 'ts-morph';
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

    for (const sourceFile of project.getSourceFiles()) {
      const namespace = namespaceOf(sourceFile.getFilePath());
      // classes
      for (const c of sourceFile.getClasses()) {
        const entity: EntityInfo = {
          name: c.getName() ?? 'Anonymous',
          kind: 'class',
          isAbstract: c.isAbstract(),
          typeParameters: c.getTypeParameters().map(tp => tp.getText()),
          extends: c.getExtends()?.getExpression().getText() ? [c.getExtends()!.getExpression().getText()] : [],
          implements: c.getImplements().map(i => i.getExpression().getText()),
          namespace,
          members: [],
          relations: [],
        };
        c.getProperties().forEach(p => {
          const propertyType = p.getType();
          const typeText = this.formatType(propertyType);
          entity.members.push({
            name: p.getName(),
            kind: 'property',
            visibility: p.getScope() ?? 'public',
            type: typeText,
            isStatic: p.isStatic?.() ?? false,
            isAbstract: p.isAbstract?.() ?? false,
          });
          const relType = this.isCollection(propertyType)
            ? propertyType.getArrayElementType() || propertyType.getTypeArguments()[0]
            : propertyType;
          const symbol = relType.getAliasSymbol() ?? relType.getSymbol();
          const typeName = symbol?.getName();
          if (typeName && !typeName.startsWith('__')) {
            const rel: RelationInfo = {
              type: this.isCollection(propertyType) ? 'aggregation' : 'composition',
              target: typeName,
              label: p.getName(),
              sourceCardinality: '1',
              targetCardinality: this.isCollection(propertyType) ? '0..*' : '1',
            };
            entity.relations.push(rel);
          }
        });
        c.getConstructors().forEach(cons => {
          const paramEntries: { info: ParameterInfo; type: Type }[] = [];
          cons.getParameters().forEach(prm => {
            const nameNode = prm.getNameNode();
            if (nameNode && Node.isObjectBindingPattern(nameNode)) {
              const t = prm.getType();
              paramEntries.push({
                info: { name: 'options', type: this.formatType(t) },
                type: t,
              });
            } else {
              const t = prm.getType();
              paramEntries.push({
                info: { name: prm.getName(), type: this.formatType(t) },
                type: t,
              });
            }
          });
          entity.members.push({
            name: 'constructor',
            kind: 'constructor',
            visibility: cons.getScope() ?? 'public',
            parameters: paramEntries.map(p => p.info),
          });
          paramEntries.forEach(({ info, type }) => {
            const relType = this.isCollection(type)
              ? type.getArrayElementType() || type.getTypeArguments()[0]
              : type;
            const symbol = relType.getAliasSymbol() ?? relType.getSymbol();
            const typeName = symbol?.getName();
            if (typeName && !typeName.startsWith('__')) {
              const rel: RelationInfo = {
                type: 'dependency',
                target: typeName,
                label: info.name,
                sourceCardinality: '1',
                targetCardinality: this.isCollection(type) ? '0..*' : '1',
              };
              entity.relations.push(rel);
            }
          });
        });
        c.getMethods().forEach(m => {
          const parameters: ParameterInfo[] = m.getParameters().map(prm => ({
            name: prm.getName(),
            type: this.formatType(prm.getType()),
          }));
          entity.members.push({
            name: m.getName(),
            kind: 'method',
            visibility: m.getScope() ?? 'public',
            returnType: this.formatType(m.getReturnType()),
            parameters,
            isStatic: m.isStatic?.() ?? false,
            isAbstract: m.isAbstract?.() ?? false,
            typeParameters: m.getTypeParameters().map(tp => tp.getText()),
          });
          m.getParameters().forEach(prm => {
            const t = prm.getType();
            const relType = this.isCollection(t)
              ? t.getArrayElementType() || t.getTypeArguments()[0]
              : t;
            const symbol = relType.getAliasSymbol() ?? relType.getSymbol();
            const typeName = symbol?.getName();
            if (typeName && !typeName.startsWith('__')) {
              const rel: RelationInfo = {
                type: 'dependency',
                target: typeName,
                label: prm.getName(),
                sourceCardinality: '1',
                targetCardinality: this.isCollection(t) ? '0..*' : '1',
              };
              entity.relations.push(rel);
            }
          });
          const rt = m.getReturnType();
          const relRt = this.isCollection(rt)
            ? rt.getArrayElementType() || rt.getTypeArguments()[0]
            : rt;
          const rts = relRt.getAliasSymbol() ?? relRt.getSymbol();
          const rtn = rts?.getName();
          if (rtn && !rtn.startsWith('__')) {
            entity.relations.push({
              type: 'dependency',
              target: rtn,
              sourceCardinality: '1',
              targetCardinality: this.isCollection(rt) ? '0..*' : '1',
            });
          }
        });
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
        entities.push(entity);
      }

      // interfaces
      for (const i of sourceFile.getInterfaces()) {
        const entity: EntityInfo = {
          name: i.getName() ?? 'Anonymous',
          kind: 'interface',
          typeParameters: i.getTypeParameters().map(tp => tp.getText()),
          extends: i.getExtends().map(e => e.getExpression().getText()),
          namespace,
          members: [],
          relations: [],
        };
        i.getProperties().forEach(p => {
          const propertyType = p.getType();
          const typeText = this.formatType(propertyType);
          entity.members.push({
            name: p.getName(),
            kind: 'property',
            visibility: 'public',
            type: typeText,
            isAbstract: true,
          });
          const relType = this.isCollection(propertyType)
            ? propertyType.getArrayElementType() || propertyType.getTypeArguments()[0]
            : propertyType;
          const symbol = relType.getAliasSymbol() ?? relType.getSymbol();
          const typeName = symbol?.getName();
          if (typeName && !typeName.startsWith('__')) {
            const rel: RelationInfo = {
              type: this.isCollection(propertyType) ? 'aggregation' : 'association',
              target: typeName,
              label: p.getName(),
              sourceCardinality: '1',
              targetCardinality: this.isCollection(propertyType) ? '0..*' : '1',
            };
            entity.relations.push(rel);
          }
        });
        i.getMethods().forEach(m => {
          const parameters: ParameterInfo[] = m.getParameters().map(prm => ({
            name: prm.getName(),
            type: this.formatType(prm.getType()),
          }));
          entity.members.push({
            name: m.getName(),
            kind: 'method',
            visibility: 'public',
            returnType: this.formatType(m.getReturnType()),
            parameters,
            isAbstract: true,
            typeParameters: m.getTypeParameters().map(tp => tp.getText()),
          });
          m.getParameters().forEach(prm => {
            const t = prm.getType();
            const relType = this.isCollection(t)
              ? t.getArrayElementType() || t.getTypeArguments()[0]
              : t;
            const symbol = relType.getAliasSymbol() ?? relType.getSymbol();
            const typeName = symbol?.getName();
            if (typeName && !typeName.startsWith('__')) {
              entity.relations.push({
                type: 'dependency',
                target: typeName,
                label: prm.getName(),
                sourceCardinality: '1',
                targetCardinality: this.isCollection(t) ? '0..*' : '1',
              });
            }
          });
          const rt = m.getReturnType();
          const relRt = this.isCollection(rt)
            ? rt.getArrayElementType() || rt.getTypeArguments()[0]
            : rt;
          const rts = relRt.getAliasSymbol() ?? relRt.getSymbol();
          const rtn = rts?.getName();
          if (rtn && !rtn.startsWith('__')) {
            entity.relations.push({
              type: 'dependency',
              target: rtn,
              sourceCardinality: '1',
              targetCardinality: this.isCollection(rt) ? '0..*' : '1',
            });
          }
        });
        entities.push(entity);
      }

      // enums
      for (const e of sourceFile.getEnums()) {
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
        entities.push(entity);
      }

      // type aliases with object literal
      for (const t of sourceFile.getTypeAliases()) {
        const node = t.getTypeNode();
        if (node && node.getKind() === SyntaxKind.TypeLiteral) {
          const entity: EntityInfo = {
            name: t.getName(),
            kind: 'type',
            namespace,
            members: [],
            relations: [],
          };
          const props = t.getType().getProperties();
          props.forEach(sym => {
            const decl = sym.getDeclarations()[0];
            const typeText = this.formatType(decl.getType());
            entity.members.push({
              name: sym.getName(),
              kind: 'property',
              visibility: 'public',
              type: typeText,
            });
          });
          entities.push(entity);
        }
      }
    }

    const names = new Set(entities.map(e => e.name));
    for (const e of entities) {
      if (e.extends) e.extends.forEach(parent => e.relations.push({ type: 'inheritance', target: parent }));
      if (e.implements) e.implements.forEach(intf => e.relations.push({ type: 'implementation', target: intf }));
      e.relations = e.relations.filter(r => names.has(r.target));
    }

    return entities;
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
    return raw.replace(/import\([^\)]+\)\./g, '');
  }
}
