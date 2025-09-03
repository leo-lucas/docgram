export class ConfigUntyped {
  foo: string;
  bar: number;
  constructor({ foo, bar }) {
    this.foo = foo;
    this.bar = bar;
  }

  update({ foo, bar }): void {
    this.foo = foo;
    this.bar = bar;
  }
}
