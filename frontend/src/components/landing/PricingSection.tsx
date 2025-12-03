import React from 'react';
import { Check, Star, Zap } from 'lucide-react';
import { Button } from '../common/Button';

interface PricingSectionProps {
  onGetStarted: () => void;
}

export const PricingSection: React.FC<PricingSectionProps> = ({ onGetStarted }) => {
  return (
    <section className="py-16 bg-gradient-to-br from-green-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            Completamente{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-green-600">
              gratuitamente
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            A Bordo è completamente gratuito. Nessun costo nascosto, nessun limite di tempo.
          </p>
          
          <Button 
            size="lg"
            onClick={onGetStarted}
            className="text-lg px-12 py-4 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200"
          >
            <Zap className="mr-2 h-6 w-6" />
            Inizia Gratis Ora
          </Button>
        </div>

        {/* Features Grid */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h3 className="text-2xl font-bold text-center text-gray-900 mb-8">
              Tutto incluso, sempre gratis
            </h3>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                {[
                  'Veicoli illimitati',
                  'Notifiche automatiche avanzate',
                  'Storico completo manutenzioni',
                  'Dashboard intelligente',
                  'Calcolo costi e budget'
                ].map((feature, index) => (
                  <div key={index} className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>
              
              <div className="space-y-4">
                {[
                  'Gestione scadenze complete',
                  'Promemoria personalizzabili',
                  'Esportazione dati',
                  'Supporto multi-dispositivo',
                  'Backup automatico cloud'
                ].map((feature, index) => (
                  <div key={index} className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Trust Signals */}
        <div className="mt-16 text-center">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center opacity-60">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center">
                <Check className="h-5 w-5 text-white" />
              </div>
              <span className="font-medium">GDPR Compliant</span>
            </div>
            
            <div className="flex items-center justify-center space-x-2">
              <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
                <Star className="h-5 w-5 text-white" />
              </div>
              <span className="font-medium">4.9/5 Rating</span>
            </div>
            
            <div className="flex items-center justify-center space-x-2">
              <div className="w-8 h-8 bg-purple-500 rounded flex items-center justify-center">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span className="font-medium">SSL Sicuro</span>
            </div>
            
            <div className="flex items-center justify-center space-x-2">
              <div className="w-8 h-8 bg-orange-500 rounded flex items-center justify-center">
                <Check className="h-5 w-5 text-white" />
              </div>
              <span className="font-medium">Cancellazione Facile</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};