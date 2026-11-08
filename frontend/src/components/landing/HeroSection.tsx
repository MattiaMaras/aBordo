import React from 'react';
import { ArrowRight, BellRing, Check } from 'lucide-react';
import { Button } from '../common/Button';

interface HeroSectionProps {
  onGetStarted: () => void;
}

type Tone = 'red' | 'amber' | 'green';

// Dati dimostrativi della finestra di prodotto (esempio, non dati reali di utenti)
const DEMO_ROWS: { label: string; detail: string; value: string; tone: Tone }[] = [
  { label: 'Assicurazione', detail: 'Allianz · scade 14 nov', value: '6 giorni', tone: 'red' },
  { label: 'Gomme', detail: 'Cambio stagionale', value: '19 giorni', tone: 'amber' },
  { label: 'Tagliando', detail: 'Prossimo a 62.000 km', value: '2.340 km', tone: 'green' },
  { label: 'Revisione', detail: 'Scade a maggio 2027', value: '188 giorni', tone: 'green' },
];

const toneDot: Record<Tone, string> = {
  red: 'bg-red-500 shadow-[0_0_0_4px_rgba(255,92,77,0.18)]',
  amber: 'bg-yellow-500 shadow-[0_0_0_4px_rgba(255,194,51,0.16)]',
  green: 'bg-green-500 shadow-[0_0_0_4px_rgba(52,211,153,0.14)]',
};
const toneText: Record<Tone, string> = { red: 'text-red-700', amber: 'text-yellow-700', green: 'text-green-700' };

export const HeroSection: React.FC<HeroSectionProps> = ({ onGetStarted }) => {
  return (
    <section className="relative pt-16 pb-20 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-14 items-center">
          <div className="text-center lg:text-left">
            <p className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-surface px-3.5 py-1.5 text-sm text-gray-600 mb-7">
              <BellRing className="h-4 w-4 text-blue-500" aria-hidden="true" />
              Avvisi via email prima di ogni scadenza
            </p>

            <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-semibold tracking-tight text-gray-900 leading-[1.05] mb-6">
              Revisione, bollo, assicurazione e tagliando.{' '}
              <span className="text-blue-500">Mai più una scadenza persa.</span>
            </h1>

            <p className="text-lg text-gray-600 mb-9 leading-relaxed max-w-xl mx-auto lg:mx-0">
              Inserisci l'ultimo intervento fatto: A Bordo calcola le prossime scadenze del tuo veicolo
              e ti scrive in tempo, quando serve davvero.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-9 justify-center lg:justify-start">
              <Button size="lg" onClick={onGetStarted} className="text-base px-7 py-3.5 shadow-[0_8px_30px_-8px_rgba(190,242,60,0.55)]">
                Inizia gratis
                <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
              </Button>
            </div>

            <ul className="flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2 text-sm text-gray-500">
              {['Gratis', 'Nessuna carta richiesta', 'Pronto in 2 minuti'].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-blue-500" aria-hidden="true" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Finestra di prodotto: l'interfaccia vera, non un'illustrazione */}
          <div className="relative">
            <div className="absolute -inset-6 rounded-[2rem] bg-blue-500/10 blur-3xl" aria-hidden="true" />
            <div className="relative rounded-2xl border border-gray-200 bg-surface shadow-2xl overflow-hidden transition-transform duration-200 ease-out hover:-translate-y-0.5">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200">
                <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
                <span className="ml-3 text-xs text-gray-500">abordo · Fiat Panda</span>
              </div>

              <div className="p-5">
                <div className="flex items-end justify-between mb-5">
                  <div>
                    <p className="text-lg font-semibold text-gray-900">Fiat Panda</p>
                    <p className="font-mono text-sm text-gray-500 tracking-wider">QA123TS</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-2xl font-medium text-gray-900 tabular-nums">59.660</p>
                    <p className="text-xs text-gray-500">km attuali</p>
                  </div>
                </div>

                <ul className="divide-y divide-gray-200 rounded-xl border border-gray-200 bg-gray-50">
                  {DEMO_ROWS.map((r) => (
                    <li key={r.label} className="flex items-center gap-3 px-4 py-3">
                      <span className={`h-2 w-2 rounded-full shrink-0 ${toneDot[r.tone]}`} aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">{r.label}</p>
                        <p className="text-xs text-gray-500 truncate">{r.detail}</p>
                      </div>
                      <span className={`font-mono text-sm tabular-nums ${toneText[r.tone]}`}>{r.value}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
                  <BellRing className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Email inviata: l'assicurazione scade tra 6 giorni.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
