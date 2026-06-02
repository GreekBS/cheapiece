export type ValidationRule =
  | { kind: "min"; value: number }
  | { kind: "max"; value: number }
  | { kind: "min_length"; value: number }
  | { kind: "max_length"; value: number }
  | { kind: "regex"; pattern: string }
  | { kind: "precision"; value: number };
