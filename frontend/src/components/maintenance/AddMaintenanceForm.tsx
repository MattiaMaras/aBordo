import React, { useState } from 'react';
import { X, Calendar, MapPin, Euro, FileText, Gauge } from 'lucide-react';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { MaintenanceRecord, MAINTENANCE_TYPES } from '../../types/maintenance';
import { toInputDate } from '../../utils/dateUtils';
import { Vehicle } from '../../types/vehicle';

interface AddMaintenanceFormProps {
  vehicle: Vehicle;
  /** Se presente, il form si apre in modalità modifica precompilato con questi dati */
  initialData?: MaintenanceRecord;
  onSubmit: (maintenance: Omit<MaintenanceRecord, 'id'>) => Promise<{ success: boolean; error?: string }> | void;
  onCancel: () => void;
  errorMessage?: string;
}

const MAINTENANCE_TYPE_OPTIONS = MAINTENANCE_TYPES.filter(t =>
  ['oil', 'filters', 'brakes', 'tires', 'adblue', 'other'].includes(t.id)
);

export const AddMaintenanceForm: React.FC<AddMaintenanceFormProps> = ({
  vehicle,
  initialData,
  onSubmit,
  onCancel,
  errorMessage
}) => {
  const isEditMode = Boolean(initialData);

  const [formData, setFormData] = useState({
    type: initialData?.type ?? ('oil' as MaintenanceRecord['type']),
    title: initialData?.title && initialData.title !== 'Manutenzione' ? initialData.title : '',
    description: initialData?.description ?? '',
    date: initialData?.date ? toInputDate(new Date(initialData.date)) : toInputDate(new Date()),
    nextDue: initialData?.nextDue ? toInputDate(new Date(initialData.nextDue)) : '',
    mileage: initialData?.mileage ?? vehicle.currentMileage,
    nextMileage: initialData?.nextMileage ?? 0,
    cost: initialData?.cost ?? 0,
    location: initialData?.location ?? '',
    notes: initialData?.notes ?? '',
    // Il calcolo automatico della prossima scadenza è utile solo in creazione;
    // in modifica l'utente edita direttamente i valori già salvati.
    isRecurring: !isEditMode,
    intervalType: 'kilometers' as 'days' | 'months' | 'kilometers',
    intervalValue: 5000,
    reminderDays: [30, 14, 7]
  });
  const [isNextDueManual, setIsNextDueManual] = useState(isEditMode);
  // Disabilita il pulsante durante l'invio: previene i duplicati causati da
  // doppio click o doppia pressione di Invio sullo stesso form.
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const selectedType = MAINTENANCE_TYPE_OPTIONS.find(t => t.id === formData.type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // guardia anti-doppio-submit

    let nextDue: string | undefined = formData.nextDue || undefined;
    let nextMileage: number | undefined = formData.nextMileage || undefined;
    if (!isEditMode && formData.isRecurring && formData.intervalType === 'kilometers') {
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
      isRecurring: !isEditMode && formData.isRecurring,
      intervalType: (!isEditMode && formData.isRecurring) ? formData.intervalType : undefined,
      intervalValue: (!isEditMode && formData.isRecurring) ? formData.intervalValue : undefined,
      reminderDays: formData.reminderDays
    };

    setIsSubmitting(true);
    setLocalError(null);
    try {
      const result = await onSubmit(maintenance);
      // Se onSubmit non ritorna un esito (void), consideriamo l'operazione conclusa
      // e lasciamo che sia il chiamante a chiudere il form.
      if (result && result.success === false) {
        setLocalError(result.error || 'Operazione non riuscita');
      }
    } finally {
      setIsSubmitting(false);
    }
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
    const typeConfig = MAINTENANCE_TYPE_OPTIONS.find(t => t.id === newType);
    setFormData(prev => ({
      ...prev,
      type: newType,
      // In modifica manteniamo il titolo esistente: cambiare tipo non deve svuotarlo
      title: isEditMode ? prev.title : '',
      intervalType: typeConfig?.defaultIntervalType || 'kilometers',
      intervalValue: typeConfig?.defaultInterval || 5000,
      reminderDays: typeConfig?.defaultReminderDays || [30, 14, 7]
    }));
  };

  const calculateNextDue = () => {
    if (!formData.isRecurring || !formData.intervalValue) return;

    const currentDate = new Date(formData.date);
    const nextDate = new Date(currentDate);

    switch (formData.intervalType) {
      case 'days':
        nextDate.setDate(currentDate.getDate() + formData.intervalValue);
        break;
      case 'months':
        nextDate.setMonth(currentDate.getMonth() + formData.intervalValue);
        break;
      case 'kilometers': {
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
    // Il calcolo automatico ha senso solo in creazione: in modifica l'utente
    // controlla direttamente "Prossima scadenza" e "Prossimo chilometraggio".
    if (!isEditMode && formData.isRecurring) {
      calculateNextDue();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.date, formData.intervalType, formData.intervalValue, formData.mileage]);

  const modalTitle = isEditMode
    ? `Modifica Manutenzione - ${vehicle.brand} ${vehicle.model}`
    : `Aggiungi Manutenzione - ${vehicle.brand} ${vehicle.model}`;

  return (
    <Modal onClose={onCancel} labelledBy="add-maintenance-title" className="max-w-2xl max-h-[90vh] overflow-y-auto" closeOnBackdrop={false}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 id="add-maintenance-title" className="text-xl font-semibold text-gray-900">
              {modalTitle}
            </h2>
            <button
              onClick={onCancel}
              aria-label="Chiudi form manutenzione"
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tipo Manutenzione */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Tipo Manutenzione
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {MAINTENANCE_TYPE_OPTIONS.map((type) => (
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

            {(errorMessage || localError) && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded" role="alert">
                {errorMessage || localError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Titolo */}
              <div>
                <label htmlFor="maintenance-title" className="block text-sm font-medium text-gray-700 mb-1">
                  Titolo
                </label>
                <input
                  type="text"
                  id="maintenance-title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder={selectedType?.name}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Data */}
              <div>
                <label htmlFor="maintenance-date" className="block text-sm font-medium text-gray-700 mb-1">
                  Data Esecuzione
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" aria-hidden="true" />
                  <input
                    type="date"
                    id="maintenance-date"
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
                <label htmlFor="maintenance-mileage" className="block text-sm font-medium text-gray-700 mb-1">
                  Chilometraggio
                </label>
                <input
                  type="number"
                  id="maintenance-mileage"
                  name="mileage"
                  value={formData.mileage}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
                <p className="mt-1 text-xs text-gray-500">Se superiore ai km del veicolo, aggiorna il chilometraggio del veicolo.</p>
              </div>

              <div>
                <label htmlFor="maintenance-cost" className="block text-sm font-medium text-gray-700 mb-1">
                  Costo (€)
                </label>
                <div className="relative">
                  <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" aria-hidden="true" />
                  <input
                    type="number"
                    id="maintenance-cost"
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
              <label htmlFor="maintenance-location" className="block text-sm font-medium text-gray-700 mb-1">
                Luogo/Officina
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" aria-hidden="true" />
                <input
                  type="text"
                  id="maintenance-location"
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
              <label htmlFor="maintenance-description" className="block text-sm font-medium text-gray-700 mb-1">
                Descrizione
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400" aria-hidden="true" />
                <textarea
                  id="maintenance-description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Dettagli della manutenzione eseguita..."
                />
              </div>
            </div>

            {!isEditMode ? (
              /* Manutenzione Ricorrente: calcolatore automatico, solo in creazione */
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-4">
                  <input
                    type="checkbox"
                    id="maintenance-recurring"
                    name="isRecurring"
                    checked={formData.isRecurring}
                    onChange={handleChange}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="maintenance-recurring" className="ml-2 text-sm font-medium text-gray-700">
                    Manutenzione ricorrente (programma la prossima)
                  </label>
                </div>
                <p className="text-xs text-gray-500 mb-3">Imposta l'intervallo per pianificare un promemoria del prossimo intervento. Se scegli "Chilometri" puoi inserire anche i "Prossimi Km"; sono promemoria e non vengono salvati nel database.</p>

                {formData.isRecurring && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="maintenance-interval-value" className="block text-sm font-medium text-gray-700 mb-1">
                          Intervallo
                        </label>
                        <input
                          type="number"
                          id="maintenance-interval-value"
                          name="intervalValue"
                          value={formData.intervalValue}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="mt-1 text-xs text-gray-500">Numero di chilometri/mesi/giorni tra un intervento e il successivo.</p>
                      </div>
                      <div>
                        <label htmlFor="maintenance-interval-type" className="block text-sm font-medium text-gray-700 mb-1">
                          Tipo
                        </label>
                        <select
                          id="maintenance-interval-type"
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
                          <label htmlFor="maintenance-next-due" className="block text-sm font-medium text-gray-700 mb-1">
                            Prossima Scadenza
                          </label>
                          <input
                            type="date"
                            id="maintenance-next-due"
                            name="nextDue"
                            value={formData.nextDue}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      )}
                      {formData.intervalType === 'kilometers' && (
                        <div>
                          <span className="block text-sm font-medium text-gray-700 mb-1">
                            Prossima Scadenza (chilometri)
                          </span>
                          <p className="text-sm text-blue-700">
                            A {((formData.mileage || 0) + (formData.intervalValue || 0)).toLocaleString()} km • Km rimanenti: {Math.max(0, ((formData.mileage || 0) + (formData.intervalValue || 0)) - (vehicle.currentMileage ?? 0)).toLocaleString()} km
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Modifica: prossima scadenza modificabile direttamente, senza ricalcolo automatico */
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-3">Prossima Scadenza</p>
                <p className="text-xs text-gray-500 mb-3">Modifica direttamente data o chilometraggio della prossima scadenza, oppure svuota entrambi i campi per rimuoverla.</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="maintenance-next-due-edit" className="block text-sm font-medium text-gray-700 mb-1">
                      Data
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" aria-hidden="true" />
                      <input
                        type="date"
                        id="maintenance-next-due-edit"
                        name="nextDue"
                        value={formData.nextDue}
                        onChange={handleChange}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="maintenance-next-mileage-edit" className="block text-sm font-medium text-gray-700 mb-1">
                      Chilometraggio
                    </label>
                    <div className="relative">
                      <Gauge className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" aria-hidden="true" />
                      <input
                        type="number"
                        id="maintenance-next-mileage-edit"
                        name="nextMileage"
                        value={formData.nextMileage || ''}
                        onChange={handleChange}
                        placeholder="0"
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Note */}
            <div>
              <label htmlFor="maintenance-notes" className="block text-sm font-medium text-gray-700 mb-1">
                Note Aggiuntive
              </label>
              <textarea
                id="maintenance-notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Note, osservazioni, raccomandazioni..."
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? 'Salvataggio...' : (isEditMode ? 'Salva Modifiche' : 'Salva Manutenzione')}
              </Button>
              <Button type="button" variant="outline" onClick={onCancel} className="flex-1" disabled={isSubmitting}>
                Annulla
              </Button>
            </div>
          </form>
        </div>
    </Modal>
  );
};
