import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  FileSignature,
  MessageSquareShare,
  ScrollText,
  Share2,
  Tent
} from 'lucide-react';
import { cleanUserText, formatDateAr, getTodayIsoLocal } from '../utils/textSanitizer.js';

const DOC_TYPES = Object.freeze([
  {
    id: 'pedido_acampe',
    label: 'Pedido de Acampe',
    icon: Tent
  },
  {
    id: 'autorizacion_salida',
    label: 'Autorizacion de Salida',
    icon: FileSignature
  },
  {
    id: 'acta_consejo',
    label: 'Acta de Consejo de Grupo',
    icon: ScrollText
  },
  {
    id: 'comunicado_familias',
    label: 'Comunicado para Familias',
    icon: MessageSquareShare
  }
]);

function describeBranches(camp) {
  if (!camp?.branch_counts) {
    return camp?.branch_scope === 'grupal' ? 'Todas las ramas del Grupo' : camp?.branch_scope || 'Manada y Unidad';
  }
  const labels = [];
  if (camp.branch_counts.manada > 0) labels.push('Manada');
  if (camp.branch_counts.unidad > 0) labels.push('Unidad Scout');
  if (camp.branch_counts.caminantes > 0) labels.push('Caminantes');
  if (camp.branch_counts.rovers > 0) labels.push('Rovers');
  return labels.length > 0 ? labels.join(', ') : 'Grupo Scout completo';
}

