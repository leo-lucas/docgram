import {
  DiagramGenerator,
  EntityInfo,
  RelationInfo,
  MemberInfo,
  ParameterInfo,
} from '../../core/model.js';

function visibilitySymbol(v: MemberInfo['visibility']): string {
  switch (v) {
    case 'private':
      return '-';
    case 'protected':
      return '#';
    default:
      return '+';
  }
}

export class MermaidDiagramGenerator implements DiagramGenerator {
  generate(entities: EntityInfo[]): string {
    const lines: string[] = ['classDiagram'];
    this.prioritizeRelations(entities);
    const namespaceGroups = this.groupByNamespace(entities);
    for (const [namespace, entityList] of namespaceGroups) {
      this.emitNamespace(lines, namespace, entityList);
    }
    entities.forEach(entity => this.emitRelations(lines, entity));
    return lines.join('\n');
  }

  private groupByNamespace(entities: EntityInfo[]): Map<string | undefined, EntityInfo[]> {
    const groups = new Map<string | undefined, EntityInfo[]>();
    entities.forEach(entity => {
      const namespace = entity.namespace;
      if (!groups.has(namespace)) groups.set(namespace, []);
      groups.get(namespace)!.push(entity);
    });
    return groups;
  }

  private emitNamespace(
    lines: string[],
    namespace: string | undefined,
    entities: EntityInfo[]
  ): void {
    if (namespace) {
      lines.push(`  namespace ${namespace} {`);
      entities.forEach(entity => this.emitEntity(lines, entity, '    '));
      lines.push('  }');
    } else {
      entities.forEach(entity => this.emitEntity(lines, entity, '  '));
    }
  }

  private emitEntity(lines: string[], entity: EntityInfo, indent: string): void {
    const className = entity.typeParameters?.length
      ? `${entity.name}~${entity.typeParameters.join(', ')}~`
      : entity.name;
    lines.push(`${indent}class ${className} {`);
    if (entity.kind === 'interface') lines.push(`${indent}  <<interface>>`);
    if (entity.kind === 'enum') lines.push(`${indent}  <<enumeration>>`);
    if (entity.isAbstract) lines.push(`${indent}  <<abstract>>`);
    entity.members.forEach(member =>
      lines.push(this.memberLine(member, indent, entity.name))
    );
    lines.push(`${indent}}`);
  }

  private memberLine(member: MemberInfo, indent: string, ownerName: string): string {
    let name = member.name;
    if (member.typeParameters?.length) name += `~${member.typeParameters.join(', ')}~`;
    const symbol = visibilitySymbol(member.visibility);
    const staticMark = member.isStatic ? '$' : '';
    if (member.kind === 'property')
      return this.propertyLine(member, indent, symbol, staticMark, name);
    if (member.kind === 'constructor')
      return this.ctorLine(member, indent, symbol, ownerName);
    return this.methodLine(member, indent, symbol, staticMark, name);
  }

  private propertyLine(
    member: MemberInfo,
    indent: string,
    symbol: string,
    staticMark: string,
    name: string
  ): string {
    const abstractMark = member.isAbstract ? '*' : '';
    const type = member.type ? `: ${member.type}` : '';
    return `${indent}  ${symbol}${name}${staticMark}${abstractMark}${type}`;
  }

  private ctorLine(
    member: MemberInfo,
    indent: string,
    symbol: string,
    ownerName: string
  ): string {
    const params = this.paramList(member.parameters);
    const abstractMark = member.isAbstract ? '*' : '';
    return `${indent}  ${symbol}${ownerName}(${params})${abstractMark}`;
  }

  private methodLine(
    member: MemberInfo,
    indent: string,
    symbol: string,
    staticMark: string,
    name: string
  ): string {
    const prefix =
      member.kind === 'getter' ? 'get ' : member.kind === 'setter' ? 'set ' : '';
    const params = this.paramList(member.parameters);
    const returnType = member.returnType ? `: ${member.returnType}` : '';
    const abstractMark = member.isAbstract ? '*' : '';
    return `${indent}  ${symbol}${prefix}${name}${staticMark}(${params})${abstractMark}${returnType}`;
  }

  private paramList(parameters?: ParameterInfo[]): string {
    return (parameters ?? [])
      .map(parameter => `${parameter.name}: ${parameter.type}`)
      .join(', ');
  }

  private emitRelations(lines: string[], entity: EntityInfo): void {
    entity.relations.forEach(relation =>
      lines.push(this.relationLine(entity.name, relation))
    );
  }

  private relationLine(sourceName: string, relation: RelationInfo): string {
    const sourceCard = this.cardinality(relation.sourceCardinality);
    const targetCard = this.cardinality(relation.targetCardinality);
    const label = relation.label ? ` : ${relation.label}` : '';
    const map: Record<RelationInfo['type'], string> = {
      inheritance: '<|--',
      implementation: '<|..',
      association: '-->',
      composition: '*--',
      aggregation: 'o--',
      dependency: '..>',
    };
    if (relation.type === 'inheritance' || relation.type === 'implementation') {
      return `  ${relation.target} ${map[relation.type]} ${sourceName}`;
    }
    return `  ${sourceName}${sourceCard} ${map[relation.type]}${targetCard} ${relation.target}${label}`;
  }

  private cardinality(value?: string): string {
    return value ? ` "${value}"` : '';
  }

  private prioritizeRelations(entities: EntityInfo[]): void {
    const entityNames = new Set(entities.map(entity => entity.name));
    const priority: Record<RelationInfo['type'], number> = {
      inheritance: 1,
      implementation: 2,
      composition: 3,
      aggregation: 4,
      association: 5,
      dependency: 6,
    };

    for (const entity of entities) {
      const best = new Map<string, RelationInfo>();
      const filtered = entity.relations.filter(r => entityNames.has(r.target));
      for (const relation of filtered) {
        const current = best.get(relation.target);
        if (!current || priority[relation.type] < priority[current.type]) {
          best.set(relation.target, relation);
        }
      }
      entity.relations = Array.from(best.values());
    }
  }
}

