import { SAAC_LOCAL_KNOWLEDGE } from '../data/saacLocalKnowledge.js';
import { getCurrentSession, isSupabaseConfigured, supabase } from './supabaseClient.js';

function normalizeText(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeQuery(query) {
  const stopWords = new Set([
    'cual',
    'cuales',
    'como',
    'cuando',
    'cuanto',
    'cuanta',
    'quien',
    'quienes',
    'para',
    'con',
    'sin',
    'sobre',
    'los',
    'las',
    'del',
    'una',
    'uno',
    'que',
    'por',
    'son',
    'debe',
    'deben',
    'hay',
    'esta',
    'este'
  ]);

  return normalizeText(query)
    .split(' ')
    .filter((token) => token.length >= 2 && !stopWords.has(token));
}

function scoreLocalDocument(doc, tokens, normalizedQuery) {
  const titleNorm = normalizeText(doc.docTitle);
  const articleNorm = normalizeText(doc.articleRef);
  const summaryNorm = normalizeText(doc.summary);
  const bodyNorm = normalizeText([...(doc.paragraphs || []), ...(doc.bullets || [])].join(' '));
  const keywordsNorm = (doc.keywords || []).map(normalizeText);

  let score = 0;

  for (const kw of keywordsNorm) {
    if (normalizedQuery.includes(kw)) {
      score += 12;
    }
  }

  for (const token of tokens) {
    if (keywordsNorm.some((kw) => kw === token || kw.includes(token))) {
      score += 8;
    }
    if (titleNorm.includes(token) || articleNorm.includes(token)) {
      score += 5;
    }
    if (summaryNorm.includes(token)) {
      score += 4;
    }
    if (bodyNorm.includes(token)) {
      score += 2;
    }
  }

  return score;
}

async function queryRemoteKnowledgeBase(tokens) {
  if (!isSupabaseConfigured || !supabase || tokens.length === 0) {
    return { items: [], connected: false };
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { items: [], connected: false };
  }

  const session = await getCurrentSession();
  if (!session) {
    return { items: [], connected: false };
  }

  try {
    // Busqueda textual segura sobre saac_knowledge_base (RLS requiere usuario autenticado)
    const primaryTerm = tokens.slice(0, 3).join(' ');
    const { data, error } = await supabase
      .from('saac_knowledge_base')
      .select('id, doc_title, doc_category, article_ref, source_url, content')
      .or(`content.ilike.%${tokens[0]}%,doc_title.ilike.%${primaryTerm}%`)
      .limit(3);

    if (error || !Array.isArray(data)) {
      return { items: [], connected: true };
    }

    const mapped = data.map((row) => ({
      id: `remote-${row.id}`,
      docTitle: row.doc_title,
      docCategory: row.doc_category,
      articleRef: row.article_ref || 'Documento indexado SAAC',
      sourceUrl: row.source_url,
      summary: '',
      paragraphs: [row.content],
      bullets: [],
      sourceType: 'saac_knowledge_base',
      suggestedAction: null
    }));

    return { items: mapped, connected: true };
  } catch {
    return { items: [], connected: false };
  }
}

export async function isRemoteKnowledgeAvailable() {
  if (!isSupabaseConfigured || !supabase) {
    return false;
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false;
  }
  const session = await getCurrentSession();
  return Boolean(session);
}

/**
 * Consulta la normativa SAAC combinando `saac_knowledge_base` (si hay sesion online)
 * con la base local precargada para garantizar respuesta inmediata offline/online.
 */
export async function searchNormativa(query) {
  const normalizedQuery = normalizeText(query);
  const tokens = tokenizeQuery(query);

  const rankedLocal = SAAC_LOCAL_KNOWLEDGE.map((doc) => ({
    doc,
    score: scoreLocalDocument(doc, tokens, normalizedQuery)
  }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  const remoteResult = await queryRemoteKnowledgeBase(tokens);

  if (rankedLocal.length > 0) {
    const primary = rankedLocal[0].doc;
    const secondaryRemote = remoteResult.items[0];

    return {
      sourceType: secondaryRemote ? 'saac_knowledge_base' : 'local',
      remoteConnected: remoteResult.connected,
      matchFound: true,
      primary: {
        ...primary,
        sourceType: secondaryRemote ? 'saac_knowledge_base' : 'local'
      },
      related: rankedLocal.slice(1, 3).map((item) => item.doc),
      remoteExcerpt: secondaryRemote || null
    };
  }

  if (remoteResult.items.length > 0) {
    const firstRemote = remoteResult.items[0];
    return {
      sourceType: 'saac_knowledge_base',
      remoteConnected: true,
      matchFound: true,
      primary: firstRemote,
      related: [],
      remoteExcerpt: null
    };
  }

  // Fallback orientativo cuando no hay coincidencia directa de terminos
  return {
    sourceType: 'local',
    remoteConnected: remoteResult.connected,
    matchFound: false,
    primary: {
      id: 'fallback-normativa',
      docTitle: 'Indice Normativo Oficial SAAC',
      docCategory: 'otro',
      articleRef: 'Norma Operativa y Reglamento General - Consulta de referencia',
      sourceUrl: 'https://scouts.org.ar/biblioteca',
      summary:
        'No se encontro una coincidencia exacta para los terminos ingresados en la base normativa local.',
      paragraphs: [
        'Podes reformular tu consulta utilizando terminos clave como: ratios por rama, plazos de carpeta distrital, A Salvo del Peligro, ficha medica, Cruz del Sur, actas de Consejo o Centros Scouts.',
        'Tambien podes validar directamente los requisitos de una salida en el Planificador o consultar los documentos completos en la Biblioteca SAAC.'
      ],
      bullets: [],
      sourceType: 'local',
      suggestedAction: 'camp_planner'
    },
    related: SAAC_LOCAL_KNOWLEDGE.slice(0, 2),
    remoteExcerpt: null
  };
}
