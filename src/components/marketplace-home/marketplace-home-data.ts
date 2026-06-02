/** Static UI-only content for the public marketplace homepage. */

export type CategoryCard = {
  slug: string;
  label: string;
  hint: string;
  query: string;
};

export const categoryCards: CategoryCard[] = [
  { slug: "tech", label: "Τεχνολογία", hint: "Υπολογιστές, περιφερειακά, έξυπνο σπίτι", query: "laptop" },
  { slug: "home", label: "Σπίτι", hint: "Έπιπλα, διακόσμηση, κουζίνα", query: "έπιπλα" },
  { slug: "gaming", label: "Gaming", hint: "Κονσόλες, καρέκλες, αξεσουάρ", query: "gaming" },
  { slug: "fashion", label: "Μόδα", hint: "Ρούχα, παπούτσια, αξεσουάρ", query: "μόδα" },
  { slug: "beauty", label: "Ομορφιά", hint: "Περιποίηση, αρώματα, ευεξία", query: "ομορφιά" },
  { slug: "sports", label: "Αθλητικά", hint: "Εξοπλισμός, ένδυση, γυμναστήριο", query: "αθλητικά" },
  { slug: "appliances", label: "Λευκές συσκευές", hint: "Ψυγεία, πλυντήρια, κουζίνα", query: "συσκευές" },
  { slug: "business", label: "Business", hint: "Γραφείο, laptop, αναλύσεις, εργαλεία εργασίας", query: "office" },
  { slug: "auto", label: "Auto & Moto", hint: "Ελαστικά, λιπαντικά, αξεσουάρ αυτοκινήτου", query: "αυτοκίνητο" },
];

/** Hero slider — UI only; links reuse public `/offers` browse. Art: `public/banners/*.webp` (+ source SVG). */
export type HomeHeroSlide = {
  id: string;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  /** Raster art (1920×700); SVG siblings in repo for edits */
  bannerSrc: string;
  /** CSS object-position for safe mobile crop */
  objectPosition: string;
  /** Text contrast over banner art */
  theme: "light" | "dark";
};

export const homeHeroSlides: HomeHeroSlide[] = [
  {
    id: "tech",
    title: "Οι καλύτερες τιμές στην τεχνολογία",
    subtitle: "Σύγκρινε χιλιάδες προϊόντα από κορυφαία καταστήματα",
    cta: "Δες προσφορές",
    href: "/offers?q=laptop",
    bannerSrc: "/banners/hero-tech.webp",
    objectPosition: "72% 50%",
    theme: "light",
  },
  {
    id: "home",
    title: "Όλα για το σπίτι σου",
    subtitle: "Ανακάλυψε έξυπνες αγορές για κάθε χώρο",
    cta: "Δες προϊόντα",
    href: `/offers?q=${encodeURIComponent("έπιπλα")}`,
    bannerSrc: "/banners/hero-home.webp",
    objectPosition: "68% 50%",
    theme: "light",
  },
  {
    id: "play",
    title: "Gaming, fashion & trends",
    subtitle: "Τα πιο hot προϊόντα σε ένα marketplace",
    cta: "Ανακάλυψε τώρα",
    href: "/offers?q=gaming",
    bannerSrc: "/banners/hero-play.webp",
    objectPosition: "65% 50%",
    theme: "dark",
  },
];

export type TrendingProduct = {
  id: string;
  title: string;
  bestPrice: string;
  storeCount: number;
  availability: "Διαθέσιμο" | "Περιορισμένο";
  discount?: string;
  rating: string;
  ratingCount: string;
  shipping?: string;
};

