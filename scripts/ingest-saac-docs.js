#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_BIBLIOTECA_URL = 'https://scouts.org.ar/biblioteca';
const TARGET_CHUNK_CHARS = 3400; // ~850 tokens (objetivo 800-1000 tokens)
const MAX_CHUNK_CHARS = 4000;
const OVERLAP_CHARS = 600; // ~150 tokens de overlap
const EMBEDDING_DIMENSIONS = 768;
const FETCH_TIMEOUT_MS = 20000;

const VALID_CATEGORIES = new Set([
  'norma_operativa',
  'reglamento',
  'proteccion_infantil',
  'acampe_seguridad',
  'educativo',
  'otro'
]);

const SAAC_SOURCE_MANIFEST = [
  {
    id: 'biblioteca-index',
    docTitle: 'Biblioteca Oficial SAAC - Indice Normativo',
    docCategory: 'otro',
    sourceUrl: DEFAULT_BIBLIOTECA_URL,
    versionYear: new Date().getUTCFullYear()
  },
  {
    id: 'norma-operativa',
    docTitle: 'Norma Operativa de Scouts de Argentina',
    docCategory: 'norma_operativa',
    sourceUrl: `${DEFAULT_BIBLIOTECA_URL}?categoria=norma-operativa`,
    versionYear: new Date().getUTCFullYear()
  },
  {
    id: 'reglamento-general',
    docTitle: 'Reglamento General SAAC',
    docCategory: 'reglamento',
    sourceUrl: `${DEFAULT_BIBLIOTECA_URL}?categoria=reglamento`,
    versionYear: new Date().getUTCFullYear()
  },
  {
    id: 'a-salvo-del-peligro',
    docTitle: 'Politica Nacional A Salvo del Peligro',
    docCategory: 'proteccion_infantil',
    sourceUrl: `${DEFAULT_BIBLIOTECA_URL}?categoria=a-salvo-del-peligro`,
    versionYear: new Date().getUTCFullYear()
  },
  {
    id: 'acampe-y-salidas',
    docTitle: 'Protocolo de Salidas, Acantonamientos y Campamentos SAAC',
    docCategory: 'acampe_seguridad',
    sourceUrl: `${DEFAULT_BIBLIOTECA_URL}?categoria=campamentos`,
    versionYear: new Date().getUTCFullYear()
  }
];

function parseCliArgs(argv) {
  const options = {
    source: 'all',
    category: null,
    inputDir: null,
    dryRun: false,
    limit: null,
    help: false
  };

  for (const arg of argv) {
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg.startsWith('--source=')) {
      options.source = arg.slice('--source='.length).trim() || 'all';
    } else if (arg.startsWith('--category=')) {
      options.category = arg.slice('--category='.length).trim() || null;
    } else if (arg.startsWith('--input-dir=')) {
      options.inputDir = arg.slice('--input-dir='.length).trim() || null;
    } else if (arg.startsWith('--limit=')) {
      const parsed = Number(arg.slice('--limit='.length));
      if (Number.isInteger(parsed) && parsed > 0) {
        options.limit = parsed;
      }
    }
  }

  return options;
}

function printHelp() {
  console.log(
    [
      'Uso: node scripts/ingest-saac-docs.js [opciones]',
      '',
      'Opciones:',
      '  --source=all|<id>        Fuente del manifiesto a procesar (por defecto: all)',
      '  --category=<categoria>   Filtra por doc_category (norma_operativa, reglamento, proteccion_infantil, acampe_seguridad, educativo, otro)',
      '  --input-dir=<ruta>       Directorio local con archivos .txt, .md, .html o .pdf',
      '  --dry-run                Genera chunks e imprime resumen sin escribir en Supabase',
      '  --limit=<n>              Limita la cantidad de chunks procesados',
      '  --help                   Muestra esta ayuda'
    ].join('\n')
  );
}

function decodeHtmlEntities(text) {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&aacute;/g, 'a')
    .replace(/&eacute;/g, 'e')
    .replace(/&iacute;/g, 'i')
    .replace(/&oacute;/g, 'o')
    .replace(/&uacute;/g, 'u')
    .replace(/&ntilde;/g, 'n')
    .replace(/&Aacute;/g, 'A')
    .replace(/&Eacute;/g, 'E')
    .replace(/&Iacute;/g, 'I')
    .replace(/&Oacute;/g, 'O')
    .replace(/&Uacute;/g, 'U')
    .replace(/&Ntilde;/g, 'N');
}

