import { useState } from 'react';
import { Shield } from 'lucide-react';
import { isSafeLogoValue } from '../domain/branding.js';

export default function GroupLogoBadge({
  logoUrl,
  primaryColor,
  sizeClass = 'w-10 h-10',
  iconClass = 'w-5 h-5',
  alt = 'Escudo del Grupo Scout'
}) {
  const [imgError, setImgError] = useState(false);
  const validLogo =
    typeof logoUrl === 'string' &&
    logoUrl.trim() !== '' &&
    isSafeLogoValue(logoUrl) &&
    !imgError;

  if (validLogo) {
    return (
      <div
        className={`${sizeClass} rounded-xl border border-slate-300 bg-white overflow-hidden inline-flex items-center justify-center shrink-0`}
      >
        <img
          src={logoUrl}
          alt={alt}
          onError={() => setImgError(true)}
          className="w-full h-full object-contain p-0.5"
        />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-xl inline-flex items-center justify-center shrink-0 transition-colors`}
      style={{
        backgroundColor: primaryColor || 'var(--brand-primary, #1B365D)',
        color: 'var(--brand-primary-contrast, #FFFFFF)'
      }}
    >
      <Shield className={iconClass} aria-hidden="true" />
    </div>
  );
}
