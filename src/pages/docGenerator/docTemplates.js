import {
  FileSignature,
  MessageSquareShare,
  ScrollText,
  Tent
} from 'lucide-react';
import { cleanUserText, formatDateAr, getTodayIsoLocal } from '../../utils/textSanitizer.js';
import { buildActaConsejoText, buildComunicadoFamiliasText } from './docCommsTemplates.js';

export const DOC_TYPES = Object.freeze([
  { id: 'pedido_acampe', label: 'Pedido de Acampe', icon: Tent },
  { id: 'autorizacion_salida', label: 'Autorizacion de Salida', icon: FileSignature },
  { id: 'acta_consejo', label: 'Acta de Consejo de Grupo', icon: ScrollText },
  { id: 'comunicado_familias', label: 'Comunicado para Familias', icon: MessageSquareShare }
]);

export function describeBranches(camp) {
  if (!camp?.branch_counts) {
    return camp?.branch_scope === 'grupal'
      ? 'Todas las ramas del Grupo'
      : camp?.branch_scope || 'Manada y Unidad';
  }
  const labels = [];
  if (camp.branch_counts.manada > 0) labels.push('Manada');
  if (camp.branch_counts.unidad > 0) labels.push('Unidad Scout');
  if (camp.branch_counts.caminantes > 0) labels.push('Caminantes');
  if (camp.branch_counts.rovers > 0) labels.push('Rovers');
  return labels.length > 0 ? labels.join(', ') : 'Grupo Scout completo';
}

export function createInitialDocFields(groupProfile) {
  return {
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
  };
}

export function buildDocumentText(docType, fields) {
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
    return buildActaConsejoText(fields, groupName, district, zone);
  }

  return buildComunicadoFamiliasText(fields, groupName);
}
