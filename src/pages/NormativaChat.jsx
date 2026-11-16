import { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  CalendarClock,
  Check,
  Cloud,
  Copy,
  Database,
  FileCheck2,
  FileText,
  HardDrive,
  HelpCircle,
  Loader2,
  RotateCcw,
  Send,
  ShieldCheck,
  Tent
} from 'lucide-react';
import { SAAC_FAQ_SUGGESTIONS } from '../data/saacLocalKnowledge.js';
import { isRemoteKnowledgeAvailable, searchNormativa } from '../services/knowledgeService.js';
import { cleanUserText } from '../utils/textSanitizer.js';

const FAQ_ICON_MAP = {
  BookOpen,
  CalendarClock,
  ShieldCheck,
  FileCheck2
};

export default function NormativaChat({
  isOnline,
  onNavigateToCampPlanner,
  onNavigateToDocGenerator
}) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [remoteAvailable, setRemoteAvailable] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [showSuggestionsBar, setShowSuggestionsBar] = useState(false);

  const threadEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function checkRemote() {
      const available = await isRemoteKnowledgeAvailable();
      if (!cancelled) {
        setRemoteAvailable(available);
      }
    }
    void checkRemote();
    return () => {
      cancelled = true;
    };
  }, [isOnline]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages, isSearching]);

  async function submitQuestion(rawQuestion) {
    const cleanedQuestion = cleanUserText(rawQuestion, { maxLength: 400 });
    if (!cleanedQuestion || isSearching) {
      return;
    }

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: cleanedQuestion
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setShowSuggestionsBar(false);
    setIsSearching(true);

    try {
      const result = await searchNormativa(cleanedQuestion);
      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        result
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setIsSearching(false);
    }
  }

  function handleFormSubmit(event) {
    event.preventDefault();
    void submitQuestion(inputText);
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submitQuestion(inputText);
    }
  }

  async function handleCopyCitation(msgId, doc) {
    const citationText = `${doc.docTitle} — ${doc.articleRef} (${doc.sourceUrl || 'Biblioteca SAAC'})`;
    try {
      await navigator.clipboard.writeText(citationText);
      setCopiedId(msgId);
      setTimeout(() => {
        setCopiedId((current) => (current === msgId ? null : current));
      }, 2500);
    } catch {
      // Silencioso si el navegador restringe portapapeles sin foco
    }
  }

  function handleReset() {
    setMessages([]);
    setShowSuggestionsBar(false);
    setInputText('');
    inputRef.current?.focus();
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-56px-64px-env(safe-area-inset-top)-env(safe-area-inset-bottom))] md:h-dvh max-w-5xl mx-auto bg-slate-50">
      {/* Cabecera de Estado de Conocimiento */}
      <header className="shrink-0 px-4 py-3 border-b border-slate-300 bg-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {remoteAvailable && isOnline ? (
            <>
              <Cloud className="w-4 h-4 text-[var(--brand-primary)] shrink-0" aria-hidden="true" />
              <Database className="w-4 h-4 text-green-700 shrink-0" aria-hidden="true" />
              <span className="text-xs sm:text-sm font-medium text-slate-800 truncate">
                Conectado a saac_knowledge_base + Base local offline
              </span>
            </>
          ) : (
            <>
              <HardDrive className="w-4 h-4 text-[var(--brand-primary)] shrink-0" aria-hidden="true" />
              <span className="text-xs sm:text-sm font-medium text-slate-800 truncate">
                Modo Offline: respondiendo desde base normativa local precargada
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => setShowSuggestionsBar((prev) => !prev)}
              aria-label="Mostrar sugerencias frecuentes"
              className="min-w-[44px] min-h-[44px] px-2.5 inline-flex items-center justify-center gap-1.5 rounded-lg text-xs font-semibold text-[var(--brand-primary)] hover:bg-slate-200"
            >
              <HelpCircle className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Sugerencias</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleReset}
            aria-label="Nueva consulta"
            title="Nueva consulta"
            className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg text-slate-700 hover:bg-slate-200"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Panel desplegable de sugerencias cuando ya hay hilo */}
      {showSuggestionsBar && messages.length > 0 && (
        <div className="shrink-0 p-3 bg-white border-b border-slate-200 flex gap-2 overflow-x-auto no-scrollbar">
          {SAAC_FAQ_SUGGESTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => void submitQuestion(item.question)}
              className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50 hover:border-[var(--brand-primary)] text-xs font-medium text-slate-800 whitespace-nowrap shrink-0"
            >
              {item.question}
            </button>
          ))}
        </div>
      )}

      {/* Hilo de Conversacion */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="max-w-2xl mx-auto py-4 space-y-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Consulta normativa oficial SAAC
              </h1>
              <p className="text-sm text-slate-700">
                Respuestas verificables con cita de documento y articulo, disponibles incluso sin senal en campo.
              </p>
            </div>

            <div className="space-y-2.5">
              {SAAC_FAQ_SUGGESTIONS.map((faq) => {
                const Icon = FAQ_ICON_MAP[faq.icon] || BookOpen;
                return (
                  <button
                    key={faq.id}
                    type="button"
                    onClick={() => void submitQuestion(faq.question)}
                    className="w-full min-h-[48px] px-4 py-3 text-left rounded-xl border border-slate-300 bg-white hover:border-[var(--brand-primary)] hover:bg-[var(--brand-primary-soft)] flex items-center gap-3 transition-colors"
                  >
                    <span className="w-9 h-9 rounded-lg bg-[var(--brand-primary-soft)] text-[var(--brand-primary)] inline-flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" aria-hidden="true" />
                    </span>
                    <span className="text-sm font-medium text-slate-900">
                      {faq.question}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {messages.map((msg) => {
          if (msg.role === 'user') {
            return (
              <div key={msg.id} className="flex justify-end">
                <div className="max-w-[85%] bg-[var(--brand-primary)] text-white rounded-2xl rounded-br-sm px-4 py-3 text-base leading-6">
                  {msg.text}
                </div>
              </div>
            );
          }

          const doc = msg.result?.primary;
          const isCopied = copiedId === msg.id;

          return (
            <div key={msg.id} className="flex justify-start">
              <article className="max-w-[92%] md:max-w-[78%] bg-white border border-slate-300 rounded-2xl rounded-bl-sm p-4 shadow-sm space-y-3">
                {doc?.summary ? (
                  <p className="text-sm font-semibold text-slate-900">{doc.summary}</p>
                ) : null}

                {doc?.paragraphs?.map((paragraph, idx) => (
                  <p key={idx} className="text-base leading-6 text-slate-800">
                    {paragraph}
                  </p>
                ))}

                {doc?.bullets?.length > 0 && (
                  <ul className="list-disc pl-5 space-y-1.5 text-sm leading-6 text-slate-800">
                    {doc.bullets.map((bullet, idx) => (
                      <li key={idx}>{bullet}</li>
                    ))}
                  </ul>
                )}

                {msg.result?.remoteExcerpt && (
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-slate-800 space-y-1">
                    <p className="font-semibold text-blue-900">
                      Extracto complementario en saac_knowledge_base:
                    </p>
                    <p>{msg.result.remoteExcerpt.paragraphs?.[0]}</p>
                  </div>
                )}

                {/* Tarjeta Obligatoria de Cita Normativa */}
                {doc && (
                  <div className="bg-slate-100 border-l-4 border-[var(--brand-primary)] rounded-r-lg p-3 mt-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <FileText className="w-4 h-4 text-[var(--brand-primary)] shrink-0 mt-0.5" aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">
                          {doc.docTitle}
                        </p>
                        <p className="font-mono text-xs text-slate-700 mt-0.5 break-words">
                          {doc.articleRef} | Origen:{' '}
                          {doc.sourceType === 'saac_knowledge_base'
                            ? 'saac_knowledge_base'
                            : 'Local'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => void handleCopyCitation(msg.id, doc)}
                        aria-live="polite"
                        className={`min-h-[44px] px-3 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                          isCopied
                            ? 'bg-green-700 border-green-700 text-white'
                            : 'bg-white border-slate-300 text-slate-800 hover:border-[var(--brand-primary)]'
                        }`}
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Cita copiada</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Copiar cita</span>
                          </>
                        )}
                      </button>

                      {doc.suggestedAction === 'camp_planner' && (
                        <button
                          type="button"
                          onClick={onNavigateToCampPlanner}
                          className="min-h-[44px] px-3 rounded-lg border border-[var(--brand-primary)] bg-[var(--brand-primary-soft)] text-[var(--brand-primary)] text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-blue-100"
                        >
                          <Tent className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Validar en Planificador</span>
                        </button>
                      )}

                      {doc.suggestedAction === 'doc_generator' && (
                        <button
                          type="button"
                          onClick={onNavigateToDocGenerator}
                          className="min-h-[44px] px-3 rounded-lg border border-[var(--brand-primary)] bg-[var(--brand-primary-soft)] text-[var(--brand-primary)] text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-blue-100"
                        >
                          <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Redactar Nota</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </article>
            </div>
          );
        })}

        {isSearching && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-300 rounded-2xl rounded-bl-sm px-4 py-3 inline-flex items-center gap-2.5 text-sm text-slate-700">
              <Loader2 className="w-4 h-4 animate-spin text-[var(--brand-primary)]" aria-hidden="true" />
              <span>Consultando normativa SAAC...</span>
            </div>
          </div>
        )}

        <div ref={threadEndRef} />
      </div>

      {/* Barra de Entrada Fija */}
      <form
        onSubmit={handleFormSubmit}
        className="shrink-0 bg-white border-t border-slate-300 p-3"
      >
        <div className="flex items-end gap-2">
          <label htmlFor="normativa-query-input" className="sr-only">
            Consulta sobre normativa SAAC
          </label>
          <textarea
            ref={inputRef}
            id="normativa-query-input"
            rows={1}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pregunta sobre ratios, acampes, habilitaciones..."
            className="flex-1 min-h-[44px] max-h-32 px-3 py-2.5 rounded-lg border border-slate-500 text-base text-slate-900 bg-white resize-y"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isSearching}
            aria-label="Enviar consulta"
            className="w-12 h-12 shrink-0 rounded-lg bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white inline-flex items-center justify-center transition-colors disabled:opacity-50"
          >
            <Send className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      </form>
    </div>
  );
}
