import React, { useState } from 'react';
import type { ClinicSettings, Professional, BlockedTimeRange, DaySchedule } from '../types';
import { TrashIcon, PencilSquareIcon, PlusIcon } from './icons';
import ConfirmDialog from './ConfirmDialog';
import { compressImage } from '../imageUtils';

const DEFAULT_WEEKLY_SCHEDULE: DaySchedule[] = [
  { dayOfWeek: 1, enabled: true, startHour: '08:00', endHour: '18:00' }, // Lunes
  { dayOfWeek: 2, enabled: true, startHour: '08:00', endHour: '18:00' }, // Martes
  { dayOfWeek: 3, enabled: true, startHour: '08:00', endHour: '18:00' }, // Miércoles
  { dayOfWeek: 4, enabled: true, startHour: '08:00', endHour: '18:00' }, // Jueves
  { dayOfWeek: 5, enabled: true, startHour: '08:00', endHour: '18:00' }, // Viernes
  { dayOfWeek: 6, enabled: false, startHour: '09:00', endHour: '13:00' }, // Sábado
  { dayOfWeek: 0, enabled: false, startHour: '09:00', endHour: '13:00' }, // Domingo
];

interface SettingsProps {
  settings: ClinicSettings;
  onUpdateSettings: (settings: ClinicSettings) => void;
  professionals: Professional[];
  onUpdateProfessionals: (professionals: Professional[]) => void;
}

