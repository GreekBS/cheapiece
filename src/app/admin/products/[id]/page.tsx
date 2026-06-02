import { ProductEditorClient } from "@/components/admin/products/ProductEditorClient";

type Props = { params: { id: string } };

export default function AdminProductEditPage({ params }: Props) {
  return <ProductEditorClient mode="edit" productId={params.id} />;
}
