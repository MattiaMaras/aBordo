import React from 'react';
import { AlertTriangle, Euro, Wrench, Shield } from 'lucide-react';

export const ProblemsSection: React.FC = () => {
  const problems = [
    {
      icon: AlertTriangle,
      title: 'Revisione scaduta',
      cost: '€173',
      description: 'Multa + fermo veicolo',
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      icon: Shield,
      title: 'Assicurazione scaduta',
      cost: '€3.464',
      description: 'Sequestro + sanzioni fino a',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      icon: Wrench,
      title: 'Tagliando rimandato',
      cost: '€2.000+',
      description: 'Danni al motore costosi',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      icon: Euro,
      title: 'Pneumatici usurati',
      cost: '€500',
      description: 'Rischio sicurezza + multa',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    }
  ];

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Basta con scadenze dimenticate e{' '}
            <span className="text-red-600">multe salate</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Ogni anno migliaia di automobilisti pagano multe evitabili per scadenze dimenticate. 
            Non essere uno di loro.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {problems.map((problem, index) => (
            <div key={index} className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className={`${problem.bgColor} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
                <problem.icon className={`h-6 w-6 ${problem.color}`} />
              </div>
              
              <h3 className="font-semibold text-gray-900 mb-2">{problem.title}</h3>
              <div className={`text-2xl font-bold ${problem.color} mb-2`}>
                {problem.cost}
              </div>
              <p className="text-sm text-gray-600">{problem.description}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <div className="inline-flex items-center bg-red-100 text-red-800 px-6 py-3 rounded-full">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <span className="font-semibold">
              Costo medio annuale per scadenze dimenticate: €1.200+
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};