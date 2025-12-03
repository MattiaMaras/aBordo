import React from 'react';
import { 
  Gauge, 
  Bell, 
  FileText, 
  Users, 
  Calculator
} from 'lucide-react';

export const FeaturesSection: React.FC = () => {
  const features = [
    {
      icon: Gauge,
      title: 'Dashboard intelligente',
      description: 'Semaforo rosso/verde per ogni scadenza. Vedi tutto a colpo d\'occhio.',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      icon: Bell,
      title: 'Notifiche smart',
      description: 'Email e app 30-14-7-1 giorni prima. Non dimenticherai mai più nulla.',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      icon: FileText,
      title: 'Storico completo',
      description: 'Tutti i pagamenti e interventi registrati. Perfetto per rivendita.',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      icon: Users,
      title: 'Multi-veicolo',
      description: 'Gestisci auto, moto, furgoni della famiglia in un\'unica app.',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      icon: Calculator,
      title: 'Calcolo costi',
      description: 'Budget annuale e tracking spese reali. Controlla dove vanno i tuoi soldi.',
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    
  ];

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Tutto sotto controllo in{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-green-600">
              un click
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Un'unica piattaforma per gestire tutti gli aspetti dei tuoi veicoli. 
            Semplice, intuitiva e sempre aggiornata.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="group hover:bg-gray-50 rounded-xl p-6 transition-all duration-300 hover:shadow-lg">
              <div className={`${feature.bgColor} w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className={`h-6 w-6 ${feature.color}`} />
              </div>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
              <p className="text-gray-600 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Timeline visualization */}
        <div className="mt-16 bg-gradient-to-r from-blue-50 to-green-50 rounded-2xl p-8">
          <h3 className="text-2xl font-bold text-center text-gray-900 mb-8">
            Timeline Notifiche Automatiche
          </h3>
          
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            {[
              { days: '30', color: 'bg-blue-500', label: 'Primo avviso' },
              { days: '14', color: 'bg-yellow-500', label: 'Promemoria' },
              { days: '7', color: 'bg-orange-500', label: 'Urgente' },
              { days: '1', color: 'bg-red-500', label: 'Critico' }
            ].map((item, index) => (
              <div key={index} className="flex items-center">
                <div className="text-center">
                  <div className={`${item.color} w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-lg mb-2`}>
                    {item.days}
                  </div>
                  <p className="text-sm font-medium text-gray-700">{item.label}</p>
                  <p className="text-xs text-gray-500">{item.days} giorni prima</p>
                </div>
                {index < 3 && (
                  <div className="hidden md:block w-16 h-0.5 bg-gray-300 mx-4"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
