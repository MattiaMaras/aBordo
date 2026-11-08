import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '../common/Button';

interface CTASectionProps {
  onGetStarted: () => void;
}

export const CTASection: React.FC<CTASectionProps> = ({ onGetStarted }) => {
  return (
    <section className="py-24">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-surface px-6 py-16 sm:px-12 text-center">
          <div className="absolute inset-x-0 -top-24 h-48 bg-blue-500/10 blur-3xl" aria-hidden="true" />
          <h2 className="relative text-3xl sm:text-4xl font-semibold tracking-tight text-gray-900 mb-4">
            Metti in regola il tuo veicolo <span className="text-blue-500">in 2 minuti</span>
          </h2>
          <p className="relative text-lg text-gray-600 max-w-xl mx-auto mb-9">
            Inserisci targa e ultimi interventi. Alle scadenze pensiamo noi, con un'email prima che sia tardi.
          </p>
          <Button size="lg" onClick={onGetStarted} className="relative text-base px-7 py-3.5 shadow-[0_8px_30px_-8px_rgba(190,242,60,0.55)]">
            Crea il tuo account
            <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
          </Button>
          <p className="relative mt-5 text-sm text-gray-500">Gratis · nessuna carta richiesta</p>
        </div>
      </div>
    </section>
  );
};
