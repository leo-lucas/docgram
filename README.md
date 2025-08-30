# doc-graphc

Ferramenta de linha de comando que lê arquivos de código e gera diagramas UML no formato Mermaid. Atualmente suporta arquivos TypeScript, reconhecendo classes, interfaces, tipos e enums com construtores, parâmetros, tipos de atributos, retornos de métodos, modificadores de acesso e relacionamentos, agrupando as entidades por namespaces baseados na hierarquia de diretórios. A arquitetura permite adicionar outros parsers no futuro.

O parser pode ser escolhido entre uma implementação nativa de TypeScript (baseada em ts-morph) ou um cliente genérico de Language Server Protocol (LSP), permitindo integrar servidores de linguagem externos ou versões personalizadas.

## Uso

```bash
npm install
npm run diagram -- <caminho-do-arquivo-ou-pasta>

# utilizando o parser LSP
npm run diagram -- --parser lsp <caminho-do-arquivo-ou-pasta>

# gerar README.md com o diagrama
npm run docs -- <caminho-do-arquivo-ou-pasta>
```

## Testes

```bash
npm test
```
