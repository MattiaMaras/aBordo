import React from 'react';

// Solo risposte verificabili sul comportamento reale dell'app.
const FAQS = [
  { q: 'È gratis?', a: 'Sì, al momento l\'uso di A Bordo è gratuito e non serve una carta per registrarsi.' },
  { q: 'Quando ricevo gli avvisi?', a: 'Via email: una volta a 30 giorni dalla scadenza, una a 7 giorni e una il giorno stesso. Puoi disattivare le email dalle impostazioni.' },
  { q: 'Cosa devo inserire all\'inizio?', a: 'L\'ultimo dato noto di revisione, tagliando, assicurazione, bollo, gomme e filtri. Servono per calcolare le scadenze fin dal primo giorno.' },
  { q: 'Posso cancellare i miei dati?', a: 'Sì: eliminando un veicolo ne cancelli anche scadenze e storico. Per chiudere l\'account scrivici.' },
];

export const FAQSection: React.FC = () => (
  <section className="py-16" id="faq">
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
      <h2 className="text-3xl font-semibold tracking-tight text-gray-900 text-center mb-10">Domande frequenti</h2>
      <div className="divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-surface">
        {FAQS.map((f, i) => (
          <details key={f.q} className="group px-6 py-4" open={i === 0}>
            <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-gray-900">
              {f.q}
              <span className="ml-4 text-blue-500 transition-transform duration-200 ease-out group-open:rotate-45" aria-hidden="true">+</span>
            </summary>
            <p className="mt-3 text-gray-600 leading-relaxed">{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  </section>
);
