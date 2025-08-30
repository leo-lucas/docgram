import { Parser, DiagramGenerator } from '../model.js';

export class DiagramService {
  constructor(private parser: Parser, private generator: DiagramGenerator) {}

  async generateFromPaths(paths: string[]): Promise<string> {
    const entities = await this.parser.parse(paths);
    return this.generator.generate(entities);
  }
}
