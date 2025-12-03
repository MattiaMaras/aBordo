import React from 'react';
import { Star, Quote } from 'lucide-react';

export const TestimonialsSection: React.FC = () => {
  const testimonials = [
    {
      name: 'Marco Bianchi',
      location: 'Milano',
      avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop&crop=face',
      rating: 5,
      text: 'Ho evitato una multa di €500 grazie alle notifiche! L\'app mi ha avvisato 15 giorni prima della scadenza della revisione. Fantastica!',
      highlight: 'Evitata multa di €500'
    },
    {
      name: 'Laura Rossi',
      location: 'Roma',
      avatar: 'https://images.pexels.com/photos/3763188/pexels-photo-3763188.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop&crop=face',
      rating: 5,
      text: 'Perfetto per gestire 3 auto di famiglia. Mio marito non dimentica più i tagliandi e io tengo sotto controllo le assicurazioni. Semplicissima da usare.',
      highlight: 'Gestisce 3 veicoli famiglia'
    },
    {
      name: 'Giuseppe Verdi',
      location: 'Napoli',
      avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop&crop=face',
      rating: 5,
      text: 'La mia officina ora ha tutto lo storico digitale. I clienti sono più soddisfatti e io lavoro meglio. Consiglio A Bordo a tutti i miei clienti.',
      highlight: 'Officina partner'
    },
    {
      name: 'Anna Ferrari',
      location: 'Torino',
      avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop&crop=face',
      rating: 5,
      text: 'Da quando uso A Bordo ho risparmiato oltre €800 in un anno. Le notifiche mi hanno fatto fare la manutenzione in tempo, evitando guasti costosi.',
      highlight: 'Risparmiati €800 in un anno'
    }
  ];

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Cosa dicono i nostri{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-green-600">
              10.000+ utenti
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Storie reali di automobilisti che hanno trasformato la gestione dei loro veicoli
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-gradient-to-br from-blue-50 to-green-50 rounded-xl p-8 relative hover:shadow-lg transition-shadow duration-300">
              <Quote className="absolute top-4 right-4 h-8 w-8 text-blue-200" />
              
              <div className="flex items-center mb-6">
                <img
                  src={testimonial.avatar}
                  alt={testimonial.name}
                  className="w-16 h-16 rounded-full object-cover mr-4"
                />
                <div>
                  <h4 className="font-semibold text-gray-900">{testimonial.name}</h4>
                  <p className="text-gray-600 text-sm">{testimonial.location}</p>
                  <div className="flex items-center mt-1">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                    ))}
                  </div>
                </div>
              </div>
              
              <blockquote className="text-gray-700 mb-4 leading-relaxed">
                "{testimonial.text}"
              </blockquote>
              
              <div className="inline-flex items-center bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                ✨ {testimonial.highlight}
              </div>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-3xl font-bold text-blue-600">10.000+</div>
            <div className="text-gray-600">Utenti attivi</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-green-600">€2.5M+</div>
            <div className="text-gray-600">Risparmiati in multe</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-purple-600">50.000+</div>
            <div className="text-gray-600">Notifiche inviate</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-orange-600">4.9/5</div>
            <div className="text-gray-600">Rating medio</div>
          </div>
        </div>
      </div>
    </section>
  );
};