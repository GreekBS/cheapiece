import type { AttributeDefinition } from "../types/attribute-definition";
import { isValidAttributeCode } from "../types/attribute-code";

export class AttributeRegistry {
  private readonly byCode = new Map<string, AttributeDefinition>();

  register(definition: AttributeDefinition): void {
    if (!isValidAttributeCode(definition.code)) {
      throw new Error(`Invalid attribute code: ${definition.code}`);
    }
    if (this.byCode.has(definition.code)) {
      throw new Error(`Attribute already registered: ${definition.code}`);
    }
    this.byCode.set(definition.code, definition);
  }

  registerMany(definitions: AttributeDefinition[]): void {
    for (const def of definitions) {
      this.register(def);
    }
  }

  get(code: string): AttributeDefinition | undefined {
    return this.byCode.get(code);
  }

  require(code: string): AttributeDefinition {
    const def = this.byCode.get(code);
    if (!def) throw new Error(`Unknown attribute: ${code}`);
    return def;
  }

  has(code: string): boolean {
    return this.byCode.has(code);
  }

  list(): AttributeDefinition[] {
    return [...this.byCode.values()];
  }

  static from(definitions: AttributeDefinition[]): AttributeRegistry {
    const registry = new AttributeRegistry();
    registry.registerMany(definitions);
    return registry;
  }
}
