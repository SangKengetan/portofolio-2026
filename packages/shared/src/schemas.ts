import { z } from "zod";

/**
 * POST /contact — shared by the web form (client validation)
 * and the API (server validation), as planned in section 8.
 */
export const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(120, "Name is too long."),
  email: z.string().trim().email("Please enter a valid email address.").max(255),
  subject: z.string().trim().max(200).optional().or(z.literal("")),
  message: z
    .string()
    .trim()
    .min(10, "Message should be at least 10 characters.")
    .max(5000, "Message is too long (max 5000 characters)."),
  /** Honeypot — real users never fill this hidden field. */
  website: z.string().max(0).optional().or(z.literal("")),
});

export type ContactInput = z.infer<typeof contactSchema>;

export const projectCategories = ["web", "uiux", "data"] as const;
export const projectCategorySchema = z.enum(projectCategories);
