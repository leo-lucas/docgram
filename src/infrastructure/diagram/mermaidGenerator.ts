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
    const groups = this.groupByNamespace(entities);
    for (const [ns, ents] of groups) {
      this.emitNamespace(lines, ns, ents);
    }
    entities.forEach(e => this.emitRelations(lines, e));
    return lines.join('\n');
  }

  private groupByNamespace(entities: EntityInfo[]): Map<string | undefined, EntityInfo[]> {
    const groups = new Map<string | undefined, EntityInfo[]>();
    entities.forEach(e => {
      const ns = e.namespace;
      if (!groups.has(ns)) groups.set(ns, []);
      groups.get(ns)!.push(e);
    });
    return groups;
  }

  private emitNamespace(
    lines: string[],
    ns: string | undefined,
    ents: EntityInfo[]
  ): void {
    if (ns) {
      lines.push(`  namespace ${ns} {`);
      ents.forEach(e => this.emitEntity(lines, e, '    '));
      lines.push('  }');
    } else {
      ents.forEach(e => this.emitEntity(lines, e, '  '));
    }
  }

  private emitEntity(lines: string[], e: EntityInfo, indent: string): void {
    const className = e.typeParameters?.length
      ? `${e.name}~${e.typeParameters.join(', ')}~`
      : e.name;
    lines.push(`${indent}class ${className} {`);
    if (e.kind === 'interface') lines.push(`${indent}  <<interface>>`);
    if (e.kind === 'enum') lines.push(`${indent}  <<enumeration>>`);
    if (e.isAbstract) lines.push(`${indent}  <<abstract>>`);
    e.members.forEach(m => lines.push(this.memberLine(m, indent, e.name)));
    lines.push(`${indent}}`);
  }

  private memberLine(m: MemberInfo, indent: string, owner: string): string {
    let name = m.name;
    if (m.typeParameters?.length) name += `~${m.typeParameters.join(', ')}~`;
    const symbol = visibilitySymbol(m.visibility);
    const staticMark = m.isStatic ? '$' : '';
    if (m.kind === 'property') return this.propertyLine(m, indent, symbol, staticMark, name);
    if (m.kind === 'constructor') return this.ctorLine(m, indent, symbol, owner);
    return this.methodLine(m, indent, symbol, staticMark, name);
  }

  private propertyLine(
    m: MemberInfo,
    indent: string,
    symbol: string,
    staticMark: string,
    name: string
  ): string {
    const abstractMark = m.isAbstract ? '*' : '';
    const type = m.type ? `: ${m.type}` : '';
    return `${indent}  ${symbol}${name}${staticMark}${abstractMark}${type}`;
  }

  private ctorLine(m: MemberInfo, indent: string, symbol: string, owner: string): string {
    const params = this.paramList(m.parameters);
    const abstractMark = m.isAbstract ? '*' : '';
    return `${indent}  ${symbol}${owner}(${params})${abstractMark}`;
  }

  private methodLine(
    m: MemberInfo,
    indent: string,
    symbol: string,
    staticMark: string,
    name: string
  ): string {
    const prefix = m.kind === 'getter' ? 'get ' : m.kind === 'setter' ? 'set ' : '';
    const params = this.paramList(m.parameters);
    const returnType = m.returnType ? `: ${m.returnType}` : '';
    const abstractMark = m.isAbstract ? '*' : '';
    return `${indent}  ${symbol}${prefix}${name}${staticMark}(${params})${abstractMark}${returnType}`;
  }

  private paramList(params?: ParameterInfo[]): string {
    return (params ?? []).map(p => `${p.name}: ${p.type}`).join(', ');
  }

  private emitRelations(lines: string[], e: EntityInfo): void {
    e.relations.forEach(r => lines.push(this.relationLine(e.name, r)));
  }

  private relationLine(from: string, rel: RelationInfo): string {
    const left = this.cardinality(rel.sourceCardinality);
    const right = this.cardinality(rel.targetCardinality);
    const label = rel.label ? ` : ${rel.label}` : '';
    const map: Record<RelationInfo['type'], string> = {
      inheritance: '<|--',
      implementation: '<|..',
      association: '-->',
      composition: '*--',
      aggregation: 'o--',
      dependency: '..>',
    };
    if (rel.type === 'inheritance' || rel.type === 'implementation') {
      return `  ${rel.target} ${map[rel.type]} ${from}`;
    }
    return `  ${from}${left} ${map[rel.type]}${right} ${rel.target}${label}`;
  }

  private cardinality(value?: string): string {
    return value ? ` "${value}"` : '';
  }
}

