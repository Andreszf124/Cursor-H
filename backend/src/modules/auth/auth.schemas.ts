import { z } from 'zod';

export const registerSchema = z.object({
  email: z.email('Correo electrónico inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(72),
  full_name: z.string().trim().min(1, 'El nombre es requerido').max(120),
});

export const loginSchema = z.object({
  email: z.email('Correo electrónico inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

export const forgotPasswordSchema = z.object({
  email: z.email('Correo electrónico inválido'),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(72),
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'La contraseña es requerida para confirmar'),
});
