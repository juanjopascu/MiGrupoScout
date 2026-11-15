const ALLOWED_RELATIVE_URL_REGEX = /^\/[a-zA-Z0-9\-\/\?=&]*$/;

const ALLOWED_EVENT_TYPES = new Set([
  'CAMP_DEADLINE',
  'MEDICAL_EXPIRY',
  'COUNCIL_TASK',
  'GENERAL_NOTICE'
]);

const MAX_TITLE_LENGTH = 64;
const MAX_BODY_LENGTH = 160;
const MAX_TAG_LENGTH = 64;

// Patrones PII / PHI para prevenir filtracion en pantalla de bloqueo del dispositivo.
const DNI_DOTTED_REGEX = /\b\d{1,2}\.\d{3}\.\d{3}\b/g;
const DNI_PLAIN_REGEX = /\b(?:dni|doc|documento)?\s*[:#-]?\s*\d{7,8}\b/gi;
const PHONE_REGEX = /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)\d{3,4}[\s.-]?\d{3,4}\b/g;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

const SENSITIVE_MEDICAL_REGEX =
  /\b(diagnostico|patologia|alergi[ao]s?|alergic[oa]s?|medicacion|medicamento|farmaco|insulina|epilep[a-z]+|convulsion(?:es)?|asma|asmatic[oa]s?|diabetes|diabetic[oa]s?|celiac[oa]s?|celiaquia|tda|tdah|autismo|psiquiatric[oa]s?|psicologic[oa]s?|neurologic[oa]s?|cardiopatia|discapacidad|internacion|cirugia|tratamiento|grupo\s+sanguineo|factor\s+rh|obra\s+social|historia\s+clinica|vacuna|embarazo)\b/i;

const SENSITIVE_MEDICAL_TERMS = [
  'diagnostico',
  'patologia',
  'alergia',
  'alergias',
  'alergico',
  'alergica',
  'medicacion',
  'medicamento',
  'farmaco',
  'insulina',
  'epilepsia',
  'epileptico',
  'epileptica',
  'convulsion',
  'convulsiones',
  'asma',
  'asmatico',
  'asmatica',
  'diabetes',
  'diabetico',
  'diabetica',
  'celiaco',
  'celiaca',
  'celiaquia',
  'tda',
  'tdah',
  'autismo',
  'psiquiatrico',
  'psiquiatrica',
  'psicologico',
  'psicologica',
  'neurologico',
  'neurologica',
  'cardiopatia',
  'discapacidad',
  'internacion',
  'cirugia',
  'tratamiento',
  'grupo sanguineo',
  'factor rh',
  'obra social',
  'historia clinica',
  'vacuna',
  'embarazo'
];

// Elimina pictogramas/emojis Unicode (regla CERO emojis).
const EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}]/gu;

function stripControlAndHtml(input) {
  if (typeof input !== 'string') {
    return '';
  }
  return input
    .replace(/<[^>]*>/g, '')
    .replace(EMOJI_REGEX, '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeForMatch(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

const DIACRITIC_CHAR_CLASS = {
  a: '[aáàäâ]',
  e: '[eéèëê]',
  i: '[iíìïî]',
  o: '[oóòöô]',
  u: '[uúùüû]',
  n: '[nñ]',
  c: '[cç]'
};

function buildAccentInsensitiveRegex(phrase) {
  const normalized = normalizeForMatch(phrase);
  const pattern = normalized
    .split(/\s+/)
    .filter(Boolean)
    .map((word) =>
      Array.from(word)
        .map((ch) => DIACRITIC_CHAR_CLASS[ch] || escapeRegExp(ch))
        .join('')
    )
    .join('[\\s,]+');

  if (!pattern) {
    return null;
  }
  return new RegExp(`(?<![\\p{L}\\p{N}])${pattern}(?![\\p{L}\\p{N}])`, 'giu');
}

function maskSensitivePatterns(text, blockedNames = []) {
  let masked = text
    .replace(EMAIL_REGEX, '[dato-protegido]')
    .replace(DNI_DOTTED_REGEX, '[dato-protegido]')
    .replace(DNI_PLAIN_REGEX, '[dato-protegido]')
    .replace(PHONE_REGEX, '[dato-protegido]');

  for (const term of SENSITIVE_MEDICAL_TERMS) {
    const termRegex = buildAccentInsensitiveRegex(term);
    if (termRegex) {
      masked = masked.replace(termRegex, '[dato-clinico-reservado]');
    }
  }

  if (Array.isArray(blockedNames) && blockedNames.length > 0) {
    for (const rawName of blockedNames) {
      if (typeof rawName !== 'string') {
        continue;
      }
      const cleanName = stripControlAndHtml(rawName);
      if (cleanName.length < 4) {
        continue;
      }

      const nameVariants = [cleanName];
      const parts = cleanName.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        nameVariants.push(`${parts.slice(1).join(' ')} ${parts[0]}`);
      }

      for (const variant of nameVariants) {
        const nameRegex = buildAccentInsensitiveRegex(variant);
        if (nameRegex) {
          masked = masked.replace(nameRegex, '[integrante]');
        }
      }
    }
  }

  return masked.replace(/\s+/g, ' ').trim();
}

/**
 * Valida si una URL es una ruta relativa permitida por ConsejoScout.
 */
export function isAllowedPushUrl(url) {
  if (typeof url !== 'string') {
    return false;
  }
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith('//') || trimmed.includes('..')) {
    return false;
  }
  return ALLOWED_RELATIVE_URL_REGEX.test(trimmed);
}

