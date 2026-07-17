import React, { useState, useMemo } from 'react';
import type { Appointment, AppointmentStatus, Patient, Professional, ClinicSettings } from '../types';
import { PROFESSIONALS } from '../constants';
import { PlusIcon, TrashIcon, CalendarDaysIcon, UserIcon, ClipboardDocumentListIcon } from './icons';
import Modal from './Modal';

const formatProfessionalSchedule = (prof: Professional): string => {
    if (prof.weeklySchedule && prof.weeklySchedule.some(d => d.enabled)) {
        const enabledDays = prof.weeklySchedule.filter(d => d.enabled);
        const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        
        const firstDay = enabledDays[0];
        const sameHours = enabledDays.every(d => d.startHour === firstDay.startHour && d.endHour === firstDay.endHour);
        
        if (sameHours) {
            const isContiguous = enabledDays.every((d, i) => i === 0 || d.dayOfWeek === enabledDays[i-1].dayOfWeek + 1);
            if (isContiguous && enabledDays.length > 1) {
                return `${dayNames[enabledDays[0].dayOfWeek]} a ${dayNames[enabledDays[enabledDays.length - 1].dayOfWeek]} de ${firstDay.startHour} a ${firstDay.endHour} hs`;
            } else {
                return `${enabledDays.map(d => dayNames[d.dayOfWeek]).join(', ')} de ${firstDay.startHour} a ${firstDay.endHour} hs`;
            }
        } else {
            return enabledDays.map(d => `${dayNames[d.dayOfWeek]}: ${d.startHour} a ${d.endHour}`).join(' | ');
        }
    }
    
    const start = prof.startHour || '08:00';
    const end = prof.endHour || '18:00';
    return `Lun a Vie de ${start} a ${end} hs`;
};

interface CalendarProps {
    appointments: Appointment[];
    patients: Patient[];
    professionals?: Professional[];
    clinicSettings?: ClinicSettings;
    onSelectPatient: (patientId: number) => void;
    onAddPatient: () => void;
    onAddAppointment: (date: string, time: string, professionalId: number) => void;
    onUpdateAppointmentStatus: (appointmentId: number, status: AppointmentStatus, cancellationReason?: string) => void;
    onDeleteAppointment: (appointmentId: number) => void;
}

