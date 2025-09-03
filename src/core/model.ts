import { DocumentSymbol } from 'vscode-languageserver-protocol';

/** Visibility levels for class members. */
export type Visibility = 'public' | 'protected' | 'private';

/** Represents a parameter in a method or constructor. */
export interface ParameterInfo {
  /** Parameter name. */
  name: string;
  /** Parameter type as a string. */
  type: string;
}

/** Describes a member of an entity such as a property or method. */
export interface MemberInfo {
  /** Member name. */
  name: string;
  /** Kind of member. */
  kind: 'property' | 'method' | 'getter' | 'setter' | 'constructor';
  /** Visibility of the member. */
  visibility: Visibility;
  /** Type for properties. */
  type?: string;
  /** Return type for methods. */
  returnType?: string;
  /** Parameters for methods or constructors. */
  parameters?: ParameterInfo[];
  /** Indicates a static member. */
  isStatic?: boolean;
  /** Indicates an abstract member. */
  isAbstract?: boolean;
  /** Generic type parameters. */
  typeParameters?: string[];
}

/** Relationship between two entities. */
export interface RelationInfo {
  /** Type of relationship. */
  type:
    | 'inheritance'
    | 'implementation'
    | 'association'
    | 'composition'
    | 'aggregation'
    | 'dependency';
  /** Target entity name. */
  target: string;
  /** Optional label describing the relation. */
  label?: string;
  /** Cardinality from source side. */
  sourceCardinality?: string;
  /** Cardinality from target side. */
  targetCardinality?: string;
}

/** Metadata describing a TypeScript entity such as a class or interface. */
export interface EntityInfo {
  /** Entity name. */
  name: string;
  /** Kind of entity. */
  kind: 'class' | 'interface' | 'enum' | 'type';
  /** Whether the entity is abstract. */
  isAbstract?: boolean;
  /** Generic type parameters. */
  typeParameters?: string[];
  /** Parent classes. */
  extends?: string[];
  /** Implemented interfaces. */
  implements?: string[];
  /** Optional namespace. */
  namespace?: string;
  /** Members of the entity. */
  members: MemberInfo[];
  /** Relations to other entities. */
  relations: RelationInfo[];
}

/** Parses source paths and builds entity information. */
export interface Parser {
  /** Parse the provided file or directory paths. */
  parse(paths: string[]): Promise<EntityInfo[]>;
}

/** Generates diagram text from parsed entities. */
export interface DiagramGenerator {
  /** Generate a diagram representation for the given entities. */
  generate(entities: EntityInfo[]): string;
}


/** Abstraction over an LSP language client. */
export interface LanguageClient {
  /** Initialize the client at the given root URI. */
  initialize(rootUri: string): Promise<void>;
  /** Request document symbols for a file. */
  documentSymbols(filePath: string, content: string): Promise<DocumentSymbol[]>;
  /** Shut down the client. */
  shutdown(): Promise<void>;
}
