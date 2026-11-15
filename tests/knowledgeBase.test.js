import { describe, expect, it } from 'vitest';
import {
  SAAC_FAQ_SUGGESTIONS,
  SAAC_LOCAL_KNOWLEDGE
} from '../src/data/saacLocalKnowledge.js';
import { searchNormativa } from '../src/services/knowledgeService.js';

const UNICODE_EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

describe('saacLocalKnowledge - integridad normativa offline', () => {
  it('contiene fragmentos normativos para ratios, plazos distritales, A Salvo del Peligro, ficha medica y Centros Scouts', () => {
    const ids = new Set(SAAC_LOCAL_KNOWLEDGE.map((entry) => entry.id));

    expect(ids.has('saac-ratios-ramas')).toBe(true);
    expect(ids.has('saac-plazos-distritales')).toBe(true);
    expect(ids.has('saac-a-salvo-del-peligro')).toBe(true);
    expect(ids.has('saac-ficha-medica-autorizaciones')).toBe(true);
    expect(ids.has('saac-centros-scouts')).toBe(true);
  });

  it('incluye citas obligatorias (docTitle y articleRef) y contenido no vacio en cada fragmento', () => {
    expect(SAAC_LOCAL_KNOWLEDGE.length).toBeGreaterThanOrEqual(5);

    for (const item of SAAC_LOCAL_KNOWLEDGE) {
      expect(typeof item.docTitle).toBe('string');
      expect(item.docTitle.trim().length).toBeGreaterThan(3);

      expect(typeof item.articleRef).toBe('string');
      expect(item.articleRef.trim().length).toBeGreaterThan(3);

      expect(typeof item.summary).toBe('string');
      expect(item.summary.trim().length).toBeGreaterThan(10);

      expect(Array.isArray(item.paragraphs)).toBe(true);
      expect(item.paragraphs.length).toBeGreaterThan(0);
    }
  });

  it('no contiene emojis en ningun fragmento ni en las sugerencias FAQ', () => {
    for (const item of SAAC_LOCAL_KNOWLEDGE) {
      const serialized = JSON.stringify(item);
      expect(UNICODE_EMOJI_REGEX.test(serialized)).toBe(false);
    }

    for (const faq of SAAC_FAQ_SUGGESTIONS) {
      const serialized = JSON.stringify(faq);
      expect(UNICODE_EMOJI_REGEX.test(serialized)).toBe(false);
    }
  });
});

describe('knowledgeService - searchNormativa offline', () => {
  it('recupera la normativa correcta con cita para consultas sobre los 5 ejes principales', async () => {
    const cases = [
      {
        query: 'Cuales son los ratios de adultos por rama en campamento?',
        expectedId: 'saac-ratios-ramas'
      },
      {
        query: 'Con cuantos dias de anticipacion se presenta la carpeta distrital?',
        expectedId: 'saac-plazos-distritales'
      },
      {
        query: 'Es obligatorio el curso A Salvo del Peligro para todos los adultos?',
        expectedId: 'saac-a-salvo-del-peligro'
      },
      {
        query: 'Requisitos de ficha medica y autorizacion de familias',
        expectedId: 'saac-ficha-medica-autorizaciones'
      },
      {
        query: 'Como reservar Centro Scout Necochea o Campo Scout El Jaguel',
        expectedId: 'saac-centros-scouts'
      }
    ];

    for (const { query, expectedId } of cases) {
      const result = await searchNormativa(query);
      expect(result.matchFound).toBe(true);
      expect(result.primary.id).toBe(expectedId);
      expect(result.primary.docTitle).toBeTruthy();
      expect(result.primary.articleRef).toBeTruthy();
      expect(UNICODE_EMOJI_REGEX.test(JSON.stringify(result))).toBe(false);
    }
  });

  it('retorna respuesta orientativa segura cuando no hay coincidencias', async () => {
    const fallback = await searchNormativa('termino_inexistente_xyz_999');

    expect(fallback.matchFound).toBe(false);
    expect(fallback.sourceType).toBe('local');
    expect(fallback.primary.docTitle).toBeTruthy();
    expect(fallback.primary.articleRef).toBeTruthy();
    expect(Array.isArray(fallback.related)).toBe(true);
    expect(fallback.related.length).toBeGreaterThan(0);
  });
});
