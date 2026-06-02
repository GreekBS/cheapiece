import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const SUBMIT_SOURCE = readFileSync(
  join(__dirname, "../submit-product-definition-revision.ts"),
  "utf8",
);

describe("submitProductDefinitionRevision", () => {
  it("confirmMajor path uses args.baseline (no bare baseline ReferenceError)", () => {
    assert.ok(
      SUBMIT_SOURCE.includes("args.baseline.status"),
      "expected args.baseline.status guard",
    );
    assert.ok(
      !SUBMIT_SOURCE.includes("if (baseline.status"),
      "bare baseline.status must not be referenced in module scope",
    );
    assert.ok(
      SUBMIT_SOURCE.includes("row: args.baseline"),
      "expected classifyCatalogRequestEditDiff to use args.baseline",
    );
  });
});
