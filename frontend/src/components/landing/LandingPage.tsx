import React, { useState } from 'react';
import { Car } from 'lucide-react';
import { HeroSection } from './HeroSection';
import { ProblemsSection } from './ProblemsSection';
import { FeaturesSection } from './FeaturesSection';
import { PricingSection } from './PricingSection';
import { FAQSection } from './FAQSection';
import { CTASection } from './CTASection';
import { LoginForm } from '../auth/LoginForm';
import { RegisterForm } from '../auth/RegisterForm';

export const LandingPage: React.FC = () => {
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');

  const handleGetStarted = () => {
    setShowAuth(true);
    setAuthMode('register');
  };

  const handleLogin = () => {
    setShowAuth(true);
    setAuthMode('login');
  };

  if (showAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
        <div className="w-full max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Branding */}
            <div className="text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start space-x-3 mb-6">
                <div className="bg-blue-600 p-3 rounded-xl">
                  <Car className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">A Bordo</h1>
                  <p className="text-gray-600">Gestione Veicoli Completa</p>
                </div>
              </div>
              
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                La tua auto, sempre sotto controllo
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Gestisci scadenze, manutenzioni e costi. Ricevi notifiche automatiche e non perdere mai più una scadenza importante.
              </p>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="text-2xl font-bold text-green-600">€2.500+</div>
                  <div className="text-gray-600">Risparmio medio annuo</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="text-2xl font-bold text-blue-600">10.000+</div>
                  <div className="text-gray-600">Utenti soddisfatti</div>
                </div>
              </div>
            </div>
            
            {/* Right side - Auth Form */}
            <div className="bg-white rounded-2xl shadow-2xl p-8">
              {authMode === 'login' ? (
                <LoginForm onSwitchToRegister={() => setAuthMode('register')} />
              ) : (
                <RegisterForm onSwitchToLogin={() => setAuthMode('login')} />
              )}
              
              <div className="mt-6 text-center">
                <button 
                  onClick={() => setShowAuth(false)}
                  className="text-gray-500 hover:text-gray-700 text-sm"
                >
                  ← Torna alla homepage
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Car className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">A Bordo</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button 
                onClick={handleLogin}
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Accedi
              </button>
              <button 
                onClick={handleGetStarted}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Inizia Gratis
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Landing Page Sections */}
      <HeroSection onGetStarted={handleGetStarted} />
      <ProblemsSection />
      <FeaturesSection />
      
      <PricingSection onGetStarted={handleGetStarted} />
      <FAQSection />
      <CTASection onGetStarted={handleGetStarted} />

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-blue-600 p-2 rounded-lg">
                  <Car className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-bold">A Bordo</span>
              </div>
              <p className="text-gray-400">
                La piattaforma completa per la gestione dei tuoi veicoli.
              </p>
            </div>
            
      
            
            <div>
              <h4 className="font-semibold mb-4">Supporto</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Centro Aiuto</a></li>
                <li><a href="#" className="hover:text-white">Contatti</a></li>
                <li><a href="#" className="hover:text-white">FAQ</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Legale</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white">Termini di Servizio</a></li>
                <li><a href="#" className="hover:text-white">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 A Bordo. Tutti i diritti riservati.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};