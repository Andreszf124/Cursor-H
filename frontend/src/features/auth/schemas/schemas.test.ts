import { describe, expect, it } from 'vitest';
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from './index';

describe('schemas de auth', () => {
  describe('loginSchema', () => {
    it('acepta credenciales válidas', () => {
      const result = loginSchema.safeParse({
        email: 'ana@universidad.edu',
        password: 'Password123',
      });
      expect(result.success).toBe(true);
    });

    it('rechaza email inválido', () => {
      const result = loginSchema.safeParse({ email: 'no-es-email', password: 'x' });
      expect(result.success).toBe(false);
    });

    it('rechaza contraseña vacía', () => {
      const result = loginSchema.safeParse({ email: 'ana@universidad.edu', password: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('registerSchema', () => {
    const valid = {
      full_name: 'Ana Mora',
      email: 'ana@universidad.edu',
      password: 'Password123',
      confirmPassword: 'Password123',
    };

    it('acepta un registro válido', () => {
      expect(registerSchema.safeParse(valid).success).toBe(true);
    });

    it('rechaza contraseña menor a 8 caracteres', () => {
      const result = registerSchema.safeParse({
        ...valid,
        password: 'corta',
        confirmPassword: 'corta',
      });
      expect(result.success).toBe(false);
    });

    it('rechaza cuando las contraseñas no coinciden', () => {
      const result = registerSchema.safeParse({ ...valid, confirmPassword: 'Otra12345' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.path).toContain('confirmPassword');
      }
    });

    it('rechaza nombre vacío', () => {
      const result = registerSchema.safeParse({ ...valid, full_name: '   ' });
      expect(result.success).toBe(false);
    });
  });

  describe('forgotPasswordSchema', () => {
    it('acepta un email válido y rechaza uno inválido', () => {
      expect(forgotPasswordSchema.safeParse({ email: 'ana@universidad.edu' }).success).toBe(true);
      expect(forgotPasswordSchema.safeParse({ email: 'nope' }).success).toBe(false);
    });
  });

  describe('resetPasswordSchema', () => {
    it('exige mínimo 8 caracteres y confirmación coincidente', () => {
      expect(
        resetPasswordSchema.safeParse({ password: 'NuevaPass1', confirmPassword: 'NuevaPass1' })
          .success,
      ).toBe(true);
      expect(
        resetPasswordSchema.safeParse({ password: 'NuevaPass1', confirmPassword: 'distinta12' })
          .success,
      ).toBe(false);
      expect(
        resetPasswordSchema.safeParse({ password: 'corta', confirmPassword: 'corta' }).success,
      ).toBe(false);
    });
  });
});
