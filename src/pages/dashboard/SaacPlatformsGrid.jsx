import { ExternalLink } from 'lucide-react';
import { SAAC_LINKS } from '../../config/saacLinks.js';
import { SAAC_ICON_MAP } from './dashboardConstants.js';

export default function SaacPlatformsGrid() {
  return (
    <section aria-label="Plataformas oficiales SAAC" className="space-y-2.5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Plataformas SAAC</h2>
        <span className="text-xs text-slate-600">Enlaces externos oficiales</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {SAAC_LINKS.map((link) => {
          const Icon = SAAC_ICON_MAP[link.iconName] || ExternalLink;
          return (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="relative min-h-[76px] p-3 rounded-xl bg-white border border-slate-300 hover:border-[var(--brand-primary)] shadow-sm flex flex-col justify-between gap-2 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-lg bg-[var(--brand-primary-soft)] text-[var(--brand-primary)] inline-flex items-center justify-center">
                  <Icon className="w-4 h-4" aria-hidden="true" />
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 leading-tight">
                  {link.title}
                </p>
                <p className="text-xs text-slate-600 mt-0.5">{link.subtitle}</p>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
