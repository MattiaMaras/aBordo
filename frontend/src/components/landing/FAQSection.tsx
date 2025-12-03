import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: 'È davvero gratis?',
      answer: 'Sì! A Bordo è completamente gratuito per sempre. Puoi registrare veicoli illimitati e utilizzare tutte le funzionalità senza alcun costo. Non richiediamo nemmeno la carta di credito per iniziare.'
    },
    {
      question: 'Funziona per moto e furgoni?',
      answer: 'Assolutamente sì! A Bordo supporta tutti i tipi di veicoli: auto, moto, scooter, furgoni, camper e veicoli commerciali. Ogni tipo di veicolo ha le sue specifiche scadenze e manutenzioni.'
    },
    {
      question: 'Le notifiche sono personalizzabili?',
      answer: 'Completamente personalizzabili! Puoi scegliere quando ricevere le notifiche (30, 14, 7, 1 giorni prima), il canale (email, app, SMS) e per quali tipi di scadenze. Hai il controllo totale.'
    },
    {
      question: 'I miei dati sono al sicuro?',
      answer: 'La sicurezza è la nostra priorità. Utilizziamo crittografia SSL, siamo conformi al GDPR e i tuoi dati sono archiviati su server sicuri in Europa. Non condividiamo mai i tuoi dati con terze parti.'
    },
    {
      question: 'Posso cancellare in qualsiasi momento?',
      answer: 'Certo! Non ci sono contratti vincolanti. Puoi cancellare il tuo account in qualsiasi momento dalle impostazioni senza alcun costo o penale.'
    },
    
  ];

  return (
    <section className="py-16 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Domande Frequenti
          </h2>
          <p className="text-xl text-gray-600">
            Tutto quello che devi sapere su A Bordo
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="bg-gray-50 rounded-lg overflow-hidden">
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-100 transition-colors duration-200"
              >
                <span className="font-semibold text-gray-900">{faq.question}</span>
                {openIndex === index ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                )}
              </button>
              
              {openIndex === index && (
                <div className="px-6 pb-4">
                  <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-600 mb-4">
            Non trovi la risposta che cerchi?
          </p>
          <a 
            href="mailto:supporto@abordo.app" 
            className="text-blue-600 hover:text-blue-500 font-medium"
          >
            Contatta il nostro supporto →
          </a>
        </div>
      </div>
    </section>
  );
};