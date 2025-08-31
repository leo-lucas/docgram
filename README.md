# docgram

Gera diagramas UML no formato [Mermaid](https://mermaid.js.org/) a partir de arquivos de código. Atualmente suporta projetos TypeScript e reconhece classes, interfaces, tipos e enums com construtores, parâmetros, tipos de atributos, retornos de métodos, modificadores de acesso e relacionamentos. As entidades são agrupadas por namespaces seguindo a hierarquia de diretórios. A arquitetura permite adicionar outros parsers no futuro.

## Requisitos

- Node.js >= 20

## Instalação

### Global

```bash
npm install -g docgram
```

### Local

```bash
npm install docgram
# ou usando npx
npx docgram diagram src
```

## Uso

### Gerar diagrama no console

```bash
docgram diagram <caminho-do-arquivo-ou-pasta>
```

#### Utilizando o parser LSP

```bash
docgram diagram --parser lsp <caminho-do-arquivo-ou-pasta>
```

### Gerar README.md com o diagrama

```bash
docgram docs <caminho-do-arquivo-ou-pasta>
```

### Usar em um script próprio

Também é possível importar as classes do pacote para gerar diagramas no seu
próprio código:

```ts
import { buildService } from 'docgram';

async function main() {
  const service = buildService('ts'); // ou 'lsp'
  const diagram = await service.generateFromPaths(['src']);
  console.log(diagram);
}

main();
```

Para maior flexibilidade, o pacote também exporta `DiagramService`,
`TypeScriptParser`, `MermaidDiagramGenerator`, `LspParser` e
`StdioLanguageClient` para composições personalizadas.

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
