import { z } from "zod";
import { optText, optUrl, optUuid, textList } from "../../common/validate";

const isTimeZone = (tz: string) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

export const socialsSchema = z
  .object({
    github: optUrl,
    linkedin: optUrl,
    dribbble: optUrl,
    behance: optUrl,
    instagram: optUrl,
  })
  .default({});

export const profileBody = z.object({
  fullName: z.string().trim().min(1, "Full name is required.").max(120),
  shortName: z.string().trim().min(1, "Short name is required.").max(60),
  roles: textList(6, 60),
  headline: optText(255),
  statement: optText(2000),
  bio: optText(3000),
  location: optText(120),
  timezone: z.string().trim().max(60).refine(isTimeZone, "Unknown time zone, e.g. Asia/Makassar.").default("Asia/Makassar"),
  email: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().trim().email("Please enter a valid email address.").max(255).nullish(),
  ).transform((v) => v ?? null),
  phone: optText(40),
  handle: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().trim().max(60).regex(/^@?[\w.]+$/, "Letters, digits, dots and underscores only.").nullish(),
  ).transform((v) => v ?? null),
  availableForWork: z.boolean().default(true),
  socials: socialsSchema,
  photoMediaId: optUuid,
  cvMediaId: optUuid,
  seoTitle: optText(70),
  seoDescription: optText(160),
});
export type ProfileBody = z.output<typeof profileBody>;
