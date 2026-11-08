import React from 'react';
import { Mail } from 'lucide-react';

// Corrisponde agli stadi reali del job email: 30 giorni, 7 giorni, giorno della scadenza.
const STAGES = [
  { when: '30 giorni prima', label: 'In scadenza', dot: 'bg-yellow-500', text: 'text-yellow-700' },
  { when: '7 giorni prima', label: 'Urgente', dot: 'bg-orange-500', text: 'text-orange-700' },
  { when: 'Il giorno della scadenza', label: 'Ultimo avviso', dot: 'bg-red-500', text: 'text-red-700' },
];

export const AlertsSection: React.FC = () => (
  <section className="py-20" id="avvisi">
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">
      <div>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-gray-900 mb-4">
          Ti scriviamo prima che sia tardi
        </h2>
        <p className="text-lg text-gray-600 mb-8">
          Per ogni scadenza ricevi tre email, nei momenti in cui puoi ancora fare qualcosa.
        </p>
        <ol className="space-y-5">
          {STAGES.map((s) => (
            <li key={s.when} className="flex items-center gap-4">
              <span className={`h-3 w-3 shrink-0 rounded-full ${s.dot}`} aria-hidden="true" />
              <div>
                <p className="font-medium text-gray-900">{s.when}</p>
                <p className={`text-sm ${s.text}`}>{s.label}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-8 text-sm text-gray-500">Le email si disattivano in qualsiasi momento dalle impostazioni.</p>
      </div>

      {/* Anteprima dell'email reale (dati di esempio) */}
      <div className="rounded-2xl border border-gray-200 bg-surface shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 border-b border-gray-200 px-5 py-3">
          <Mail className="h-4 w-4 text-gray-500" aria-hidden="true" />
          <p className="text-sm text-gray-600">A Bordo · Scadenza imminente</p>
        </div>
        <div className="p-6">
          <p className="text-gray-900 font-medium mb-1">Ciao Ale,</p>
          <p className="text-sm text-gray-600 mb-5">sta per scadere un'importante scadenza per il tuo veicolo.</p>
          <dl className="rounded-xl border border-gray-200 bg-gray-50 divide-y divide-gray-200 text-sm">
            {[['Veicolo', 'Fiat Panda · QA123TS'], ['Scadenza', 'Assicurazione'], ['Data', '14/11/2026'], ['Giorni rimanenti', '7']].map(([k, v]) => (
              <div key={k} className="flex justify-between px-4 py-2.5">
                <dt className="text-gray-500">{k}</dt>
                <dd className="font-medium text-gray-900">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-5 inline-block rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium" style={{ color: '#0A0C10' }}>Vai alla dashboard</div>
        </div>
      </div>
    </div>
  </section>
);
