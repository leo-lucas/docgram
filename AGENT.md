# Guia Rápido para Agentes

Este repositório fornece o `docgram`, uma ferramenta para gerar diagramas UML em sintaxe Mermaid a partir de código TypeScript. Utilize este arquivo como referência rápida e consulte `docs/AI_GUIDE.md` para detalhes completos.

## Como começar

1. Garanta que o Node.js 20 ou superior esteja instalado.
2. Instale dependências com `npm install`.
3. Execute `npm test` para validar o estado do projeto.

## Scripts úteis

| Comando | Descrição |
| --- | --- |
| `npm exec docgram diagram <caminho>` | Gera o diagrama Mermaid diretamente no terminal. |
| `npm exec docgram docs <caminho>` | Cria um arquivo Markdown com diagrama incorporado. |
| `npm run build` | Compila o projeto (se definido). |
| `npm test` | Executa a suíte de testes Jest. |

## Estrutura essencial

- `src/core/`: regras de negócio (parser, modelos, geradores).
- `src/infrastructure/`: integrações concretas (parsers TypeScript/LSP e geradores Mermaid/Markdown).
- `docs/AI_GUIDE.md`: documentação detalhada para agentes.
- `fixtures/` e `test/`: dados de exemplo e testes unitários.

## Convenções

- Mantenha funções puras em `src/core` e injete dependências explicitamente.
- Atualize a documentação sempre que modificar a arquitetura ou novos fluxos.
- Prefira criar testes ao adicionar funcionalidades.

## Checklist rápido antes de submeter alterações

- [ ] Dependências instaladas.
- [ ] Testes executados com sucesso.
- [ ] Documentação atualizada (`README.md`, `docs/AI_GUIDE.md`, etc.).
- [ ] Mensagens de commit descritivas.

## Recursos adicionais

- `README.md`: visão geral para humanos.
- `package.json`: scripts e dependências.
- `jest.config.js`: configuração dos testes.

Manter este arquivo atualizado garante que outros agentes consigam colaborar rapidamente com o projeto.
