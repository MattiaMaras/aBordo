import React, { useEffect, useState } from 'react';
import { X, User, Mail, Calendar } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../common/Button';

interface ProfileModalProps {
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ onClose }) => {
  const { user } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
  const [profile, setProfile] = useState<typeof user | null>(user);

  useEffect(() => {
    const loadProfile = async () => {
      if (profile) return;
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const res = await fetch(`${API_URL}/auth/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (res.ok) {
          const data = await res.json();
          setProfile(data?.user ?? null);
        }
      } catch (e) {
        // Silenzioso: se fallisce, mostriamo comunque i fallback
      }
    };
    loadProfile();
  }, [API_URL, profile]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <User className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-semibold">Il Mio Profilo</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Avatar and basic info */}
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
              {profile?.firstName?.charAt(0)}{profile?.lastName?.charAt(0)}
            </div>
            <h3 className="text-xl font-semibold text-gray-900">
              {profile?.firstName || 'Utente'} {profile?.lastName || ''}
            </h3>
            <p className="text-gray-600">{profile?.email || 'non disponibile'}</p>
          </div>

          {/* Profile details essenziali */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <Mail className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-700">Email</p>
                <p className="text-sm text-gray-600">{profile?.email || 'non disponibile'}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <Calendar className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-700">Membro dal</p>
                <p className="text-sm text-gray-600">
                  {profile?.createdAt ? formatDate(profile.createdAt) : 'N/A'}
                </p>
              </div>
            </div>
          </div>

         
        </div>

        <div className="border-t p-4 bg-gray-50">
          <Button onClick={onClose} className="w-full">
            Chiudi
          </Button>
        </div>
      </div>
    </div>
  );
};
