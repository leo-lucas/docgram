import fs from 'node:fs';
import path from 'node:path';
import { Project, SyntaxKind, Type } from 'ts-morph';
import { EntityInfo, Parser, ParameterInfo } from '../../core/model.js';

export class TypeScriptParser implements Parser {
  async parse(paths: string[]): Promise<EntityInfo[]> {
    const files: string[] = [];
    for (const p of paths) this.collectFiles(p, files);

    const project = new Project();
    project.addSourceFilesAtPaths(files);

    const entities: EntityInfo[] = [];

    for (const sourceFile of project.getSourceFiles()) {
      // classes
      for (const c of sourceFile.getClasses()) {
        const entity: EntityInfo = {
          name: c.getName() ?? 'Anonymous',
          kind: 'class',
          isAbstract: c.isAbstract(),
          extends: c.getExtends()?.getExpression().getText() ? [c.getExtends()!.getExpression().getText()] : [],
          implements: c.getImplements().map(i => i.getExpression().getText()),
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
          });
          const symbol = propertyType.getAliasSymbol() ?? propertyType.getSymbol();
          const typeName = symbol?.getName();
          if (typeName && !typeName.startsWith('__'))
            entity.relations.push({ type: 'association', target: typeName });
        });
        c.getConstructors().forEach(cons => {
          const parameters: ParameterInfo[] = cons.getParameters().map(prm => ({
            name: prm.getName(),
            type: this.formatType(prm.getType()),
          }));
          entity.members.push({
            name: 'constructor',
            kind: 'constructor',
            visibility: cons.getScope() ?? 'public',
            parameters,
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
          });
        });
        c.getGetAccessors().forEach(g => {
          entity.members.push({
            name: g.getName(),
            kind: 'getter',
            visibility: g.getScope() ?? 'public',
            returnType: this.formatType(g.getReturnType()),
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
          });
        });
        entities.push(entity);
      }

      // interfaces
      for (const i of sourceFile.getInterfaces()) {
        const entity: EntityInfo = {
          name: i.getName() ?? 'Anonymous',
          kind: 'interface',
          extends: i.getExtends().map(e => e.getExpression().getText()),
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
          });
          const symbol = propertyType.getAliasSymbol() ?? propertyType.getSymbol();
          const typeName = symbol?.getName();
          if (typeName && !typeName.startsWith('__'))
            entity.relations.push({ type: 'association', target: typeName });
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
          });
        });
        entities.push(entity);
      }

      // enums
      for (const e of sourceFile.getEnums()) {
        const entity: EntityInfo = {
          name: e.getName() ?? 'Anonymous',
          kind: 'enum',
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

  private collectFiles(target: string, files: string[]) {
    const stat = fs.statSync(target);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(target)) {
        this.collectFiles(path.join(target, entry), files);
      }
    } else if (target.endsWith('.ts')) {
      files.push(target);
    }
  }

  private formatType(t: Type): string {
    const symName = t.getSymbol()?.getName();
    const raw = symName && !symName.startsWith('__') ? symName : t.getText();
    return raw.replace(/import\([^\)]+\)\./g, '');
  }
}
