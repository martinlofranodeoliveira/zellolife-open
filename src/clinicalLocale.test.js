import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CLINICAL_LOCALE,
  getClinicalLocaleMetadata,
  isClinicalLocalePairSupported,
  isClinicalLocale,
  isLocalClinicalProvider,
  normalizeClinicalLocale,
} from './clinicalLocale.js';

describe('clinical locale validation', () => {
  it('accepts only the supported application locales', () => {
    expect(isClinicalLocale('pt-br')).toBe(true);
    expect(isClinicalLocale('en-us')).toBe(true);
    expect(isClinicalLocale('es')).toBe(true);
    expect(isClinicalLocale('fr-fr')).toBe(false);
  });

  it('keeps every supported language available on the local runtime', () => {
    for (const locale of ['pt-br', 'en-us', 'es']) {
      expect(isClinicalLocalePairSupported(locale, locale, 'zello')).toBe(true);
    }
  });

  it('rejects cross-language evidence only for the non-translation local runtime', () => {
    expect(isLocalClinicalProvider(' LOCAL ')).toBe(true);
    expect(isLocalClinicalProvider('zello-medical')).toBe(true);
    expect(isClinicalLocalePairSupported('en-us', 'pt-br', 'zello')).toBe(false);
    expect(isClinicalLocalePairSupported('es', 'en-us', 'local')).toBe(false);
    expect(isClinicalLocalePairSupported('en-us', 'pt-br', 'azure')).toBe(true);
  });

  it('keeps backwards compatibility by defaulting legacy values to pt-br', () => {
    expect(normalizeClinicalLocale(undefined)).toBe(DEFAULT_CLINICAL_LOCALE);
    expect(normalizeClinicalLocale('invalid')).toBe('pt-br');
  });

  it('maps app locales to transcription provider language codes', () => {
    expect(getClinicalLocaleMetadata('pt-br')).toMatchObject({ bcp47: 'pt-BR', transcriptionLanguage: 'pt' });
    expect(getClinicalLocaleMetadata('en-us')).toMatchObject({ bcp47: 'en-US', transcriptionLanguage: 'en' });
    expect(getClinicalLocaleMetadata('es')).toMatchObject({ bcp47: 'es-ES', transcriptionLanguage: 'es' });
  });
});
