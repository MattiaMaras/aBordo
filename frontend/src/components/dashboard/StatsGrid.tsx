import React from 'react';
import { Car, AlertTriangle, Euro, Calendar } from 'lucide-react';
import { Card } from '../common/Card';
import { DashboardStats } from '../../types/vehicle';

interface StatsGridProps {
  stats: DashboardStats;
  onDeadlinesClick?: () => void;
}

export const StatsGrid: React.FC<StatsGridProps> = ({ stats, onDeadlinesClick }) => {
  const statItems = [
    {
      title: 'Veicoli Totali',
      value: stats.totalVehicles,
      icon: Car,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Scadenze Imminenti',
      value: stats.expiringSoon,
      icon: AlertTriangle,
      color: stats.expiringSoon > 0 ? 'text-red-600' : 'text-green-600',
      bgColor: stats.expiringSoon > 0 ? 'bg-red-50' : 'bg-green-50'
    },
    {
      title: 'Costi Mensili',
      value: `€${stats.totalMonthlyCosts}`,
      icon: Euro,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statItems.map((item, index) => (
        <Card key={index} className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">{item.title}</p>
              <p className="text-2xl font-bold text-gray-900">{item.value}</p>
            </div>
            <div className={`p-3 rounded-lg ${item.bgColor}`}>
              <item.icon className={`h-6 w-6 ${item.color}`} />
            </div>
          </div>
        </Card>
      ))}
      {/* Link “Tutte le scadenze” */}
      <Card className="p-6" onClick={onDeadlinesClick}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">Tutte le scadenze</p>
            <p className="text-2xl font-bold text-gray-900">Apri</p>
          </div>
          <div className={`p-3 rounded-lg bg-purple-50`}>
            <Calendar className={`h-6 w-6 text-purple-600`} />
          </div>
        </div>
      </Card>
    </div>
  );
};