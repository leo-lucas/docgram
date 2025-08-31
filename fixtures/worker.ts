import { Greeter } from './sample';

export interface Worker extends Greeter {
  test: {
    test: string;
  };
}
