import React, { useState } from 'react';
import { X, Calendar, MapPin, Euro, FileText } from 'lucide-react';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { MaintenanceRecord, MAINTENANCE_TYPES } from '../../types/maintenance';
import { toInputDate } from '../../utils/dateUtils';
import { Vehicle } from '../../types/vehicle';

interface AddMaintenanceFormProps {
  vehicle: Vehicle;
  onSubmit: (maintenance: Omit<MaintenanceRecord, 'id'>) => void;
  onCancel: () => void;
  errorMessage?: string;
}

export const AddMaintenanceForm: React.FC<AddMaintenanceFormProps> = ({ 
  vehicle, 
  onSubmit, 
  onCancel,
  errorMessage
}) => {
  const [formData, setFormData] = useState({
    type: 'oil' as MaintenanceRecord['type'],
    title: '',
    description: '',
    date: toInputDate(new Date()),
    nextDue: '',
    mileage: vehicle.currentMileage,
    nextMileage: 0,
    cost: 0,
    location: '',
    notes: '',
    isRecurring: true,
    intervalType: 'kilometers' as 'days' | 'months' | 'kilometers',
    intervalValue: 5000,
    reminderDays: [30, 14, 7]
  });
  const [isNextDueManual, setIsNextDueManual] = useState(false);

  const selectedType = MAINTENANCE_TYPES.find(t => t.id === formData.type);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let nextDue = formData.nextDue || undefined;
    let nextMileage = formData.nextMileage || undefined;
    if (formData.isRecurring && formData.intervalType === 'kilometers') {
      const baseMileage = (typeof formData.mileage === 'number' ? formData.mileage : (vehicle.currentMileage ?? 0)) || 0;
      const interval = typeof formData.intervalValue === 'number' ? formData.intervalValue : 0;
      nextMileage = baseMileage + interval;
      nextDue = undefined;
    }

    const maintenance: Omit<MaintenanceRecord, 'id'> = {
      vehicleId: vehicle.id,
      type: formData.type,
      title: formData.title || selectedType?.name || 'Manutenzione',
      description: formData.description,
      date: formData.date,
      nextDue,
      mileage: formData.mileage || undefined,
      nextMileage,
      cost: formData.cost,
      location: formData.location || undefined,
      notes: formData.notes || undefined,
      isRecurring: formData.isRecurring,
      intervalType: formData.isRecurring ? formData.intervalType : undefined,
      intervalValue: formData.isRecurring ? formData.intervalValue : undefined,
      reminderDays: formData.reminderDays
    };

    onSubmit(maintenance);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (name === 'intervalType') {
      const defaults: Record<string, number> = { days: 30, months: 6, kilometers: 5000 };
      const nextType = value as 'days' | 'months' | 'kilometers';
      // Cambiando tipo intervallo, ricalcoliamo e rimuoviamo eventuale blocco manuale
      setIsNextDueManual(false);
      setFormData(prev => ({
        ...prev,
        intervalType: nextType,
        intervalValue: defaults[nextType],
        nextDue: nextType === 'kilometers' ? '' : prev.nextDue
      }));
      return;
    }
    if (name === 'nextDue') {
      // Segna come impostata manualmente solo se presente un valore non vuoto
      setIsNextDueManual(!!value);
    }
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 :
               type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleTypeChange = (newType: MaintenanceRecord['type']) => {
    const typeConfig = MAINTENANCE_TYPES.find(t => t.id === newType);
    setFormData(prev => ({
      ...prev,
      type: newType,
      title: '',
      intervalType: typeConfig?.defaultIntervalType || 'kilometers',
      intervalValue: typeConfig?.defaultInterval || 5000,
      reminderDays: typeConfig?.defaultReminderDays || [30, 14, 7]
    }));
  };

  const calculateNextDue = () => {
    if (!formData.isRecurring || !formData.intervalValue) return;

    const currentDate = new Date(formData.date);
    let nextDate = new Date(currentDate);

  switch (formData.intervalType) {
    case 'days':
      nextDate.setDate(currentDate.getDate() + formData.intervalValue);
      break;
    case 'months':
      nextDate.setMonth(currentDate.getMonth() + formData.intervalValue);
      break;
    case 'kilometers':
      const baseMileage = formData.mileage || 0;
      const targetMileage = baseMileage + formData.intervalValue;
      // In modalità chilometri, la data non è usata e non deve restare bloccata manualmente
      setIsNextDueManual(false);
      setFormData(prev => ({
        ...prev,
        nextDue: '',
        nextMileage: targetMileage
      }));
      return;
  }

  setFormData(prev => ({
    ...prev,
    // Aggiorna dinamicamente solo se non impostato manualmente
    nextDue: isNextDueManual ? prev.nextDue : toInputDate(nextDate),
    nextMileage: formData.intervalType === 'kilometers' 
      ? (formData.mileage || 0) + formData.intervalValue 
      : 0
  }));
  };

  React.useEffect(() => {
    if (formData.isRecurring) {
      calculateNextDue();
    }
  }, [formData.date, formData.intervalType, formData.intervalValue, formData.mileage]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Aggiungi Manutenzione - {vehicle.brand} {vehicle.model}
            </h2>
            <button 
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tipo Manutenzione */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Tipo Manutenzione
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {MAINTENANCE_TYPES.filter(t => ['oil','filters','brakes','tires','adblue','other'].includes(t.id)).map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => handleTypeChange(type.id as MaintenanceRecord['type'])}
                    className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                      formData.type === type.id
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    {type.name}
                  </button>
                ))}
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded">
                {errorMessage}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Titolo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Titolo
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder={selectedType?.name}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Data */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Esecuzione
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Chilometraggio e Costo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chilometraggio
                </label>
                <input
                  type="number"
                  name="mileage"
                  value={formData.mileage}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
                <p className="mt-1 text-xs text-gray-500">Se superiore ai km del veicolo, aggiorna il chilometraggio del veicolo.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Costo (€)
                </label>
                <div className="relative">
                  <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    name="cost"
                    value={formData.cost}
                    onChange={handleChange}
                    step="0.01"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">Importo reale pagato per l'intervento; entra nei costi mensili del mese indicato nella data.</p>
              </div>
            </div>

            {/* Luogo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Luogo/Officina
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nome officina o luogo"
                />
              </div>
            </div>

            {/* Descrizione */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrizione
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Dettagli della manutenzione eseguita..."
                />
              </div>
            </div>

            {/* Manutenzione Ricorrente */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  name="isRecurring"
                  checked={formData.isRecurring}
                  onChange={handleChange}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label className="ml-2 text-sm font-medium text-gray-700">
                  Manutenzione ricorrente (programma la prossima)
                </label>
              </div>
              <p className="text-xs text-gray-500 mb-3">Imposta l'intervallo per pianificare un promemoria del prossimo intervento. Se scegli "Chilometri" puoi inserire anche i "Prossimi Km"; sono promemoria e non vengono salvati nel database.</p>

              {formData.isRecurring && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Intervallo
                      </label>
                      <input
                        type="number"
                        name="intervalValue"
                        value={formData.intervalValue}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="mt-1 text-xs text-gray-500">Numero di chilometri/mesi/giorni tra un intervento e il successivo.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tipo
                      </label>
                      <select
                        name="intervalType"
                        value={formData.intervalType}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="kilometers">Chilometri</option>
                        <option value="months">Mesi</option>
                        <option value="days">Giorni</option>
                      </select>
                      <p className="mt-1 text-xs text-gray-500">Scegli se l'intervallo è in km, mesi o giorni.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {formData.intervalType !== 'kilometers' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Prossima Scadenza
                        </label>
                        <input
                          type="date"
                          name="nextDue"
                          value={formData.nextDue}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}
                    {formData.intervalType === 'kilometers' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Prossima Scadenza (chilometri)
                        </label>
                        <p className="text-sm text-blue-700">
                          A {((formData.mileage || 0) + (formData.intervalValue || 0)).toLocaleString()} km • Km rimanenti: {Math.max(0, ((formData.mileage || 0) + (formData.intervalValue || 0)) - (vehicle.currentMileage ?? 0)).toLocaleString()} km
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Note */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Note Aggiuntive
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Note, osservazioni, raccomandazioni..."
              />
            </div>
            
            <div className="flex space-x-3 pt-4">
              <Button type="submit" className="flex-1">
                Salva Manutenzione
              </Button>
              <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
                Annulla
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
};