export function extractTextFromHtml(html) {
  if (typeof html !== 'string') {
    return '';
  }

  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<(header|footer|nav)[\s\S]*?<\/\1>/gi, ' ');

  const withLineBreaks = withoutScripts
    .replace(/<\/(p|div|li|h[1-6]|tr|section|article|br)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');

  return normalizeExtractedText(decodeHtmlEntities(withLineBreaks));
}

export function normalizeExtractedText(rawText) {
  if (typeof rawText !== 'string') {
    return '';
  }

  const lines = rawText
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  // Remueve lineas repetitivas tipicas de encabezados/pies de pagina (> 4 repeticiones).
  const lineCounts = new Map();
  for (const line of lines) {
    if (line.length <= 100) {
      lineCounts.set(line, (lineCounts.get(line) || 0) + 1);
    }
  }

  const filteredLines = lines.filter((line) => {
    if (/^(p[aá]gina|page)\s+\d+(\s+de\s+\d+)?$/i.test(line)) {
      return false;
    }
    const count = lineCounts.get(line) || 0;
    return count <= 4;
  });

  return filteredLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

async function extractTextFromPdfBuffer(buffer) {
  try {
    const pdfParseModule = await import('pdf-parse');
    const pdfParse = pdfParseModule.default || pdfParseModule;
    const parsed = await pdfParse(buffer);
    return {
      text: normalizeExtractedText(parsed?.text || ''),
      pageCount: parsed?.numpages || null
    };
  } catch (error) {
    console.warn(
      `[ingest] No se pudo parsear PDF (${error?.message || 'instalar dependencia pdf-parse si se ingieren PDFs binarios'}).`
    );
    return { text: '', pageCount: null };
  }
}

/**
 * Divide un texto normativo en bloques semanticos por Articulo / Capitulo
 * respetando un tamano objetivo de 800-1000 tokens con 150 tokens de overlap.
 */
export function chunkNormativeText(text, docTitle) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const markerRegex =
    /(?=^(?:Cap[ií]tulo|CAP[IÍ]TULO|Secci[oó]n|SECCI[OÓ]N|Art[ií]culo|ART[IÍ]CULO|Art\.)\s+[^\n]+)/gm;

  const rawSections = text
    .split(markerRegex)
    .map((s) => s.trim())
    .filter((s) => s.length >= 40);

  const sections = rawSections.length > 0 ? rawSections : [text.trim()];
  const chunks = [];

  for (const section of sections) {
    const firstLine = section.split('\n')[0].trim();
    const hasExplicitMarker =
      /^(?:Cap[ií]tulo|Secci[oó]n|Art[ií]culo|Art\.)\s+/i.test(firstLine);
    const articleRef = hasExplicitMarker
      ? firstLine.slice(0, 120)
      : `${docTitle} - Seccion`;

    if (section.length <= MAX_CHUNK_CHARS) {
      chunks.push({
        articleRef,
        content: section
      });
      continue;
    }

    let start = 0;
    while (start < section.length) {
      let end = Math.min(start + TARGET_CHUNK_CHARS, section.length);
      if (end < section.length) {
        const lastPeriod = section.lastIndexOf('.', end);
        const lastNewline = section.lastIndexOf('\n', end);
        const splitPoint = Math.max(lastPeriod, lastNewline);
        if (splitPoint > start + Math.floor(TARGET_CHUNK_CHARS * 0.5)) {
          end = splitPoint + 1;
        }
      }

      const slice = section.slice(start, end).trim();
      if (slice.length >= 40) {
        chunks.push({
          articleRef,
          content: slice
        });
      }

      if (end >= section.length) {
        break;
      }
      start = Math.max(0, end - OVERLAP_CHARS);
    }
  }

  return chunks.map((chunk, index) => {
    const contentHash = crypto
      .createHash('sha256')
      .update(`${docTitle}|${chunk.articleRef}|${chunk.content}`)
      .digest('hex');

    return {
      chunkIndex: index,
      articleRef: chunk.articleRef,
      content: chunk.content,
      contentHash
    };
  });
}

