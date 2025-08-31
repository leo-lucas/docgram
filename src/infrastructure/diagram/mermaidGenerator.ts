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
  if (rel.type === 'inheritance') {
    return `  ${rel.target} <|-- ${from}`;
  }
  if (rel.type === 'implementation') {
    return `  ${rel.target} <|.. ${from}`;
  }
  return `  ${from} --> ${rel.target}`;
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
      lines.push(`${indent}class ${e.name} {`);
      if (e.kind === 'interface') lines.push(`${indent}  <<interface>>`);
      if (e.kind === 'enum') lines.push(`${indent}  <<enumeration>>`);
      if (e.isAbstract) lines.push(`${indent}  <<abstract>>`);

      for (const m of e.members) {
        const symbol = visibilitySymbol(m.visibility);
        if (m.kind === 'constructor') {
          const params = (m.parameters || []).map(p => `${p.name}: ${p.type}`).join(', ');
          lines.push(`${indent}  ${symbol}${e.name}(${params})`);
        } else if (m.kind === 'property') {
          const type = m.type ? `: ${m.type}` : '';
          lines.push(`${indent}  ${symbol}${m.name}${type}`);
        } else {
          const prefix = m.kind === 'getter' ? 'get ' : m.kind === 'setter' ? 'set ' : '';
          const params = (m.parameters || []).map(p => `${p.name}: ${p.type}`).join(', ');
          const returnType = m.returnType ? `: ${m.returnType}` : '';
          lines.push(`${indent}  ${symbol}${prefix}${m.name}(${params})${returnType}`);
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
