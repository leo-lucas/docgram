export type Options = {
  foo: string;
  bar: number;
};

export class Config {
  foo: string;
  bar: number;
  constructor({ foo, bar }: Options) {
    this.foo = foo;
    this.bar = bar;
  }
}
