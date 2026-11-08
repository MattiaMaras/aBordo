import React from 'react';
import { ClipboardList, CalendarClock, BellRing, Gauge, History, Wallet } from 'lucide-react';

const STEPS = [
  { icon: ClipboardList, title: 'Inserisci l\'ultimo intervento', text: 'Revisione, tagliando, assicurazione, bollo, gomme, filtri: bastano le date che hai già.' },
  { icon: CalendarClock, title: 'Calcoliamo le scadenze', text: 'Da quei dati ricaviamo cosa scade e quando, anche in base ai chilometri.' },
  { icon: BellRing, title: 'Ti avvisiamo in tempo', text: 'Un\'email a 30 giorni, una a 7 e una il giorno della scadenza.' },
];

const EXTRAS = [
  { icon: Gauge, title: 'Stato a colpo d\'occhio', text: 'Ogni scadenza è verde, gialla o rossa.' },
  { icon: History, title: 'Storico completo', text: 'Tutti gli interventi con costi e chilometri.' },
  { icon: Wallet, title: 'Costi sotto controllo', text: 'Spese mensili e riepilogo per periodo, con export CSV.' },
];

export const FeaturesSection: React.FC = () => (
  <section className="py-20" id="come-funziona">
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-gray-900 text-center mb-12">
        Tre passi, poi ci pensiamo noi
      </h2>

      <ol className="grid md:grid-cols-3 gap-5">
        {STEPS.map((s, i) => (
          <li key={s.title} className="rounded-2xl border border-gray-200 bg-surface p-6 transition-transform duration-200 ease-out hover:-translate-y-0.5">
            <div className="flex items-center gap-3 mb-4">
              <span className="font-mono text-sm text-blue-500">0{i + 1}</span>
              <s.icon className="h-5 w-5 text-gray-500" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{s.title}</h3>
            <p className="text-gray-600 leading-relaxed">{s.text}</p>
          </li>
        ))}
      </ol>

      <ul className="mt-10 grid sm:grid-cols-3 gap-x-8 gap-y-6 border-t border-gray-200 pt-10">
        {EXTRAS.map((e) => (
          <li key={e.title} className="flex gap-3">
            <e.icon className="h-5 w-5 mt-0.5 shrink-0 text-blue-500" aria-hidden="true" />
            <div>
              <p className="font-medium text-gray-900">{e.title}</p>
              <p className="text-sm text-gray-600">{e.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  </section>
);
