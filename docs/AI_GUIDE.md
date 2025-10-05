# Guia para Agentes Inteligentes

Este documento explica como agentes autônomos podem instalar, utilizar e estender o docgram.

## Visão geral do projeto

O docgram gera diagramas UML em sintaxe Mermaid a partir de código TypeScript. O pipeline principal segue estes passos:

1. **Parser** (`src/core/parser` e `src/infrastructure/parsers`): transforma arquivos em uma representação intermediária.
2. **Serviço de diagrama** (`src/core/service`): orquestra os parsers e converte a representação em diagramas.
3. **Geradores** (`src/core/generator` e `src/infrastructure/generators`): produzem a saída Mermaid ou arquivos Markdown.
4. **CLI** (`src/cli.ts`): expõe comandos `diagram` e `docs` para usuários finais.

O entrypoint de biblioteca (`src/index.ts`) exporta `buildService` e classes individuais para composições customizadas.

## Preparando o ambiente

1. Certifique-se de ter Node.js >= 20.
2. Instale as dependências com `npm install`.
3. Execute os testes com `npm test` para validar o estado inicial.

Se o agente precisar gerar builds repetidamente, recomendamos executar `npm test -- --watch` em segundo plano para feedback contínuo.

## Usando a CLI

- `npm exec docgram diagram <caminho>`: gera o diagrama Mermaid no console. Utilize `--parser lsp` para ativar o parser baseado em LSP.
- `npm exec docgram docs <caminho>`: cria um `README.md` com o diagrama incorporado.

Durante execuções batch, capture a saída padronizada (`stdout`) para uso posterior por outras ferramentas.

## Utilizando como biblioteca

```ts
import { buildService } from 'docgram';

const service = buildService('ts'); // ou 'lsp'
const diagram = await service.generateFromPaths(['src']);
```

Cada componente (por exemplo `DiagramService`, `TypeScriptParser`, `MermaidDiagramGenerator`) pode ser importado individualmente para composições específicas.

## Estrutura de diretórios relevante

- `src/core`: lógica independente de infraestrutura (parser, modelos, gerador, serviço).
- `src/infrastructure`: integrações concretas como parser TypeScript, parser LSP e geradores Mermaid/Markdown.
- `fixtures`: exemplos de código utilizados nos testes.
- `test`: suíte de testes Jest que valida parsers, geradores e CLI.

## Fluxo para adicionar novos recursos

1. Crie ou estenda um parser dentro de `src/infrastructure/parsers`.
2. Atualize os modelos ou conversores no domínio (`src/core`).
3. Garanta cobertura de testes adicionando casos em `test/`.
4. Atualize a documentação relevante (`README.md`, este guia ou docs específicos).

## Convenções de código

- O projeto utiliza TypeScript com `tsconfig.json` na raiz.
- Prefira funções puras nos módulos de `src/core`.
- Utilize injeção explícita de dependências para facilitar mocks em testes.
- Os testes são escritos em Jest; use `describe`/`it` com expectativas claras.

## Checklist operacional para agentes

- [ ] Instalar dependências (`npm install`).
- [ ] Rodar testes (`npm test`).
- [ ] Seguir convenções descritas acima.
- [ ] Atualizar documentação sempre que expor novas capacidades.
- [ ] Usar `npm run lint` se disponível (verifique `package.json`).

## Recursos adicionais

- `README.md`: documentação principal para usuários humanos.
- `package.json`: lista scripts úteis e dependências.
- `jest.config.js`: configuração da suíte de testes.

Este guia deve ser mantido atualizado sempre que novas funcionalidades forem adicionadas ou a arquitetura for alterada.
