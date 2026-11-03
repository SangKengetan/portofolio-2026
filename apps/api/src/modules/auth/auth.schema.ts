import { z } from "zod";

export const loginBody = z.object({
  email: z.string().trim().email("Please enter a valid email address.").max(255),
  password: z.string().min(1, "Password is required.").max(200),
});

export const changePasswordBody = z
  .object({
    currentPassword: z.string().min(1, "Current password is required.").max(200),
    newPassword: z
      .string()
      .min(12, "Use at least 12 characters.")
      .max(200)
      .refine((v) => /[a-z]/.test(v) && /[A-Z]/.test(v) && /\d/.test(v), "Mix upper case, lower case and a digit."),
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    path: ["newPassword"],
    message: "The new password must be different.",
  });
