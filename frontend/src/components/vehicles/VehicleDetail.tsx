import React from 'react';
import { ArrowLeft, Car, Calendar, MapPin, Fuel, FileText, Shield, CreditCard, Wrench, Plus } from 'lucide-react';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { StatusBadge } from '../common/StatusBadge';
import { Vehicle, VehicleNotification } from '../../types/vehicle';
import { MaintenanceRecord } from '../../types/maintenance';
import { MaintenanceList } from '../maintenance/MaintenanceList';
import { AddMaintenanceForm } from '../maintenance/AddMaintenanceForm';
import { getFuelTypeLabel } from '../../utils/vehicleUtils';
import { formatDate, toInputDate } from '../../utils/dateUtils';
import { useInsurances } from '../../hooks/useInsurances';
import { useCarTaxes } from '../../hooks/useCarTaxes';
import { useInspections } from '../../hooks/useInspections';
import { useServices } from '../../hooks/useServices';

interface VehicleDetailProps {
  vehicle: Vehicle;
  notifications: VehicleNotification[];
  maintenances: MaintenanceRecord[];
  onBack: () => void;
  onAddMaintenance: (maintenance: Omit<MaintenanceRecord, 'id'>) => void;
  onRefreshNotifications?: () => void;
  onUpdateMaintenance?: (maintenanceId: string, data: Partial<Omit<MaintenanceRecord, 'id'>>) => Promise<{ success: boolean; error?: string }> | void;
  onDeleteMaintenance?: (maintenanceId: string) => Promise<{ success: boolean; error?: string }> | void;
  onUpdateVehicleMileage?: (newMileage: number) => Promise<{ success: boolean; error?: string }> | void;
}

