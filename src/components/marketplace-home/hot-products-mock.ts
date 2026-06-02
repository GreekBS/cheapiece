/** Mock hot products for homepage carousel — replace with API/fetch later. */

export const HOT_PRODUCTS_PAGE_SIZE = 6;

export type HotProductMock = {
  id: string;
  title: string;
  price: string;
  /** HOT label or discount e.g. "-18%" */
  badge?: string;
  rating?: string;
  ratingCount?: string;
};

export const hotProductsMock: HotProductMock[] = [
  { id: "h1", title: "Wireless earbuds ANC · charging case", price: "79,00 €", badge: "HOT", rating: "4,6", ratingCount: "1.240" },
  { id: "h2", title: "USB-C hub 7-in-1 · HDMI 4K", price: "45,90 €", badge: "-12%", rating: "4,4", ratingCount: "892" },
  { id: "h3", title: "Mechanical keyboard 75% · hot-swap", price: "119,00 €", rating: "4,8", ratingCount: "2.103" },
  { id: "h4", title: "27\" IPS monitor · 144Hz · 1ms", price: "289,00 €", badge: "HOT", rating: "4,7", ratingCount: "3.401" },
  { id: "h5", title: "Ergonomic mouse · silent clicks", price: "34,50 €" },
  { id: "h6", title: "Portable SSD 1TB · USB 3.2", price: "92,00 €", badge: "-20%", rating: "4,9", ratingCount: "4.120" },
  { id: "h7", title: "Webcam 1080p · dual mic", price: "59,99 €", rating: "4,2", ratingCount: "778" },
  { id: "h8", title: "Laptop stand aluminum · foldable", price: "28,00 €", rating: "4,5", ratingCount: "2.009" },
  { id: "h9", title: "Smart plug Wi‑Fi · 4 pack", price: "41,00 €", badge: "HOT", rating: "4,6", ratingCount: "1.881" },
  { id: "h10", title: "Noise-cancelling headset · PC/PS5", price: "149,00 €", badge: "-15%", rating: "4,7", ratingCount: "990" },
  { id: "h11", title: "Gaming chair mesh · lumbar", price: "219,00 €", rating: "4,4", ratingCount: "445" },
  { id: "h12", title: "Power bank 20.000mAh · 45W PD", price: "52,90 €", rating: "4,8", ratingCount: "3.300" },
  { id: "h13", title: "Ring light 12\" · tripod", price: "36,00 €", badge: "-10%", rating: "4,1", ratingCount: "612" },
  { id: "h14", title: "Bluetooth speaker waterproof IPX7", price: "67,00 €", rating: "4,5", ratingCount: "1.102" },
  { id: "h15", title: "Docking station Thunderbolt 4", price: "189,00 €", badge: "HOT", rating: "4,6", ratingCount: "721" },
  { id: "h16", title: "Cable management kit · desk", price: "19,90 €", rating: "4,0", ratingCount: "334" },
  { id: "h17", title: "Tablet stylus · palm rejection", price: "44,00 €", rating: "4,7", ratingCount: "889" },
  { id: "h18", title: "Air purifier HEPA · compact", price: "129,00 €", badge: "-8%", rating: "4,5", ratingCount: "2.556" },
  { id: "h19", title: "Smartwatch AMOLED · GPS", price: "199,00 €", badge: "HOT", rating: "4,8", ratingCount: "5.001" },
  { id: "h20", title: "Router Wi‑Fi 6 · mesh node", price: "98,00 €", rating: "4,3", ratingCount: "667" },
  { id: "h21", title: "Desk mat XL · stitched edges", price: "24,00 €", rating: "4,6", ratingCount: "1.450" },
  { id: "h22", title: "LED strip 5m · app control", price: "31,50 €", badge: "-25%", rating: "4,4", ratingCount: "2.200" },
  { id: "h23", title: "USB microphone cardioid", price: "72,00 €", rating: "4,7", ratingCount: "903" },
  { id: "h24", title: "Mini projector 1080p · portable", price: "259,00 €", badge: "HOT", rating: "4,2", ratingCount: "412" },
];
