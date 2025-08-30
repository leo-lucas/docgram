import { DocumentSymbol } from 'vscode-languageserver-protocol';

export type Visibility = 'public' | 'protected' | 'private';

export interface MemberInfo {
  name: string;
  kind: 'property' | 'method' | 'getter' | 'setter';
  visibility: Visibility;
}

export interface RelationInfo {
  type: 'inheritance' | 'implementation' | 'association';
  target: string;
}

export interface EntityInfo {
  name: string;
  kind: 'class' | 'interface' | 'enum' | 'type';
  isAbstract?: boolean;
  extends?: string[];
  implements?: string[];
  members: MemberInfo[];
  relations: RelationInfo[];
}

export interface Parser {
  parse(paths: string[]): Promise<EntityInfo[]>;
}

export interface DiagramGenerator {
  generate(entities: EntityInfo[]): string;
}


export interface LanguageClient {
  initialize(rootUri: string): Promise<void>;
  documentSymbols(filePath: string, content: string): Promise<DocumentSymbol[]>;
  shutdown(): Promise<void>;
}
