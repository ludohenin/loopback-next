// Copyright IBM Corp. 2013,2017. All Rights Reserved.
// Node module: loopback
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {Binding, BoundValue} from './binding';
import {inject} from './inject';
import {isPromise} from './isPromise';

export class Context {
  private registry: Map<string, Binding>;

  constructor() {
    this.registry = new Map();
  }

  bind(key: string): Binding {
    const keyExists = this.registry.has(key);
    if (keyExists) {
      const existingBinding = this.registry.get(key);
      const bindingIsLocked = existingBinding && existingBinding.isLocked;
      if (bindingIsLocked)
        throw new Error(`Cannot rebind key "${key}", associated binding is locked`);
    }

    const binding = new Binding(this, key);
    this.registry.set(key, binding);
    return binding;
  }

  contains(key: string): boolean {
    return this.registry.has(key);
  }

  find(pattern?: string): Binding[] {
    let bindings: Binding[] = [];
    if (pattern) {
      // TODO(@superkhau): swap with production grade glob to regex lib
      const glob = new RegExp('^' + pattern.split('*').join('.*') + '$');
      this.registry.forEach(binding => {
        const isMatch = glob.test(binding.key);
        if (isMatch)
          bindings.push(binding);
      });
    } else {
      bindings = Array.from(this.registry.values());
    }

    return bindings;
  }

  findByTag(pattern: string): Binding[] {
    const bindings: Binding[] = [];
    // TODO(@superkhau): swap with production grade glob to regex lib
    const glob = new RegExp('^' + pattern.split('*').join('.*') + '$');
    this.registry.forEach(binding => {
      const isMatch = glob.test(binding.tagName);
      if (isMatch)
        bindings.push(binding);
    });
    return bindings;
  }

  get(key: string): Promise<BoundValue> {
    try {
      const binding = this.getBinding(key);
      return Promise.resolve(binding.getValue());
    } catch (err) {
      return Promise.reject(err);
    }
  }

  getSync(key: string): BoundValue {
    const binding = this.getBinding(key);
    const valueOrPromise = binding.getValue();

    if (isPromise(valueOrPromise)) {
      throw new Error(
        `Cannot get ${key} synchronously: ` +
        `the value requires async computation`);
    }

    return valueOrPromise;
  }

  getBinding(key: string): Binding {
    const binding = this.registry.get(key);
    if (!binding)
      throw new Error(`The key ${key} was not bound to any value.`);
    return binding;
  }
}