/**
 * Sanitiza y valida el payload de una notificacion Web Push.
 *
 * @param {object} rawPayload
 * @param {object} [options]
 * @param {string[]} [options.blockedNames] - Nombres de nomina a bloquear/enmascarar.
 * @param {boolean} [options.rejectSensitiveTerms=true] - Si true, rechaza payloads con datos clinicos sensibles.
 * @returns {{
 *   valid: boolean,
 *   error?: string,
 *   payload?: {
 *     title: string,
 *     body: string,
 *     url: string,
 *     tag: string,
 *     eventType: string,
 *     icon: string,
 *     badge: string
 *   }
 * }}
 */
export function sanitizePushPayload(rawPayload, options = {}) {
  const { blockedNames = [], rejectSensitiveTerms = true } = options;

  if (!rawPayload || typeof rawPayload !== 'object') {
    return {
      valid: false,
      error: 'Payload de notificacion ausente o invalido.'
    };
  }

  const eventType =
    typeof rawPayload.eventType === 'string' && ALLOWED_EVENT_TYPES.has(rawPayload.eventType)
      ? rawPayload.eventType
      : 'GENERAL_NOTICE';

  const targetUrl = typeof rawPayload.url === 'string' ? rawPayload.url.trim() : '/dashboard';
  if (!isAllowedPushUrl(targetUrl)) {
    return {
      valid: false,
      error: 'Payload invalido o ruta de destino no permitida.'
    };
  }

  const cleanTitleRaw = stripControlAndHtml(rawPayload.title);
  const cleanBodyRaw = stripControlAndHtml(rawPayload.body);

  if (!cleanTitleRaw || !cleanBodyRaw) {
    return {
      valid: false,
      error: 'El titulo y el cuerpo de la notificacion son obligatorios.'
    };
  }

  if (
    rejectSensitiveTerms &&
    (SENSITIVE_MEDICAL_REGEX.test(normalizeForMatch(cleanTitleRaw)) ||
      SENSITIVE_MEDICAL_REGEX.test(normalizeForMatch(cleanBodyRaw)))
  ) {
    return {
      valid: false,
      error: 'La notificacion contiene terminos medicos sensibles no permitidos en Web Push.'
    };
  }

  const maskedTitle = maskSensitivePatterns(cleanTitleRaw, blockedNames);
  const maskedBody = maskSensitivePatterns(cleanBodyRaw, blockedNames);

  if (!maskedTitle || !maskedBody) {
    return {
      valid: false,
      error: 'El contenido de la notificacion no es valido tras la sanitizacion.'
    };
  }

  const title = maskedTitle.slice(0, MAX_TITLE_LENGTH).trim();
  const body = maskedBody.slice(0, MAX_BODY_LENGTH).trim();

  const rawTag = stripControlAndHtml(rawPayload.tag || eventType.toLowerCase());
  const sanitizedTag = rawTag
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, MAX_TAG_LENGTH) || 'consejoscout-notice';

  return {
    valid: true,
    payload: {
      title,
      body,
      url: targetUrl,
      tag: sanitizedTag,
      eventType,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png'
    }
  };
}
