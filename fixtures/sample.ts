export interface Greeter {
  greet(): void;
}

export type Address = {
  street: string;
}

export enum Role {
  Admin,
  User
}

export abstract class Person implements Greeter {
  protected age: number;
  private _name: string;
  address: Address;

  constructor(name: string, age: number, address: Address) {
    this._name = name;
    this.age = age;
    this.address = address;
  }

  get name() {
    return this._name;
  }

  set name(n: string) {
    this._name = n;
  }

  calculateSalary(multiplier: number): number {
    return this.age * multiplier;
  }

  abstract greet(): void;
}

export class Employee extends Person {
  role: Role;
  greet() {}
}