export const VehicleDetail: React.FC<VehicleDetailProps> = ({ 
  vehicle, 
  maintenances, 
  onBack, 
  onAddMaintenance,
  onRefreshNotifications,
  onDeleteMaintenance,
  onUpdateVehicleMileage
}) => {
  // Filtro globale per anno
  const [selectedYear, setSelectedYear] = React.useState<number | 'all'>(new Date().getFullYear());
  const [showAddMaintenance, setShowAddMaintenance] = React.useState(false);
  const [maintenanceError, setMaintenanceError] = React.useState<string | null>(null);
  const [maintenanceInfoId, setMaintenanceInfoId] = React.useState<string | null>(null);
  const [showAddInsurance, setShowAddInsurance] = React.useState(false);
  const [insuranceError, setInsuranceError] = React.useState<string | null>(null);
  const [showAddTax, setShowAddTax] = React.useState(false);
  const [taxError, setTaxError] = React.useState<string | null>(null);
  const [showAddInspection, setShowAddInspection] = React.useState(false);
  const [inspectionError, setInspectionError] = React.useState<string | null>(null);
  const [showAddService, setShowAddService] = React.useState(false);
  const [serviceError, setServiceError] = React.useState<string | null>(null);
  const [editingMileage, setEditingMileage] = React.useState<boolean>(false);
  const [mileageInput, setMileageInput] = React.useState<string>(vehicle.currentMileage?.toString() ?? '0');
  const [mileageError, setMileageError] = React.useState<string | null>(null);

  // Editing state per categoria
  const [editingInsuranceId, setEditingInsuranceId] = React.useState<string | null>(null);
  const [insuranceEditError, setInsuranceEditError] = React.useState<string | null>(null);
  const [editingTaxId, setEditingTaxId] = React.useState<string | null>(null);
  const [taxEditError, setTaxEditError] = React.useState<string | null>(null);
  const [editingInspectionId, setEditingInspectionId] = React.useState<string | null>(null);
  const [inspectionEditError, setInspectionEditError] = React.useState<string | null>(null);
  const [editingServiceId, setEditingServiceId] = React.useState<string | null>(null);
  const [serviceEditError, setServiceEditError] = React.useState<string | null>(null);

  const { insurances, addInsurance, updateInsurance, deleteInsurance } = useInsurances(vehicle.id);
  const { taxes, addTax, updateTax, deleteTax } = useCarTaxes(vehicle.id);
  const { inspections, addInspection, updateInspection, deleteInspection } = useInspections(vehicle.id);
  const { services, addService, updateService, deleteService } = useServices(vehicle.id);

  // Sezioni collassabili per ridurre lo scroll
  const [showMaintenancesSection, setShowMaintenancesSection] = React.useState(true);
  const [showInsurancesSection, setShowInsurancesSection] = React.useState(true);
  const [showTaxesSection, setShowTaxesSection] = React.useState(true);
  const [showInspectionsSection, setShowInspectionsSection] = React.useState(true);
  const [showServicesSection, setShowServicesSection] = React.useState(true);

  // Anni disponibili (derivati dai dati)
  const availableYears = React.useMemo(() => {
    const years = new Set<number>();
    maintenances.forEach(m => { try { years.add(new Date(m.date).getFullYear()); } catch {} });
    insurances.forEach(i => { try { years.add(new Date(i.expiryDate).getFullYear()); } catch {} });
    taxes.forEach(t => { try { years.add(new Date(t.expiryDate).getFullYear()); } catch {} });
    inspections.forEach(i => { try { years.add(new Date(i.nextInspectionDate).getFullYear()); } catch {} });
    services.forEach(s => { try { years.add(new Date(s.lastServiceDate).getFullYear()); } catch {} });
    const arr = Array.from(years).sort((a, b) => b - a);
    return arr.length ? arr : [new Date().getFullYear()];
  }, [maintenances, insurances, taxes, inspections, services]);

  // Helper di filtro per anno
  const matchYear = React.useCallback((dateStr?: string | null) => {
    if (!dateStr) return selectedYear === 'all';
    const y = new Date(dateStr).getFullYear();
    return selectedYear === 'all' ? true : y === selectedYear;
  }, [selectedYear]);

  // Collezioni filtrate
  const filteredMaintenances = React.useMemo(() => (
    maintenances.filter(m => matchYear(m.date))
  ), [maintenances, matchYear]);

  const filteredInsurances = React.useMemo(() => (
    insurances.filter(i => matchYear(i.expiryDate))
  ), [insurances, matchYear]);

  const filteredTaxes = React.useMemo(() => (
    taxes.filter(t => matchYear(t.expiryDate))
  ), [taxes, matchYear]);

  const filteredInspections = React.useMemo(() => (
    inspections.filter(i => matchYear(i.nextInspectionDate) || matchYear(i.lastInspectionDate))
  ), [inspections, matchYear]);

  const filteredServices = React.useMemo(() => (
    services.filter(s => matchYear(s.lastServiceDate))
  ), [services, matchYear]);



  

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Button variant="outline" onClick={onBack} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Torna alla Dashboard
        </Button>
        
        <Card className="p-6">
          <div className="flex items-center space-x-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <Car className="h-10 w-10 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {vehicle.brand} {vehicle.model} ({vehicle.year})
              </h1>
              <p className="text-lg text-gray-600">{vehicle.plateNumber}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className={`flex items-center space-x-3 ${editingMileage ? 'md:col-span-2' : ''}`}>
              <Calendar className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Anno Immatricolazione</p>
                <p className="font-semibold">{vehicle.year}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <MapPin className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Chilometraggio</p>
                {!editingMileage ? (
                  <p className="font-semibold">
                    {vehicle.currentMileage.toLocaleString()} km
                    {onUpdateVehicleMileage && (
                      <Button variant="outline" className="ml-2" onClick={() => { setMileageInput(vehicle.currentMileage?.toString() ?? '0'); setEditingMileage(true); }}>
                        Modifica
                      </Button>
                    )}
                  </p>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="number"
                      min={vehicle.currentMileage ?? 0}
                      className="w-32 border border-gray-300 rounded-md px-2 py-1 text-sm"
                      value={mileageInput}
                      onChange={(e) => setMileageInput(e.target.value)}
                    />
                    <Button size="sm" onClick={async () => {
                      setMileageError(null);
                      const val = Number(mileageInput);
                      if (!Number.isFinite(val)) { setMileageError('Inserisci un numero valido'); return; }
                      if (val < (vehicle.currentMileage ?? 0)) { setMileageError('Il chilometraggio non può diminuire'); return; }
                      const res = await onUpdateVehicleMileage?.(val);
                      if (res && !res.success) { setMileageError(res.error || 'Errore nell\'aggiornamento dei chilometri'); return; }
                      setEditingMileage(false);
                    }}>Salva</Button>
                    <Button size="sm" variant="outline" onClick={() => { setEditingMileage(false); setMileageError(null); }}>Annulla</Button>
                    {mileageError && (<span className="text-red-600 text-sm ml-2">{mileageError}</span>)}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Fuel className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Alimentazione</p>
                <p className="font-semibold">{getFuelTypeLabel(vehicle.fuelType)}</p>
              </div>
            </div>
          </div>
          {/* Filtro per anno */}
          <div className="mt-6">
            <label className="text-sm font-medium text-gray-700 mr-2">Filtro per anno:</label>
            <select
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              value={selectedYear}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedYear(val === 'all' ? 'all' : parseInt(val, 10));
              }}
            >
              <option value="all">Tutti</option>
              {availableYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </Card>
      </div>

      

      {/* Gestione Manutenzioni */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Wrench className="h-5 w-5 mr-2 text-green-500" />
            Manutenzioni e Scadenze
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowMaintenancesSection(v => !v)}>
              {showMaintenancesSection ? 'Nascondi' : 'Mostra'}
            </Button>
            <Button onClick={() => setShowAddMaintenance(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi Manutenzione
            </Button>
          </div>
        </div>
        {showMaintenancesSection ? (
          <>
            <p className="text-sm text-gray-600 mb-4">Questa sezione registra interventi con costo (olio, filtri, freni, pneumatici, AdBlue, altro). Per assicurazione, bollo, revisione e tagliando usa le sezioni dedicate qui sotto.</p>
            <MaintenanceList 
              maintenances={filteredMaintenances} 
              currentMileage={vehicle.currentMileage ?? 0}
              onEdit={(m) => setMaintenanceInfoId(m.id)}
              onDelete={async (id) => {
                const res = await (onDeleteMaintenance?.(id) as unknown as Promise<{ success: boolean; error?: string }>);
                if (res && res.success) { onRefreshNotifications?.(); }
              }}
            />
            {filteredMaintenances.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">
                    Totale Spese {selectedYear === 'all' ? '(Tutti gli anni)' : `Anno ${selectedYear}`}:
                  </span>
                  <span className="text-lg font-bold text-blue-600">
                    €{filteredMaintenances.reduce((sum, m) => sum + m.cost, 0).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-500">Sezione nascosta • Manutenzioni: {filteredMaintenances.length}</p>
        )}
      </Card>

      {/* Assicurazioni */}
      <Card className="p-6 mt-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Shield className="h-5 w-5 mr-2 text-indigo-500" />
            Assicurazioni
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowInsurancesSection(v => !v)}>
              {showInsurancesSection ? 'Nascondi' : 'Mostra'}
            </Button>
            <Button onClick={() => { setShowAddInsurance(true); setEditingInsuranceId(null); }}>
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi Assicurazione
            </Button>
          </div>
        </div>
        {showInsurancesSection ? (
          filteredInsurances.length === 0 ? (
            <p className="text-gray-500">Nessuna assicurazione registrata</p>
          ) : (
            <div className="space-y-3">
              {filteredInsurances.map(i => (
                <div key={i.id} className="flex justify-between items-center p-3 bg-indigo-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{i.company} • {i.policyNumber}</p>
                    <p className="text-xs text-gray-600">Scadenza: {formatDate(i.expiryDate)} • Premio annuo: €{i.annualPremium.toFixed(2)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setEditingInsuranceId(i.id)}>Modifica</Button>
                    <Button variant="outline" onClick={async () => { const res = await deleteInsurance(i.id); if ((res as any)?.success) { onRefreshNotifications?.(); } }}>
                      Elimina
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <p className="text-sm text-gray-500">Sezione nascosta • Assicurazioni: {filteredInsurances.length}</p>
        )}
        {editingInsuranceId && (
          <div className="mt-4 border-t pt-4">
            <SimpleInsuranceForm
              onCancel={() => { setEditingInsuranceId(null); setInsuranceEditError(null); }}
              errorMessage={insuranceEditError ?? undefined}
              initialData={() => {
                const item = insurances.find(x => x.id === editingInsuranceId);
                return item ? { company: item.company, expiryDate: item.expiryDate, annualPremium: item.annualPremium } : undefined;
              }}
              submitLabel="Aggiorna"
              onSubmit={async (data) => {
                const res = await updateInsurance(editingInsuranceId!, data);
                if ((res as any)?.success) { setInsuranceEditError(null); setEditingInsuranceId(null); onRefreshNotifications?.(); }
                else { setInsuranceEditError((res as any)?.error || 'Errore nell\'aggiornamento assicurazione'); }
              }}
            />
          </div>
        )}
        {showAddInsurance && (
          <div className="mt-6 border-t pt-4">
            <SimpleInsuranceForm 
              onCancel={() => setShowAddInsurance(false)}
              errorMessage={insuranceError ?? undefined}
              onSubmit={async (data) => {
                const res = await addInsurance(data);
                if ((res as any)?.success) { setInsuranceError(null); setShowAddInsurance(false); setSelectedYear('all'); onRefreshNotifications?.(); }
                else { setInsuranceError((res as any)?.error || 'Errore nel salvataggio assicurazione'); }
              }}
            />
          </div>
        )}
      </Card>

      {/* Bollo Auto */}
      <Card className="p-6 mt-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <CreditCard className="h-5 w-5 mr-2 text-blue-500" />
            Bollo Auto
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowTaxesSection(v => !v)}>
              {showTaxesSection ? 'Nascondi' : 'Mostra'}
            </Button>
            <Button onClick={() => { setShowAddTax(true); setEditingTaxId(null); }}>
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi Bollo
            </Button>
          </div>
        </div>
        {showTaxesSection ? (
          filteredTaxes.length === 0 ? (
            <p className="text-gray-500">Nessun bollo registrato</p>
          ) : (
            <div className="space-y-3">
              {filteredTaxes.map(t => (
                <div key={t.id} className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{t.region} • {formatDate(t.expiryDate)}</p>
                    <p className="text-xs text-gray-600">Importo: €{t.amount.toFixed(2)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setEditingTaxId(t.id)}>Modifica</Button>
                    <Button variant="outline" onClick={async () => { const res = await deleteTax(t.id); if ((res as any)?.success) { onRefreshNotifications?.(); } }}>
                      Elimina
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <p className="text-sm text-gray-500">Sezione nascosta • Bolli: {filteredTaxes.length}</p>
        )}
        {editingTaxId && (
          <div className="mt-4 border-t pt-4">
            <SimpleTaxForm
              onCancel={() => { setEditingTaxId(null); setTaxEditError(null); }}
              errorMessage={taxEditError ?? undefined}
              initialData={() => {
                const item = taxes.find(x => x.id === editingTaxId);
                return item ? { expiryDate: item.expiryDate, amount: item.amount, region: item.region } : undefined;
              }}
              submitLabel="Aggiorna"
              onSubmit={async (data) => {
                const res = await updateTax(editingTaxId!, data);
                if ((res as any)?.success) { setTaxEditError(null); setEditingTaxId(null); onRefreshNotifications?.(); }
                else { setTaxEditError((res as any)?.error || 'Errore nell\'aggiornamento bollo'); }
              }}
            />
          </div>
        )}
        {showAddTax && (
          <div className="mt-6 border-t pt-4">
            <SimpleTaxForm 
              onCancel={() => setShowAddTax(false)}
              errorMessage={taxError ?? undefined}
              onSubmit={async (data) => {
                const res = await addTax({ ...data, isPaid: true });
                if ((res as any)?.success) { setTaxError(null); setShowAddTax(false); setSelectedYear('all'); onRefreshNotifications?.(); }
                else { setTaxError((res as any)?.error || 'Errore nel salvataggio bollo'); }
              }}
            />
          </div>
        )}
      </Card>

      {/* Revisioni */}
      <Card className="p-6 mt-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <FileText className="h-5 w-5 mr-2 text-orange-500" />
            Revisioni
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowInspectionsSection(v => !v)}>
              {showInspectionsSection ? 'Nascondi' : 'Mostra'}
            </Button>
            <Button onClick={() => { setShowAddInspection(true); setEditingInspectionId(null); }}>
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi Revisione
            </Button>
          </div>
        </div>
        {showInspectionsSection ? (
          filteredInspections.length === 0 ? (
            <p className="text-gray-500">Nessuna revisione registrata</p>
          ) : (
            <div className="space-y-3">
              {filteredInspections.map(i => (
                <div key={i.id} className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Ultima: {formatDate(i.lastInspectionDate)} • Prossima: {formatDate(i.nextInspectionDate)}</p>
                    <p className="text-xs text-gray-600">Centro: {i.inspectionCenter || '—'} • Costo: €{i.cost.toFixed(2)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setEditingInspectionId(i.id)}>Modifica</Button>
                    <Button variant="outline" onClick={async () => { const res = await deleteInspection(i.id); if ((res as any)?.success) { onRefreshNotifications?.(); } }}>
                      Elimina
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <p className="text-sm text-gray-500">Sezione nascosta • Revisioni: {filteredInspections.length}</p>
        )}
        {editingInspectionId && (
          <div className="mt-4 border-t pt-4">
            <SimpleInspectionForm
              onCancel={() => { setEditingInspectionId(null); setInspectionEditError(null); }}
              errorMessage={inspectionEditError ?? undefined}
              initialData={() => {
                const item = inspections.find(x => x.id === editingInspectionId);
                return item ? { lastInspectionDate: item.lastInspectionDate, nextInspectionDate: item.nextInspectionDate, inspectionCenter: item.inspectionCenter, cost: item.cost } : undefined;
              }}
              submitLabel="Aggiorna"
              onSubmit={async (data) => {
                const res = await updateInspection(editingInspectionId!, data);
                if ((res as any)?.success) { setInspectionEditError(null); setEditingInspectionId(null); onRefreshNotifications?.(); }
                else { setInspectionEditError((res as any)?.error || 'Errore nell\'aggiornamento revisione'); }
              }}
            />
          </div>
        )}
        {showAddInspection && (
          <div className="mt-6 border-t pt-4">
            <SimpleInspectionForm 
              onCancel={() => setShowAddInspection(false)}
              errorMessage={inspectionError ?? undefined}
              onSubmit={async (data) => {
                const res = await addInspection(data);
                if ((res as any)?.success) { setInspectionError(null); setShowAddInspection(false); setSelectedYear('all'); onRefreshNotifications?.(); }
                else { setInspectionError((res as any)?.error || 'Errore nel salvataggio revisione'); }
              }}
            />
          </div>
        )}
      </Card>

      {/* Tagliandi */}
      <Card className="p-6 mt-6 mb-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Wrench className="h-5 w-5 mr-2 text-green-600" />
            Tagliandi
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowServicesSection(v => !v)}>
              {showServicesSection ? 'Nascondi' : 'Mostra'}
            </Button>
            <Button onClick={() => { setShowAddService(true); setEditingServiceId(null); }}>
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi Tagliando
            </Button>
          </div>
        </div>
        {showServicesSection ? (
          filteredServices.length === 0 ? (
            <p className="text-gray-500">Nessun tagliando registrato</p>
          ) : (
            <div className="space-y-3">
              {filteredServices.map(s => {
                const kmRemaining = typeof s.nextServiceMileage === 'number' ? (s.nextServiceMileage - (vehicle.currentMileage ?? 0)) : null;
                const overdueKm = typeof s.nextServiceMileage === 'number' ? ((vehicle.currentMileage ?? 0) - s.nextServiceMileage) : null;
                const isOverdue = (overdueKm ?? -1) >= 0;
                return (
                  <div key={s.id} className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Ultimo: {formatDate(s.lastServiceDate)} • Km: {s.lastServiceMileage}</p>
                      <p className="text-xs text-gray-600">
                        Intervallo: {s.serviceInterval}km • Prossimo a {s.nextServiceMileage}km • Tipo: {s.serviceType === 'major' ? 'Maggiore' : 'Regolare'}
                        {kmRemaining !== null && (
                          <span className={isOverdue ? 'text-red-600 font-medium ml-2' : 'text-gray-700 ml-2'}>
                            {isOverdue ? `Scaduto di ${overdueKm} km` : `Mancano ${Math.max(0, kmRemaining)} km`}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setEditingServiceId(s.id)}>Modifica</Button>
                      <Button variant="outline" onClick={async () => { const res = await deleteService(s.id); if ((res as any)?.success) { onRefreshNotifications?.(); } }}>
                        Elimina
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <p className="text-sm text-gray-500">Sezione nascosta • Tagliandi: {filteredServices.length}</p>
        )}
        {editingServiceId && (
          <div className="mt-4 border-t pt-4">
            <SimpleServiceForm
              onCancel={() => { setEditingServiceId(null); setServiceEditError(null); }}
              errorMessage={serviceEditError ?? undefined}
              initialData={() => {
                const item = services.find(x => x.id === editingServiceId);
                return item ? { lastServiceMileage: item.lastServiceMileage, lastServiceDate: item.lastServiceDate, serviceInterval: item.serviceInterval, nextServiceMileage: item.nextServiceMileage, serviceType: item.serviceType } : undefined;
              }}
              submitLabel="Aggiorna"
              onSubmit={async (data) => {
                // Validazione: il prossimo tagliando non può essere inferiore ai km attuali
                if (typeof data.nextServiceMileage === 'number' && data.nextServiceMileage < (vehicle.currentMileage ?? 0)) {
                  setServiceEditError('Il prossimo tagliando deve essere ≥ chilometraggio attuale del veicolo');
                  return;
                }
                // Aggiorna chilometraggio veicolo se l'ultimo tagliando supera gli attuali
                if (typeof data.lastServiceMileage === 'number' && data.lastServiceMileage > (vehicle.currentMileage ?? 0)) {
                  await (onUpdateVehicleMileage?.(data.lastServiceMileage) as unknown as Promise<{ success: boolean; error?: string }>);
                }
                const res = await updateService(editingServiceId!, data);
                if ((res as any)?.success) { setServiceEditError(null); setEditingServiceId(null); onRefreshNotifications?.(); }
                else { setServiceEditError((res as any)?.error || 'Errore nell\'aggiornamento tagliando'); }
              }}
            />
          </div>
        )}
        {showAddService && (
          <div className="mt-6 border-t pt-4">
            <SimpleServiceForm 
              onCancel={() => setShowAddService(false)}
              errorMessage={serviceError ?? undefined}
              onSubmit={async (data) => {
                // Validazione: il prossimo tagliando non può essere inferiore ai km attuali
                if (typeof data.nextServiceMileage === 'number' && data.nextServiceMileage < (vehicle.currentMileage ?? 0)) {
                  setServiceError('Il prossimo tagliando deve essere ≥ chilometraggio attuale del veicolo');
                  return;
                }
                // Aggiorna chilometraggio veicolo se l'ultimo tagliando supera gli attuali
                if (typeof data.lastServiceMileage === 'number' && data.lastServiceMileage > (vehicle.currentMileage ?? 0)) {
                  await (onUpdateVehicleMileage?.(data.lastServiceMileage) as unknown as Promise<{ success: boolean; error?: string }>);
                }
                const res = await addService(data);
                if ((res as any)?.success) { setServiceError(null); setShowAddService(false); setSelectedYear('all'); onRefreshNotifications?.(); }
                else { setServiceError((res as any)?.error || 'Errore nel salvataggio tagliando'); }
              }}
            />
          </div>
        )}
      </Card>

      {/* Add Maintenance Modal */}
      {showAddMaintenance && (
        <AddMaintenanceForm
          vehicle={vehicle}
          errorMessage={maintenanceError ?? undefined}
          onSubmit={async (maintenance) => {
            if (typeof maintenance.mileage === 'number' && (vehicle.currentMileage ?? 0) < maintenance.mileage) {
              await (onUpdateVehicleMileage?.(maintenance.mileage) as unknown as Promise<{ success: boolean; error?: string }>);
            }
            const result = await (onAddMaintenance(maintenance) as unknown as Promise<{ success: boolean; error?: string }>);
            if (result && (result as any).success) {
              setMaintenanceError(null);
              setShowAddMaintenance(false);
              onRefreshNotifications?.();
            } else {
              setMaintenanceError((result as any)?.error || 'Errore nell\'aggiunta della manutenzione');
            }
          }}
          onCancel={() => setShowAddMaintenance(false)}
        />
      )}

      {/* Maintenance Info Modal */}
      {maintenanceInfoId && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-xl">
            <div className="p-6">
              {(() => {
                const item = maintenances.find(m => m.id === maintenanceInfoId);
                if (!item) return null;
                const current = vehicle.currentMileage ?? 0;
                const kmUntil = typeof item.nextMileage === 'number' ? (item.nextMileage - current) : undefined;
                const status = item.nextDue
                  ? (() => {
                      const today = new Date();
                      const nextDue = new Date(item.nextDue);
                      const diffDays = Math.ceil((nextDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                      return diffDays < 0 ? 'expired' : (diffDays <= 7 ? 'critical' : (diffDays <= 30 ? 'warning' : 'safe'));
                    })()
                  : (typeof kmUntil === 'number'
                      ? (kmUntil <= 0 ? 'expired' : (kmUntil <= 250 ? 'critical' : (kmUntil <= 600 ? 'warning' : 'safe')))
                      : 'safe');
                return (
                  <>
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Dettagli Manutenzione</h3>
                      <button className="text-gray-500 hover:text-gray-700" onClick={() => setMaintenanceInfoId(null)}>Chiudi</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Titolo</p>
                        <p className="text-sm text-gray-900">{item.title}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Tipo</p>
                        <p className="text-sm text-gray-900">{
                          ({ oil: 'Cambio olio', filters: 'Filtri', brakes: 'Freni', tires: 'Cambio pneumatici', adblue: 'AdBlue', other: 'Manutenzione' } as Record<string, string>)[item.type] || 'Manutenzione'
                        }</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Data</p>
                        <p className="text-sm text-gray-900">{formatDate(item.date)}</p>
                      </div>
                      {item.mileage && (
                        <div>
                          <p className="text-sm font-medium text-gray-700">Km veicolo all'intervento</p>
                          <p className="text-sm text-gray-900">{item.mileage.toLocaleString()} km</p>
                        </div>
                      )}
                      
                      <div>
                        <p className="text-sm font-medium text-gray-700">Costo</p>
                        <p className="text-sm text-gray-900">€{item.cost.toFixed(2)}</p>
                      </div>
                      {item.location && (
                        <div>
                          <p className="text-sm font-medium text-gray-700">Luogo</p>
                          <p className="text-sm text-gray-900">{item.location}</p>
                        </div>
                      )}
                    </div>
                    
                    {(item.nextDue || typeof item.nextMileage === 'number') && (
                      <div className="bg-blue-50 p-3 rounded-lg mb-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-blue-900">Prossima Scadenza</p>
                            {item.nextDue ? (
                              <p className="text-sm text-blue-700">{formatDate(item.nextDue)}</p>
                            ) : (
                              <p className="text-sm text-blue-700">
                                Km rimanenti: {Math.max(0, (item.nextMileage! - current)).toLocaleString()} km
                              </p>
                            )}
                          </div>
                          {typeof item.nextMileage === 'number' && (
                            <div className="text-right">
                              <p className="text-sm font-medium text-blue-900">A</p>
                              <p className="text-sm text-blue-700">{item.nextMileage.toLocaleString()} km</p>
                            </div>
                          )}
                        </div>
                        <div className="mt-3">
                          <StatusBadge status={status as any}>
                            {(status === 'expired') ? 'SCADUTA' : (status === 'critical') ? 'URGENTE' : (status === 'warning') ? 'IN SCADENZA' : 'OK'}
                          </StatusBadge>
                        </div>
                      </div>
                    )}
                    {item.description && (
                      <div className="bg-gray-50 p-3 rounded-lg mb-4">
                        <p className="text-sm font-medium text-gray-700 mb-1">Descrizione</p>
                        <p className="text-sm text-gray-900">{item.description}</p>
                      </div>
                    )}
                    {item.notes && (
                      <div className="bg-gray-50 p-3 rounded-lg mb-4">
                        <p className="text-sm font-medium text-gray-700 mb-1">Note</p>
                        <p className="text-sm text-gray-900">{item.notes}</p>
                      </div>
                    )}
                    <div className="text-right">
                      <Button variant="outline" onClick={() => setMaintenanceInfoId(null)}>Chiudi</Button>
                    </div>
                  </>
                );
              })()}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

// Semplici form inline per inserimento dati reali
const SimpleInsuranceForm: React.FC<{ onSubmit: (data: { company: string; expiryDate: string; annualPremium: number; }) => void; onCancel: () => void; errorMessage?: string; initialData?: () => { company: string; expiryDate: string; annualPremium: number } | undefined; submitLabel?: string; }>
  = ({ onSubmit, onCancel, errorMessage, initialData, submitLabel }) => {
  const initial = initialData?.();
  const [company, setCompany] = React.useState(initial?.company ?? '');
  const [expiryDate, setExpiryDate] = React.useState(initial?.expiryDate ?? toInputDate(new Date()));
  const [annualPremium, setAnnualPremium] = React.useState(initial?.annualPremium ?? 0);
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSubmit({ company, expiryDate, annualPremium }); }}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <input className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="Compagnia" value={company} onChange={e => setCompany(e.target.value)} required />
          <p className="mt-1 text-xs text-gray-500">Compagnia assicurativa (es. Allianz, Unipol).</p>
        </div>
        <div>
          <input type="date" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} required />
          <p className="mt-1 text-xs text-gray-500">Data di scadenza della polizza.</p>
        </div>
        <div>
          <input type="number" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="Premio annuo (€)" value={annualPremium} onChange={e => setAnnualPremium(Number(e.target.value))} required min={0} step="0.01" />
          <p className="mt-1 text-xs text-gray-500">Premio annuo totale (senza rate).</p>
        </div>
      </div>
      {errorMessage && (<p className="text-sm text-red-600">{errorMessage}</p>)}
      <div className="flex gap-2">
        <Button type="submit">{submitLabel ?? 'Salva'}</Button>
        <Button variant="outline" type="button" onClick={onCancel}>Annulla</Button>
      </div>
    </form>
  );
};

const SimpleTaxForm: React.FC<{ onSubmit: (data: { expiryDate: string; amount: number; region: string; }) => void; onCancel: () => void; errorMessage?: string; initialData?: () => { expiryDate: string; amount: number; region: string } | undefined; submitLabel?: string; }>
  = ({ onSubmit, onCancel, errorMessage, initialData, submitLabel }) => {
  const initial = initialData?.();
  const [expiryDate, setExpiryDate] = React.useState(initial?.expiryDate ?? toInputDate(new Date()));
  const [amount, setAmount] = React.useState(initial?.amount ?? 0);
  const [region, setRegion] = React.useState(initial?.region ?? '');
  const italianRegions = [
    'Abruzzo', 'Basilicata', 'Calabria', 'Campania', 'Emilia-Romagna', 'Friuli Venezia Giulia', 'Lazio', 'Liguria',
    'Lombardia', 'Marche', 'Molise', 'Piemonte', 'Puglia', 'Sardegna', 'Sicilia', 'Toscana',
    'Trentino-Alto Adige', 'Umbria', 'Valle d\'Aosta', 'Veneto'
  ];
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSubmit({ expiryDate, amount, region }); }}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <input type="date" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} required />
          <p className="mt-1 text-xs text-gray-500">Data scadenza del bollo per l’annualità.</p>
        </div>
        <div>
          <input type="number" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="Importo (€)" value={amount} onChange={e => setAmount(Number(e.target.value))} required min={0} step="0.01" />
          <p className="mt-1 text-xs text-gray-500">Importo totale del bollo da pagare.</p>
        </div>
        <div>
          <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" value={region} onChange={e => setRegion(e.target.value)} required>
            <option value="">Seleziona regione</option>
            {italianRegions.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">Regione di immatricolazione del veicolo.</p>
        </div>
      </div>
      {errorMessage && (<p className="text-sm text-red-600">{errorMessage}</p>)}
      <div className="flex gap-2">
        <Button type="submit">{submitLabel ?? 'Salva'}</Button>
        <Button variant="outline" type="button" onClick={onCancel}>Annulla</Button>
      </div>
    </form>
  );
};

const SimpleInspectionForm: React.FC<{ onSubmit: (data: { lastInspectionDate: string; nextInspectionDate: string; inspectionCenter: string; cost: number; }) => void; onCancel: () => void; errorMessage?: string; initialData?: () => { lastInspectionDate: string; nextInspectionDate: string; inspectionCenter: string; cost: number } | undefined; submitLabel?: string; }>
  = ({ onSubmit, onCancel, errorMessage, initialData, submitLabel }) => {
  const initial = initialData?.();
  const [lastInspectionDate, setLastInspectionDate] = React.useState(initial?.lastInspectionDate ?? toInputDate(new Date()));
  const [nextInspectionDate, setNextInspectionDate] = React.useState(initial?.nextInspectionDate ?? toInputDate(new Date(new Date().setFullYear(new Date().getFullYear() + 2))));
  const [inspectionCenter, setInspectionCenter] = React.useState(initial?.inspectionCenter ?? '');
  const [cost, setCost] = React.useState(initial?.cost ?? 0);

  // Aggiorna automaticamente la prossima revisione a +2 anni dall'ultima
  React.useEffect(() => {
    if (lastInspectionDate) {
      const base = new Date(lastInspectionDate);
      const next = new Date(base);
      next.setFullYear(base.getFullYear() + 2);
      setNextInspectionDate(toInputDate(next));
    }
  }, [lastInspectionDate]);
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSubmit({ lastInspectionDate, nextInspectionDate, inspectionCenter, cost }); }}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <input type="date" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" value={lastInspectionDate} onChange={e => setLastInspectionDate(e.target.value)} required />
          <p className="mt-1 text-xs text-gray-500">Data dell’ultima revisione effettuata.</p>
        </div>
        <div>
          <input type="date" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" value={nextInspectionDate} onChange={e => setNextInspectionDate(e.target.value)} required />
          <p className="mt-1 text-xs text-gray-500">Data della prossima scadenza revisione.</p>
        </div>
        <div>
          <input className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="Centro revisione" value={inspectionCenter} onChange={e => setInspectionCenter(e.target.value)} />
          <p className="mt-1 text-xs text-gray-500">Centro revisione dove è stata effettuata.</p>
        </div>
        <div>
          <input type="number" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="Costo (€)" value={cost} onChange={e => setCost(Number(e.target.value))} />
          <p className="mt-1 text-xs text-gray-500">Costo pagato per la revisione.</p>
        </div>
      </div>
      {errorMessage && (<p className="text-sm text-red-600">{errorMessage}</p>)}
      <div className="flex gap-2">
        <Button type="submit">{submitLabel ?? 'Salva'}</Button>
        <Button variant="outline" type="button" onClick={onCancel}>Annulla</Button>
      </div>
    </form>
  );
};

const SimpleServiceForm: React.FC<{ onSubmit: (data: { lastServiceMileage: number; lastServiceDate: string; serviceInterval: number; nextServiceMileage: number; serviceType: 'regular' | 'major'; }) => void; onCancel: () => void; errorMessage?: string; initialData?: () => { lastServiceMileage: number; lastServiceDate: string; serviceInterval: number; nextServiceMileage: number; serviceType: 'regular' | 'major' } | undefined; submitLabel?: string; }>
  = ({ onSubmit, onCancel, errorMessage, initialData, submitLabel }) => {
  const initial = initialData?.();
  const [lastServiceMileage, setLastServiceMileage] = React.useState(initial?.lastServiceMileage ?? 0);
  const [lastServiceDate, setLastServiceDate] = React.useState(initial?.lastServiceDate ?? toInputDate(new Date()));
  const [serviceInterval, setServiceInterval] = React.useState(initial?.serviceInterval ?? 15000);
  const [nextServiceMileage, setNextServiceMileage] = React.useState(initial?.nextServiceMileage ?? 0);
  const [serviceType, setServiceType] = React.useState<'regular' | 'major'>(initial?.serviceType ?? 'regular');

  // Calcolo automatico del prossimo tagliando: ultimo km + intervallo
  React.useEffect(() => {
    const autoNext = (Number(lastServiceMileage) || 0) + (Number(serviceInterval) || 0);
    setNextServiceMileage(autoNext);
  }, [lastServiceMileage, serviceInterval]);
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSubmit({ lastServiceMileage, lastServiceDate, serviceInterval, nextServiceMileage, serviceType }); }}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <input type="number" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="Km ultimo tagliando" value={lastServiceMileage} onChange={e => setLastServiceMileage(Number(e.target.value))} />
          <p className="mt-1 text-xs text-gray-500">Chilometri al momento dell’ultimo tagliando.</p>
        </div>
        <div>
          <input type="date" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" value={lastServiceDate} onChange={e => setLastServiceDate(e.target.value)} />
          <p className="mt-1 text-xs text-gray-500">Data dell’ultimo tagliando.</p>
        </div>
        <div>
          <input type="number" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="Intervallo (km)" value={serviceInterval} onChange={e => setServiceInterval(Number(e.target.value))} />
          <p className="mt-1 text-xs text-gray-500">Intervallo chilometrico tra tagliandi (es. 15000).</p>
        </div>
        <div>
          <input type="number" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="Prossimo a km" value={nextServiceMileage} onChange={e => setNextServiceMileage(Number(e.target.value))} />
          <p className="mt-1 text-xs text-gray-500">Chilometraggio previsto per il prossimo tagliando.</p>
        </div>
        <div>
          <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" value={serviceType} onChange={e => setServiceType(e.target.value as 'regular' | 'major')}>
            <option value="regular">Regolare</option>
            <option value="major">Maggiore</option>
          </select>
          <p className="mt-1 text-xs text-gray-500">Tipo di tagliando: regolare o maggiore.</p>
        </div>
      </div>
      {errorMessage && (<p className="text-sm text-red-600">{errorMessage}</p>)}
      <div className="flex gap-2">
        <Button type="submit">{submitLabel ?? 'Salva'}</Button>
        <Button variant="outline" type="button" onClick={onCancel}>Annulla</Button>
      </div>
    </form>
  );
};

// (form di modifica manutenzione rimosso)
