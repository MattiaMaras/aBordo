import React from 'react';
import { Gauge, History, Wallet, Layers } from 'lucide-react';

const BENEFITS = [
  { icon: Gauge, title: 'Stato a colpo d\'occhio', text: 'Ogni scadenza è verde, gialla o rossa. Le più urgenti stanno sempre in cima, comprese quelle già scadute.' },
  { icon: Layers, title: 'Più veicoli, un solo posto', text: 'Aggiungi tutti i veicoli di casa: ognuno ha le sue scadenze e il suo storico.' },
  { icon: History, title: 'Storico che non perdi', text: 'Ultimi interventi in evidenza e tutto lo storico a un clic, con chilometri, officina e note.' },
  { icon: Wallet, title: 'Costi sotto controllo', text: 'Spese del mese e riepilogo per periodo, con export CSV quando ti serve.' },
];

export const BenefitsSection: React.FC = () => (
  <section className="py-20" id="vantaggi">
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-gray-900 mb-10 max-w-2xl">
        Pensata per essere usata in due minuti
      </h2>
      <div className="grid md:grid-cols-2 gap-5">
        {BENEFITS.map((b) => (
          <div key={b.title} className="flex gap-4 rounded-2xl border border-gray-200 bg-surface p-6">
            <div className="h-11 w-11 shrink-0 rounded-xl bg-blue-50 flex items-center justify-center">
              <b.icon className="h-5 w-5 text-blue-500" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{b.title}</h3>
              <p className="text-gray-600 leading-relaxed">{b.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);