function inferCategoryFromFilename(fileName) {
  const lower = fileName.toLowerCase();
  if (lower.includes('norma')) return 'norma_operativa';
  if (lower.includes('reglamento')) return 'reglamento';
  if (lower.includes('peligro') || lower.includes('proteccion')) return 'proteccion_infantil';
  if (lower.includes('acampe') || lower.includes('campamento') || lower.includes('salida')) {
    return 'acampe_seguridad';
  }
  if (lower.includes('educativo') || lower.includes('programa')) return 'educativo';
  return 'otro';
}

async function loadLocalDocuments(inputDir, categoryFilter) {
  const resolvedDir = path.resolve(inputDir);
  const entries = await fs.readdir(resolvedDir, { withFileTypes: true });
  const docs = [];

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    if (!['.txt', '.md', '.html', '.htm', '.pdf'].includes(ext)) {
      continue;
    }

    const docCategory = categoryFilter || inferCategoryFromFilename(entry.name);
    const safeCategory = VALID_CATEGORIES.has(docCategory) ? docCategory : 'otro';
    const fullPath = path.join(resolvedDir, entry.name);
    const baseTitle = path.basename(entry.name, ext).replace(/[-_]+/g, ' ').trim();

    let text = '';
    let pageCount = null;
    if (ext === '.pdf') {
      const buffer = await fs.readFile(fullPath);
      const parsed = await extractTextFromPdfBuffer(buffer);
      text = parsed.text;
      pageCount = parsed.pageCount;
    } else {
      const raw = await fs.readFile(fullPath, 'utf8');
      text = ext === '.html' || ext === '.htm' ? extractTextFromHtml(raw) : normalizeExtractedText(raw);
    }

    if (text) {
      docs.push({
        docTitle: baseTitle || entry.name,
        docCategory: safeCategory,
        sourceUrl: `${DEFAULT_BIBLIOTECA_URL}#local:${encodeURIComponent(entry.name)}`,
        versionYear: new Date().getUTCFullYear(),
        pageRange: pageCount ? `1-${pageCount}` : null,
        text
      });
    }
  }

  return docs;
}

