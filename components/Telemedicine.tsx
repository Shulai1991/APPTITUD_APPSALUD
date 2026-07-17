import React, { useState, useMemo } from 'react';
import type { Patient, Appointment, Professional, AppointmentStatus, User, ClinicalHistoryEntry } from '../types';
import { VideoCameraIcon, ClockIcon, UserIcon, TrashIcon, CalendarDaysIcon, PlusIcon, PencilSquareIcon } from './icons';
import ConfirmDialog from './ConfirmDialog';

interface TelemedicineProps {
  appointments: Appointment[];
  patients: Patient[];
  professionals: Professional[];
  currentUser: User;
  onAddAppointment: (appointmentData: Omit<Appointment, 'id' | 'status' | 'patientName'> & { telemedicine?: boolean; jitsiRoomUrl?: string }) => void;
  onUpdateAppointmentStatus: (appointmentId: number, status: AppointmentStatus, cancellationReason?: string) => void;
  onDeleteAppointment: (appointmentId: number) => void;
  onUpdatePatient: (updatedPatient: Patient) => void;
}

const Telemedicine: React.FC<TelemedicineProps> = ({
  appointments,
  patients,
  professionals,
  currentUser,
  onAddAppointment,
  onUpdateAppointmentStatus,
  onDeleteAppointment,
  onUpdatePatient
}) => {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [activeCallApt, setActiveCallApt] = useState<Appointment | null>(null);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>('all');

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
  
  // Quick Booking fields
  const [bookingPatientId, setBookingPatientId] = useState<string>('');
  const [bookingProfessionalId, setBookingProfessionalId] = useState<string>('');
  const [bookingTime, setBookingTime] = useState('09:00');
  const [bookingReason, setBookingReason] = useState('');
  const [bookingSearch, setBookingSearch] = useState('');
  const [showBookingForm, setShowBookingForm] = useState(false);

  // During call - Clinical History Entry quick note
  const [liveReason, setLiveReason] = useState('');
  const [liveDiagnosis, setLiveDiagnosis] = useState('');
  const [liveProcedures, setLiveProcedures] = useState('');
  const [liveTreatment, setLiveTreatment] = useState('');

  // 1. Filter professionals who have telemedicineEnabled: true
  const telemedicineProfessionals = useMemo(() => {
    return professionals.filter(p => p.telemedicineEnabled);
  }, [professionals]);

  // Set the default professional for booking if none selected and professionals exist
  React.useEffect(() => {
    if (telemedicineProfessionals.length > 0 && !bookingProfessionalId) {
      setBookingProfessionalId(telemedicineProfessionals[0].id.toString());
    }
  }, [telemedicineProfessionals, bookingProfessionalId]);

  // Set the default patient
  React.useEffect(() => {
    if (patients.length > 0 && !bookingPatientId) {
      setBookingPatientId(patients[0].id.toString());
    }
  }, [patients, bookingPatientId]);

  // 2. Filter telemedicine appointments (virtual) for selected date and professional
  const telemedicineAppointments = useMemo(() => {
    return appointments.filter(apt => {
      const isDateMatch = apt.date === selectedDate;
      const isTelemedicine = apt.telemedicine === true;
      const isProfessionalMatch = selectedProfessionalId === 'all' || apt.professionalId.toString() === selectedProfessionalId;
      return isDateMatch && isTelemedicine && isProfessionalMatch;
    }).sort((a, b) => a.time.localeCompare(b.time));
  }, [appointments, selectedDate, selectedProfessionalId]);

  // Find the patient linked to the active call
  const activeCallPatient = useMemo(() => {
    if (!activeCallApt) return null;
    return patients.find(p => p.id === activeCallApt.patientId) || null;
  }, [activeCallApt, patients]);

  const activeCallProf = useMemo(() => {
    if (!activeCallApt) return null;
    return professionals.find(p => p.id === activeCallApt.professionalId) || null;
  }, [activeCallApt, professionals]);

  // Filter patients for booking dropdown based on search
  const filteredPatients = useMemo(() => {
    if (!bookingSearch.trim()) return patients;
    return patients.filter(p =>
      `${p.name} ${p.lastName}`.toLowerCase().includes(bookingSearch.toLowerCase()) ||
      p.dni.includes(bookingSearch)
    );
  }, [patients, bookingSearch]);

  // Create automatic room name
  const generateRoomName = (patientName: string, docName: string, time: string) => {
    const cleanStr = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "");
    return `Consultorio-Telemedicina-${cleanStr(docName)}-${cleanStr(patientName)}-${time.replace(':', '')}-${Date.now().toString().slice(-4)}`;
  };

  // Submit quick booking
  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingPatientId) {
      alert('Por favor seleccione un paciente.');
      return;
    }
    if (!bookingProfessionalId) {
      alert('Por favor seleccione un profesional.');
      return;
    }

    const patient = patients.find(p => p.id === parseInt(bookingPatientId, 10));
    const prof = professionals.find(p => p.id === parseInt(bookingProfessionalId, 10));
    if (!patient || !prof) return;

    // Validate against independent telemedicine schedule if has enabled days configured
    if (prof.telemedicineWeeklySchedule && prof.telemedicineWeeklySchedule.some(s => s.enabled)) {
      const [y, m, d] = selectedDate.split('-').map(Number);
      const selDateObj = new Date(y, m - 1, d);
      const dayOfWeek = selDateObj.getDay(); // 0 = Dom, 1 = Lun, etc.
      
      const teleSched = prof.telemedicineWeeklySchedule.find(s => s.dayOfWeek === dayOfWeek);
      if (!teleSched || !teleSched.enabled) {
        const daysSpanish = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados'];
        alert(`Atención: El especialista ${prof.name} no realiza consultas de telemedicina los ${daysSpanish[dayOfWeek]}.`);
        return;
      }
      
      if (bookingTime < teleSched.startHour || bookingTime > teleSched.endHour) {
        alert(`Atención: El horario seleccionado (${bookingTime} hs) está fuera de la agenda de telemedicina de este especialista para este día (${teleSched.startHour} a ${teleSched.endHour} hs).`);
        return;
      }
    }

    const roomName = generateRoomName(`${patient.name} ${patient.lastName}`, prof.name, bookingTime);

    onAddAppointment({
      patientId: patient.id,
      professionalId: prof.id,
      date: selectedDate,
      time: bookingTime,
      reason: bookingReason || 'Consulta de Telemedicina',
      telemedicine: true,
      jitsiRoomUrl: roomName
    });

    setBookingReason('');
    setShowBookingForm(false);
    alert('Consulta de Telemedicina programada exitosamente.');
  };

  // Save quick clinical entry during live video call
  const handleSaveLiveHistory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCallPatient || !activeCallApt) return;

    const newEntry: ClinicalHistoryEntry = {
      id: Date.now(),
      date: activeCallApt.date,
      time: activeCallApt.time,
      createdAtISO: new Date().toISOString(),
      reason: liveReason || activeCallApt.reason || 'Atención por Telemedicina',
      diagnosis: liveDiagnosis || 'Sin especificar',
      procedures: liveProcedures ? liveProcedures.split(',').map(p => p.trim()) : ['Teleconsulta Odontológica'],
      suggestedTreatment: liveTreatment || '',
      professionalName: activeCallProf?.name || currentUser.fullName || currentUser.username,
      professionalLicense: activeCallProf?.license
    };

    const updatedPatient: Patient = {
      ...activeCallPatient,
      clinicalHistory: [newEntry, ...activeCallPatient.clinicalHistory]
    };

    onUpdatePatient(updatedPatient);
    onUpdateAppointmentStatus(activeCallApt.id, 'present');

    setLiveReason('');
    setLiveDiagnosis('');
    setLiveProcedures('');
    setLiveTreatment('');
    setActiveCallApt(null);
    alert('Atención médica registrada e historia clínica guardada.');
  };

  const inputClass = "mt-1 block h-10 w-full px-3 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-100 focus:ring-indigo-500 focus:border-indigo-500";
  const labelClass = "block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide";

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in text-left">
      {/* Dynamic Header */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border border-slate-100 dark:border-slate-700/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span className="p-1.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg text-indigo-650 dark:text-indigo-400">
              <VideoCameraIcon className="w-6 h-6" />
            </span>
            <span>Turnera de Telemedicina</span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gestione de manera independiente salas virtuales de videoconsultas automatizadas integrando Jitsi Meet.
          </p>
        </div>

        <div className="flex gap-3">
          <input 
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-700 dark:border-slate-600 cursor-pointer text-slate-800 dark:text-slate-100 font-bold"
          />
          {telemedicineProfessionals.length > 0 && (
            <button
              onClick={() => setShowBookingForm(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-650/10"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Agendar Turno Virtual</span>
            </button>
          )}
        </div>
      </div>

      {telemedicineProfessionals.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/30 p-6 rounded-xl text-center space-y-3">
          <p className="text-amber-800 dark:text-amber-400 font-bold">⚠️ No hay profesionales para telemedicina habilitados en este centro</p>
          <p className="text-xs text-slate-505 dark:text-slate-450 max-w-lg mx-auto">
            Por favor, diríjase al panel de <strong>Configuraciones &gt; Profesionales y Agendas</strong>, haga clic en "Configurar" sobre el especialista deseado y marque la casilla <strong>"Habilitar Telemedicina para este Especialista"</strong>.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Side-by-side call controller panel */}
          {activeCallApt ? (
            <div className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Teleconference Viewer (Jitsi Iframe) */}
              <div className="lg:col-span-7 bg-slate-900 border border-slate-950 rounded-xl shadow-xl overflow-hidden flex flex-col h-[640px]">
                <div className="p-3 bg-slate-950 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                    <span className="text-xs font-bold font-sans uppercase tracking-wider">Llamada en Curso</span>
                  </div>
                  <div className="text-xs font-bold text-slate-300">
                    Paciente: <span className="text-white uppercase font-extrabold">{activeCallPatient?.lastName}, {activeCallPatient?.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const rawPhone = activeCallPatient?.phone || '';
                      const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
                      
                      const roomUrl = `https://meet.jit.si/${activeCallApt.jitsiRoomUrl}`;
                      const message = `Hola *${activeCallPatient?.name || 'paciente'}*,\n\nLe enviamos el enlace de acceso para unirse a la videollamada de telemedicina en curso:\n\n🔗 *Enlace de acceso:* ${roomUrl}\n\nPor favor, conéctese lo antes posible. ¡Muchas gracias!`;
                      const waUrl = cleanPhone 
                        ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`
                        : null;

                      return (
                        <a
                          href={waUrl || '#'}
                          onClick={(e) => {
                            if (!cleanPhone) {
                              e.preventDefault();
                              alert("El paciente no tiene un número de teléfono celular registrado para enviarle el link.");
                            }
                          }}
                          target={cleanPhone ? "_blank" : undefined}
                          rel={cleanPhone ? "noopener noreferrer" : undefined}
                          className={`px-2.5 py-1 text-[10px] uppercase font-extrabold flex items-center gap-1 rounded border transition ${
                            cleanPhone 
                              ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-600 hover:text-white' 
                              : 'bg-slate-800 text-slate-500 border-slate-700/50 cursor-not-allowed opacity-60'
                          }`}
                          title={cleanPhone ? `Enviar enlace por WhatsApp al ${rawPhone}` : "Paciente sin teléfono registrado"}
                        >
                          <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.1 1.452 4.887 1.453 5.4 0 9.794-4.393 9.798-9.799.002-2.618-1.01-5.081-2.853-6.927C16.578 2.036 14.12 1.026 11.5 1.026 6.1 1.026 1.705 5.419 1.702 10.824c-.001 1.81.473 3.578 1.373 5.148l-.94 3.433 3.513-.93z"/>
                          </svg>
                          <span>Enviar WhatsApp</span>
                        </a>
                      );
                    })()}
                    <a
                      href={`https://meet.jit.si/${activeCallApt.jitsiRoomUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 text-[10px] uppercase font-extrabold bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600 hover:text-white rounded transition"
                    >
                      Pestaña Nueva ↗
                    </a>
                    <button
                      onClick={() => setActiveCallApt(null)}
                      className="text-slate-400 hover:text-red-500 text-xs px-2 font-bold cursor-pointer"
                    >
                      Cerrar Vista
                    </button>
                  </div>
                </div>

                <div className="flex-1 bg-slate-950 relative">
                  <iframe
                    src={`https://meet.jit.si/${activeCallApt.jitsiRoomUrl}#userInfo.displayName="${encodeURIComponent(currentUser.fullName || currentUser.username)}"`}
                    allow="camera; microphone; fullscreen; display-capture; autoplay"
                    className="w-full h-full border-0 absolute inset-0"
                    title="Telemedicina Jitsi Meet"
                  />
                </div>
              </div>

              {/* Physician Console during a call (Clinical history on the side!) */}
              <div className="lg:col-span-5 flex flex-col space-y-6 h-[640px]">
                {/* 1. Quick Clinic History Note Form */}
                <div className="bg-white dark:bg-slate-800 border border-indigo-100 dark:border-slate-700 p-5 rounded-xl shadow-md flex-1 flex flex-col overflow-hidden">
                  <div className="border-b border-indigo-50 dark:border-slate-700/60 pb-3 mb-4 flex-shrink-0">
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-1.5">
                      <span>📝</span> Ficha y Evolución en Vivo
                    </h3>
                    <p className="text-xs text-slate-505 dark:text-slate-400 mt-0.5">Registre de inmediato las observaciones de la atención virtual en curso de {activeCallPatient?.name}.</p>
                  </div>

                  <form onSubmit={handleSaveLiveHistory} className="space-y-4 flex-1 overflow-y-auto pr-1">
                    <div>
                      <label className={labelClass}>Motivo de consulta</label>
                      <input 
                        type="text" 
                        value={liveReason}
                        onChange={e => setLiveReason(e.target.value)}
                        placeholder="Ej. Dolor agudo en premolar primario"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Diagnóstico Clínico</label>
                      <input 
                        type="text" 
                        value={liveDiagnosis}
                        onChange={e => setLiveDiagnosis(e.target.value)}
                        placeholder="Ej. Caries profunda o pulpitis"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Tratamiento Sugerido</label>
                      <textarea 
                        value={liveTreatment}
                        onChange={e => setLiveTreatment(e.target.value)}
                        rows={2}
                        placeholder="Tratamiento analgésico recetado o citación urgente..."
                        className="mt-1 block p-2.5 w-full border border-slate-300 dark:border-slate-600 rounded-md shadow-sm dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-100 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Prácticas Realizadas (separadas por coma)</label>
                      <input 
                        type="text" 
                        value={liveProcedures}
                        onChange={e => setLiveProcedures(e.target.value)}
                        placeholder="Teleconsulta médica, Receta recetada..."
                        className={inputClass}
                      />
                    </div>

                    <div className="flex gap-2 pt-4 border-t border-slate-100 dark:border-slate-700/60">
                      <button
                        type="submit"
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-lg text-xs transition uppercase tracking-wider"
                      >
                        ✔ Completar y Guardar Evolución
                      </button>
                    </div>
                  </form>
                </div>

                {/* 2. Patient background sidebar */}
                <div className="bg-slate-50 dark:bg-slate-800 p-4 border rounded-xl dark:border-slate-700 text-left max-h-48 overflow-y-auto">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">📋 Antecedentes Médicos de {activeCallPatient?.name}</h4>
                  {activeCallPatient?.clinicalHistory && activeCallPatient.clinicalHistory.length > 0 ? (
                    <div className="space-y-2">
                      {activeCallPatient.clinicalHistory.slice(0, 3).map((hist, i) => (
                        <div key={i} className="p-2 border bg-white dark:bg-slate-700/40 rounded text-[11px] space-y-1">
                          <div className="flex justify-between font-extrabold text-[10px] text-indigo-650 dark:text-indigo-400">
                            <span>📅 {hist.date}</span>
                            <span>🩺 {hist.professionalName}</span>
                          </div>
                          <div><strong className="text-slate-720 dark:text-slate-300">Motivo:</strong> {hist.description || hist.reason}</div>
                          {hist.diagnosis && <div><strong className="text-slate-720 dark:text-slate-300">Diag:</strong> {hist.diagnosis}</div>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">No hay registros clínicos previos ingresados para este paciente.</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Daily virtual turn agenda list */}
              <div className="lg:col-span-8 space-y-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border border-slate-100 dark:border-slate-700/50 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 dark:border-slate-700 pb-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                        <span>🕒</span> Cronograma del Día
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Evolución diaria de las citas asignadas a canales virtuales de atención.</p>
                    </div>

                    <div>
                      <select
                        id="professional_filter"
                        value={selectedProfessionalId}
                        onChange={(e) => setSelectedProfessionalId(e.target.value)}
                        className="px-3 py-1.5 border rounded-lg text-xs bg-slate-50 dark:bg-slate-700 dark:border-slate-600 text-slate-800 dark:text-slate-100 font-bold"
                      >
                        <option value="all">👩‍⚕️ Todos los Profesionales Telem.</option>
                        {telemedicineProfessionals.map(p => (
                          <option key={p.id} value={p.id}>Dra/Dr. {p.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {telemedicineAppointments.length === 0 ? (
                    <div className="py-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-center space-y-2">
                      <p className="text-sm font-bold text-slate-500 dark:text-slate-400">No hay turnos de telemedicina agendados para este día</p>
                      <p className="text-xs text-slate-400">Pruebe seleccionando otra fecha de atención o registre un nuevo turno virtual.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {telemedicineAppointments.map(apt => {
                        const prof = professionals.find(p => p.id === apt.professionalId);
                        const isCallActive = activeCallApt?.id === apt.id;
                        return (
                          <div
                            key={apt.id}
                            className={`p-4 border rounded-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-all ${
                              apt.status === 'present'
                                ? 'bg-emerald-50/25 border-emerald-100 dark:bg-emerald-950/5 dark:border-emerald-900/30'
                                : apt.status === 'cancelled'
                                ? 'bg-rose-50/25 border-rose-100 dark:bg-rose-950/5 dark:border-rose-900/30 opacity-60'
                                : 'bg-slate-50/40 border-slate-200 dark:bg-slate-800/10 dark:border-slate-700/60'
                            }`}
                          >
                            <div className="flex items-start gap-3.5">
                              <span className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 rounded-lg text-sm font-mono font-bold flex flex-col items-center justify-center w-12 h-12 flex-shrink-0">
                                <span>🕒</span>
                                <span className="text-xs leading-none mt-0.5">{apt.time}</span>
                              </span>
                              <div className="min-w-0">
                                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate uppercase tracking-wide">
                                  {apt.patientName}
                                </h4>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                  Motivo: <span className="font-semibold text-slate-700 dark:text-slate-300">{apt.reason}</span>
                                </p>
                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                  <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-0.5 px-2 rounded-full font-bold">
                                    👩‍⚕️ Dr/a: {prof?.name || 'Desconocido'}
                                  </span>
                                  {apt.status === 'scheduled' && (
                                    <span className="text-[10px] bg-amber-100/70 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 py-0.5 px-2 rounded-full font-extrabold uppercase">
                                      🟢 Pendiente
                                    </span>
                                  )}
                                  {apt.status === 'present' && (
                                    <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 py-0.5 px-2 rounded-full font-extrabold uppercase">
                                      ✔ Realizado
                                    </span>
                                  )}
                                  {apt.status === 'cancelled' && (
                                    <span className="text-[10px] bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 py-0.5 px-2 rounded-full font-extrabold uppercase">
                                      ❌ Cancelado
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2.5 justify-end">
                              {apt.status !== 'cancelled' && (() => {
                                const patientObj = patients.find(p => p.id === apt.patientId);
                                const rawPhone = patientObj?.phone || '';
                                const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
                                
                                const roomUrl = `https://meet.jit.si/${apt.jitsiRoomUrl}`;
                                const message = `Hola *${patientObj?.name || 'paciente'}*,\n\nLe enviamos el enlace de acceso para su consulta virtual de telemedicina el día *${apt.date}* a las *${apt.time} hs*.\n\n🔗 *Enlace de acceso:* ${roomUrl}\n\nPor favor, conéctese unos minutos antes. ¡Muchas gracias!`;
                                const waUrl = cleanPhone 
                                  ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`
                                  : null;

                                return (
                                  <a
                                    href={waUrl || '#'}
                                    onClick={(e) => {
                                      if (!cleanPhone) {
                                        e.preventDefault();
                                        alert("El paciente no tiene un número de teléfono celular registrado para enviarle el link.");
                                      }
                                    }}
                                    target={cleanPhone ? "_blank" : undefined}
                                    rel={cleanPhone ? "noopener noreferrer" : undefined}
                                    className={`font-bold py-2 px-3 rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer ${
                                      cleanPhone 
                                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/10' 
                                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-60'
                                    }`}
                                    title={cleanPhone ? `Enviar enlace por WhatsApp al ${rawPhone}` : "Paciente sin teléfono registrado"}
                                  >
                                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.1 1.452 4.887 1.453 5.4 0 9.794-4.393 9.798-9.799.002-2.618-1.01-5.081-2.853-6.927C16.578 2.036 14.12 1.026 11.5 1.026 6.1 1.026 1.705 5.419 1.702 10.824c-.001 1.81.473 3.578 1.373 5.148l-.94 3.433 3.513-.93z"/>
                                    </svg>
                                    <span>Enviar Link</span>
                                  </a>
                                );
                              })()}

                              {apt.status === 'scheduled' && (
                                <button
                                  onClick={() => setActiveCallApt(apt)}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer"
                                >
                                  <VideoCameraIcon className="w-4 h-4" />
                                  <span>Iniciar Videollamada</span>
                                </button>
                              )}
                              
                              {apt.status === 'present' && (
                                <button
                                  onClick={() => {
                                    const matchPat = patients.find(p => p.id === apt.patientId);
                                    if(matchPat) {
                                      setActiveCallApt(apt);
                                    }
                                  }}
                                  className="text-xs font-semibold py-1.5 px-3 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border dark:border-slate-600 text-slate-700 dark:text-slate-350 rounded-lg transition"
                                >
                                  Reabrir Sala
                                </button>
                              )}

                              {apt.status === 'scheduled' && (
                                <button
                                  onClick={() => {
                                    setConfirmState({
                                      isOpen: true,
                                      title: 'Cancelar Turno',
                                      message: '¿Desea cancelar este turno de telemedicina?',
                                      danger: true,
                                      onConfirm: () => {
                                        onUpdateAppointmentStatus(apt.id, 'cancelled', 'Cancelado desde Turnera Virtual');
                                        setConfirmState(prev => ({ ...prev, isOpen: false }));
                                      }
                                    });
                                  }}
                                  className="text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/15 p-1.5 rounded transition"
                                  title="Cancelar turno"
                                >
                                  Cancelar
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  setConfirmState({
                                    isOpen: true,
                                    title: 'Eliminar Turno',
                                    message: '¿Está seguro de eliminar este turno de la base de datos?',
                                    danger: true,
                                    onConfirm: () => {
                                      onDeleteAppointment(apt.id);
                                      setConfirmState(prev => ({ ...prev, isOpen: false }));
                                    }
                                  });
                                }}
                                className="text-slate-400 hover:text-red-655 p-1.5 rounded transition"
                                title="Eliminar registro"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Form panel / Telemedicine information right column */}
              <div className="lg:col-span-4 space-y-6">
                {/* 1. Quick Tutorial Info */}
                <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 text-white p-5 rounded-xl shadow-md border border-indigo-950 text-left space-y-4">
                  <h4 className="font-bold text-sm flex items-center gap-1.5 text-indigo-300">
                    <span>💡</span> Guía de Teleasistencia
                  </h4>
                  <ul className="space-y-3.5 text-xs text-indigo-100 font-sans tracking-wide">
                    <li className="flex items-start gap-2">
                      <span className="p-0.5 bg-indigo-800 rounded text-[10px] font-bold">1</span>
                      <span>Habilite los médicos y el opcional de centro en la pestaña de <strong>Configuración</strong>.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="p-0.5 bg-indigo-800 rounded text-[10px] font-bold">2</span>
                      <span>Haga clic en <strong>"Iniciar Videollamada"</strong> para activar la sala Jitsi Meet integrada en pantalla dividida.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="p-0.5 bg-indigo-800 rounded text-[10px] font-bold">3</span>
                      <span>Complete la evolución odontológica en vivo mientras habla con el paciente, y haga clic en guardar para asentar la historia clínica.</span>
                    </li>
                  </ul>
                  <div className="border-t border-indigo-800 pt-3 flex items-center justify-between text-[11px] text-indigo-300 font-mono">
                    <span>Certificados: Jitsi Meet SSL</span>
                    <span>Habilitado 🚀</span>
                  </div>
                </div>

                {/* 2. List of telemedicine-enabled professionals */}
                <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-md border border-slate-100 dark:border-slate-700/50 space-y-4">
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 border-b pb-2">
                    👨‍⚕️ Profesionales en Línea
                  </h4>
                  <div className="space-y-3">
                    {telemedicineProfessionals.map(p => (
                      <div key={p.id} className="flex items-center gap-3">
                        <img src={p.avatar} alt={p.name} className="w-10 h-10 rounded-full object-cover border border-indigo-200" referrerPolicy="no-referrer" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{p.name}</p>
                          <p className="text-[10px] text-primary dark:text-primary-400 font-semibold truncate uppercase">{p.specialty}</p>
                        </div>
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse flex-shrink-0" title="Vía Libre Teleconsulta"></span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Booking Form Dialog Modal */}
      {showBookingForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-205 dark:border-slate-700 animate-fade-in-up">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-indigo-50/20 dark:bg-indigo-950/10">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-1.5">
                <span>💻</span> Agendar Consulta Virtual (Telemedicina)
              </h3>
              <button
                type="button"
                onClick={() => setShowBookingForm(false)}
                className="text-slate-400 hover:text-slate-650 cursor-pointer p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleBookingSubmit} className="p-6 space-y-4">
              <div>
                <label className={labelClass}>Especialista de Telemedicina</label>
                <select
                  value={bookingProfessionalId}
                  onChange={e => setBookingProfessionalId(e.target.value)}
                  className={inputClass}
                  required
                >
                  {telemedicineProfessionals.map(p => (
                    <option key={p.id} value={p.id}>Dra/Dr. {p.name} ({p.specialty})</option>
                  ))}
                </select>
                {(() => {
                  const prof = telemedicineProfessionals.find(p => p.id.toString() === bookingProfessionalId);
                  if (!prof) return null;
                  
                  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
                  // Filter and sort by dayOfWeek
                  const schedules = prof.telemedicineWeeklySchedule?.filter(s => s.enabled);
                  
                  if (!schedules || schedules.length === 0) {
                    return (
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1">
                        ⚠️ Este profesional no tiene configurada una agenda específica de telemedicina. Se usará su rango de horario general.
                      </p>
                    );
                  }
                  
                  return (
                    <div className="mt-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded p-2 text-[10px] text-emerald-800 dark:text-emerald-350">
                      <span className="font-semibold block mb-0.5">📅 Horarios Exclusivos de Telemedicina:</span>
                      <div className="flex flex-wrap gap-x-2 gap-y-0.5 font-mono">
                        {schedules.map(sched => (
                          <span key={sched.dayOfWeek} className="bg-emerald-500/15 px-1 py-0.5 rounded text-emerald-700 dark:text-emerald-300">
                            {days[sched.dayOfWeek]}: {sched.startHour} - {sched.endHour} hs
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Patient Search and Selector */}
              <div className="border p-3.5 rounded-lg bg-slate-50/50 dark:bg-slate-800/20 space-y-3">
                <span className={labelClass}>Paciente Beneficiario</span>
                <input
                  type="text"
                  placeholder="Buscar por DNI o apellidos..."
                  value={bookingSearch}
                  onChange={e => setBookingSearch(e.target.value)}
                  className="w-full text-xs p-2 border rounded bg-white dark:bg-slate-700 dark:border-slate-600 text-slate-800 dark:text-slate-100"
                />
                <select
                  value={bookingPatientId}
                  onChange={e => setBookingPatientId(e.target.value)}
                  className={inputClass}
                  required
                >
                  <option value="" disabled>Seleccione el paciente...</option>
                  {filteredPatients.map(p => (
                    <option key={p.id} value={p.id}>{p.lastName}, {p.name} (DNI: {p.dni})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Fecha Seleccionada</label>
                  <input
                    type="date"
                    value={selectedDate}
                    disabled
                    className="mt-1 block h-10 w-full px-3 border border-slate-205 dark:border-slate-600 rounded-md bg-slate-100 dark:bg-slate-700 text-sm text-slate-550 dark:text-slate-350 cursor-not-allowed font-bold"
                  />
                </div>
                <div>
                  <label className={labelClass}>Hora del Turno</label>
                  <input
                    type="time"
                    value={bookingTime}
                    onChange={e => setBookingTime(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Motivo / Observación de Cita</label>
                <input
                  type="text"
                  value={bookingReason}
                  onChange={e => setBookingReason(e.target.value)}
                  placeholder="Ej. Control post-quirúrgico virtual"
                  className={inputClass}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => setShowBookingForm(false)}
                  className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold py-2 px-4 rounded-lg text-xs transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-5 rounded-lg text-xs transition"
                >
                  Agendar Turno
                </button>
              </div>
            </form>
          </div>
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

export default Telemedicine;
