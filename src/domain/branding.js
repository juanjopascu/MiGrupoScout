/**
 * Utilidades puras de identidad visual por Grupo Scout (logo y colores).
 * Calcula variantes de hover, tinte suave y contraste WCAG sin dependencias externas.
 */

export const DEFAULT_BRANDING = Object.freeze({
  primaryColor: '#1B365D',
  accentColor: '#2E7D32',
  logoUrl: null
});

export const BRAND_COLOR_PRESETS = Object.freeze([
  Object.freeze({
    id: 'saac',
    label: 'Azul SAAC',
    primary: '#1B365D',
    accent: '#2E7D32'
  }),
  Object.freeze({
    id: 'bosque',
    label: 'Verde Bosque',
    primary: '#1B5E20',
    accent: '#D97706'
  }),
  Object.freeze({
    id: 'rover',
    label: 'Bordo Rover',
    primary: '#7F1D1D',
    accent: '#1B365D'
  }),
  Object.freeze({
    id: 'caminante',
    label: 'Azul Noche',
    primary: '#0F172A',
    accent: '#0284C7'
  }),
  Object.freeze({
    id: 'terracota',
    label: 'Terracota',
    primary: '#9A3412',
    accent: '#15803D'
  }),
  Object.freeze({
    id: 'teal',
    label: 'Verde Petroleo',
    primary: '#115E59',
    accent: '#B45309'
  })
]);

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;
const SAFE_DATA_IMAGE_REGEX = /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/i;
const SAFE_HTTPS_IMAGE_REGEX = /^https:\/\/[a-zA-Z0-9.-]+(?:\/[^\s<>"']*)?$/;
const MAX_LOGO_LENGTH = 200000;

export function isValidHexColor(value) {
  return typeof value === 'string' && HEX_COLOR_REGEX.test(value.trim());
}

export function normalizeHexColor(value, fallback = DEFAULT_BRANDING.primaryColor) {
  if (!isValidHexColor(value)) {
    return fallback.toUpperCase();
  }
  return value.trim().toUpperCase();
}

export function isSafeLogoValue(value) {
  if (value === null || value === undefined || value === '') {
    return true;
  }
  if (typeof value !== 'string') {
    return false;
  }
  const trimmed = value.trim();
  if (trimmed.length > MAX_LOGO_LENGTH) {
    return false;
  }
  if (/svg\+xml|<script|javascript:/i.test(trimmed)) {
    return false;
  }
  if (trimmed.startsWith('data:')) {
    return SAFE_DATA_IMAGE_REGEX.test(trimmed);
  }
  if (trimmed.startsWith('https://')) {
    return SAFE_HTTPS_IMAGE_REGEX.test(trimmed);
  }
  return false;
}

function hexToRgb(hex) {
  const clean = normalizeHexColor(hex).slice(1);
  return {
    r: Number.parseInt(clean.slice(0, 2), 16),
    g: Number.parseInt(clean.slice(2, 4), 16),
    b: Number.parseInt(clean.slice(4, 6), 16)
  };
}

function rgbToHex({ r, g, b }) {
  const toByte = (n) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, '0')
      .toUpperCase();
  return `#${toByte(r)}${toByte(g)}${toByte(b)}`;
}

function mixColors(hexA, hexB, weightB) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const w = Math.max(0, Math.min(1, weightB));
  return rgbToHex({
    r: a.r * (1 - w) + b.r * w,
    g: a.g * (1 - w) + b.g * w,
    b: a.b * (1 - w) + b.b * w
  });
}

function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const toLinear = (c) => {
    const srgb = c / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function computeBrandTheme(primaryInput, accentInput) {
  const primary = normalizeHexColor(primaryInput, DEFAULT_BRANDING.primaryColor);
  const accent = normalizeHexColor(accentInput, DEFAULT_BRANDING.accentColor);
  const lum = relativeLuminance(primary);
  const primaryContrast = lum > 0.45 ? '#0F172A' : '#FFFFFF';
  const primaryHover = mixColors(primary, '#000000', 0.2);
  const primarySoft = mixColors(primary, '#FFFFFF', 0.88);
  const primarySoftText = lum > 0.45 ? mixColors(primary, '#000000', 0.45) : primary;
  const accentSoft = mixColors(accent, '#FFFFFF', 0.88);

  return {
    primary,
    primaryHover,
    primarySoft,
    primarySoftText,
    primaryContrast,
    accent,
    accentSoft
  };
}

export function applyGroupBrandingToDocument(groupProfile) {
  if (typeof document === 'undefined' || !document.documentElement) {
    return;
  }
  const theme = computeBrandTheme(
    groupProfile?.primary_color,
    groupProfile?.accent_color
  );
  const rootStyle = document.documentElement.style;
  rootStyle.setProperty('--brand-primary', theme.primary);
  rootStyle.setProperty('--brand-primary-hover', theme.primaryHover);
  rootStyle.setProperty('--brand-primary-soft', theme.primarySoft);
  rootStyle.setProperty('--brand-primary-soft-text', theme.primarySoftText);
  rootStyle.setProperty('--brand-primary-contrast', theme.primaryContrast);
  rootStyle.setProperty('--brand-accent', theme.accent);
  rootStyle.setProperty('--brand-accent-soft', theme.accentSoft);
}