async function fetchRemoteDocument(source) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(source.sourceUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'ConsejoScout-Ingest-CLI/1.0 (+https://scouts.org.ar/biblioteca)'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} al descargar ${source.sourceUrl}`);
    }

    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    if (contentType.includes('application/pdf') || source.sourceUrl.toLowerCase().endsWith('.pdf')) {
      const arrayBuffer = await response.arrayBuffer();
      const parsed = await extractTextFromPdfBuffer(Buffer.from(arrayBuffer));
      return {
        docTitle: source.docTitle,
        docCategory: source.docCategory,
        sourceUrl: source.sourceUrl,
        versionYear: source.versionYear,
        pageRange: parsed.pageCount ? `1-${parsed.pageCount}` : null,
        text: parsed.text
      };
    }

    const html = await response.text();
    return {
      docTitle: source.docTitle,
      docCategory: source.docCategory,
      sourceUrl: source.sourceUrl,
      versionYear: source.versionYear,
      pageRange: null,
      text: extractTextFromHtml(html)
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateEmbeddingWithRetry(text, provider, apiKey, maxRetries = 3) {
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      if (provider === 'openai') {
        const res = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: text,
            dimensions: EMBEDDING_DIMENSIONS
          })
        });

        if (!res.ok) {
          const errBody = await res.text();
          throw new Error(`OpenAI HTTP ${res.status}: ${errBody.slice(0, 200)}`);
        }

        const json = await res.json();
        const vector = json?.data?.[0]?.embedding;
        if (!Array.isArray(vector) || vector.length !== EMBEDDING_DIMENSIONS) {
          throw new Error('Dimension de embedding invalida recibida desde OpenAI.');
        }
        return vector;
      }

      // Proveedor por defecto: Gemini text-embedding-004 (768 dimensiones)
      const endpoint =
        'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          model: 'models/text-embedding-004',
          content: { parts: [{ text }] }
        })
      });

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`Gemini HTTP ${res.status}: ${errBody.slice(0, 200)}`);
      }

      const json = await res.json();
      const vector = json?.embedding?.values;
      if (!Array.isArray(vector) || vector.length !== EMBEDDING_DIMENSIONS) {
        throw new Error('Dimension de embedding invalida recibida desde Gemini.');
      }
      return vector;
    } catch (error) {
      attempt += 1;
      if (attempt > maxRetries) {
        throw error;
      }
      const delayMs = 500 * Math.pow(2, attempt - 1);
      await sleep(delayMs);
    }
  }
}

async function main() {
  const options = parseCliArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  if (options.category && !VALID_CATEGORIES.has(options.category)) {
    console.error(
      `[ingest] Categoria invalida: ${options.category}. Valores permitidos: ${Array.from(VALID_CATEGORIES).join(', ')}`
    );
    process.exitCode = 1;
    return;
  }

  const fetchedAt = new Date().toISOString();
  const documents = [];

  if (options.inputDir) {
    const localDocs = await loadLocalDocuments(options.inputDir, options.category);
    documents.push(...localDocs);
  } else {
    const selectedSources = SAAC_SOURCE_MANIFEST.filter((s) => {
      if (options.source !== 'all' && s.id !== options.source) {
        return false;
      }
      if (options.category && s.docCategory !== options.category) {
        return false;
      }
      return true;
    });

    for (const source of selectedSources) {
      try {
        console.log(`[ingest] Descargando fuente: ${source.id} (${source.sourceUrl})`);
        const doc = await fetchRemoteDocument(source);
        if (doc.text) {
          documents.push(doc);
        }
      } catch (error) {
        console.warn(`[ingest] Error descargando ${source.id}: ${error?.message || error}`);
      }
    }
  }

  const allRecords = [];
  for (const doc of documents) {
    const chunks = chunkNormativeText(doc.text, doc.docTitle);
    for (const chunk of chunks) {
      allRecords.push({
        doc_title: doc.docTitle,
        doc_category: doc.docCategory,
        source_url: doc.sourceUrl,
        article_ref: chunk.articleRef,
        chunk_index: chunk.chunkIndex,
        content: chunk.content,
        content_hash: chunk.contentHash,
        metadata: {
          version_year: doc.versionYear,
          page_range: doc.pageRange,
          fetched_at: fetchedAt,
          char_count: chunk.content.length,
          approx_tokens: Math.ceil(chunk.content.length / 4)
        }
      });
    }
  }

  const recordsToProcess = options.limit ? allRecords.slice(0, options.limit) : allRecords;
  console.log(
    `[ingest] Documentos procesados: ${documents.length} | Chunks generados: ${recordsToProcess.length}`
  );

  const embeddingProvider = (process.env.EMBEDDING_PROVIDER || 'gemini').toLowerCase();
  const embeddingApiKey = process.env.EMBEDDING_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (options.dryRun || !embeddingApiKey) {
    if (!options.dryRun && !embeddingApiKey) {
      console.warn(
        '[ingest] EMBEDDING_API_KEY no configurada. Se ejecuta inspeccion en modo solo lectura (sin embeddings ni upsert).'
      );
    } else {
      console.log('[ingest] Modo --dry-run activo. Resumen de chunks:');
    }

    for (const sample of recordsToProcess.slice(0, 10)) {
      console.log(
        `  - [${sample.doc_category}] ${sample.doc_title} | ${sample.article_ref} | chunk=${sample.chunk_index} | chars=${sample.content.length} | hash=${sample.content_hash.slice(0, 12)}`
      );
    }
    return;
  }

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      '[ingest] Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY para ejecutar upsert en saac_knowledge_base.'
    );
    process.exitCode = 1;
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  let upsertedCount = 0;
  for (const record of recordsToProcess) {
    const embedding = await generateEmbeddingWithRetry(
      record.content,
      embeddingProvider,
      embeddingApiKey
    );

    const { error } = await supabase
      .from('saac_knowledge_base')
      .upsert(
        {
          ...record,
          embedding
        },
        { onConflict: 'content_hash' }
      );

    if (error) {
      throw new Error(`Error en upsert de chunk ${record.content_hash}: ${error.message}`);
    }

    upsertedCount += 1;
    await sleep(120); // Rate-limiting basico entre solicitudes
  }

  console.log(`[ingest] Ingesta completada. Chunks actualizados/insertados: ${upsertedCount}`);
}

const isDirectExecution =
  process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname;

if (isDirectExecution) {
  main().catch((error) => {
    console.error('[ingest] Error fatal:', error?.message || error);
    process.exitCode = 1;
  });
}
