export const CLINICAL_LOCALES = ['pt-br', 'en-us', 'es'];
export const DEFAULT_CLINICAL_LOCALE = 'pt-br';
export const LOCAL_CLINICAL_LOCALE_PAIR_ERROR = 'ZELLO_MEDICAL_SOURCE_LOCALE_MISMATCH';

const CLINICAL_LOCALE_SET = new Set(CLINICAL_LOCALES);
const LOCAL_CLINICAL_PROVIDER_SET = new Set(['local', 'zello', 'zello-medical']);

const LOCALE_METADATA = {
  'pt-br': {
    bcp47: 'pt-BR',
    transcriptionLanguage: 'pt',
    languageName: 'português do Brasil',
    missingInformation: 'não informado',
  },
  'en-us': {
    bcp47: 'en-US',
    transcriptionLanguage: 'en',
    languageName: 'US English',
    missingInformation: 'not provided',
  },
  es: {
    bcp47: 'es-ES',
    transcriptionLanguage: 'es',
    languageName: 'español',
    missingInformation: 'no informado',
  },
};

export function isClinicalLocale(value) {
  return typeof value === 'string' && CLINICAL_LOCALE_SET.has(value.trim().toLowerCase());
}

export function normalizeClinicalLocale(value, fallback = DEFAULT_CLINICAL_LOCALE) {
  const normalized = String(value || '').trim().toLowerCase();
  return CLINICAL_LOCALE_SET.has(normalized) ? normalized : fallback;
}

export function getClinicalLocaleMetadata(locale) {
  return LOCALE_METADATA[normalizeClinicalLocale(locale)];
}

export function isLocalClinicalProvider(value) {
  return LOCAL_CLINICAL_PROVIDER_SET.has(String(value || '').trim().toLowerCase());
}

// The local clinical contract validates that every evidence segment has the
// same locale as the requested document. It is deliberately not a translation
// endpoint. Reject cross-language pairs before durable work is created rather
// than spending ASR/GPU capacity on a job that must fail at generation time.
export function isClinicalLocalePairSupported(documentLocale, transcriptionLocale, provider) {
  if (!isClinicalLocale(documentLocale) || !isClinicalLocale(transcriptionLocale)) return false;
  if (!isLocalClinicalProvider(provider)) return true;
  return normalizeClinicalLocale(documentLocale) === normalizeClinicalLocale(transcriptionLocale);
}
