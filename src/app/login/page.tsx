import { redirect } from "next/navigation";

function firstSearchValue(
  sp: Record<string, string | string[] | undefined> | undefined,
  key: string,
): string {
  if (!sp) return "";
  const v = sp[key];
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v[0] ?? "";
  return "";
}

type Props = { searchParams?: Record<string, string | string[] | undefined> };

/** Compatibility shim: canonical auth UI lives at `/merchant`. */
export default function LoginPage({ searchParams }: Props) {
  const raw = firstSearchValue(searchParams, "returnUrl").trim();
  if (raw) {
    redirect(`/merchant?returnUrl=${encodeURIComponent(raw)}`);
  }
  redirect("/merchant");
}
