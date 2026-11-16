import { useState } from 'react';
import { ImagePlus, Palette, RotateCcw, Trash2 } from 'lucide-react';
import {
  BRAND_COLOR_PRESETS,
  DEFAULT_BRANDING,
  computeBrandTheme,
  normalizeHexColor
} from '../domain/branding.js';
import { processLogoImageFile } from '../utils/imageProcessor.js';
import GroupLogoBadge from './GroupLogoBadge.jsx';

export default function GroupBrandingFields({
  groupName,
  groupNumber,
  primaryColor,
  accentColor,
  logoUrl,
  disabled,
  onChangePrimaryColor,
  onChangeAccentColor,
  onChangeLogoUrl
}) {
  const [uploadError, setUploadError] = useState('');
  const theme = computeBrandTheme(primaryColor, accentColor);

  async function handleLogoUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }
    setUploadError('');
    const result = await processLogoImageFile(file);
    if (!result.ok) {
      setUploadError(result.error);
      return;
    }
    onChangeLogoUrl(result.dataUrl);
  }

  return (
    <div className="pt-4 border-t border-slate-200 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-slate-700" aria-hidden="true" />
          <h4 className="text-sm font-semibold text-slate-900">
            Logo y Colores Institucionales
          </h4>
        </div>
        {!disabled ? (
          <button
            type="button"
            onClick={() => {
              onChangePrimaryColor(DEFAULT_BRANDING.primaryColor);
              onChangeAccentColor(DEFAULT_BRANDING.accentColor);
              setUploadError('');
            }}
            className="text-xs font-semibold text-slate-700 hover:text-slate-900 inline-flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Violeta Scout</span>
          </button>
        ) : (
          <span className="text-xs font-medium text-slate-600">
            Solo Jefe de Grupo
          </span>
        )}
      </div>

      {/* Vista previa de cabecera del tenant */}
      <div className="p-3 rounded-xl border border-slate-300 bg-slate-50 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <GroupLogoBadge
            logoUrl={logoUrl}
            primaryColor={theme.primary}
            sizeClass="w-12 h-12"
            iconClass="w-6 h-6"
          />
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">
              {groupName || `Grupo Scout Nro. ${groupNumber || '-'}`}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className="h-2.5 w-10 rounded-full border border-black/10"
                style={{ backgroundColor: theme.primary }}
                title="Color primario"
              />
              <span
                className="h-2.5 w-10 rounded-full border border-black/10"
                style={{ backgroundColor: theme.accent }}
                title="Color secundario / panoleta"
              />
              <span className="text-[11px] text-slate-600">Vista previa</span>
            </div>
          </div>
        </div>

        <span
          className="px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0"
          style={{
            backgroundColor: theme.primary,
            color: theme.primaryContrast
          }}
        >
          Boton activo
        </span>
      </div>

      {/* Logo del Grupo */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-700">
          Escudo o Logo del Grupo (PNG, JPG o WebP)
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <label
            className={`h-10 px-3.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-2 ${
              disabled
                ? 'border-slate-300 bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'border-slate-400 bg-white text-slate-800 hover:bg-slate-100 cursor-pointer'
            }`}
          >
            <ImagePlus className="w-4 h-4" aria-hidden="true" />
            <span>{logoUrl ? 'Cambiar logo' : 'Subir logo'}</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={disabled}
              onChange={handleLogoUpload}
              className="sr-only"
            />
          </label>

          {logoUrl && !disabled && (
            <button
              type="button"
              onClick={() => {
                onChangeLogoUrl(null);
                setUploadError('');
              }}
              className="h-10 px-3 rounded-lg border border-red-700 text-red-900 hover:bg-red-50 text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Quitar logo</span>
            </button>
          )}
        </div>
        {uploadError && (
          <p role="alert" className="text-xs text-red-800 font-medium">
            {uploadError}
          </p>
        )}
      </div>

      {/* Paletas rapidas */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-700">Paletas sugeridas</p>
        <div className="flex flex-wrap gap-2">
          {BRAND_COLOR_PRESETS.map((preset) => {
            const active =
              normalizeHexColor(primaryColor) === preset.primary &&
              normalizeHexColor(accentColor) === preset.accent;
            return (
              <button
                key={preset.id}
                type="button"
                disabled={disabled}
                onClick={() => {
                  onChangePrimaryColor(preset.primary);
                  onChangeAccentColor(preset.accent);
                }}
                className={`h-9 px-2.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 disabled:opacity-50 ${
                  active
                    ? 'border-slate-900 bg-slate-100 text-slate-900 font-semibold'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span
                  className="w-3.5 h-3.5 rounded-full border border-black/15"
                  style={{ backgroundColor: preset.primary }}
                  aria-hidden="true"
                />
                <span
                  className="w-2.5 h-3.5 rounded-sm border border-black/15"
                  style={{ backgroundColor: preset.accent }}
                  aria-hidden="true"
                />
                <span>{preset.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selectores libres */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="brand-primary-input" className="block text-xs font-medium text-slate-700 mb-1">
            Color principal
          </label>
          <div className="flex items-center gap-2">
            <input
              id="brand-primary-input"
              type="color"
              disabled={disabled}
              value={theme.primary}
              onChange={(e) => onChangePrimaryColor(e.target.value.toUpperCase())}
              className="w-12 h-11 p-1 rounded-lg border border-slate-500 bg-white cursor-pointer disabled:opacity-50"
            />
            <input
              type="text"
              aria-label="Codigo hexadecimal color principal"
              disabled={disabled}
              value={primaryColor}
              onChange={(e) => onChangePrimaryColor(e.target.value.toUpperCase())}
              maxLength={7}
              className="flex-1 h-11 px-3 rounded-lg border border-slate-500 text-sm font-mono text-slate-900 bg-white disabled:bg-slate-100"
            />
          </div>
        </div>

        <div>
          <label htmlFor="brand-accent-input" className="block text-xs font-medium text-slate-700 mb-1">
            Color secundario / Panoleta
          </label>
          <div className="flex items-center gap-2">
            <input
              id="brand-accent-input"
              type="color"
              disabled={disabled}
              value={theme.accent}
              onChange={(e) => onChangeAccentColor(e.target.value.toUpperCase())}
              className="w-12 h-11 p-1 rounded-lg border border-slate-500 bg-white cursor-pointer disabled:opacity-50"
            />
            <input
              type="text"
              aria-label="Codigo hexadecimal color secundario"
              disabled={disabled}
              value={accentColor}
              onChange={(e) => onChangeAccentColor(e.target.value.toUpperCase())}
              maxLength={7}
              className="flex-1 h-11 px-3 rounded-lg border border-slate-500 text-sm font-mono text-slate-900 bg-white disabled:bg-slate-100"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