const Settings: React.FC<SettingsProps> = ({ 
  settings, 
  onUpdateSettings,
  professionals,
  onUpdateProfessionals
}) => {
  const [activeTab, setActiveTab] = useState<'clinic' | 'professionals'>('clinic');
  
  // Custom confirmation dialog state
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    danger: false,
  });
  
  // Tab 1: Clinic settings state
  const [clinicForm, setClinicForm] = useState<ClinicSettings>(settings);

  // Tab 2: Professionals settings state
  const [editingProf, setEditingProf] = useState<Professional | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Form states for active Professional Add/Edit
  const [profName, setProfName] = useState('');
  const [profSpecialty, setProfSpecialty] = useState('');
  const [profLicense, setProfLicense] = useState('');
  const [profAvatar, setProfAvatar] = useState('');
  const [profSlotInterval, setProfSlotInterval] = useState<15 | 20 | 30 | 40 | 60>(30);
  const [profStartHour, setProfStartHour] = useState('08:00');
  const [profEndHour, setProfEndHour] = useState('18:00');
  const [profBlockedRanges, setProfBlockedRanges] = useState<BlockedTimeRange[]>([]);
  const [profWeeklySchedule, setProfWeeklySchedule] = useState<DaySchedule[]>([]);
  const [profTelemedicineWeeklySchedule, setProfTelemedicineWeeklySchedule] = useState<DaySchedule[]>([]);
  const [profTelemedicineEnabled, setProfTelemedicineEnabled] = useState(false);

  // New Block form state
  const [newBlockStartDate, setNewBlockStartDate] = useState('');
  const [newBlockEndDate, setNewBlockEndDate] = useState('');
  const [newBlockIsFullDay, setNewBlockIsFullDay] = useState(true);
  const [newBlockStartTime, setNewBlockStartTime] = useState('08:00');
  const [newBlockEndTime, setNewBlockEndTime] = useState('18:00');
  const [newBlockReason, setNewBlockReason] = useState<'vacation' | 'sickness' | 'personal' | 'other'>('vacation');
  const [newBlockComment, setNewBlockComment] = useState('');

  // Handle clinic submit
  const handleClinicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(clinicForm);
  };

  const handleClinicChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setClinicForm(prev => ({ ...prev, [name]: value }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      compressImage(file, 400, 400, 0.7)
        .then(compressedUrl => {
          setClinicForm(prev => ({ ...prev, logo: compressedUrl }));
        })
        .catch(err => {
          console.error("Error compressing logo:", err);
          const reader = new FileReader();
          reader.onloadend = () => {
            setClinicForm(prev => ({ ...prev, logo: reader.result as string }));
          };
          reader.readAsDataURL(file);
        });
    }
  };

  const handleProfAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      compressImage(file, 200, 200, 0.7)
        .then(compressedUrl => {
          setProfAvatar(compressedUrl);
        })
        .catch(err => {
          console.error("Error compressing avatar:", err);
          const reader = new FileReader();
          reader.onloadend = () => {
            setProfAvatar(reader.result as string);
          };
          reader.readAsDataURL(file);
        });
    }
  };

  const handleUpdateDaySchedule = (dayIndex: number, field: 'enabled' | 'startHour' | 'endHour', value: any) => {
    setProfWeeklySchedule(prev => prev.map(item => {
      if (item.dayOfWeek === dayIndex) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleUpdateTelemedicineDaySchedule = (dayIndex: number, field: 'enabled' | 'startHour' | 'endHour', value: any) => {
    setProfTelemedicineWeeklySchedule(prev => prev.map(item => {
      if (item.dayOfWeek === dayIndex) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  // Start adding a new professional
  const startAddNewProf = () => {
    setProfName('');
    setProfSpecialty('');
    setProfLicense('');
    setProfAvatar('https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=200&h=200');
    setProfSlotInterval(30);
    setProfStartHour('08:00');
    setProfEndHour('18:00');
    setProfBlockedRanges([]);
    setProfWeeklySchedule(JSON.parse(JSON.stringify(DEFAULT_WEEKLY_SCHEDULE)));
    setProfTelemedicineWeeklySchedule(JSON.parse(JSON.stringify(DEFAULT_WEEKLY_SCHEDULE)));
    setProfTelemedicineEnabled(false);
    setIsAddingNew(true);
    setEditingProf(null);
  };

  // Edit current professional
  const startEditProf = (prof: Professional) => {
    setEditingProf(prof);
    setProfName(prof.name);
    setProfSpecialty(prof.specialty);
    setProfLicense(prof.license || '');
    setProfAvatar(prof.avatar);
    setProfSlotInterval(prof.slotInterval);
    setProfStartHour(prof.startHour);
    setProfEndHour(prof.endHour);
    setProfBlockedRanges(prof.blockedRanges || []);
    setProfWeeklySchedule(prof.weeklySchedule ? JSON.parse(JSON.stringify(prof.weeklySchedule)) : JSON.parse(JSON.stringify(DEFAULT_WEEKLY_SCHEDULE)));
    setProfTelemedicineWeeklySchedule(prof.telemedicineWeeklySchedule ? JSON.parse(JSON.stringify(prof.telemedicineWeeklySchedule)) : JSON.parse(JSON.stringify(DEFAULT_WEEKLY_SCHEDULE)));
    setProfTelemedicineEnabled(prof.telemedicineEnabled || false);
    setIsAddingNew(false);
  };

  // Cancel edit/add professional
  const cancelProfEdit = () => {
    setEditingProf(null);
    setIsAddingNew(false);
  };

  // Add a blocked range in local draft
  const handleAddBlockLocal = () => {
    if (!newBlockStartDate || !newBlockEndDate) {
      alert("Por favor configure las fechas de inicio y fin del bloqueo.");
      return;
    }
    const newBlock: BlockedTimeRange = {
      id: Date.now(),
      startDate: newBlockStartDate,
      endDate: newBlockEndDate,
      startTime: newBlockIsFullDay ? undefined : newBlockStartTime,
      endTime: newBlockIsFullDay ? undefined : newBlockEndTime,
      reason: newBlockReason,
      comment: newBlockComment,
    };

    setProfBlockedRanges(prev => [...prev, newBlock]);
    // reset block form fields
    setNewBlockStartDate('');
    setNewBlockEndDate('');
    setNewBlockIsFullDay(true);
    setNewBlockComment('');
  };

  // Delete a blocked range in local draft
  const handleDeleteBlockLocal = (blockId: number) => {
    setProfBlockedRanges(prev => prev.filter(b => b.id !== blockId));
  };

  // Save changes to professionals list
  const handleSaveProf = () => {
    if (!profName.trim() || !profSpecialty.trim()) {
      alert("Por favor complete nombre y especialidad.");
      return;
    }

    if (isAddingNew) {
      const newProfessional: Professional = {
        id: Date.now(),
        name: profName,
        specialty: profSpecialty,
        license: profLicense,
        avatar: profAvatar || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=200&h=200',
        slotInterval: profSlotInterval,
        startHour: profStartHour,
        endHour: profEndHour,
        blockedRanges: profBlockedRanges,
        weeklySchedule: profWeeklySchedule,
        telemedicineWeeklySchedule: profTelemedicineWeeklySchedule,
        telemedicineEnabled: profTelemedicineEnabled,
      };
      onUpdateProfessionals([...professionals, newProfessional]);
      alert("Profesional agregado exitosamente.");
    } else if (editingProf) {
      const updatedProfessionals = professionals.map(p => {
        if (p.id === editingProf.id) {
          return {
            ...p,
            name: profName,
            specialty: profSpecialty,
            license: profLicense,
            avatar: profAvatar,
            slotInterval: profSlotInterval,
            startHour: profStartHour,
            endHour: profEndHour,
            blockedRanges: profBlockedRanges,
            weeklySchedule: profWeeklySchedule,
            telemedicineWeeklySchedule: profTelemedicineWeeklySchedule,
            telemedicineEnabled: profTelemedicineEnabled,
          };
        }
        return p;
      });
      onUpdateProfessionals(updatedProfessionals);
      alert("Cambios guardados exitosamente.");
    }

    setEditingProf(null);
    setIsAddingNew(false);
  };

  // Delete professional
  const handleDeleteProf = (id: number) => {
    setConfirmState({
      isOpen: true,
      title: 'Eliminar Especialista',
      message: '¿Está seguro que desea eliminar este profesional o especialista médico? Se perderán sus configuraciones.',
      danger: true,
      onConfirm: () => {
        onUpdateProfessionals(professionals.filter(p => p.id !== id));
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case 'vacation': return 'Vacaciones';
      case 'sickness': return 'Enfermedad';
      case 'personal': return 'Motivos Personales';
      default: return 'Otros Motivos';
    }
  };

  const inputClass = "mt-1 block h-10 w-full px-3 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm dark:bg-slate-700 focus:ring-primary focus:border-primary text-sm text-slate-800 dark:text-slate-100";
  const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-300";

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Title */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border border-slate-100 dark:border-slate-700/50">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Configuraciones</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Administre la información del consultorio y configure las agendas y turnos de los profesionales clínicos.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 font-sans">
        <button
          onClick={() => { setActiveTab('clinic'); cancelProfEdit(); }}
          className={`py-3 px-6 font-semibold text-sm transition-all border-b-2 ${
            activeTab === 'clinic'
              ? 'border-primary text-primary dark:text-primary-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          Consultorio
        </button>
        <button
          onClick={() => setActiveTab('professionals')}
          className={`py-3 px-6 font-semibold text-sm transition-all border-b-2 ${
            activeTab === 'professionals'
              ? 'border-primary text-primary dark:text-primary-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          Profesionales y Agendas
        </button>
      </div>

      {activeTab === 'clinic' ? (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border border-slate-100 dark:border-slate-700/50">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6">Información General</h3>
          <form onSubmit={handleClinicSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className={labelClass}>Nombre del Consultorio</label>
                <input type="text" name="name" id="name" value={clinicForm.name} onChange={handleClinicChange} className={inputClass} required />
              </div>
              <div>
                <label htmlFor="cuil" className={labelClass}>CUIL / CUIT</label>
                <input type="text" name="cuil" id="cuil" value={clinicForm.cuil} onChange={handleClinicChange} className={inputClass} required />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="address" className={labelClass}>Dirección</label>
                <input type="text" name="address" id="address" value={clinicForm.address} onChange={handleClinicChange} className={inputClass} required />
              </div>
              <div>
                <label htmlFor="phone" className={labelClass}>Teléfono de Contacto</label>
                <input type="tel" name="phone" id="phone" value={clinicForm.phone} onChange={handleClinicChange} className={inputClass} required />
              </div>
              <div>
                <label htmlFor="logo" className={labelClass}>Logo del Consultorio</label>
                <input 
                  type="file" 
                  name="logo" 
                  id="logo" 
                  accept="image/png, image/jpeg"
                  onChange={handleLogoChange}
                  className="mt-2 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary hover:file:bg-primary-100 dark:file:bg-slate-700 dark:file:text-slate-350"
                />
                {clinicForm.logo && <img src={clinicForm.logo} alt="Vista previa" className="mt-4 w-32 h-auto rounded-md border border-slate-200 dark:border-slate-705" />}
              </div>
              
              <div className="md:col-span-2 bg-indigo-50/45 dark:bg-indigo-950/20 p-5 border border-indigo-150 dark:border-indigo-900/40 rounded-xl mt-2 flex items-center justify-between">
                <div className="flex items-start space-x-3.5">
                  <input 
                    type="checkbox" 
                    name="telemedicineModuleActive"
                    id="telemedicineModuleActive"
                    checked={clinicForm.telemedicineModuleActive || false} 
                    onChange={e => setClinicForm(prev => ({ ...prev, telemedicineModuleActive: e.target.checked }))} 
                    className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600 cursor-pointer mt-0.5" 
                  />
                  <div>
                    <label htmlFor="telemedicineModuleActive" className="block text-sm font-bold text-slate-800 dark:text-slate-100 cursor-pointer">
                      Activar Módulo Opcional de Telemedicina
                    </label>
                    <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Habilita la Turnera de Telemedicina separada y permite configurar qué especialistas del centro pueden atender de manera remota vía Jitsi Meet.
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="md:col-span-2 border-t pt-6 border-slate-100 dark:border-slate-700/60 mt-2">
                <label htmlFor="consentTemplate" className="block text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-1">
                  <span className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 text-[10px] px-2 py-0.5 rounded font-extrabold uppercase">Plantilla</span>
                  <span>Texto de Consentimiento Informado (PDF)</span>
                </label>
                <p className="text-xs text-slate-500 mb-3">Este escrito se presentará en formato de documento digital al paciente desde el Odontograma para que proceda a rubricarlo con su firma táctil, aclaración y DNI.</p>
                <textarea
                  name="consentTemplate"
                  id="consentTemplate"
                  rows={8}
                  value={clinicForm.consentTemplate || ''}
                  onChange={handleClinicChange}
                  placeholder="Redacte el contrato o consentimiento informado general para tratamientos de odontología..."
                  className="mt-1 block w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-100 focus:ring-primary focus:border-primary font-sans leading-relaxed"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
              <button type="submit" className="bg-primary hover:bg-primary-600 text-white font-bold py-2 px-6 rounded-lg transition-colors">
                Guardar Cambios
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="space-y-6">
          {!editingProf && !isAddingNew ? (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border border-slate-100 dark:border-slate-700/50 space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-700">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Profesionales Habilitados</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Defina las franjas de turnos y agendas particulares.</p>
                </div>
                <button
                  onClick={startAddNewProf}
                  className="bg-primary hover:bg-primary-600 text-white text-xs font-bold py-2 px-4 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Añadir Profesional</span>
                </button>
              </div>

              {/* Grid / List of professionals */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {professionals.map(prof => (
                  <div key={prof.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 flex items-start gap-4">
                    <img src={prof.avatar} alt={prof.name} className="w-14 h-14 rounded-full object-cover border-2 border-primary/20 flex-shrink-0" referrerPolicy="no-referrer" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">{prof.name}</h4>
                      <p className="text-xs text-primary font-semibold dark:text-primary-400 truncate">{prof.specialty}</p>
                      {prof.license && (
                        <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-extrabold mt-0.5">Matrícula: {prof.license}</p>
                      )}
                      
                      {settings.telemedicineModuleActive && prof.telemedicineEnabled && (
                        <div className="mt-1">
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-900/20">
                            💻 Telemedicina Activa
                          </span>
                        </div>
                      )}
                      
                      <div className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-400 font-mono">
                        <div>
                          <strong>Frecuencia:</strong> cada {prof.slotInterval} minutos
                        </div>
                        <div>
                          <strong>Horario:</strong> Configurado por día
                        </div>
                        <div>
                          <strong>Bloqueos:</strong> {prof.blockedRanges?.length || 0} cargados
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                        <button
                          onClick={() => startEditProf(prof)}
                          className="text-xs font-semibold py-1 px-2.5 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-md transition flex items-center gap-1"
                        >
                          <PencilSquareIcon className="w-3.5 h-3.5" />
                          <span>Configurar</span>
                        </button>
                        <button
                          onClick={() => handleDeleteProf(prof.id)}
                          className="text-xs font-semibold py-1 px-2.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 text-red-600 rounded-md transition flex items-center gap-1"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                          <span>Eliminar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // Add or Edit Form Panel
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border border-slate-100 dark:border-slate-700/50 space-y-6">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 border-b border-slate-150 dark:border-slate-700 pb-3">
                {isAddingNew ? 'Registrar odontólogo profesional nuevo' : `Configurar Agenda: ${profName}`}
              </h3>

              <div className="space-y-6">
                {/* Section 1: Professional details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={labelClass}>Nombre y Apellido</label>
                    <input 
                      type="text" 
                      value={profName} 
                      onChange={e => setProfName(e.target.value)} 
                      placeholder="Ej. Dra. María Perez" 
                      className={inputClass} 
                      required 
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Especialidad</label>
                    <input 
                      type="text" 
                      value={profSpecialty} 
                      onChange={e => setProfSpecialty(e.target.value)} 
                      placeholder="Ej. Ortodoncia, Cirugía" 
                      className={inputClass} 
                      required 
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Matrícula Provincial</label>
                    <input 
                      type="text" 
                      value={profLicense} 
                      onChange={e => setProfLicense(e.target.value)} 
                      placeholder="Ej. MP-8432-A" 
                      className={inputClass} 
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Intervalo de Turnos (Frecuencia)</label>
                    <select 
                      value={profSlotInterval} 
                      onChange={e => setProfSlotInterval(parseInt(e.target.value, 10) as any)} 
                      className={inputClass}
                    >
                      <option value={15}>Cada 15 minutos</option>
                      <option value={20}>Cada 20 minutos</option>
                      <option value={30}>Cada 30 minutos</option>
                      <option value={40}>Cada 40 minutos</option>
                      <option value={60}>Cada 60 minutos</option>
                    </select>
                  </div>

                  {settings.telemedicineModuleActive && (
                    <div className="md:col-span-2 bg-indigo-50/40 dark:bg-indigo-950/20 p-4 border border-indigo-150 dark:border-indigo-900/30 rounded-lg mt-2">
                      <label className="flex items-center space-x-3 text-sm font-semibold text-slate-700 dark:text-slate-350 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={profTelemedicineEnabled} 
                          onChange={e => setProfTelemedicineEnabled(e.target.checked)} 
                          className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600 cursor-pointer" 
                        />
                        <div>
                          <span className="block text-sm font-bold text-slate-800 dark:text-slate-100">👩‍⚕️ Habilitar Telemedicina para este Especialista</span>
                          <span className="block text-xs font-normal text-slate-500 dark:text-slate-400 mt-0.5">Permite asignarle consultas virtuales y agendar turnos de telemedicina con salasMeet Jitsi automatizadas.</span>
                        </div>
                      </label>
                    </div>
                  )}

                  <div className="md:col-span-2 border border-slate-200 dark:border-slate-700/60 p-4 rounded-lg bg-slate-50/40 dark:bg-slate-800/20">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 mb-1">
                      <span>📆</span> Configuración de Agenda Semanal
                    </h4>
                    <p className="text-xs text-slate-505 dark:text-slate-400 mb-4 font-normal">
                      Habilite los días de atención específica del especialista y configure el rango horario de su jornada diaria.
                    </p>
                    
                    <div className="space-y-2.5">
                      {[1, 2, 3, 4, 5, 6, 0].map(dayNum => {
                        const dayName = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][dayNum];
                        const daySched = profWeeklySchedule.find(s => s.dayOfWeek === dayNum) || {
                          dayOfWeek: dayNum,
                          enabled: false,
                          startHour: '08:00',
                          endHour: '18:00'
                        };
                        
                        return (
                          <div 
                            key={dayNum} 
                            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border transition-all ${
                              daySched.enabled 
                                ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm' 
                                : 'bg-slate-100/40 dark:bg-slate-900/10 border-slate-150 dark:border-slate-800/40 opacity-75'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <input 
                                type="checkbox"
                                id={`check-${dayNum}`}
                                checked={daySched.enabled}
                                onChange={e => handleUpdateDaySchedule(dayNum, 'enabled', e.target.checked)}
                                className="w-4 h-4 rounded text-primary focus:ring-primary border-slate-300 cursor-pointer"
                              />
                              <label 
                                htmlFor={`check-${dayNum}`}
                                className={`text-xs sm:text-sm font-bold cursor-pointer select-none ${
                                  daySched.enabled ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-555'
                                }`}
                              >
                                {dayName}
                              </label>
                            </div>

                            {daySched.enabled ? (
                              <div className="flex items-center gap-2 sm:gap-3">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-slate-450 dark:text-slate-450 font-medium">Desde:</span>
                                  <input 
                                    type="time"
                                    value={daySched.startHour}
                                    onChange={e => handleUpdateDaySchedule(dayNum, 'startHour', e.target.value)}
                                    className="h-8 text-xs px-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-850 dark:text-slate-100 focus:ring-1 focus:ring-primary"
                                  />
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-slate-450 dark:text-slate-450 font-medium">Hasta:</span>
                                  <input 
                                    type="time"
                                    value={daySched.endHour}
                                    onChange={e => handleUpdateDaySchedule(dayNum, 'endHour', e.target.value)}
                                    className="h-8 text-xs px-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-850 dark:text-slate-100 focus:ring-1 focus:ring-primary"
                                  />
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 dark:text-slate-500 italic flex items-center gap-1">
                                🔒 Cerrado / Sin atención
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {profTelemedicineEnabled && (
                    <div className="md:col-span-2 border border-emerald-200 dark:border-emerald-800/40 p-4 rounded-lg bg-emerald-50/15 dark:bg-emerald-950/5">
                      <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5 mb-1">
                        <span>📹</span> Configuración de Agenda de Telemedicina (Virtual)
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 font-normal">
                        Configure de forma independiente los días y el rango horario exclusivo para consultas de telemedicina por videollamada.
                      </p>
                      
                      <div className="space-y-2.5">
                        {[1, 2, 3, 4, 5, 6, 0].map(dayNum => {
                          const dayName = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][dayNum];
                          const daySched = (profTelemedicineWeeklySchedule && profTelemedicineWeeklySchedule.find(s => s.dayOfWeek === dayNum)) || {
                            dayOfWeek: dayNum,
                            enabled: false,
                            startHour: '08:00',
                            endHour: '18:00'
                          };
                          
                          return (
                            <div 
                              key={dayNum} 
                              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border transition-all ${
                                daySched.enabled 
                                  ? 'bg-white dark:bg-slate-800 border-emerald-200 dark:border-emerald-950 shadow-sm' 
                                  : 'bg-slate-100/40 dark:bg-slate-900/10 border-slate-150 dark:border-slate-800/40 opacity-75'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <input 
                                  type="checkbox"
                                  id={`telecheck-${dayNum}`}
                                  checked={daySched.enabled}
                                  onChange={e => handleUpdateTelemedicineDaySchedule(dayNum, 'enabled', e.target.checked)}
                                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                                />
                                <label 
                                  htmlFor={`telecheck-${dayNum}`}
                                  className={`text-xs sm:text-sm font-bold cursor-pointer select-none ${
                                    daySched.enabled ? 'text-emerald-800 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-555'
                                  }`}
                                >
                                  {dayName} (Virtual)
                                </label>
                              </div>

                              {daySched.enabled ? (
                                <div className="flex items-center gap-2 sm:gap-3">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-slate-450 dark:text-slate-450 font-medium">Desde:</span>
                                    <input 
                                      type="time"
                                      value={daySched.startHour}
                                      onChange={e => handleUpdateTelemedicineDaySchedule(dayNum, 'startHour', e.target.value)}
                                      className="h-8 text-xs px-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-850 dark:text-slate-100 focus:ring-1 focus:ring-emerald-500"
                                    />
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-slate-450 dark:text-slate-450 font-medium">Hasta:</span>
                                    <input 
                                      type="time"
                                      value={daySched.endHour}
                                      onChange={e => handleUpdateTelemedicineDaySchedule(dayNum, 'endHour', e.target.value)}
                                      className="h-8 text-xs px-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-850 dark:text-slate-100 focus:ring-1 focus:ring-emerald-500"
                                    />
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400 dark:text-slate-500 italic flex items-center gap-1">
                                  🔒 Sin videollamadas
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div className="md:col-span-2 border border-slate-200 dark:border-slate-700/60 p-4 rounded-lg bg-slate-50/40 dark:bg-slate-800/20">
                    <label className={`${labelClass} font-semibold mb-2`}>Foto de Perfil (Avatar)</label>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      {profAvatar ? (
                        <img 
                          src={profAvatar} 
                          alt="Vista previa" 
                          className="w-16 h-16 rounded-full object-cover border-2 border-primary/20 flex-shrink-0" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-500 font-extrabold flex-shrink-0 text-xl border">
                          ?
                        </div>
                      )}
                      <div className="flex-1 w-full space-y-3">
                        <div>
                          <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Subir desde la computadora</span>
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={handleProfAvatarChange}
                            className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-slate-300 dark:file:border-slate-600 file:text-xs file:font-semibold file:bg-white hover:file:bg-slate-50 dark:file:bg-slate-700 dark:file:text-slate-200 cursor-pointer"
                          />
                        </div>
                        <div>
                          <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">O pegar una URL externa de imagen</span>
                          <input 
                            type="text" 
                            value={profAvatar.startsWith('data:image') ? '' : profAvatar} 
                            onChange={e => setProfAvatar(e.target.value)} 
                            placeholder="https://..."
                            className={inputClass} 
                          />
                          {profAvatar.startsWith('data:image') && (
                            <p className="text-[10px] text-green-600 dark:text-green-400 mt-1">✓ Imagen cargada localmente con éxito</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Blocked shift ranges */}
                <div className="border-t border-slate-200 dark:border-slate-700 pt-6 space-y-4">
                  <div>
                    <h4 className="text-md font-bold text-slate-800 dark:text-slate-100">🚫 Bloquear Franjas Horarias de la Agenda</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Configure bloqueos por vacaciones, licencias médicas, enfermedad del profesional, o motivos personales. Se bloqueará la reserva en estos períodos.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="md:col-span-3">
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-350 mb-1">Fecha de Inicio</label>
                      <input 
                        type="date" 
                        value={newBlockStartDate} 
                        onChange={e => setNewBlockStartDate(e.target.value)} 
                        className={inputClass} 
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-350 mb-1">Fecha de Fin</label>
                      <input 
                        type="date" 
                        value={newBlockEndDate} 
                        onChange={e => setNewBlockEndDate(e.target.value)} 
                        className={inputClass} 
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-350 mb-1">Motivo</label>
                      <select 
                        value={newBlockReason} 
                        onChange={e => setNewBlockReason(e.target.value as any)} 
                        className={inputClass}
                      >
                        <option value="vacation">Vacaciones</option>
                        <option value="sickness">Enfermedad</option>
                        <option value="personal">Motivos Personales</option>
                        <option value="other">Otros</option>
                      </select>
                    </div>
                    <div className="md:col-span-4">
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-350 mb-1">Motivo / Comentarios (opcional)</label>
                      <input 
                        type="text" 
                        placeholder="Ej: Congreso odontológico" 
                        value={newBlockComment} 
                        onChange={e => setNewBlockComment(e.target.value)} 
                        className={inputClass} 
                      />
                    </div>

                    <div className="md:col-span-12 flex flex-col md:flex-row md:items-center md:justify-between border-t border-slate-200/50 dark:border-slate-700/50 pt-3 mt-1 gap-3">
                      <label className="flex items-center space-x-2.5 text-xs text-slate-600 dark:text-slate-300 font-semibold cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={newBlockIsFullDay} 
                          onChange={e => setNewBlockIsFullDay(e.target.checked)} 
                          className="w-4 h-4 rounded text-primary focus:ring-primary border-slate-300 dark:border-slate-600" 
                        />
                        <span>Bloquear de forma completa TODO EL DÍA</span>
                      </label>

                      {!newBlockIsFullDay && (
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-slate-500">Horario:</span>
                          <input type="time" value={newBlockStartTime} onChange={e => setNewBlockStartTime(e.target.value)} className="p-1 px-2 border dark:border-slate-600 rounded dark:bg-slate-700 text-xs text-slate-800 dark:text-slate-100" />
                          <span className="text-xs text-slate-500">hasta</span>
                          <input type="time" value={newBlockEndTime} onChange={e => setNewBlockEndTime(e.target.value)} className="p-1 px-2 border dark:border-slate-600 rounded dark:bg-slate-700 text-xs text-slate-800 dark:text-slate-100" />
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleAddBlockLocal}
                        className="bg-primary hover:bg-primary-600 text-white font-bold text-xs py-2 px-4 rounded-lg transition self-end"
                      >
                        + Añadir Bloqueo a la Lista
                      </button>
                    </div>
                  </div>

                  {/* List of active blocks drafted */}
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {profBlockedRanges.length === 0 ? (
                      <p className="text-xs text-slate-500 italic text-center py-2">No se han registrado bloqueos activos para esta agenda.</p>
                    ) : (
                      profBlockedRanges.map(block => (
                        <div key={block.id} className="flex items-center justify-between p-2.5 rounded-lg border border-red-100 dark:border-red-950/30 bg-red-50/25 dark:bg-red-950/10 text-xs text-slate-700 dark:text-slate-300">
                          <div className="space-y-0.5">
                            <span className="font-bold text-red-600 dark:text-red-400 capitalize">
                              [{getReasonLabel(block.reason)}] &mdash; 
                            </span>
                            <span className="ml-1">
                              Del {block.startDate} al {block.endDate}
                            </span>
                            {block.startTime && block.endTime ? (
                              <span className="text-slate-500 ml-2"> (Horario: {block.startTime} - {block.endTime}) </span>
                            ) : (
                              <span className="text-slate-500 ml-2"> (Todo el día) </span>
                            )}
                            {block.comment && <span className="text-slate-400 dark:text-slate-500 italic ml-2"> &ldquo;{block.comment}&rdquo; </span>}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteBlockLocal(block.id)}
                            className="p-1 text-slate-400 hover:text-red-650 transition"
                            title="Eliminar bloqueo"
                          >
                            <TrashIcon className="w-4 h-4 text-slate-400 hover:text-red-655" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Form buttons */}
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={cancelProfEdit}
                  className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold py-2 px-5 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveProf}
                  className="bg-primary hover:bg-primary-600 text-white font-bold py-2 px-6 rounded-lg transition"
                >
                  {isAddingNew ? 'Agregar Profesional' : 'Guardar Cambios'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
        danger={confirmState.danger}
      />
    </div>
  );
};

export default Settings;