export const trendingProducts: TrendingProduct[] = [
  {
    id: "1",
    title: "Ασύρματα ακουστικά με ενεργή ακύρωση θορύβου",
    bestPrice: "89,00 €",
    storeCount: 24,
    availability: "Διαθέσιμο",
    discount: "-18%",
    rating: "4,7",
    ratingCount: "2.841",
    shipping: "Δωρεάν μεταφορικά",
  },
  {
    id: "2",
    title: "Έξυπνο ρολόι · AMOLED · αδιάβροχο 5ATM",
    bestPrice: "199,00 €",
    storeCount: 17,
    availability: "Διαθέσιμο",
    rating: "4,5",
    ratingCount: "1.902",
    shipping: "Από 2,90 €",
  },
  {
    id: "3",
    title: "Ρομποτική σκούπα · mapping · αυτοκαθαρισμός",
    bestPrice: "329,00 €",
    storeCount: 11,
    availability: "Περιορισμένο",
    discount: "-12%",
    rating: "4,8",
    ratingCount: "956",
  },
  {
    id: "4",
    title: "Μηχανικό πληκτρολόγιο · silent switches · PBT",
    bestPrice: "74,90 €",
    storeCount: 9,
    availability: "Διαθέσιμο",
    rating: "4,6",
    ratingCount: "612",
    shipping: "Δωρεάν από 50 €",
  },
];

export type DealCard = {
  id: string;
  title: string;
  oldPrice: string;
  newPrice: string;
  badge: string;
  stores: number;
  discountPercent: string;
  urgency?: string;
};

export const bestDeals: DealCard[] = [
  {
    id: "d1",
    title: "Φορητός SSD 1TB · NVMe Gen4",
    oldPrice: "119,00 €",
    newPrice: "89,00 €",
    badge: "Έκπτωση",
    stores: 14,
    discountPercent: "-25%",
    urgency: "Υψηλή ζήτηση",
  },
  {
    id: "d2",
    title: "Κάμερα ασφαλείας 2K · νυχτερινή λήψη",
    oldPrice: "79,00 €",
    newPrice: "59,00 €",
    badge: "Προσφορά",
    stores: 8,
    discountPercent: "-25%",
    urgency: "Περιορισμένο απόθεμα",
  },
  {
    id: "d3",
    title: "Έξυπνη πρίζα Wi‑Fi · pack x4",
    oldPrice: "48,00 €",
    newPrice: "34,90 €",
    badge: "Έκπτωση",
    stores: 21,
    discountPercent: "-27%",
  },
  {
    id: "d4",
    title: "Φορητός φορτιστής 65W · GaN",
    oldPrice: "45,00 €",
    newPrice: "32,00 €",
    badge: "Τάση",
    stores: 19,
    discountPercent: "-29%",
    urgency: "Τελευταία κομμάτια",
  },
  {
    id: "d5",
    title: "Καρέκλα γραφείου · mesh · lumbar",
    oldPrice: "249,00 €",
    newPrice: "189,00 €",
    badge: "Έκπτωση",
    stores: 6,
    discountPercent: "-24%",
  },
];

export type TrustPoint = {
  icon: "verified" | "secure" | "prices" | "reviews" | "speed";
  title: string;
  body: string;
};

export const trustPoints: TrustPoint[] = [
  {
    icon: "verified",
    title: "Επαληθευμένα καταστήματα",
    body: "Έμφαση σε αξιόπιστους πωλητές και διαφανείς κανόνες λειτουργίας.",
  },
  {
    icon: "secure",
    title: "Ασφαλείς αγορές",
    body: "Ήρεμο περιβάλλον πλοήγησης και προτεραιότητα στην ασφάλεια της εμπειρίας.",
  },
  {
    icon: "prices",
    title: "Καλύτερες τιμές",
    body: "Σύγκριση ανά προϊόν ώστε να βλέπεις άμεσα την πιο συμφέρουσα επιλογή.",
  },
  {
    icon: "reviews",
    title: "Πραγματικές αξιολογήσεις",
    body: "Απόψεις χρηστών που σε βοηθούν να αποφασίζεις με σιγουριά.",
  },
  {
    icon: "speed",
    title: "Γρήγορη σύγκριση",
    body: "Λιγότερα κλικ, πιο καθαρή πληροφορία — γρήγορη επισκόπηση προσφορών.",
  },
];
