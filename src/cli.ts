#!/usr/bin/env node
import { Command } from 'commander';
import { writeFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { buildService } from './index.js';

const program = new Command();

program.name('docgram').description('Generate diagrams from source code');

program
  .command('diagram')
  .argument('<path...>', 'File or directory to parse')
  .option('--parser <parser>', 'Parser implementation to use (ts|lsp)', 'ts')
  .action(async (paths: string[], opts) => {
    const service = buildService(opts.parser);
    const diagram = await service.generateFromPaths(paths);
    console.log(diagram);
  });

program
  .command('docs')
  .argument('<path...>', 'File or directory to parse')
  .option('--parser <parser>', 'Parser implementation to use (ts|lsp)', 'ts')
  .action(async (paths: string[], opts) => {
    const service = buildService(opts.parser);
    const diagram = await service.generateFromPaths(paths);
    const target = paths[0];
    const dir = statSync(target).isDirectory() ? target : path.dirname(target);
    const title = path.basename(dir);
    const content = `# ${title}\n\n\`\`\`mermaid\n${diagram}\n\`\`\`\n`;
    const readmePath = path.join(dir, 'README.md');
    writeFileSync(readmePath, content);
    console.log(`README written to ${readmePath}`);
  });

program.parse();

