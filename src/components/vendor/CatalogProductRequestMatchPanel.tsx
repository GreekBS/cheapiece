"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  suggestCatalogRequestMatchesAction,
  type MatchSuggestionDTO,
} from "@/actions/catalog-request-matching";
import { parseAttributeValuesFromFormData } from "@/modules/catalog-requests/services/parse-merchant-attribute-values";

const DEBOUNCE_MS = 400;

type Props = {
  vendorId: string;
  categoryId: string;
  formRef: React.RefObject<HTMLFormElement | null>;
};

type PanelState = "idle" | "loading" | "match" | "no_match" | "low_confidence" | "error";

export function CatalogProductRequestMatchPanel({ vendorId, categoryId, formRef }: Props) {
  const [panelState, setPanelState] = useState<PanelState>("idle");
  const [suggestion, setSuggestion] = useState<MatchSuggestionDTO | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [fieldHint, setFieldHint] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef(0);

  const readDraftFromForm = useCallback(() => {
    const form = formRef.current;
    if (!form) return null;
    const fd = new FormData(form);
    return {
      title: (fd.get("title") as string | null)?.trim() ?? "",
      brand: (fd.get("brand") as string | null)?.trim() || null,
      model: (fd.get("model") as string | null)?.trim() || null,
      attributeValues: parseAttributeValuesFromFormData(fd),
    };
  }, [formRef]);

  const runSuggest = useCallback(async () => {
    const draft = readDraftFromForm();
    if (!vendorId || !draft?.title) {
      setPanelState("idle");
      setSuggestion(null);
      return;
    }

    const runId = ++abortRef.current;
    setPanelState("loading");
    setErrorMessage(null);

    const result = await suggestCatalogRequestMatchesAction({
      vendorId,
      categoryId: categoryId || null,
      title: draft.title,
      brand: draft.brand,
      model: draft.model,
      attributeValues: draft.attributeValues,
    });

    if (runId !== abortRef.current) return;

    if (result.error) {
      setPanelState("error");
      setErrorMessage(result.errorMessage ?? "Αδυναμία φόρτωσης πρότασης.");
      setSuggestion(null);
      return;
    }

    if (!result.data) {
      setPanelState("no_match");
      setSuggestion(null);
      return;
    }

    setSuggestion(result.data);
    setPanelState(result.data.isLowConfidence ? "low_confidence" : "match");
  }, [vendorId, categoryId, readDraftFromForm]);

  const scheduleSuggest = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void runSuggest();
    }, DEBOUNCE_MS);
  }, [runSuggest]);

  useEffect(() => {
    setSelectedProductId(null);
    scheduleSuggest();
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current += 1;
    };
  }, [vendorId, categoryId, scheduleSuggest]);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const onInput = () => scheduleSuggest();
    form.addEventListener("input", onInput);
    return () => form.removeEventListener("input", onInput);
  }, [formRef, scheduleSuggest]);

  const canConfirm = Boolean(suggestion?.productId && categoryId && readDraftFromForm()?.title);

  const onConfirm = () => {
    const draft = readDraftFromForm();
    if (!suggestion?.productId) return;

    const missing: string[] = [];
    if (!categoryId) missing.push("κατηγορία");
    if (!draft?.title) missing.push("τίτλο");
    if (!draft?.brand && !draft?.model) missing.push("μάρκα ή μοντέλο");

    if (missing.length > 0) {
      setFieldHint("Συμπλήρωσε τα βασικά στοιχεία για καλύτερη αντιστοίχιση.");
      return;
    }

    setFieldHint(null);
    setSelectedProductId(suggestion.productId);
  };

  return (
    <aside className="space-y-3 lg:sticky lg:top-6 lg:self-start">
      <h2 className="text-sm font-semibold text-slate-900">Προτεινόμενη αντιστοίχιση</h2>

      {fieldHint ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900" role="status">
          {fieldHint}
        </p>
      ) : null}

      {panelState === "loading" || panelState === "idle" ? (
        <div className="animate-pulse space-y-2 rounded-xl border border-slate-200 bg-white p-4">
          <div className="h-4 w-2/3 rounded bg-slate-200" />
          <div className="h-3 w-1/2 rounded bg-slate-100" />
        </div>
      ) : null}

      {panelState === "error" ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {panelState === "no_match" ? (
        <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Δεν βρέθηκε αντιστοίχιση.
        </p>
      ) : null}

      {(panelState === "match" || panelState === "low_confidence") && suggestion ? (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          {panelState === "low_confidence" ? (
            <p className="text-xs text-amber-800" role="status">
              Η αντιστοίχιση είναι αβέβαιη.
            </p>
          ) : null}
          <p className="font-medium text-slate-900">{suggestion.title}</p>
          <p className="text-sm text-slate-600">
            {[suggestion.brand, suggestion.model].filter(Boolean).join(" · ") || "—"}
          </p>
          <p className="text-xs text-slate-500">Εμπιστοσύνη: {Math.round(suggestion.confidence * 100)}%</p>
          {suggestion.matchReasons.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {suggestion.matchReasons.map((r) => (
                <span
                  key={r}
                  className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600"
                >
                  {r}
                </span>
              ))}
            </div>
          ) : null}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!canConfirm}
              onClick={onConfirm}
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Αυτό είναι
            </button>
            {selectedProductId === suggestion.productId ? (
              <span className="text-sm font-medium text-emerald-700" aria-label="Επιλεγμένο">
                ✔
              </span>
            ) : null}
          </div>
          {selectedProductId ? (
            <p className="text-xs text-slate-500">Θα αποθηκευτεί με την υποβολή της αίτησης.</p>
          ) : null}
        </div>
      ) : null}

      {selectedProductId ? (
        <input type="hidden" name="merchantSelectedProductId" value={selectedProductId} />
      ) : null}
    </aside>
  );
}
