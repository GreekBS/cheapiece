import { z } from "zod";

const emptyToNull = (v: unknown) => {
  if (v === null || v === undefined) return null;
  if (typeof v === "string" && v.trim() === "") return null;
  return v;
};

export const updateVendorStoreProfileSchema = z.object({
  vendorId: z.string().uuid(),
  name: z.string().trim().min(2, "Το όνομα καταστήματος πρέπει να έχει τουλάχιστον 2 χαρακτήρες.").max(200),
  description: z.preprocess(
    emptyToNull,
    z.string().trim().max(2000, "Η περιγραφή είναι πολύ μεγάλη.").nullable().optional(),
  ),
  logoUrl: z.preprocess(
    emptyToNull,
    z
      .union([
        z.null(),
        z
          .string()
          .trim()
          .url("Μη έγκυρο URL λογότυπου.")
          .refine((u) => u.startsWith("https://"), "Το λογότυπο πρέπει να είναι HTTPS URL."),
      ])
      .optional(),
  ),
  contactEmail: z.preprocess(
    emptyToNull,
    z.string().trim().email("Μη έγκυρο email.").max(320).nullable().optional(),
  ),
  contactPhone: z.preprocess(
    emptyToNull,
    z.string().trim().max(50, "Το τηλέφωνο είναι πολύ μεγάλο.").nullable().optional(),
  ),
  address: z.preprocess(
    emptyToNull,
    z.string().trim().max(500, "Η διεύθυνση είναι πολύ μεγάλη.").nullable().optional(),
  ),
  eshopUrl: z.preprocess(
    emptyToNull,
    z
      .union([
        z.null(),
        z
          .string()
          .trim()
          .url("Μη έγκυρο URL e-shop.")
          .refine((u) => u.startsWith("https://"), "Το e-shop URL πρέπει να είναι HTTPS."),
      ])
      .optional(),
  ),
});

export type UpdateVendorStoreProfileInput = z.infer<typeof updateVendorStoreProfileSchema>;
