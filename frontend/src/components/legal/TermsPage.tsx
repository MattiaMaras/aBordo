import React from 'react';

export const TermsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Termini di Servizio</h1>
        <p className="text-gray-600 mb-4">
          Utilizzando A Bordo, accetti questi termini e condizioni.
        </p>
        <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-2">Uso del servizio</h2>
        <p className="text-gray-600">Non sono consentiti usi fraudolenti o che violino la legge.</p>
        <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-2">Limitazione di responsabilità</h2>
        <p className="text-gray-600">Il servizio è fornito "così com’è"; non garantiamo assenza di errori.</p>
        <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-2">Cancellazione</h2>
        <p className="text-gray-600">Puoi cancellare l’account in qualsiasi momento; i dati saranno rimossi.</p>
      </main>
    </div>
  );
};

export default TermsPage;
