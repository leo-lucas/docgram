export class B {}

export class A {
  b: B;

  constructor(b: B) {
    this.b = b;
  }

  use(b: B): B {
    return b;
  }
}
