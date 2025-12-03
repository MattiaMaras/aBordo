import React from 'react';
import { ArrowRight, Users, Shield, Zap } from 'lucide-react';
import { Button } from '../common/Button';

interface CTASectionProps {
  onGetStarted: () => void;
}

export const CTASection: React.FC<CTASectionProps> = ({ onGetStarted }) => {
  return (
    <section className="py-16 bg-gradient-to-br from-blue-600 via-blue-700 to-green-600 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-black opacity-10"></div>
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-10 left-10 w-20 h-20 bg-white opacity-10 rounded-full"></div>
        <div className="absolute bottom-10 right-10 w-32 h-32 bg-white opacity-5 rounded-full"></div>
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-white opacity-10 rounded-full"></div>
      </div>
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
          Unisciti a migliaia di{' '}
          <span className="text-yellow-300">automobilisti smart</span>
        </h2>
        
        <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto leading-relaxed">
          Non aspettare la prossima multa o il prossimo guasto costoso. 
          Inizia oggi stesso a gestire i tuoi veicoli come un professionista.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Button 
            onClick={onGetStarted} 
            className="text-lg px-6 py-3 bg-white text-blue-700 rounded-lg shadow hover:shadow-md hover:bg-blue-50 transition-colors"
          >
            Inizia Gratis
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>

        {/* Trust indicators */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-white">
          <div className="flex items-center justify-center space-x-3">
            <Users className="h-8 w-8 text-yellow-300" />
            <div className="text-left">
              <div className="text-2xl font-bold">10.000+</div>
              <div className="text-blue-200 text-sm">Utenti soddisfatti</div>
            </div>
          </div>
          
          <div className="flex items-center justify-center space-x-3">
            <Shield className="h-8 w-8 text-yellow-300" />
            <div className="text-left">
              <div className="text-2xl font-bold">€2.5M+</div>
              <div className="text-blue-200 text-sm">Risparmiati in multe</div>
            </div>
          </div>
          
          <div className="flex items-center justify-center space-x-3">
            <Zap className="h-8 w-8 text-yellow-300" />
            <div className="text-left">
              <div className="text-2xl font-bold">2 min</div>
              <div className="text-blue-200 text-sm">Setup completo</div>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-blue-200 text-sm">
            ✨ Nessuna carta di credito richiesta • Cancellazione gratuita • Supporto 24/7
          </p>
        </div>
      </div>
    </section>
  );
};
