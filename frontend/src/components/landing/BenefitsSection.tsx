import React from 'react';
import { TrendingUp, Clock, Shield, Award } from 'lucide-react';

export const BenefitsSection: React.FC = () => {
  const benefits = [
    {
      icon: Shield,
      title: 'Evita multe fino a €3.000+ all\'anno',
      description: 'Niente più sorprese: revisioni, assicurazioni e bolli sempre in regola.',
      stats: '€3.000+',
      statsLabel: 'risparmio medio annuo'
    },
    {
      icon: Clock,
      title: 'Risparmia 5+ ore al mese',
      description: 'Basta perdere tempo a ricordare scadenze e cercare documenti.',
      stats: '5+ ore',
      statsLabel: 'tempo risparmiato/mese'
    },
    {
      icon: TrendingUp,
      title: 'Estendi la vita del veicolo del 20%',
      description: 'Manutenzioni puntuali significano meno guasti e maggiore durata.',
      stats: '+20%',
      statsLabel: 'durata del veicolo'
    },
    {
      icon: Award,
      title: 'Sconti assicurativi con storico digitale',
      description: 'Dimostra la tua attenzione alla manutenzione e ottieni tariffe migliori.',
      stats: '15%',
      statsLabel: 'sconto medio assicurazione'
    }
  ];

  return (
    <section className="py-16 bg-gradient-to-br from-green-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Risparmia{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">
              tempo e denaro
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            I nostri utenti risparmiano in media €2.500 all'anno e 60+ ore di tempo. 
            Ecco come anche tu puoi farlo.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {benefits.map((benefit, index) => (
            <div key={index} className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 group">
              <div className="flex items-start space-x-4">
                <div className="bg-gradient-to-br from-green-100 to-blue-100 w-16 h-16 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <benefit.icon className="h-8 w-8 text-green-600" />
                </div>
                
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {benefit.title}
                  </h3>
                  <p className="text-gray-600 mb-4 leading-relaxed">
                    {benefit.description}
                  </p>
                  
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-green-600">
                      {benefit.stats}
                    </div>
                    <div className="text-sm text-gray-600">
                      {benefit.statsLabel}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ROI Calculator */}
        <div className="mt-16 bg-white rounded-2xl p-8 shadow-xl">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Calcola il tuo risparmio annuale
            </h3>
            <p className="text-gray-600">
              Scopri quanto potresti risparmiare con A Bordo
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div className="bg-red-50 rounded-lg p-6">
              <div className="text-3xl font-bold text-red-600 mb-2">€1.200</div>
              <div className="text-sm text-gray-600">Costo medio multe/anno</div>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-6">
              <div className="text-3xl font-bold text-blue-600 mb-2">€800</div>
              <div className="text-sm text-gray-600">Riparazioni evitabili</div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-6">
              <div className="text-3xl font-bold text-green-600 mb-2">€2.000+</div>
              <div className="text-sm text-gray-600">Risparmio totale annuo</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};