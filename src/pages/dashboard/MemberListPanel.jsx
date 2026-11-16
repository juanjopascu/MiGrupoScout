import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Edit3,
  HeartPulse,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  X,
  XCircle
} from 'lucide-react';
import { cleanUserText, formatDateAr, getDaysFromToday } from '../../utils/textSanitizer.js';
import { BRANCH_BADGE_STYLES, BRANCH_SHORT_LABELS } from './dashboardConstants.js';

const PAGE_SIZE = 25;

export default function MemberListPanel({
  members,
  memberSearch,
  onMemberSearchChange,
  memberQuickFilter,
  onClearQuickFilter,
  canEdit = true,
  canDelete = true,
  onEditMember,
  onDeleteMember
}) {
  const [visibleLimit, setVisibleLimit] = useState(PAGE_SIZE);

  useEffect(() => {
    setVisibleLimit(PAGE_SIZE);
  }, [memberSearch, memberQuickFilter, members.length]);

  const visibleMembers = members.slice(0, visibleLimit);
  const remainingCount = Math.max(0, members.length - visibleMembers.length);

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search
            className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <label htmlFor="member-search-input" className="sr-only">
            Buscar integrante por nombre
          </label>
          <input
            id="member-search-input"
            type="search"
            value={memberSearch}
            onChange={(e) => onMemberSearchChange(e.target.value)}
            placeholder="Buscar integrante por nombre..."
            className="w-full h-11 pl-10 pr-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
          />
        </div>

        {memberQuickFilter !== 'all' && (
          <button
            type="button"
            onClick={onClearQuickFilter}
            className="h-11 px-3 rounded-lg border border-amber-700 bg-amber-100 text-amber-900 text-sm font-semibold inline-flex items-center gap-1.5"
          >
            <X className="w-4 h-4" aria-hidden="true" />
            <span>
              {memberQuickFilter === 'cruz_pending'
                ? 'Filtro: Cruz del Sur pendiente'
                : 'Filtro: Fichas por vencer / vencidas'}
            </span>
          </button>
        )}
      </div>

      {members.length === 0 ? (
        <div className="p-6 text-center rounded-xl border border-dashed border-slate-300 bg-slate-50">
          <p className="text-sm font-medium text-slate-700">
            No se encontraron integrantes con los filtros actuales.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between text-xs text-slate-600 px-0.5">
            <span>
              Mostrando <strong className="text-slate-900">{visibleMembers.length}</strong> de{' '}
              <strong className="text-slate-900">{members.length}</strong> integrantes
            </span>
          </div>

          <div className="space-y-2.5">
            {visibleMembers.map((member) => {
              const medDays = getDaysFromToday(member.medical_form_expires_at);
              const medStatus =
                medDays === null || medDays < 0
                  ? 'rojo'
                  : medDays <= 30
                    ? 'amarillo'
                    : 'verde';
              const isAdult =
                member.member_type === 'educador' || member.branch === 'jefatura';
              const sfhOk = member.safe_from_harm_status === 'vigente';

              return (
                <div
                  key={member.id}
                  className="p-3 rounded-xl border border-slate-300 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div className="space-y-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">
                        {cleanUserText(member.full_name)}
                      </p>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          BRANCH_BADGE_STYLES[member.branch] || BRANCH_BADGE_STYLES.jefatura
                        }`}
                      >
                        {BRANCH_SHORT_LABELS[member.branch] || 'Adultos'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          member.cruz_del_sur_status === 'afiliado'
                            ? 'bg-green-100 border-green-700 text-green-900'
                            : member.cruz_del_sur_status === 'pendiente'
                              ? 'bg-amber-100 border-amber-700 text-amber-900'
                              : 'bg-red-100 border-red-700 text-red-900'
                        }`}
                      >
                        {member.cruz_del_sur_status === 'afiliado' ? (
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                        ) : member.cruz_del_sur_status === 'pendiente' ? (
                          <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                        <span>Afiliacion: {cleanUserText(member.cruz_del_sur_status)}</span>
                      </span>

                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          medStatus === 'verde'
                            ? 'bg-green-100 border-green-700 text-green-900'
                            : medStatus === 'amarillo'
                              ? 'bg-amber-100 border-amber-700 text-amber-900'
                              : 'bg-red-100 border-red-700 text-red-900'
                        }`}
                      >
                        <HeartPulse className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>
                          {medDays === null
                            ? 'Ficha: Sin fecha'
                            : medDays < 0
                              ? `Ficha: Vencida (${formatDateAr(member.medical_form_expires_at)})`
                              : medDays <= 30
                                ? `Ficha: Vence en ${medDays}d`
                                : `Ficha: Vigente (${formatDateAr(member.medical_form_expires_at)})`}
                        </span>
                      </span>

                      {isAdult && (
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            sfhOk
                              ? 'bg-green-100 border-green-700 text-green-900'
                              : 'bg-red-100 border-red-700 text-red-900'
                          }`}
                        >
                          {sfhOk ? (
                            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                          ) : (
                            <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
                          )}
                          <span>A Salvo del Peligro: {sfhOk ? 'Vigente' : 'Pendiente'}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {(canEdit || canDelete) && (
                    <div className="flex items-center gap-1 self-end sm:self-center shrink-0">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => onEditMember(member)}
                          aria-label={`Editar integrante ${cleanUserText(member.full_name)}`}
                          className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100"
                        >
                          <Edit3 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => onDeleteMember(member.id)}
                          aria-label={`Eliminar integrante ${cleanUserText(member.full_name)}`}
                          className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {remainingCount > 0 && (
            <button
              type="button"
              onClick={() => setVisibleLimit((prev) => prev + PAGE_SIZE)}
              className="w-full h-11 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-sm font-semibold text-[var(--brand-primary)] inline-flex items-center justify-center gap-2"
            >
              <ChevronDown className="w-4 h-4" aria-hidden="true" />
              <span>
                Mostrar {Math.min(PAGE_SIZE, remainingCount)} mas ({remainingCount} restantes)
              </span>
            </button>
          )}
        </>
      )}
    </div>
  );
}
