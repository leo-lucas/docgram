import { DiagramGenerator, EntityInfo, RelationInfo, MemberInfo } from '../../core/model.js';

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

function relationLine(from: string, rel: RelationInfo): string {
  const left = rel.sourceCardinality ? ` "${rel.sourceCardinality}"` : '';
  const right = rel.targetCardinality ? ` "${rel.targetCardinality}"` : '';
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

export class MermaidDiagramGenerator implements DiagramGenerator {
  generate(entities: EntityInfo[]): string {
    const lines: string[] = ['classDiagram'];

    const groups = new Map<string | undefined, EntityInfo[]>();
    for (const e of entities) {
      const ns = e.namespace;
      if (!groups.has(ns)) groups.set(ns, []);
      groups.get(ns)!.push(e);
    }

    const emitEntity = (e: EntityInfo, indent: string) => {
      const className = e.typeParameters?.length
        ? `${e.name}~${e.typeParameters.join(', ')}~`
        : e.name;
      lines.push(`${indent}class ${className} {`);
      if (e.kind === 'interface') lines.push(`${indent}  <<interface>>`);
      if (e.kind === 'enum') lines.push(`${indent}  <<enumeration>>`);
      if (e.isAbstract) lines.push(`${indent}  <<abstract>>`);

        for (const m of e.members) {
          let name = m.name;
          if (m.typeParameters?.length) name += `~${m.typeParameters.join(', ')}~`;
          const symbol = visibilitySymbol(m.visibility);
          const staticMark = m.isStatic ? '$' : '';
          if (m.kind === 'property') {
            const abstractMark = m.isAbstract ? '*' : '';
            const type = m.type ? `: ${m.type}` : '';
            lines.push(`${indent}  ${symbol}${name}${staticMark}${abstractMark}${type}`);
          } else if (m.kind === 'constructor') {
            const params = (m.parameters || []).map(p => `${p.name}: ${p.type}`).join(', ');
            const abstractMark = m.isAbstract ? '*' : '';
            lines.push(`${indent}  ${symbol}${e.name}(${params})${abstractMark}`);
          } else {
            const prefix = m.kind === 'getter' ? 'get ' : m.kind === 'setter' ? 'set ' : '';
            const params = (m.parameters || []).map(p => `${p.name}: ${p.type}`).join(', ');
            const returnType = m.returnType ? `: ${m.returnType}` : '';
            const abstractMark = m.isAbstract ? '*' : '';
            lines.push(`${indent}  ${symbol}${prefix}${name}${staticMark}(${params})${abstractMark}${returnType}`);
          }
        }
      lines.push(`${indent}}`);
    };

    for (const [ns, ents] of groups) {
      if (ns) {
        lines.push(`  namespace ${ns} {`);
        for (const e of ents) emitEntity(e, '    ');
        lines.push('  }');
      } else {
        for (const e of ents) emitEntity(e, '  ');
      }
    }

    for (const e of entities) {
      for (const r of e.relations) {
        lines.push(relationLine(e.name, r));
      }
    }
    return lines.join('\n');
  }
}
