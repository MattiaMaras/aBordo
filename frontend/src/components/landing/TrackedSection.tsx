import React from 'react';
import { ShieldCheck, FileCheck2, ClipboardCheck, Wrench, CircleDot, Wind, Droplets, Fuel } from 'lucide-react';

// Le scadenze che l'app gestisce davvero (stesse del wizard di inserimento veicolo).
const ITEMS = [
  { icon: ShieldCheck, title: 'Assicurazione', hint: 'Scadenza polizza' },
  { icon: FileCheck2, title: 'Bollo auto', hint: 'Per regione' },
  { icon: ClipboardCheck, title: 'Revisione', hint: 'Prossima calcolata +2 anni' },
  { icon: Wrench, title: 'Tagliando', hint: 'A data e a chilometri' },
  { icon: CircleDot, title: 'Gomme', hint: 'Cambio e inversione' },
  { icon: Wind, title: 'Filtri', hint: 'Aria e abitacolo' },
  { icon: Droplets, title: 'AdBlue', hint: 'Stima a chilometri (diesel)' },
  { icon: Fuel, title: 'Olio, freni, cinghia', hint: 'Facoltativi' },
];

export const TrackedSection: React.FC = () => (
  <section className="py-20" id="cosa-monitoriamo">
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mb-10">
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-gray-900 mb-3">
          Tutto ciò che scade, in un solo posto
        </h2>
        <p className="text-lg text-gray-600">
          Le scadenze che le persone dimenticano più spesso, già pronte quando aggiungi il veicolo.
        </p>
      </div>
      <ul className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {ITEMS.map((it) => (
          <li key={it.title} className="rounded-2xl border border-gray-200 bg-surface p-5 transition-[transform,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-blue-300">
            <it.icon className="h-6 w-6 text-blue-500 mb-4" aria-hidden="true" />
            <p className="font-medium text-gray-900">{it.title}</p>
            <p className="text-sm text-gray-500 mt-0.5">{it.hint}</p>
          </li>
        ))}
      </ul>
    </div>
  </section>
);
