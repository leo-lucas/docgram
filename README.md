# doc-graphc

Gera diagramas UML no formato [Mermaid](https://mermaid.js.org/) a partir de arquivos de código. Atualmente suporta projetos TypeScript e reconhece classes, interfaces, tipos e enums com construtores, parâmetros, tipos de atributos, retornos de métodos, modificadores de acesso e relacionamentos. As entidades são agrupadas por namespaces seguindo a hierarquia de diretórios. A arquitetura permite adicionar outros parsers no futuro.

## Instalação

### Global

```bash
npm install -g doc-graphc
```

### Local

```bash
npm install doc-graphc
# ou usando npx
npx doc-graphc diagram src
```

## Uso

### Gerar diagrama no console

```bash
doc-graphc diagram <caminho-do-arquivo-ou-pasta>
```

#### Utilizando o parser LSP

```bash
doc-graphc diagram --parser lsp <caminho-do-arquivo-ou-pasta>
```

### Gerar README.md com o diagrama

```bash
doc-graphc docs <caminho-do-arquivo-ou-pasta>
```

## Desenvolvimento

```bash
npm install
npm test
```

## Publicação

A publicação para o [npm](https://www.npmjs.com/) é realizada automaticamente pelo GitHub Actions sempre que uma tag no formato `v*` é enviada. Crie e envie uma tag com a versão desejada:

```bash
git tag v1.2.3
git push origin v1.2.3
```

O workflow utiliza essa tag para definir a versão do pacote antes de executar `npm publish`. Configure o segredo `NPM_TOKEN` no repositório para que o fluxo de publicação funcione.
