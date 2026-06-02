import type { AttributePrimitive } from "./primitives";
import type { EnumOption } from "./enum-option";

export type AttributeDefinitionState = "active" | "archived";

/** Central registry entry — primitive is immutable after first publish. */
export type AttributeDefinition = {
  code: string;
  primitive: AttributePrimitive;
  labels: Record<string, string>;
  description?: Record<string, string>;
  enumOptions?: EnumOption[];
  defaultUnit?: string;
  allowedUnits?: string[];
  state: AttributeDefinitionState;
  tenantId: string;
};
