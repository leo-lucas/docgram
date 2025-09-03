#!/usr/bin/env node
import { Command } from 'commander';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { buildService } from './index.js';

const program = new Command();

program.name('docgram').description('Generate diagrams from source code');

program
  .command('diagram')
  .argument('<path...>', 'File or directory to parse')
  .option('--parser <parser>', 'Parser implementation to use (ts|lsp)', 'ts')
  .action(async (paths: string[], opts) => {
    try {
      const service = buildService(opts.parser);
      const diagram = await service.generateFromPaths(paths);
      console.log(diagram);
    } catch (err) {
      console.error('Failed to generate diagram:', err);
    }
  });

program
  .command('docs')
  .argument('<path...>', 'File or directory to parse')
  .option('--parser <parser>', 'Parser implementation to use (ts|lsp)', 'ts')
  .action(async (paths: string[], opts) => {
    try {
      const service = buildService(opts.parser);
      const diagram = await service.generateFromPaths(paths);
      const target = paths[0];
      const stat = await fs.stat(target);
      const dir = stat.isDirectory() ? target : path.dirname(target);
      const title = path.basename(dir);
      const content = `# ${title}\n\n\`\`\`mermaid\n${diagram}\n\`\`\`\n`;
      const readmePath = path.join(dir, 'README.md');
      await fs.writeFile(readmePath, content);
      console.log(`README written to ${readmePath}`);
    } catch (err) {
      console.error('Failed to generate docs:', err);
    }
  });

program.parse();

