import { describe, it, expect } from 'vitest';
import {
  isValidFullName,
  validateFullName,
  isValidCPF,
  calcularIdade,
} from '../src/lib/schemas.ts';

describe('Resiliência do Formulário em Dispositivos Móveis (mobile-form-resilience)', () => {
  describe('Nomes em Teclados Mobile (Smart Punctuation, Acentos, Iniciais e Espaços Unicode)', () => {
    it('deve aceitar nomes com apóstrofo tipográfico / aspas curvas de iOS/iPhone (Unicode \\u2019)', () => {
      // iPhone / iOS substitui apostrofe comum ' por ’
      expect(isValidFullName("Maria D’Ávila")).toBe(true);
      expect(isValidFullName("João Sant’Anna")).toBe(true);
      expect(isValidFullName("Arthur O’Connor")).toBe(true);
      expect(isValidFullName("Enzo D'Ávila")).toBe(true);
      expect(validateFullName("Maria D’Ávila").valid).toBe(true);
    });

    it('deve aceitar nomes com espaços não separáveis (NBSP \\u00A0) inseridos por teclados mobile', () => {
      // Teclados Gboard / iOS frequentemente inserem \u00A0 após sugestões automáticas
      const nameWithNbsp = "Maria\u00A0Eduarda\u00A0dos\u00A0Santos";
      expect(isValidFullName(nameWithNbsp)).toBe(true);
    });

    it('deve aceitar nomes com hífens tipográficos (en-dash, non-breaking hyphen)', () => {
      expect(isValidFullName("Ana-Paula Ferreira")).toBe(true);
      expect(isValidFullName("Ana‐Paula Ferreira")).toBe(true); // \\u2010
      expect(isValidFullName("Ana‑Paula Ferreira")).toBe(true); // \\u2011
    });

    it('deve aceitar nomes civis com abreviação / inicial de nome do meio (ex: Lucas M. Silva)', () => {
      expect(isValidFullName("Lucas M. Silva")).toBe(true);
      expect(isValidFullName("Maria A. Santos")).toBe(true);
      expect(isValidFullName("Carlos E Ferreira")).toBe(true);
    });

    it('deve rejeitar nomes fictícios ou sem sobrenome mesmo com caracteres mobile', () => {
      expect(isValidFullName("Gaga gaga")).toBe(false);
      expect(isValidFullName("Lucas")).toBe(false);
      expect(isValidFullName("a b")).toBe(false);
    });
  });

  describe('Formatação e Validação de Telefones Mobile com e sem +55', () => {
    const cleanAndFormatMobilePhone = (phoneRaw: string) => {
      let digits = phoneRaw.replace(/\D/g, '');
      if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
        digits = digits.slice(2);
      }
      return digits;
    };

    it('deve limpar e reconhecer telefones copiados do WhatsApp com prefixo +55', () => {
      const whatsappCopy1 = "+55 (61) 99999-9999";
      const digits1 = cleanAndFormatMobilePhone(whatsappCopy1);
      expect(digits1).toBe('61999999999');
      expect(digits1.length).toBe(11);

      const whatsappCopy2 = "+5561988887777";
      const digits2 = cleanAndFormatMobilePhone(whatsappCopy2);
      expect(digits2).toBe('61988887777');
      expect(digits2.length).toBe(11);
    });

    it('deve aceitar telefones nacionais comuns de 10 e 11 dígitos', () => {
      const spCell = "(11) 98765-4321";
      const spClean = cleanAndFormatMobilePhone(spCell);
      expect(spClean.length).toBe(11);

      const landline = "(61) 3321-0000";
      const landClean = cleanAndFormatMobilePhone(landline);
      expect(landClean.length).toBe(10);
    });
  });

  describe('Validação e Cálculo de Idade a partir de Datas em Mobile WebViews', () => {
    const parseMobileBirthDate = (raw: string): Date | null => {
      const clean = raw.trim();
      if (clean.includes('/')) {
        const parts = clean.split('/');
        if (parts.length === 3) {
          return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
        }
      } else if (clean.includes('-')) {
        const parts = clean.split('-');
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
          }
          return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
        }
      }
      const d = new Date(clean);
      return isNaN(d.getTime()) ? null : d;
    };

    it('deve interpretar corretamente datas padrão HTML5 (YYYY-MM-DD)', () => {
      const parsed = parseMobileBirthDate('2008-05-15');
      expect(parsed).not.toBeNull();
      expect(parsed?.getFullYear()).toBe(2008);
      expect(parsed?.getMonth()).toBe(4); // 0-indexed maio
      expect(parsed?.getDate()).toBe(15);
    });

    it('deve interpretar corretamente datas inseridas por autofill mobile no padrão BR (DD/MM/YYYY)', () => {
      const parsed = parseMobileBirthDate('15/05/2008');
      expect(parsed).not.toBeNull();
      expect(parsed?.getFullYear()).toBe(2008);
      expect(parsed?.getMonth()).toBe(4); // 0-indexed maio
      expect(parsed?.getDate()).toBe(15);
    });

    it('deve calcular idade corretamente para datas em ambos os formatos', () => {
      const ref = new Date(2026, 7, 26); // 26/08/2026
      expect(calcularIdade('2008-05-15', ref)).toBe(18);
      expect(calcularIdade('15/05/2008', ref)).toBe(18);
      expect(calcularIdade('2012-01-10', ref)).toBe(14);
      expect(calcularIdade('10/01/2012', ref)).toBe(14);
    });
  });

  describe('Validação de CPFs com espaçamentos acidentais e pontuações', () => {
    it('deve validar CPFs válidos mesmo com espaços ou pontuações coladas de apps mobile', () => {
      expect(isValidCPF(' 52998224725 ')).toBe(true);
      expect(isValidCPF('529.982.247-25')).toBe(true);
      expect(isValidCPF(' 529.982.247-25\n')).toBe(true);
    });
  });
});
