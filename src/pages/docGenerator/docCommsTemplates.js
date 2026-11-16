import { cleanUserText, formatDateAr } from '../../utils/textSanitizer.js';

export function buildActaConsejoText(fields, groupName, district, zone) {
  return [
    'LIBRO DE ACTAS - CONSEJO DE GRUPO',
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

export function buildComunicadoFamiliasText(fields, groupName) {
  return [
    `*${groupName.toUpperCase()}*`,
    `*Comunicado para Familias - ${cleanUserText(fields.branches || 'Todas las ramas')}*`,
    '',
    'Estimadas familias:',
    `Compartimos la informacion organizativa para *${cleanUserText(fields.activityTitle || 'Proxima actividad scout')}*.`,
    '',
    '*Detalles principales:*',
    `- *Fecha y horario:* Del ${formatDateAr(fields.startDate)} (${cleanUserText(fields.departureTime || '08:30 hs')}) al ${formatDateAr(fields.endDate)} (${cleanUserText(fields.returnTime || '18:00 hs')})`,
    `- *Lugar:* ${cleanUserText(fields.location || 'A confirmar')}`,
    `- *Punto de encuentro:* ${cleanUserText(fields.meetingPoint || 'Sede del Grupo')}`,
    '',
    '*Que deben llevar:*',
    `${cleanUserText(fields.packingList || '- Uniforme completo y panuelo\n- Botella de agua personal\n- Abrigo e impermeable segun pronostico\n- Autorizacion firmada en mano', { allowNewlines: true, maxLength: 800 })}`,
    '',
    '*Confirmacion y documentacion:*',
    `- Fecha limite para confirmar asistencia y entregar autorizacion: *${fields.confirmDeadline ? formatDateAr(fields.confirmDeadline) : 'Proximo sabado'}*.`,
    '- Recordamos verificar que la Ficha Medica se encuentre vigente.',
    '',
    'Ante cualquier consulta pueden responder por los canales habituales del Grupo.',
    '',
    'Siempre Listo,',
    `*${cleanUserText(fields.signature || `Jefatura de Grupo - ${groupName}`)}*`
  ].join('\n');
}
