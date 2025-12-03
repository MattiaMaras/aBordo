import React from 'react';
import { ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from '../common/Button';

interface HeroSectionProps {
  onGetStarted: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onGetStarted }) => {
  return (
    <section className="relative bg-gradient-to-br from-blue-50 via-white to-green-50 pt-20 pb-16 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left column - Content */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <CheckCircle className="h-4 w-4 mr-2" />
              Oltre 10.000 veicoli già registrati
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
              Non perdere mai più una{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-green-600">
                scadenza
              </span>{' '}
              del tuo veicolo
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Gestisci revisioni, tagliandi, assicurazioni e manutenzioni in un'unica app. 
              Ricevi notifiche automatiche e risparmia tempo e denaro.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Button 
                size="lg" 
                onClick={onGetStarted}
                className="text-lg px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              >
                Inizia Gratis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              
              
            </div>
            
            <div className="flex items-center justify-center lg:justify-start space-x-6 text-sm text-gray-500">
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                Gratis per sempre
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                Nessuna carta richiesta
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                Setup in 2 minuti
              </div>
            </div>
          </div>
          
          {/* Right column - Hero Image */}
          <div className="relative">
            <div className="relative z-10 bg-white rounded-2xl shadow-2xl p-6 transform rotate-3 hover:rotate-0 transition-transform duration-500">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Dashboard A Bordo</h3>
                  <div className="flex space-x-1">
                    <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="bg-white/20 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Fiat Punto - AB123CD</span>
                      <span className="bg-red-500 text-xs px-2 py-1 rounded-full">7 giorni</span>
                    </div>
                    <p className="text-xs opacity-90 mt-1">Assicurazione in scadenza</p>
                  </div>
                  
                  <div className="bg-white/20 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">VW Golf - XY789ZK</span>
                      <span className="bg-yellow-500 text-xs px-2 py-1 rounded-full">15 giorni</span>
                    </div>
                    <p className="text-xs opacity-90 mt-1">Revisione programmata</p>
                  </div>
                  
                  <div className="bg-white/20 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">BMW Serie 3 - MN456PQ</span>
                      <span className="bg-green-500 text-xs px-2 py-1 rounded-full">OK</span>
                    </div>
                    <p className="text-xs opacity-90 mt-1">Tutto in regola</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Floating notification */}
            <div className="absolute -top-4 -right-4 bg-red-500 text-white p-3 rounded-lg shadow-lg animate-bounce">
              <div className="text-xs font-semibold">🚨 Scadenza!</div>
              <div className="text-xs">Assicurazione tra 7 giorni</div>
            </div>
            
            {/* Background decoration */}
            <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-gradient-to-br from-green-400 to-blue-500 rounded-full opacity-20 blur-xl"></div>
          </div>
        </div>
      </div>
    </section>
  );
};
