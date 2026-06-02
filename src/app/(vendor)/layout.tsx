import { requireSessionUser } from "@/lib/auth/require-user";

export default async function VendorGroupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireSessionUser();
  return children;
}
