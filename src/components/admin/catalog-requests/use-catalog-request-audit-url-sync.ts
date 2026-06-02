"use client";

import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { AuditStatusTab } from "@/components/admin/catalog-requests/catalog-request-audit-list-utils";
import {
  auditFiltersEqual,
  canonicalAuditHrefFromSearchParams,
  parseCatalogRequestAuditUrlParams,
  serializeAuditState,
  toCanonicalAuditFilters,
  type CatalogRequestAuditFilters,
} from "@/components/admin/catalog-requests/catalog-request-audit-url-params";

const DEBOUNCE_MS = 300;

type Options = {
  initialTab: AuditStatusTab;
  initialQ: string;
};

export function useCatalogRequestAuditUrlSync({ initialTab, initialQ }: Options) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialFilters = toCanonicalAuditFilters({ tab: initialTab, q: initialQ });

  const [activeTab, setActiveTab] = useState<AuditStatusTab>(initialFilters.tab);
  const [searchInput, setSearchInput] = useState(initialFilters.q);
  const [debouncedSearch, setDebouncedSearch] = useState(initialFilters.q);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceSeqRef = useRef(0);
  const isHydratingRef = useRef(false);
  const lastCommittedRef = useRef<CatalogRequestAuditFilters>(initialFilters);

  const activeTabRef = useRef(activeTab);
  const debouncedSearchRef = useRef(debouncedSearch);
  const searchInputRef = useRef(searchInput);

  activeTabRef.current = activeTab;
  debouncedSearchRef.current = debouncedSearch;
  searchInputRef.current = searchInput;

  const bumpDebounceSeq = useCallback(() => {
    debounceSeqRef.current += 1;
  }, []);

  const cancelDebounceTimer = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, []);

  const writeUrl = useCallback(
    (input: { tab: AuditStatusTab; q: string }, mode: "push" | "replace") => {
      if (isHydratingRef.current) {
        return;
      }

      const { filters, href: nextHref } = serializeAuditState(pathname, input);
      const currentHref = canonicalAuditHrefFromSearchParams(pathname, searchParams);

      if (nextHref === currentHref) {
        return;
      }

      lastCommittedRef.current = filters;

      startTransition(() => {
        router[mode](nextHref, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    isHydratingRef.current = true;
    cancelDebounceTimer();

    const parsed = parseCatalogRequestAuditUrlParams(searchParams);

    if (auditFiltersEqual(parsed, lastCommittedRef.current)) {
      isHydratingRef.current = false;
      return;
    }

    bumpDebounceSeq();
    lastCommittedRef.current = parsed;
    setActiveTab(parsed.tab);
    setSearchInput(parsed.q);
    setDebouncedSearch(parsed.q);
    isHydratingRef.current = false;
  }, [searchParams, bumpDebounceSeq, cancelDebounceTimer]);

  useEffect(() => {
    cancelDebounceTimer();
    bumpDebounceSeq();
    const seq = debounceSeqRef.current;

    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;

      if (seq !== debounceSeqRef.current) {
        return;
      }
      if (isHydratingRef.current) {
        return;
      }

      const filters = toCanonicalAuditFilters({
        tab: activeTabRef.current,
        q: searchInputRef.current,
      });

      setDebouncedSearch(filters.q);
      lastCommittedRef.current = filters;
      writeUrl(filters, "replace");
    }, DEBOUNCE_MS);

    return cancelDebounceTimer;
  }, [searchInput, writeUrl, bumpDebounceSeq, cancelDebounceTimer]);

  const setTab = useCallback(
    (tab: AuditStatusTab) => {
      cancelDebounceTimer();
      bumpDebounceSeq();

      const filters = toCanonicalAuditFilters({
        tab,
        q: debouncedSearchRef.current,
      });

      setActiveTab(filters.tab);
      lastCommittedRef.current = filters;
      writeUrl(filters, "push");
    },
    [writeUrl, cancelDebounceTimer, bumpDebounceSeq],
  );

  const clearFilters = useCallback(() => {
    cancelDebounceTimer();
    bumpDebounceSeq();

    const filters = toCanonicalAuditFilters({ tab: "all", q: "" });

    setActiveTab(filters.tab);
    setSearchInput(filters.q);
    setDebouncedSearch(filters.q);
    lastCommittedRef.current = filters;
    writeUrl(filters, "replace");
  }, [writeUrl, cancelDebounceTimer, bumpDebounceSeq]);

  return {
    activeTab,
    setTab,
    searchInput,
    setSearchInput,
    debouncedSearch,
    clearFilters,
  };
}
