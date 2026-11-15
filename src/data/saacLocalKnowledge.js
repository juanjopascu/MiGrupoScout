/**
 * Base normativa local precargada de Scouts de Argentina Asociacion Civil (SAAC).
 * Garantiza disponibilidad desde el minuto cero sin depender de conectividad.
 */

export const SAAC_FAQ_SUGGESTIONS = Object.freeze([
  Object.freeze({
    id: 'faq-ratios',
    icon: 'BookOpen',
    question: 'Cuales son los ratios de adultos por rama en campamento?'
  }),
  Object.freeze({
    id: 'faq-plazos',
    icon: 'CalendarClock',
    question: 'Con cuanta anticipacion se presenta la carpeta distrital?'
  }),
  Object.freeze({
    id: 'faq-sfh',
    icon: 'ShieldCheck',
    question: 'Quienes deben tener vigente el curso A Salvo del Peligro?'
  }),
  Object.freeze({
    id: 'faq-fichas',
    icon: 'FileCheck2',
    question: 'Que documentacion exige la ficha medica y autorizacion?'
  })
]);

export const SAAC_LOCAL_KNOWLEDGE = Object.freeze([
  Object.freeze({
    id: 'saac-ratios-ramas',
    docTitle: 'Normativa de Actividades al Aire Libre - SAAC',
    docCategory: 'acampe_seguridad',
    articleRef: 'Cap. IV - Ratios Adulto/Beneficiario y Minimo Operativo',
    sourceUrl: 'https://scouts.org.ar/biblioteca',
    keywords: [
      'ratio',
      'ratios',
      'adultos',
      'adulto',
      'jovenes',
      'beneficiarios',
      'manada',
      'unidad',
      'caminantes',
      'rovers',
      'campamento',
      'acantonamiento',
      'salida',
      'acompanantes',
      'educadores'
    ],
    summary: 'Relacion minima obligatoria de educadores y adultos responsables por rama en salidas y campamentos.',
    paragraphs: [
      'Toda salida, acantonamiento o campamento requiere un minimo operativo obligatorio de 2 adultos habilitados con afiliacion vigente en Cruz del Sur y certificacion A Salvo del Peligro al dia, sin importar que la proporcion matematica arroje 1 adulto.',
      'Ratios de referencia por rama segun la Norma Operativa:'
    ],
    bullets: [
      'Manada (7 a 11 anos): 1 adulto cada 6 beneficiarios (minimo 2 adultos).',
      'Unidad Scout (11 a 14 anos): 1 adulto cada 8 beneficiarios (minimo 2 adultos).',
      'Comunidad de Caminantes (14 a 17 anos): 1 adulto cada 10 beneficiarios (minimo 2 adultos).',
      'Comunidad Rover (17 a 21 anos): 1 adulto cada 12 beneficiarios (minimo 2 adultos).',
      'Salidas grupales o multirrama: se calcula el aporte proporcional de cada rama participante aplicando siempre el piso obligatorio de 2 adultos y contemplando acompanamiento acorde a la composicion mixta del contingente.'
    ],
    suggestedAction: 'camp_planner'
  }),
  Object.freeze({
    id: 'saac-plazos-distritales',
    docTitle: 'Norma Operativa de Scouts de Argentina',
    docCategory: 'norma_operativa',
    articleRef: 'Art. 42 - Plazos de Presentacion de Carpetas Distritales',
    sourceUrl: 'https://scouts.org.ar/biblioteca',
    keywords: [
      'plazo',
      'plazos',
      'anticipacion',
      'carpeta',
      'distrital',
      'distrito',
      'dias',
      'presentar',
      'presentacion',
      'habilitacion',
      'pedido',
      'acampe',
      'fuera de distrito',
      'vencimiento'
    ],
    summary: 'Plazos corridos minimos de presentacion de documentacion ante el Distrito segun el tipo de actividad.',
    paragraphs: [
      'La presentacion formal de la carpeta de campamento o salida ante la Jefatura de Distrito debe realizarse respetando la antelacion minima establecida para permitir la auditoria educativa, sanitaria y de seguridad:'
    ],
    bullets: [
      'Salida por el dia: 7 dias corridos previos a la fecha de inicio.',
      'Acantonamiento o campamento corto (hasta 3 noches): 15 dias corridos previos a la fecha de inicio.',
      'Campamento largo (mas de 3 noches): 30 dias corridos previos a la fecha de inicio.',
      'Actividad fuera de distrito o zona: 45 dias corridos previos a la fecha de inicio (requiere aval distrital y comunicacion zonal/nacional segun jurisdiccion).'
    ],
    suggestedAction: 'camp_planner'
  }),
  Object.freeze({
    id: 'saac-a-salvo-del-peligro',
    docTitle: 'Politica Nacional A Salvo del Peligro - SAAC',
    docCategory: 'proteccion_infantil',
    articleRef: 'Seccion III - Certificacion Obligatoria y Prevencion',
    sourceUrl: 'https://campus.scouts.org.ar',
    keywords: [
      'salvo',
      'peligro',
      'curso',
      'certificacion',
      'proteccion',
      'infantil',
      'campus',
      'adultos',
      'educadores',
      'colaboradores',
      'vigencia',
      'obligatorio'
    ],
    summary: 'Exigencia de certificacion vigente para el 100% de los adultos que participan en actividades con jovenes.',
    paragraphs: [
      'La Politica Nacional A Salvo del Peligro establece tolerancia cero frente a situaciones de riesgo o vulneracion de derechos de ninos, ninas, adolescentes y jovenes. Su acreditacion es condicion excluyente para habilitar cualquier salida o campamento.'
    ],
    bullets: [
      'El 100% de los educadores scouts, colaboradores y adultos acompanantes declarados en la nomina del campamento debe contar con el curso A Salvo del Peligro aprobado y vigente en Campus SAAC.',
      'La ausencia de certificacion vigente en al menos un adulto participante bloquea la autorizacion de la carpeta distrital hasta su regularizacion o reemplazo.',
      'En el Tablero de ConsejoScout los adultos sin vigencia actualizada figuran en estado critico para gestion preventiva del Jefe de Grupo.'
    ],
    suggestedAction: 'camp_planner'
  }),
  Object.freeze({
    id: 'saac-ficha-medica-autorizaciones',
    docTitle: 'Protocolo de Salidas, Acantonamientos y Campamentos SAAC',
    docCategory: 'acampe_seguridad',
    articleRef: 'Anexo II - Carpeta Sanitaria, Ficha Medica y Autorizaciones',
    sourceUrl: 'https://scouts.org.ar/biblioteca',
    keywords: [
      'ficha',
      'medica',
      'salud',
      'autorizacion',
      'autorizaciones',
      'padres',
      'familias',
      'tutor',
      'firma',
      'dni',
      'seguro',
      'cruz del sur',
      'vencimiento',
      'documentacion'
    ],
    summary: 'Requisitos documentales de salud, seguro institucional y autorizacion expresa de madres, padres o tutores.',
    paragraphs: [
      'Ningun beneficiario puede participar en actividades fuera del predio habitual del Grupo sin contar con su cobertura en Cruz del Sur activa, ficha medica vigente y autorizacion firmada por su representante legal.'
    ],
    bullets: [
      'Ficha Medica Individual: debe estar completa, firmada por profesional medico cuando corresponda y por madre/padre/tutor, con vigencia anual verificada antes de la salida.',
      'Alerta temprana recomendada: renovar fichas medicas dentro de los 30 dias previos al vencimiento para evitar bajas de ultimo momento en campamentos.',
      'Autorizacion de Salida o Campamento: documento especifico por actividad con destino, fecha y hora de salida/regreso, responsables a cargo y telefono de guardia.',
      'Carpeta Sanitaria de Campo: copias resguardadas por el responsable sanitario del acampe con registro de obra social, alergias, medicacion autorizada y plan de evacuacion al centro de salud mas cercano.'
    ],
    suggestedAction: 'doc_generator'
  }),
  Object.freeze({
    id: 'saac-cruz-del-sur-afiliaciones',
    docTitle: 'Reglamento General SAAC',
    docCategory: 'reglamento',
    articleRef: 'Tit. II - Registro Nacional, Afiliacion y Sistema Cruz del Sur',
    sourceUrl: 'https://cruzdelsur.scouts.org.ar',
    keywords: [
      'cruz del sur',
      'afiliacion',
      'afiliaciones',
      'nomina',
      'seguro',
      'alta',
      'baja',
      'inscripcion',
      'beneficiario',
      'educador',
      'pase',
      'arancel'
    ],
    summary: 'Reglas de registracion institucional y vigencia de cobertura del seguro de accidentes personales.',
    paragraphs: [
      'La condicion de miembro activo de Scouts de Argentina se acredita exclusivamente mediante la afiliacion vigente en el sistema oficial Cruz del Sur.'
    ],
    bullets: [
      'Solo los beneficiarios y educadores con estado Afiliado en Cruz del Sur cuentan con cobertura de seguro institucional para actividades semanales y campamentos.',
      'Las altas nuevas deben tramitarse antes de la primera salida fuera de la sede scout.',
      'Para salidas y campamentos se adjunta la nomina exportada desde Cruz del Sur junto al pedido formal.'
    ],
    suggestedAction: 'doc_generator'
  }),
  Object.freeze({
    id: 'saac-consejo-grupo-actas',
    docTitle: 'Reglamento General y Norma Operativa - Organos de Grupo',
    docCategory: 'reglamento',
    articleRef: 'Cap. Organos del Grupo Scout - Consejo de Grupo y Libro de Actas',
    sourceUrl: 'https://scouts.org.ar/biblioteca',
    keywords: [
      'consejo',
      'grupo',
      'acta',
      'actas',
      'reunion',
      'jefe de grupo',
      'secretario',
      'resolucion',
      'quorum',
      'comunicado',
      'nota',
      'pedido'
    ],
    summary: 'Funcionamiento del Consejo de Grupo, registro en Libro de Actas y aprobacion interna de salidas.',
    paragraphs: [
      'El Consejo de Grupo es el organo de conduccion operativa y educativa integrado por la Jefatura de Grupo y los Jefes de Rama. Sus resoluciones deben quedar asentadas cronologicamente en el Libro de Actas.'
    ],
    bullets: [
      'Toda salida o campamento debe ser aprobada previamente por el Consejo de Grupo antes de elevar la nota de Pedido de Acampe al Jefe de Distrito.',
      'Las actas deben indicar numero correlativo, fecha, miembros presentes, orden del dia, resoluciones adoptadas y responsables asignados.',
      'Podes generar el borrador formal de Acta de Consejo o Pedido de Acampe desde la seccion Actas y Notas.'
    ],
    suggestedAction: 'doc_generator'
  }),
  Object.freeze({
    id: 'saac-centros-scouts',
    docTitle: 'Guia de Campos y Centros Scouts Habilitados - SAAC',
    docCategory: 'acampe_seguridad',
    articleRef: 'Directorio Operativo de Predios Institucionales',
    sourceUrl: 'https://rumbosur.scouts.org.ar',
    keywords: [
      'centro scout',
      'necochea',
      'mar del plata',
      'el jaguel',
      'jaguel',
      'campo',
      'predio',
      'destino',
      'reserva',
      'habilitacion'
    ],
    summary: 'Consideraciones operativas para reservas en Centros Scouts Nacionales y campos habilitados.',
    paragraphs: [
      'Los Centros Scouts oficiales cuentan con infraestructura adaptada para el Programa de Jovenes, pero exigen reserva anticipada y verificacion de cupos de parcelas y sanitarios.'
    ],
    bullets: [
      'Centro Scout Necochea: predio costero en Parque Miguel Lillo; prever anclaje para vientos, abrigo nocturno y aviso de salida fuera de distrito si corresponde.',
      'Centro Scout Mar del Plata: apto para acantonamientos y campamentos cortos o largos; coordinar espacios cubiertos ante contingencias climaticas.',
      'Campo Scout El Jaguel: ideal para salidas por el dia y acampes cortos en AMBA; confirmar asignacion de parcela y nomina de ingreso con anticipacion.'
    ],
    suggestedAction: 'camp_planner'
  })
]);