const Calendar: React.FC<CalendarProps> = ({ 
    appointments, 
    patients,
    professionals,
    clinicSettings,
    onSelectPatient,
    onAddPatient,
    onAddAppointment, 
    onUpdateAppointmentStatus,
    onDeleteAppointment
}) => {
    const activeProfessionals = professionals || PROFESSIONALS;
    const [selectedProfId, setSelectedProfId] = useState<number | null>(null);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [patientSearchQuery, setPatientSearchQuery] = useState('');
    const [cancellingAptId, setCancellingAptId] = useState<number | null>(null);
    const [cancellationReasonText, setCancellationReasonText] = useState('');

    const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();

    const changeMonth = (offset: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() + offset);
            return newDate;
        });
    };

    // Find selected professional object
    const currentProfessional = useMemo(() => {
        return activeProfessionals.find(p => p.id === selectedProfId) || null;
    }, [activeProfessionals, selectedProfId]);

    // Generate distinct time slots based on professional's parameters (e.g. startHour, endHour, slotInterval)
    const TIME_SLOTS = useMemo(() => {
        if (!currentProfessional) return [];
        const slots: string[] = [];
        
        // Find day of week for selectedDate (avoid timezone shifts)
        const [y, m, d] = selectedDate.split('-').map(Number);
        const selDateObj = new Date(y, m - 1, d);
        const dayOfWeek = selDateObj.getDay(); // 0 = Domingo, 1 = Lunes, etc.
        
        // Find if this day has a specific weekly schedule entry
        const daySched = currentProfessional.weeklySchedule?.find(s => s.dayOfWeek === dayOfWeek);
        
        // If weeklySchedule is defined but is explicitly disabled or not found in general schedule, we returns empty slots
        if (currentProfessional.weeklySchedule) {
            if (!daySched || !daySched.enabled) {
                return [];
            }
        }
        
        const start = daySched ? daySched.startHour : (currentProfessional.startHour || "08:00");
        const end = daySched ? daySched.endHour : (currentProfessional.endHour || "18:00");
        const interval = currentProfessional.slotInterval || 30;
        
        const [startH, startM] = start.split(':').map(Number);
        const [endH, endM] = end.split(':').map(Number);
        
        let currentInMinutes = startH * 60 + (startM || 0);
        const endInMinutes = endH * 60 + (endM || 0);
        
        while (currentInMinutes <= endInMinutes) {
            const h = Math.floor(currentInMinutes / 60);
            const m = currentInMinutes % 60;
            const hStr = h.toString().padStart(2, '0');
            const mStr = m.toString().padStart(2, '0');
            slots.push(`${hStr}:${mStr}`);
            currentInMinutes += interval;
        }
        return slots;
    }, [currentProfessional, selectedDate]);

    // Helper to check if a specific date and slot is blocked
    const getBlockState = (date: string, time: string) => {
        if (!currentProfessional?.blockedRanges) return { isBlocked: false };
        
        for (const block of currentProfessional.blockedRanges) {
            if (date >= block.startDate && date <= block.endDate) {
                if (!block.startTime || !block.endTime) {
                    return { isBlocked: true, reason: block.reason, comment: block.comment };
                }
                if (time >= block.startTime && time <= block.endTime) {
                    return { isBlocked: true, reason: block.reason, comment: block.comment };
                }
            }
        }
        return { isBlocked: false };
    };

    const getBlockReasonLabel = (reason?: string) => {
        switch (reason) {
            case 'vacation': return 'Vacaciones';
            case 'sickness': return 'Enfermedad';
            case 'personal': return 'Motivos Personales';
            default: return 'Razones Personales / Otros';
        }
    };

    // Group appointments by date for the selected professional
    const appointmentsByDate = useMemo(() => {
        if (!selectedProfId) return {};
        const filtered = appointments.filter(apt => apt.professionalId === selectedProfId);
        return filtered.reduce((acc, apt) => {
            (acc[apt.date] = acc[apt.date] || []).push(apt);
            return acc;
        }, {} as Record<string, Appointment[]>);
    }, [appointments, selectedProfId]);

    const selectedDayAppointments = useMemo(() => {
        return appointmentsByDate[selectedDate] || [];
    }, [appointmentsByDate, selectedDate]);

    // Find the appointments matching a specific time slot for the selected professional
    const getAppointmentForSlot = (time: string) => {
        return selectedDayAppointments.find(apt => {
            // Check matching hours and that it is not cancelled
            return apt.time === time && apt.status !== 'cancelled';
        });
    };

    // Get uncategorized custom-time appointments that don't fallback exactly on 30min slots
    const customTimeAppointments = useMemo(() => {
        return selectedDayAppointments.filter(apt => !TIME_SLOTS.includes(apt.time) && apt.status !== 'cancelled');
    }, [selectedDayAppointments]);

    const getStatusStyles = (status: AppointmentStatus) => {
        switch (status) {
            case 'present': 
                return {
                    border: 'border-l-4 border-green-500',
                    bg: 'bg-green-50/50 dark:bg-green-950/20',
                    badge: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                };
            case 'absent': 
                return {
                    border: 'border-l-4 border-red-500',
                    bg: 'bg-red-50/50 dark:bg-red-950/20',
                    badge: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                };
            case 'cancelled':
                return {
                    border: 'border-l-4 border-slate-400 dark:border-slate-600 line-through',
                    bg: 'bg-slate-55 dark:bg-slate-800/40 opacity-75',
                    badge: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-350'
                };
            default: 
                return {
                    border: 'border-l-4 border-amber-500',
                    bg: 'bg-amber-50/50 dark:bg-amber-950/20',
                    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                };
        }
    };

    // Patient lookup helper for search bar
    const filteredPatients = useMemo(() => {
        if (!patientSearchQuery.trim()) return [];
        return patients.filter(p => 
            `${p.name} ${p.lastName}`.toLowerCase().includes(patientSearchQuery.toLowerCase()) || 
            p.dni.includes(patientSearchQuery)
        );
    }, [patients, patientSearchQuery]);

    const todayString = new Date().toISOString().split('T')[0];

    const handleSendWhatsappReminder = (apt: Appointment) => {
        const patient = patients.find(p => p.id === apt.patientId);
        if (!patient) {
            alert("No se encontró el paciente seleccionado.");
            return;
        }

        const professional = activeProfessionals.find(p => p.id === apt.professionalId);
        const profName = professional ? professional.name : 'Odontólogo';
        const specialty = professional ? professional.specialty : 'Odontología';
        
        // Robust date formatting to support and format: YYYY-MM-DD, DD-MM-YYYY, YYYY/MM/DD, DD/MM/YYYY always to DD/MM/YYYY
        let formattedDate = apt.date;
        let parts: string[] = [];
        if (apt.date.includes('-')) {
            parts = apt.date.split('-');
        } else if (apt.date.includes('/')) {
            parts = apt.date.split('/');
        }
        
        if (parts.length === 3) {
            if (parts[0].length === 4) {
                formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
            } else if (parts[2].length === 4) {
                formattedDate = `${parts[0]}/${parts[1]}/${parts[2]}`;
            }
        }
        
        const centerName = clinicSettings?.name || 'Centro Odontológico';
        const centerAddress = clinicSettings?.address || 'Dirección de la Sede';

        const message = `Estimado *${patient.name} ${patient.lastName}*, usted tiene un turno con el profesional *${profName}* de la especialidad *${specialty}* el día *${formattedDate}* en el horario *${apt.time}* en el Centro *${centerName}* cito en calle *${centerAddress}*. Escriba *confirmo turno* para dejar asentado en el sistema, de lo contrario escriba *cancelo turno* y aguarde en línea que un representante se comunicará con usted.`;

        const cleanPhone = patient.phone.replace(/[^0-9]/g, '');
        const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
        
        const link = document.createElement('a');
        link.href = whatsappUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- State 1: Choose Professional View ---
    if (!selectedProfId) {
        return (
            <div className="space-y-6 animate-fade-in">
                <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 md:p-8 rounded-xl shadow-md border border-slate-100 dark:border-slate-700/50">
                    <h2 className="text-lg sm:text-2xl font-bold mb-1.5 text-slate-800 dark:text-slate-100">Agenda y Turnos</h2>
                    <p className="text-xs sm:text-sm text-slate-650 dark:text-slate-300">
                        Por favor, elija el especialista médico con el que desea consultar, ver la agenda horaria o agendar un nuevo turno.
                    </p>
                </div>

                {/* Professional Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {activeProfessionals.map(prof => {
                        // Count today's appointments for this professional
                        const todayAptsCount = appointments.filter(
                            apt => apt.professionalId === prof.id && apt.date === todayString
                        ).length;

                        return (
                            <div 
                                key={prof.id} 
                                className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden border border-slate-150 dark:border-slate-700 hover:shadow-md transition-all duration-300 flex flex-col justify-between"
                            >
                                <div className="p-4 sm:p-6 flex flex-col items-center text-center">
                                    <div className="relative mb-4">
                                        <img 
                                            src={prof.avatar} 
                                            alt={prof.name} 
                                            className="w-24 h-24 rounded-full object-cover border-4 border-primary-100 dark:border-slate-700"
                                            referrerPolicy="no-referrer"
                                        />
                                        <span className="absolute bottom-0 right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center" title="Activo"></span>
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{prof.name}</h3>
                                    <p className="text-sm text-primary font-medium dark:text-primary-450 mt-1">{prof.specialty}</p>

                                    <div className="mt-3.5 mb-2 px-3 py-1.5 bg-teal-50/60 dark:bg-teal-950/20 border border-teal-100/40 dark:border-teal-900/30 rounded-lg text-[11px] text-teal-700 dark:text-teal-350 font-medium flex items-center space-x-1.5 w-full justify-center select-none">
                                        <span>🕒 {formatProfessionalSchedule(prof)}</span>
                                    </div>

                                    <div className="mt-2 px-3 py-1 bg-slate-100 dark:bg-slate-700/50 rounded-full text-xs text-slate-600 dark:text-slate-300 flex items-center space-x-2">
                                        <CalendarDaysIcon className="w-3.5 h-3.5" />
                                        <span>{todayAptsCount} Turno(s) para hoy</span>
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-700">
                                    <button 
                                        onClick={() => setSelectedProfId(prof.id)}
                                        className="w-full bg-primary hover:bg-primary-600 text-white font-bold py-2 px-3 rounded-lg transition-all shadow-sm text-xs"
                                    >
                                        Ver Agenda y Turnos
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Patient Directory Portal (As a super helpful replacement block) */}
                <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-xl shadow-sm border border-slate-150 dark:border-slate-700/80">
                    <h3 className="text-sm sm:text-base md:text-lg font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-1.5">
                        <UserIcon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                        <span>Buscador de Historias Clínicas (Acceso Rápido)</span>
                    </h3>
                    <div className="max-w-xl">
                        <div className="flex gap-2.5">
                            <input 
                                type="text"
                                placeholder="Escriba nombre, apellido o DNI del paciente..."
                                value={patientSearchQuery}
                                onChange={(e) => setPatientSearchQuery(e.target.value)}
                                className="flex-1 p-2 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm dark:bg-slate-700 text-xs sm:text-sm focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none placeholder-slate-400"
                            />
                            {patientSearchQuery && (
                                <button 
                                    onClick={() => setPatientSearchQuery('')}
                                    className="px-3 text-slate-500 dark:text-slate-400 hover:text-slate-800 text-sm"
                                >
                                    Limpiar
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Patient results */}
                    {patientSearchQuery.trim() && (
                        <div className="mt-4 border border-slate-100 dark:border-slate-700 rounded-lg overflow-hidden max-h-50 overflow-y-auto bg-slate-50 dark:bg-slate-850">
                            {filteredPatients.length > 0 ? (
                                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {filteredPatients.map(p => (
                                        <div 
                                            key={p.id} 
                                            onClick={() => onSelectPatient(p.id)}
                                            className="p-3 hover:bg-primary-50 dark:hover:bg-slate-700/50 cursor-pointer flex items-center justify-between transition-colors"
                                        >
                                            <div className="flex items-center space-x-3">
                                                <img 
                                                    src={p.avatarUrl} 
                                                    alt={p.name} 
                                                    className="w-10 h-10 rounded-full object-cover"
                                                    referrerPolicy="no-referrer"
                                                />
                                                <div>
                                                    <p className="font-semibold text-sm text-slate-800 dark:text-slate-100">{p.lastName}, {p.name}</p>
                                                    <p className="text-xs text-slate-500">DNI: {p.dni} | Tel: {p.phone}</p>
                                                </div>
                                            </div>
                                            <button className="text-xs bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-650 hover:bg-slate-100 dark:hover:bg-slate-700 py-1.5 px-3 rounded-md font-semibold text-primary transition-colors">
                                                Ver Ficha Clínica
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="p-4 text-center text-sm text-slate-500">No se encontraron pacientes con esa información.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // --- State 2: Selected Professional Calendar view with hourly slots ---
    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header / Professional details */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-xl shadow-md border border-slate-100 dark:border-slate-700/50">
                <div className="flex items-center space-x-4">
                    <button 
                        onClick={() => setSelectedProfId(null)}
                        className="p-2.5 rounded-lg bg-slate-105 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5"
                        title="Cambiar Profesional"
                    >
                        &larr; Cambiar Profesional
                    </button>
                    <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700"></div>
                    <img 
                        src={currentProfessional.avatar} 
                        alt={currentProfessional.name} 
                        className="w-12 h-12 rounded-full object-cover border-2 border-primary"
                        referrerPolicy="no-referrer"
                    />
                    <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-primary dark:text-primary-400">Agenda Activa</span>
                        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight">{currentProfessional.name}</h2>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5 mt-0.5">
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{currentProfessional.specialty}</span>
                            <span className="hidden sm:inline text-slate-300 dark:text-slate-600">•</span>
                            <span className="text-[11px] text-teal-650 dark:text-teal-400 font-semibold flex items-center gap-1 select-none">
                                🕒 Horario: {formatProfessionalSchedule(currentProfessional)}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        onClick={onAddPatient}
                        className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-600 transition">
                        + Registrar Paciente
                    </button>
                    <button 
                        onClick={() => onAddAppointment(selectedDate, "09:00", selectedProfId)}
                        className="bg-primary hover:bg-primary-600 text-white text-xs font-bold py-2 px-3.5 rounded-lg transition shadow-sm">
                        + Agendar Cita
                    </button>
                </div>
            </div>

            {/* Layout (Grid of Calendar & Slot List) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Monthly selector (left side, span 5) */}
                <div className="lg:col-span-5 bg-white dark:bg-slate-800 p-5 rounded-xl shadow-md border border-slate-100 dark:border-slate-700/50 flex flex-col h-fit">
                    <div className="flex justify-between items-center mb-4">
                        <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 font-bold">&larr;</button>
                        <h3 className="text-md font-bold text-slate-840 dark:text-slate-100 uppercase tracking-wide">
                            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                        </h3>
                        <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 font-bold">&rarr;</button>
                    </div>

                    {/* Weekdays */}
                    <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-405 dark:text-slate-400 mb-2">
                        {daysOfWeek.map(day => <div key={day} className="py-1">{day}</div>)}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                            <div key={`empty-${i}`} className="border rounded-md border-transparent"></div>
                        ))}
                        {Array.from({ length: daysInMonth }).map((_, day) => {
                            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day + 1);
                            // Avoid native timezone shifts in manual formatting:
                            const y = date.getFullYear();
                            const m = String(date.getMonth() + 1).padStart(2, '0');
                            const d = String(date.getDate()).padStart(2, '0');
                            const dateString = `${y}-${m}-${d}`;

                            const isToday = dateString === todayString;
                            const isSelected = dateString === selectedDate;
                            const dayApts = appointmentsByDate[dateString] || [];

                            const dayOfWeek = date.getDay();
                            const daySched = currentProfessional?.weeklySchedule?.find(s => s.dayOfWeek === dayOfWeek);
                            const isAvailable = currentProfessional?.weeklySchedule
                                ? (daySched?.enabled ?? false)
                                : (dayOfWeek >= 1 && dayOfWeek <= 5);

                            let btnClasses = '';
                            if (isSelected) {
                                btnClasses = 'bg-primary border-primary text-white shadow-sm font-semibold scale-102';
                            } else if (isAvailable) {
                                btnClasses = 'bg-emerald-50/40 dark:bg-emerald-950/15 border-emerald-100/80 dark:border-emerald-900/30 text-slate-850 dark:text-slate-200 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/20';
                            } else {
                                btnClasses = 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-100/60 dark:border-slate-800/40 text-slate-400 dark:text-slate-500 opacity-60 hover:bg-slate-100 dark:hover:bg-slate-800/50';
                            }

                            return (
                                <button 
                                    key={day} 
                                    onClick={() => setSelectedDate(dateString)} 
                                    className={`p-1.5 border rounded-lg cursor-pointer flex flex-col items-center justify-between min-h-[48px] transition-all relative ${btnClasses}`}
                                >
                                    <span className={`text-xs w-6 h-6 flex items-center justify-center rounded-full ${
                                        isToday && !isSelected ? 'bg-primary-100 text-primary-600 font-bold' : ''
                                    }`}>
                                        {day + 1}
                                    </span>
                                    {dayApts.length > 0 && (
                                        <div className="mt-1 flex gap-0.5 justify-center w-full">
                                            {dayApts.slice(0, 3).map((apt, index) => (
                                                <span 
                                                    key={apt.id} 
                                                    className={`w-1.5 h-1.5 rounded-full ${
                                                        isSelected ? 'bg-white' : 'bg-primary'
                                                    }`}
                                                ></span>
                                            ))}
                                            {dayApts.length > 3 && <span className="text-[8px] font-bold">+</span>}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    
                    {/* Visual Help Legend */}
                    <div className="mt-6 border-t border-slate-100 dark:border-slate-700/60 pt-4 grid grid-cols-2 gap-2 text-[10px] sm:text-xs text-slate-500">
                        <div className="flex items-center space-x-1.5">
                            <span className="w-3.5 h-3.5 rounded bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 inline-block"></span>
                            <span>Disponible</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                            <span className="w-3.5 h-3.5 rounded bg-primary inline-block"></span>
                            <span>Seleccionado</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-primary-100 border border-primary text-[8px] flex items-center justify-center">●</span>
                            <span>Hoy</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                            <span className="w-2 h-2 rounded-full bg-primary inline-block"></span>
                            <span>Posee Citas</span>
                        </div>
                    </div>
                </div>

                {/* Hourly time slot planner (right side, span 7) */}
                <div className="lg:col-span-7 bg-white dark:bg-slate-800 p-5 rounded-xl shadow-md border border-slate-100 dark:border-slate-700/50">
                    <div className="flex justify-between items-baseline mb-4 border-b border-slate-100 dark:border-slate-700/80 pb-3">
                        <h3 className="text-md font-bold text-slate-800 dark:text-slate-100">
                            Agenda Horaria
                        </h3>
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </span>
                    </div>

                    {/* Scrollable list of slots */}
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                        {TIME_SLOTS.length === 0 && customTimeAppointments.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-slate-50 dark:bg-slate-800/20 border border-dashed rounded-xl border-slate-200 dark:border-slate-700/60 animate-fade-in">
                                <span className="text-3xl mb-2">🗓️</span>
                                <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">Día No Laborable / Sin Agenda</h4>
                                <p className="text-xs text-slate-500 mt-1 max-w-xs">Este especialista médico no registra atención disponible ni turnos cargados para este día de la semana.</p>
                            </div>
                        )}
                        {/* 1. First render general custom appointments if any exist before slot times */}
                        {customTimeAppointments.map(apt => {
                            const styles = getStatusStyles(apt.status);
                            return (
                                <div 
                                    key={apt.id} 
                                    className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 ${styles.border} ${styles.bg} transition-all`}
                                >
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center space-x-2.5">
                                            <span className="text-sm font-bold text-primary">{apt.time} (Espec.)</span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${styles.badge}`}>
                                                {apt.status === 'present' ? 'Presente' : apt.status === 'absent' ? 'Ausente' : 'Agendado'}
                                            </span>
                                        </div>
                                        <h4 className="font-bold text-slate-800 dark:text-slate-100">
                                            {apt.patientName}
                                        </h4>
                                        <p className="text-xs text-slate-600 dark:text-slate-350">{apt.reason || 'Consulta'}</p>
                                        {apt.createdBy && (
                                            <p className="text-[10px] text-slate-450 dark:text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                                                <span>👤 Otorgado por:</span>
                                                <span className="font-semibold text-teal-650 dark:text-teal-400">{apt.createdBy}</span>
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center space-x-2 mt-3 sm:mt-0 w-full sm:w-auto justify-end">
                                        <button 
                                            onClick={() => onSelectPatient(apt.patientId)}
                                            className="text-xs py-1.5 px-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-650 transition font-semibold text-slate-750"
                                            title="Ver expediente clínico"
                                        >
                                            Expediente
                                        </button>
                                        {apt.status === 'scheduled' && (
                                            <>
                                                <button onClick={() => onUpdateAppointmentStatus(apt.id, 'present')} className="text-xs font-semibold px-2 py-1.5 rounded-lg bg-green-200 hover:bg-green-300 text-green-900 dark:bg-green-700 dark:hover:bg-green-600 dark:text-white transition-colors">&check;</button>
                                                <button onClick={() => onUpdateAppointmentStatus(apt.id, 'absent')} className="text-xs font-semibold px-2 py-1.5 rounded-lg bg-red-200 hover:bg-red-300 text-red-900 dark:bg-red-700 dark:hover:bg-red-600 dark:text-white transition-colors">&cross;</button>
                                            </>
                                        )}
                                        <button 
                                            onClick={() => {
                                                setCancellingAptId(apt.id);
                                                setCancellationReasonText('');
                                            }}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                            title="Cancelar Cita"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}

                        {/* 2. Render standard hour slots */}
                        {TIME_SLOTS.map(slot => {
                            const apt = getAppointmentForSlot(slot);
                            const block = getBlockState(selectedDate, slot);

                            if (block.isBlocked) {
                                return (
                                    <div 
                                        key={slot}
                                        className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-80"
                                    >
                                        <div className="flex items-center space-x-3">
                                            <span className="text-sm font-bold text-slate-500 dark:text-slate-400">{slot}</span>
                                            <span className="text-xs bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300 font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                                                🔒 Bloqueado ({getBlockReasonLabel(block.reason)})
                                            </span>
                                            {block.comment && <span className="text-xs text-slate-500 dark:text-slate-450 italic max-w-xs truncate">"{block.comment}"</span>}
                                        </div>
                                    </div>
                                );
                            }

                            if (apt) {
                                // Slot has an appointment! Render booked card details.
                                const styles = getStatusStyles(apt.status);
                                return (
                                    <div 
                                        key={apt.id} 
                                        className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-700/60 ${styles.border} ${styles.bg} transition-all`}
                                    >
                                        <div className="flex-1 space-y-0.5">
                                            <div className="flex items-center space-x-2">
                                                <span className="text-sm font-bold text-primary">{slot}</span>
                                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${styles.badge}`}>
                                                    {apt.status === 'present' ? 'Presente' : apt.status === 'absent' ? 'Ausente' : 'Agendado'}
                                                </span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                                                    {apt.patientName}
                                                </h4>
                                                <button 
                                                    onClick={() => onSelectPatient(apt.patientId)}
                                                    className="text-[10px] text-primary hover:underline font-semibold"
                                                >
                                                    (Ver Ficha)
                                                </button>
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">{apt.reason}</p>
                                            {apt.createdBy && (
                                                <p className="text-[10px] text-slate-450 dark:text-slate-400 font-medium flex items-center gap-1 mt-0.5 select-none">
                                                    <span>👤 Otorgado por:</span>
                                                    <span className="font-semibold text-teal-650 dark:text-teal-450">{apt.createdBy}</span>
                                                </p>
                                            )}
                                        </div>

                                        {/* Row Quick actions: checkin, checkout, cancel */}
                                        <div className="flex items-center space-x-2.5 mt-2 sm:mt-0 w-full sm:w-auto justify-end">
                                            {apt.status === 'scheduled' && (
                                                <div className="flex space-x-1">
                                                    <button 
                                                        onClick={() => onUpdateAppointmentStatus(apt.id, 'present')} 
                                                        className="text-xs font-semibold px-2 py-1.5 rounded-md bg-green-200 hover:bg-green-300 text-green-900 dark:bg-green-700/80 dark:hover:bg-green-600 dark:text-white transition"
                                                        title="Paciente Presente"
                                                    >
                                                        Presente
                                                    </button>
                                                    <button 
                                                        onClick={() => onUpdateAppointmentStatus(apt.id, 'absent')} 
                                                        className="text-xs font-semibold px-2 py-1 rounded-md bg-red-200 hover:bg-red-300 text-red-900 dark:bg-red-700/80 dark:hover:bg-red-600 dark:text-white transition"
                                                        title="Paciente Ausente"
                                                    >
                                                        Ausente
                                                    </button>
                                                </div>
                                            )}
                                            <button 
                                                onClick={() => {
                                                    setCancellingAptId(apt.id);
                                                    setCancellationReasonText('');
                                                }}
                                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition"
                                                title="Cancelar Turno"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            } else {
                                // Slot is available! Render beautiful clickable available placeholder.
                                return (
                                    <div 
                                        key={slot}
                                        onClick={() => onAddAppointment(selectedDate, slot, selectedProfId)}
                                        className="flex items-center justify-between p-2.5 rounded-lg border border-dashed border-slate-200 dark:border-slate-700/80 hover:border-primary-400 hover:bg-primary-50/20 dark:hover:bg-slate-700/10 cursor-pointer group transition-all"
                                    >
                                        <div className="flex items-center space-x-3 text-slate-400 dark:text-slate-500">
                                            <span className="text-sm font-bold group-hover:text-primary transition">{slot}</span>
                                            <span className="text-xs tracking-wide">Disponible / Libre</span>
                                        </div>
                                        <button 
                                            className="text-xs bg-slate-100 dark:bg-slate-700/50 hover:bg-primary hover:text-white dark:hover:bg-primary group-hover:bg-primary group-hover:text-white border border-transparent hover:border-transparent py-1 px-2.5 rounded-md font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1 transition"
                                        >
                                            <PlusIcon className="w-3 h-3" />
                                            <span>Dar Turno</span>
                                        </button>
                                    </div>
                                );
                            }
                        })}
                    </div>
                </div>
            </div>

            {/* Modal de Cancelación de Turno */}
            <Modal 
                isOpen={cancellingAptId !== null} 
                onClose={() => setCancellingAptId(null)} 
                title="Motivo de Cancelación"
            >
                <form onSubmit={(e) => {
                    e.preventDefault();
                    if (cancellingAptId !== null) {
                        onUpdateAppointmentStatus(cancellingAptId, 'cancelled', cancellationReasonText);
                        setCancellingAptId(null);
                        setCancellationReasonText('');
                    }
                }} className="space-y-4 text-left">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Por favor, indique el motivo por el cual se cancela el turno. Esta información se guardará en el historial de turnos del paciente.
                    </p>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                            Motivo de Cancelación <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={cancellationReasonText}
                            onChange={(e) => setCancellationReasonText(e.target.value)}
                            placeholder="Ej. Cambio de planes, problemas de transporte, reprogramación..."
                            className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-650 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 dark:text-slate-100 font-sans bg-transparent"
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setCancellingAptId(null)}
                            className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg transition text-center font-sans cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition shadow-md hover:shadow-lg text-center font-sans cursor-pointer"
                        >
                            Confirmar Cancelación
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Calendar;