function buildDocumentText(docType, fields) {
  const groupName = cleanUserText(fields.groupName || 'Grupo Scout', { maxLength: 140 });
  const district = cleanUserText(fields.district || 'Distrito', { maxLength: 80 });
  const zone = cleanUserText(fields.zone || 'Zona', { maxLength: 80 });

  if (docType === 'pedido_acampe') {
    return [
      `${groupName.toUpperCase()}`,
      `${district} - ${zone} | Scouts de Argentina Asociacion Civil`,
      '',
      `Fecha: ${formatDateAr(getTodayIsoLocal())}`,
      `Destinatario: ${cleanUserText(fields.districtChief || 'Jefe/a de Distrito')}`,
      'Asunto: Solicitud formal de autorizacion de salida / campamento',
      '',
      'De nuestra mayor consideracion:',
      '',
      `Por medio de la presente, el Consejo de Grupo del ${groupName} solicita autorizacion distrital para la realizacion de la actividad "${cleanUserText(fields.activityTitle || 'Campamento de Grupo')}", aprobada en reunion de Consejo.`,
      '',
      'DATOS OPERATIVOS DE LA ACTIVIDAD',
      `- Lugar / Campo Scout: ${cleanUserText(fields.location || 'A confirmar')}`,
      `- Fecha de inicio: ${formatDateAr(fields.startDate)}`,
      `- Fecha de regreso: ${formatDateAr(fields.endDate)}`,
      `- Ramas participantes: ${cleanUserText(fields.branches || 'Grupal')}`,
      `- Cantidad de beneficiarios estimada: ${Number(fields.youthCount) || 0}`,
      `- Cantidad de adultos responsables declarados: ${Number(fields.adultCount) || 0} (100% con certificacion A Salvo del Peligro vigente)`,
      `- Responsable a cargo del campamento: ${cleanUserText(fields.campLeader || 'Jefe/a de Campo designado')}`,
      '',
      'DOCUMENTACION ADJUNTA',
      '- Nomina actualizada exportada del sistema Cruz del Sur.',
      '- Proyecto educativo y programa tentativo de actividades.',
      '- Carpeta sanitaria, fichas medicas y autorizaciones familiares firmadas.',
      '- Plan de emergencias, contingencias y ficha de traslado.',
      '',
      'Sin otro particular, saludamos con un fuerte Siempre Listo.',
      '',
      `Jefatura de Grupo - ${groupName}`
    ].join('\n');
  }

  if (docType === 'autorizacion_salida') {
    const feeLine = fields.fee
      ? `- Valor / Arancel de participacion: ${cleanUserText(fields.fee)}`
      : '- Valor / Arancel: Actividad sin costo adicional';

    return [
      `AUTORIZACION DE SALIDA / CAMPAMENTO - ${groupName.toUpperCase()}`,
      `${district} - Scouts de Argentina Asociacion Civil`,
      '',
      `Rama(s): ${cleanUserText(fields.branches || 'Todas las ramas')}`,
      `Actividad: ${cleanUserText(fields.activityTitle || 'Salida Educativa')}`,
      `Lugar exacto: ${cleanUserText(fields.location || 'Predio a confirmar')}`,
      `Salida: ${formatDateAr(fields.startDate)} a las ${cleanUserText(fields.departureTime || '08:30 hs')}`,
      `Regreso: ${formatDateAr(fields.endDate)} a las ${cleanUserText(fields.returnTime || '18:00 hs')}`,
      `Punto de encuentro y retiro: ${cleanUserText(fields.meetingPoint || 'Sede del Grupo Scout')}`,
      feeLine,
      `Telefono de guardia durante la actividad: ${cleanUserText(fields.emergencyPhone || 'A completar por Jefatura')}`,
      '',
      'DECLARACION DE AUTORIZACION',
      'Quien suscribe, madre, padre o tutor legal, autorizo expresamente al/la beneficiario/a cuyos datos obran en su Ficha Medica vigente a participar de la actividad arriba detallada, bajo la conduccion de los educadores scouts habilitados del Grupo.',
      'Asimismo, dejo constancia de que la Ficha Medica entregada al Grupo se encuentra actualizada al dia de la fecha y autorizo la atencion medica de urgencia en caso de necesidad.',
      '',
      'Nombre y apellido del/la beneficiario/a: ________________________________________',
      'DNI del/la beneficiario/a: __________________________',
      'Nombre y apellido del adulto firmante: _______________________________________',
      'DNI del firmante: ________________________  Vinculo: ________________________',
      'Telefono de contacto de emergencia: __________________________________________',
      '',
      'Firma y aclaracion: _______________________________   Fecha: ____/____/______'
    ].join('\n');
  }

  if (docType === 'acta_consejo') {
    return [
      `LIBRO DE ACTAS - CONSEJO DE GRUPO`,
      `${groupName} (${district} - ${zone})`,
      '',
      `ACTA NRO.: ${cleanUserText(fields.minutesNumber || '15/2026')}`,
      `Fecha y hora: ${formatDateAr(fields.meetingDate)} - ${cleanUserText(fields.meetingTime || '19:30 hs')}`,
      `Lugar: ${cleanUserText(fields.meetingPlace || 'Sede del Grupo Scout')}`,
      '',
      'MIEMBROS PRESENTES',
      `${cleanUserText(fields.attendees || 'Jefe de Grupo, Subjefe de Grupo y Jefes de Rama', { allowNewlines: true })}`,
      '',
      'ORDEN DEL DIA',
      `${cleanUserText(fields.agenda || '1. Revision de afiliaciones y fichas medicas.\n2. Planificacion de proxima salida.\n3. Varios.', { allowNewlines: true, maxLength: 1000 })}`,
      '',
      'RESOLUCIONES Y ACUERDOS TOMADOS',
      `${cleanUserText(fields.resolutions || 'Se aprueba la realizacion de la actividad y se designa responsable para la presentacion de carpeta ante el Distrito.', { allowNewlines: true, maxLength: 1500 })}`,
      '',
      `Proxima reunion ordinaria de Consejo: ${fields.nextMeetingDate ? formatDateAr(fields.nextMeetingDate) : 'A confirmar'}`,
      '',
      'Sin mas temas que tratar, se da por finalizada la sesion.',
      '',
      'Firma Secretario/a de Consejo                    Firma Jefe/a de Grupo'
    ].join('\n');
  }

  // Comunicado para Familias (WhatsApp) - Cero emojis, negrita compatible *Texto* y guiones "- "
  return [
    `*${groupName.toUpperCase()}*`,
    `*Comunicado para Familias - ${cleanUserText(fields.branches || 'Todas las ramas')}*`,
    '',
    `Estimadas familias:`,
    `Compartimos la informacion organizativa para *${cleanUserText(fields.activityTitle || 'Proxima actividad scout')}*.`,
    '',
    `*Detalles principales:*`,
    `- *Fecha y horario:* Del ${formatDateAr(fields.startDate)} (${cleanUserText(fields.departureTime || '08:30 hs')}) al ${formatDateAr(fields.endDate)} (${cleanUserText(fields.returnTime || '18:00 hs')})`,
    `- *Lugar:* ${cleanUserText(fields.location || 'A confirmar')}`,
    `- *Punto de encuentro:* ${cleanUserText(fields.meetingPoint || 'Sede del Grupo')}`,
    '',
    `*Que deben llevar:*`,
    `${cleanUserText(fields.packingList || '- Uniforme completo y panuelo\n- Botella de agua personal\n- Abrigo e impermeable segun pronostico\n- Autorizacion firmada en mano', { allowNewlines: true, maxLength: 800 })}`,
    '',
    `*Confirmacion y documentacion:*`,
    `- Fecha limite para confirmar asistencia y entregar autorizacion: *${fields.confirmDeadline ? formatDateAr(fields.confirmDeadline) : 'Proximo sabado'}*.`,
    `- Recordamos verificar que la Ficha Medica se encuentre vigente.`,
    '',
    `Ante cualquier consulta pueden responder por los canales habituales del Grupo.`,
    '',
    `Siempre Listo,`,
    `*${cleanUserText(fields.signature || `Jefatura de Grupo - ${groupName}`)}*`
  ].join('\n');
}

