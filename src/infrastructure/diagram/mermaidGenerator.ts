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
    for (const e of entities) {
      lines.push(`  class ${e.name} {`);
      if (e.kind === 'interface') lines.push('    <<interface>>');
      if (e.kind === 'enum') lines.push('    <<enumeration>>');
      if (e.isAbstract) lines.push('    <<abstract>>');
      for (const m of e.members) {
        const symbol = visibilitySymbol(m.visibility);
        const prefix = m.kind === 'getter' ? 'get ' : m.kind === 'setter' ? 'set ' : '';
        const suffix = m.kind === 'method' || m.kind === 'getter' || m.kind === 'setter' ? '()' : '';
        lines.push(`    ${symbol}${prefix}${m.name}${suffix}`);
      }
      lines.push('  }');
    }
    for (const e of entities) {
      for (const r of e.relations) {
        lines.push(relationLine(e.name, r));
      }
    }
    return lines.join('\n');
  }
}
