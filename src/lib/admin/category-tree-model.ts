/** Admin categories tree (UI + Supabase mapping). */
export type CategoryNode = {
  id: string;
  name: string;
  order: number;
  /** Depth: roots = 0 */
  level: number;
  imageDataUrl: string | null;
  children: CategoryNode[];
  emoji: string | null;
};
