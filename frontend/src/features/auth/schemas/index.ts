import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email('Correo electrónico inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

export const registerSchema = z
  .object({
    full_name: z.string().trim().min(1, 'El nombre es requerido').max(120),
    email: z.email('Correo electrónico inválido'),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(72),
    confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: z.email('Correo electrónico inválido'),
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(72),
    confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
