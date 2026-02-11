import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Nieprawidłowy adres email"),
  password: z.string().min(1, "Hasło jest wymagane"),
});

export const projectSchema = z.object({
  projectId: z.string().min(1, "ID projektu jest wymagane"),
  name: z.string().min(1, "Nazwa jest wymagana"),
  label: z.string().optional(),
  color: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const personSchema = z.object({
  firstName: z.string().min(1, "Imię jest wymagane"),
  lastName: z.string().min(1, "Nazwisko jest wymagane"),
  sectionId: z.string().min(1, "Sekcja jest wymagana"),
  sdmId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

export const sectionSchema = z.object({
  name: z.string().min(1, "Nazwa jest wymagana"),
  sortOrder: z.number().optional(),
});

export const assignmentBulkSchema = z.object({
  personId: z.string().min(1),
  dates: z.array(z.string()),
  projectIds: z.array(z.string()).min(1, "Wybierz przynajmniej jeden projekt"),
  primaryProjectId: z.string().min(1),
  workload: z.enum(["RED", "YELLOW", "GREEN"]),
});

export const assignmentDeleteSchema = z.object({
  personId: z.string().min(1),
  dates: z.array(z.string()),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ProjectInput = z.infer<typeof projectSchema>;
export type PersonInput = z.infer<typeof personSchema>;
export type SectionInput = z.infer<typeof sectionSchema>;
export type AssignmentBulkInput = z.infer<typeof assignmentBulkSchema>;
export const userCreateSchema = z.object({
  name: z.string().min(1, "Imię i nazwisko jest wymagane"),
  email: z.string().email("Nieprawidłowy adres email"),
  password: z.string().min(6, "Hasło musi mieć co najmniej 6 znaków"),
  role: z.enum(["ADMIN", "USER"]).optional(),
});

export const userUpdateSchema = z.object({
  name: z.string().min(1, "Imię i nazwisko jest wymagane").optional(),
  email: z.string().email("Nieprawidłowy adres email").optional(),
  role: z.enum(["ADMIN", "USER"]).optional(),
});

export const passwordChangeSchema = z.object({
  oldPassword: z.string().optional(),
  newPassword: z.string().min(6, "Nowe hasło musi mieć co najmniej 6 znaków"),
});

export type AssignmentDeleteInput = z.infer<typeof assignmentDeleteSchema>;
export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;