export default function DocGenerator({
  groupProfile,
  camps,
  preloadedCamp,
  onClearPreloadedCamp
}) {
  const [docType, setDocType] = useState('pedido_acampe');
  const [mobileTab, setMobileTab] = useState('form'); // 'form' | 'preview'
  const [copied, setCopied] = useState(false);

  const [fields, setFields] = useState(() => ({
    groupName: groupProfile?.name || 'Grupo Scout Nro. 412 - San Martin',
    district: groupProfile?.district || 'Distrito 2',
    zone: groupProfile?.zone || 'Zona 14',
    districtChief: 'Jefe/a de Distrito',
    activityTitle: 'Acampe de Primavera',
    location: 'Campo Scout El Jaguel',
    startDate: getTodayIsoLocal(),
    endDate: getTodayIsoLocal(),
    branches: 'Manada, Unidad Scout',
    youthCount: 22,
    adultCount: 4,
    campLeader: 'Jefe/a de Campo Designado',
    departureTime: '08:30 hs',
    returnTime: '18:00 hs',
    meetingPoint: 'Sede del Grupo Scout',
    fee: '',
    emergencyPhone: '',
    minutesNumber: '15/2026',
    meetingDate: getTodayIsoLocal(),
    meetingTime: '19:30 hs',
    meetingPlace: 'Sede del Grupo Scout',
    attendees: 'Jefe de Grupo, Subjefe de Grupo, Jefes de Rama',
    agenda: '1. Estado de afiliaciones y fichas medicas.\n2. Evaluacion y aprobacion de salida.\n3. Varios.',
    resolutions: 'Se aprueba el proyecto educativo y la nomina de adultos responsables.',
    nextMeetingDate: '',
    packingList: '- Uniforme completo y panuelo\n- Botella de agua personal\n- Abrigo e impermeable\n- Autorizacion firmada',
    confirmDeadline: getTodayIsoLocal(),
    signature: `Jefatura de Grupo - ${groupProfile?.name || 'Grupo Scout'}`
  }));

  useEffect(() => {
    setFields((prev) => ({
      ...prev,
      groupName: groupProfile?.name || prev.groupName,
      district: groupProfile?.district || prev.district,
      zone: groupProfile?.zone || prev.zone
    }));
  }, [groupProfile]);

  function applyCampData(camp) {
    if (!camp) {
      return;
    }
    setFields((prev) => ({
      ...prev,
      activityTitle: camp.title || prev.activityTitle,
      location: camp.location || prev.location,
      startDate: camp.start_date || prev.startDate,
      endDate: camp.end_date || camp.start_date || prev.endDate,
      branches: describeBranches(camp),
      youthCount: camp.youth_count ?? prev.youthCount,
      adultCount: camp.adult_count ?? prev.adultCount,
      confirmDeadline: camp.district_submission_deadline || camp.start_date || prev.confirmDeadline
    }));
  }

  useEffect(() => {
    if (preloadedCamp) {
      setDocType('pedido_acampe');
      applyCampData(preloadedCamp);
      onClearPreloadedCamp?.();
    }
  }, [preloadedCamp, onClearPreloadedCamp]);

  const nextCamp = useMemo(() => (camps && camps.length > 0 ? camps[0] : null), [camps]);
  const generatedText = useMemo(() => buildDocumentText(docType, fields), [docType, fields]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(generatedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback silencioso
    }
  }

  function handleDownloadTxt() {
    const blob = new Blob([generatedText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${docType}-${getTodayIsoLocal()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function handleWebShare() {
    if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
      return;
    }
    try {
      await navigator.share({
        title: fields.activityTitle || 'Documento ConsejoScout',
        text: generatedText
      });
    } catch {
      // Usuario cancelo compartir
    }
  }

  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Generador de Notas y Actas
          </h1>
          <p className="text-sm text-slate-700">
            Documentos institucionales formales y comunicados listos para copiar y compartir.
          </p>
        </div>

        {nextCamp && (
          <button
            type="button"
            onClick={() => applyCampData(nextCamp)}
            className="h-11 px-4 rounded-lg border border-[#1B365D] bg-[#EBF2FA] text-[#1B365D] hover:bg-blue-100 text-sm font-semibold inline-flex items-center justify-center gap-2 shrink-0"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            <span>Cargar datos de proxima salida</span>
          </button>
        )}
      </div>

      {/* Selector de Tipo de Documento */}
      <div
        role="radiogroup"
        aria-label="Tipo de documento"
        className="grid grid-cols-2 lg:grid-cols-4 gap-2.5"
      >
        {DOC_TYPES.map((item) => {
          const Icon = item.icon;
          const selected = docType === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setDocType(item.id)}
              className={`min-h-[68px] p-3 rounded-xl text-left flex items-center gap-2.5 transition-colors ${
                selected
                  ? 'border-2 border-[#1B365D] bg-[#EBF2FA] text-[#1B365D]'
                  : 'border border-slate-300 bg-white text-slate-800 hover:border-[#1B365D]'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span className="text-sm font-semibold leading-tight">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Pestanas Mobile */}
      <div className="lg:hidden grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 border border-slate-300">
        <button
          type="button"
          onClick={() => setMobileTab('form')}
          className={`h-11 rounded-lg text-sm font-semibold transition-colors ${
            mobileTab === 'form' ? 'bg-[#1B365D] text-white' : 'text-slate-700'
          }`}
        >
          1. Completar datos
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('preview')}
          className={`h-11 rounded-lg text-sm font-semibold transition-colors ${
            mobileTab === 'preview' ? 'bg-[#1B365D] text-white' : 'text-slate-700'
          }`}
        >
          2. Vista previa y Copiar
        </button>
      </div>

      {/* Split View Desktop / Tabs Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Formulario */}
        <section
          aria-label="Campos del documento"
          className={`lg:col-span-5 bg-white border border-slate-300 rounded-xl p-4 md:p-5 shadow-sm space-y-3.5 ${
            mobileTab === 'form' ? 'block' : 'hidden lg:block'
          }`}
        >
          <h2 className="text-lg font-semibold text-slate-900">Datos del documento</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label htmlFor="doc-group-name" className="block text-sm font-medium text-slate-700 mb-1">
                Grupo Scout
              </label>
              <input
                id="doc-group-name"
                type="text"
                value={fields.groupName}
                onChange={(e) => setFields((p) => ({ ...p, groupName: e.target.value }))}
                className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
              />
            </div>

            {docType === 'pedido_acampe' && (
              <>
                <div>
                  <label htmlFor="doc-district" className="block text-sm font-medium text-slate-700 mb-1">
                    Distrito
                  </label>
                  <input
                    id="doc-district"
                    type="text"
                    value={fields.district}
                    onChange={(e) => setFields((p) => ({ ...p, district: e.target.value }))}
                    className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
                  />
                </div>
                <div>
                  <label htmlFor="doc-recipient" className="block text-sm font-medium text-slate-700 mb-1">
                    Destinatario
                  </label>
                  <input
                    id="doc-recipient"
                    type="text"
                    value={fields.districtChief}
                    onChange={(e) => setFields((p) => ({ ...p, districtChief: e.target.value }))}
                    className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
                  />
                </div>
              </>
            )}
          </div>

          {docType !== 'acta_consejo' && (
            <>
              <div>
                <label htmlFor="doc-activity" className="block text-sm font-medium text-slate-700 mb-1">
                  Nombre de la actividad / Asunto
                </label>
                <input
                  id="doc-activity"
                  type="text"
                  value={fields.activityTitle}
                  onChange={(e) => setFields((p) => ({ ...p, activityTitle: e.target.value }))}
                  className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
                />
              </div>

              <div>
                <label htmlFor="doc-branches" className="block text-sm font-medium text-slate-700 mb-1">
                  Rama(s) participante(s)
                </label>
                <input
                  id="doc-branches"
                  type="text"
                  value={fields.branches}
                  onChange={(e) => setFields((p) => ({ ...p, branches: e.target.value }))}
                  className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
                />
              </div>

              <div>
                <label htmlFor="doc-location" className="block text-sm font-medium text-slate-700 mb-1">
                  Lugar / Campo Scout
                </label>
                <input
                  id="doc-location"
                  type="text"
                  value={fields.location}
                  onChange={(e) => setFields((p) => ({ ...p, location: e.target.value }))}
                  className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="doc-start-date" className="block text-sm font-medium text-slate-700 mb-1">
                    Fecha de inicio
                  </label>
                  <input
                    id="doc-start-date"
                    type="date"
                    value={fields.startDate}
                    onChange={(e) => setFields((p) => ({ ...p, startDate: e.target.value }))}
                    className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
                  />
                </div>
                <div>
                  <label htmlFor="doc-end-date" className="block text-sm font-medium text-slate-700 mb-1">
                    Fecha de regreso
                  </label>
                  <input
                    id="doc-end-date"
                    type="date"
                    value={fields.endDate}
                    onChange={(e) => setFields((p) => ({ ...p, endDate: e.target.value }))}
                    className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
                  />
                </div>
              </div>
            </>
          )}

          {docType === 'pedido_acampe' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="doc-youth-count" className="block text-sm font-medium text-slate-700 mb-1">
                    Jovenes
                  </label>
                  <input
                    id="doc-youth-count"
                    type="number"
                    min={0}
                    value={fields.youthCount}
                    onChange={(e) => setFields((p) => ({ ...p, youthCount: e.target.value }))}
                    className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base font-mono text-slate-900 bg-white"
                  />
                </div>
                <div>
                  <label htmlFor="doc-adult-count" className="block text-sm font-medium text-slate-700 mb-1">
                    Adultos
                  </label>
                  <input
                    id="doc-adult-count"
                    type="number"
                    min={0}
                    value={fields.adultCount}
                    onChange={(e) => setFields((p) => ({ ...p, adultCount: e.target.value }))}
                    className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base font-mono text-slate-900 bg-white"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="doc-camp-leader" className="block text-sm font-medium text-slate-700 mb-1">
                  Responsable a cargo del campamento
                </label>
                <input
                  id="doc-camp-leader"
                  type="text"
                  value={fields.campLeader}
                  onChange={(e) => setFields((p) => ({ ...p, campLeader: e.target.value }))}
                  className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
                />
              </div>
            </>
          )}

          {(docType === 'autorizacion_salida' || docType === 'comunicado_familias') && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="doc-dep-time" className="block text-sm font-medium text-slate-700 mb-1">
                    Horario salida
                  </label>
                  <input
                    id="doc-dep-time"
                    type="text"
                    value={fields.departureTime}
                    onChange={(e) => setFields((p) => ({ ...p, departureTime: e.target.value }))}
                    className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
                  />
                </div>
                <div>
                  <label htmlFor="doc-ret-time" className="block text-sm font-medium text-slate-700 mb-1">
                    Horario regreso
                  </label>
                  <input
                    id="doc-ret-time"
                    type="text"
                    value={fields.returnTime}
                    onChange={(e) => setFields((p) => ({ ...p, returnTime: e.target.value }))}
                    className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="doc-meeting-point" className="block text-sm font-medium text-slate-700 mb-1">
                  Punto de encuentro
                </label>
                <input
                  id="doc-meeting-point"
                  type="text"
                  value={fields.meetingPoint}
                  onChange={(e) => setFields((p) => ({ ...p, meetingPoint: e.target.value }))}
                  className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
                />
              </div>
            </>
          )}

          {docType === 'autorizacion_salida' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="doc-fee" className="block text-sm font-medium text-slate-700 mb-1">
                  Valor / Arancel (opcional)
                </label>
                <input
                  id="doc-fee"
                  type="text"
                  value={fields.fee}
                  onChange={(e) => setFields((p) => ({ ...p, fee: e.target.value }))}
                  placeholder="Ej. $ 15.000"
                  className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
                />
              </div>
              <div>
                <label htmlFor="doc-phone" className="block text-sm font-medium text-slate-700 mb-1">
                  Telefono de guardia
                </label>
                <input
                  id="doc-phone"
                  type="tel"
                  value={fields.emergencyPhone}
                  onChange={(e) => setFields((p) => ({ ...p, emergencyPhone: e.target.value }))}
                  placeholder="11-XXXX-XXXX"
                  className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
                />
              </div>
            </div>
          )}

          {docType === 'comunicado_familias' && (
            <>
              <div>
                <label htmlFor="doc-packing" className="block text-sm font-medium text-slate-700 mb-1">
                  Que llevar (elementos basicos)
                </label>
                <textarea
                  id="doc-packing"
                  rows={3}
                  value={fields.packingList}
                  onChange={(e) => setFields((p) => ({ ...p, packingList: e.target.value }))}
                  className="w-full p-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="doc-confirm-date" className="block text-sm font-medium text-slate-700 mb-1">
                    Fecha limite confirmacion
                  </label>
                  <input
                    id="doc-confirm-date"
                    type="date"
                    value={fields.confirmDeadline}
                    onChange={(e) => setFields((p) => ({ ...p, confirmDeadline: e.target.value }))}
                    className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
                  />
                </div>
                <div>
                  <label htmlFor="doc-signature" className="block text-sm font-medium text-slate-700 mb-1">
                    Firma institucional
                  </label>
                  <input
                    id="doc-signature"
                    type="text"
                    value={fields.signature}
                    onChange={(e) => setFields((p) => ({ ...p, signature: e.target.value }))}
                    className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
                  />
                </div>
              </div>
            </>
          )}

          {docType === 'acta_consejo' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="doc-minutes-num" className="block text-sm font-medium text-slate-700 mb-1">
                    Nro. de Acta
                  </label>
                  <input
                    id="doc-minutes-num"
                    type="text"
                    value={fields.minutesNumber}
                    onChange={(e) => setFields((p) => ({ ...p, minutesNumber: e.target.value }))}
                    className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base font-mono text-slate-900 bg-white"
                  />
                </div>
                <div>
                  <label htmlFor="doc-minutes-date" className="block text-sm font-medium text-slate-700 mb-1">
                    Fecha
                  </label>
                  <input
                    id="doc-minutes-date"
                    type="date"
                    value={fields.meetingDate}
                    onChange={(e) => setFields((p) => ({ ...p, meetingDate: e.target.value }))}
                    className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
                  />
                </div>
                <div>
                  <label htmlFor="doc-minutes-time" className="block text-sm font-medium text-slate-700 mb-1">
                    Hora
                  </label>
                  <input
                    id="doc-minutes-time"
                    type="text"
                    value={fields.meetingTime}
                    onChange={(e) => setFields((p) => ({ ...p, meetingTime: e.target.value }))}
                    className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="doc-minutes-place" className="block text-sm font-medium text-slate-700 mb-1">
                  Lugar de reunion
                </label>
                <input
                  id="doc-minutes-place"
                  type="text"
                  value={fields.meetingPlace}
                  onChange={(e) => setFields((p) => ({ ...p, meetingPlace: e.target.value }))}
                  className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
                />
              </div>

              <div>
                <label htmlFor="doc-attendees" className="block text-sm font-medium text-slate-700 mb-1">
                  Miembros presentes
                </label>
                <textarea
                  id="doc-attendees"
                  rows={2}
                  value={fields.attendees}
                  onChange={(e) => setFields((p) => ({ ...p, attendees: e.target.value }))}
                  className="w-full p-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
                />
              </div>

              <div>
                <label htmlFor="doc-agenda" className="block text-sm font-medium text-slate-700 mb-1">
                  Orden del dia
                </label>
                <textarea
                  id="doc-agenda"
                  rows={3}
                  value={fields.agenda}
                  onChange={(e) => setFields((p) => ({ ...p, agenda: e.target.value }))}
                  className="w-full p-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
                />
              </div>

              <div>
                <label htmlFor="doc-resolutions" className="block text-sm font-medium text-slate-700 mb-1">
                  Resoluciones / Acuerdos tomados
                </label>
                <textarea
                  id="doc-resolutions"
                  rows={3}
                  value={fields.resolutions}
                  onChange={(e) => setFields((p) => ({ ...p, resolutions: e.target.value }))}
                  className="w-full p-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
                />
              </div>

              <div>
                <label htmlFor="doc-next-meeting" className="block text-sm font-medium text-slate-700 mb-1">
                  Proxima fecha de reunion
                </label>
                <input
                  id="doc-next-meeting"
                  type="date"
                  value={fields.nextMeetingDate}
                  onChange={(e) => setFields((p) => ({ ...p, nextMeetingDate: e.target.value }))}
                  className="w-full h-11 px-3 rounded-lg border border-slate-500 text-base text-slate-900 bg-white"
                />
              </div>
            </>
          )}
        </section>

        {/* Vista Previa y Barra de Accion */}
        <section
          aria-label="Vista previa del documento"
          className={`lg:col-span-7 space-y-3 ${
            mobileTab === 'preview' ? 'block' : 'hidden lg:block'
          }`}
        >
          <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-sm">
            <pre className="font-sans text-[15px] leading-relaxed text-slate-900 whitespace-pre-wrap break-words m-0">
              {generatedText}
            </pre>
          </div>

          <div className="sticky bottom-above-nav lg:bottom-4 bg-white border border-slate-300 rounded-xl p-3 shadow-lg flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleCopy()}
              aria-live="polite"
              className={`h-12 flex-1 px-4 rounded-lg font-semibold inline-flex items-center justify-center gap-2 transition-colors ${
                copied
                  ? 'bg-green-700 text-white'
                  : 'bg-[#1B365D] hover:bg-[#122643] text-white'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-5 h-5" aria-hidden="true" />
                  <span>Texto copiado al portapapeles</span>
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" aria-hidden="true" />
                  <span>Copiar texto</span>
                </>
              )}
            </button>

            {canShare && (
              <button
                type="button"
                onClick={() => void handleWebShare()}
                aria-label="Compartir documento"
                className="w-12 h-12 shrink-0 rounded-lg border border-slate-400 text-slate-900 hover:bg-slate-100 inline-flex items-center justify-center"
              >
                <Share2 className="w-5 h-5" aria-hidden="true" />
              </button>
            )}

            <button
              type="button"
              onClick={handleDownloadTxt}
              aria-label="Descargar texto"
              className="w-12 h-12 shrink-0 rounded-lg border border-slate-400 text-slate-900 hover:bg-slate-100 inline-flex items-center justify-center"
            >
              <Download className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
