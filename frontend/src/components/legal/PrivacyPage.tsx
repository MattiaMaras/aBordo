import React from 'react';

export const PrivacyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
        <p className="text-gray-600 mb-4">
          Questa informativa spiega come A Bordo tratta i dati personali degli utenti.
        </p>
        <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-2">Dati raccolti</h2>
        <p className="text-gray-600">Email di registrazione e i dati necessari alla gestione dei veicoli e scadenze.</p>
        <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-2">Finalità</h2>
        <p className="text-gray-600">Erogazione del servizio, invio notifiche di promemoria, miglioramento dell’app.</p>
        <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-2">Conservazione</h2>
        <p className="text-gray-600">I dati sono conservati finché l’account rimane attivo o su richiesta di cancellazione.</p>
        <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-2">Contatti</h2>
        <p className="text-gray-600">Per richieste sulla privacy, contattaci via email dal form di contatto.</p>
      </main>
    </div>
  );
};

export default PrivacyPage;
