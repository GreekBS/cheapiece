import type { AttributeDefinition } from "../types/attribute-definition";

const TENANT = "pilot";

function attr(
  partial: Omit<AttributeDefinition, "tenantId" | "state">,
): AttributeDefinition {
  return { ...partial, tenantId: TENANT, state: "active" };
}

export const CORE_ATTRIBUTES: AttributeDefinition[] = [
  attr({
    code: "core.title",
    primitive: "text",
    labels: { el: "Τίτλος", en: "Title" },
  }),
  attr({
    code: "core.brand",
    primitive: "text",
    labels: { el: "Μάρκα", en: "Brand" },
  }),
  attr({
    code: "core.model",
    primitive: "text",
    labels: { el: "Μοντέλο", en: "Model" },
  }),
  attr({
    code: "core.color",
    primitive: "color",
    labels: { el: "Χρώμα", en: "Color" },
    enumOptions: [
      { code: "black", labels: { el: "Μαύρο", en: "Black" } },
      { code: "white", labels: { el: "Λευκό", en: "White" } },
      { code: "silver", labels: { el: "Ασημί", en: "Silver" } },
      { code: "navy", labels: { el: "Navy", en: "Navy" } },
      { code: "red", labels: { el: "Κόκκινο", en: "Red" } },
    ],
  }),
];

export const MOBILE_ATTRIBUTES: AttributeDefinition[] = [
  attr({
    code: "mobile.ram_gb",
    primitive: "integer",
    labels: { el: "RAM (GB)", en: "RAM (GB)" },
  }),
  attr({
    code: "mobile.storage_gb",
    primitive: "integer",
    labels: { el: "Αποθήκευση (GB)", en: "Storage (GB)" },
  }),
  attr({
    code: "mobile.screen_size",
    primitive: "decimal",
    labels: { el: "Οθόνη", en: "Screen size" },
  }),
];

export const APPAREL_ATTRIBUTES: AttributeDefinition[] = [
  attr({
    code: "apparel.gender",
    primitive: "enum_single",
    labels: { el: "Φύλο", en: "Gender" },
    enumOptions: [
      { code: "men", labels: { el: "Άνδρας", en: "Men" } },
      { code: "women", labels: { el: "Γυναίκα", en: "Women" } },
      { code: "unisex", labels: { el: "Unisex", en: "Unisex" } },
    ],
  }),
  attr({
    code: "apparel.size",
    primitive: "enum_single",
    labels: { el: "Μέγεθος", en: "Size" },
    enumOptions: [
      { code: "xs", labels: { el: "XS", en: "XS" } },
      { code: "s", labels: { el: "S", en: "S" } },
      { code: "m", labels: { el: "M", en: "M" } },
      { code: "l", labels: { el: "L", en: "L" } },
      { code: "xl", labels: { el: "XL", en: "XL" } },
    ],
  }),
  attr({
    code: "apparel.material",
    primitive: "enum_multi",
    labels: { el: "Υλικό", en: "Material" },
    enumOptions: [
      { code: "cotton", labels: { el: "Βαμβάκι", en: "Cotton" } },
      { code: "polyester", labels: { el: "Πολυεστέρας", en: "Polyester" } },
      { code: "wool", labels: { el: "Μαλλί", en: "Wool" } },
    ],
  }),
];

/** Phase 1 pilot attribute registry entries only. */
export const PILOT_ATTRIBUTES: AttributeDefinition[] = [
  ...CORE_ATTRIBUTES,
  ...MOBILE_ATTRIBUTES,
  ...APPAREL_ATTRIBUTES,
];
