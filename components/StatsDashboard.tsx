import React, { useState, useMemo } from 'react';
import type { Appointment, Professional, User, AppointmentStatus } from '../types';
import { CalendarDaysIcon, UserIcon, ClipboardDocumentListIcon } from './icons';

interface StatsDashboardProps {
  appointments: Appointment[];
  professionals: Professional[];
  users: User[];
}

type TimeFrame = 'all' | 'year' | 'month' | 'last30';

export const StatsDashboard: React.FC<StatsDashboardProps> = ({
  appointments = [],
  professionals = [],
  users = []
}) => {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('all');
  const [selectedProfId, setSelectedProfId] = useState<number | 'all'>('all');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | 'all'>('all');

  // Extracts all unique specialties from professionals
  const specialties = useMemo(() => {
    const list = professionals.map(p => p.specialty);
    return Array.from(new Set(list)).sort();
  }, [professionals]);

  // Helper dictionary of professional specialties & names
  const professionalDict = useMemo(() => {
    const dict: Record<number, { name: string; specialty: string }> = {};
    professionals.forEach(p => {
      dict[p.id] = { name: p.name, specialty: p.specialty };
    });
    return dict;
  }, [professionals]);

  // Dynamic filter logic
  const filteredAppointments = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return appointments.filter(apt => {
      // 1. Time Frame filter
      if (timeFrame === 'year') {
        const aptYear = new Date(apt.date).getFullYear();
        if (aptYear !== now.getFullYear()) return false;
      } else if (timeFrame === 'month') {
        const aptDate = new Date(apt.date);
        if (
          aptDate.getFullYear() !== now.getFullYear() ||
          aptDate.getMonth() !== now.getMonth()
        ) {
          return false;
        }
      } else if (timeFrame === 'last30') {
        const aptTime = new Date(apt.date).getTime();
        const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;
        if (aptTime < thirtyDaysAgo) return false;
      }

      // 2. Professional Filter
      if (selectedProfId !== 'all' && apt.professionalId !== selectedProfId) {
        return false;
      }

      // 3. Specialty Filter
      const aptSpecialty = professionalDict[apt.professionalId]?.specialty || 'General';
      if (selectedSpecialty !== 'all' && aptSpecialty !== selectedSpecialty) {
        return false;
      }

      return true;
    });
  }, [appointments, timeFrame, selectedProfId, selectedSpecialty, professionalDict]);

  // Metrics calculation
  const metrics = useMemo(() => {
    const total = filteredAppointments.length;
    const present = filteredAppointments.filter(a => a.status === 'present').length;
    const absent = filteredAppointments.filter(a => a.status === 'absent').length;
    const cancelled = filteredAppointments.filter(a => a.status === 'cancelled').length;
    const scheduled = filteredAppointments.filter(a => a.status === 'scheduled').length;

    // Attendance stats are computed over attended or missed appointments (dismissed show-rate in medicine)
    const attendedGrandTotal = present + absent;
    const attendanceRate = attendedGrandTotal > 0 ? (present / attendedGrandTotal) * 100 : 0;
    const absenceRate = attendedGrandTotal > 0 ? (absent / attendedGrandTotal) * 100 : 0;
    const cancellationRate = total > 0 ? (cancelled / total) * 100 : 0;

    return {
      total,
      present,
      absent,
      cancelled,
      scheduled,
      attendanceRate,
      absenceRate,
      cancellationRate
    };
  }, [filteredAppointments]);

  // 1. Specialty Breakdown
  const specialtyStats = useMemo(() => {
    const counts: Record<string, { total: number; present: number; absent: number; cancelled: number }> = {};

    filteredAppointments.forEach(apt => {
      const specialty = professionalDict[apt.professionalId]?.specialty || 'General';
      if (!counts[specialty]) {
        counts[specialty] = { total: 0, present: 0, absent: 0, cancelled: 0 };
      }
      counts[specialty].total += 1;
      if (apt.status === 'present') counts[specialty].present += 1;
      else if (apt.status === 'absent') counts[specialty].absent += 1;
      else if (apt.status === 'cancelled') counts[specialty].cancelled += 1;
    });

    return Object.entries(counts).map(([name, data]) => {
      const attended = data.present + data.absent;
      return {
        name,
        total: data.total,
        presentRate: attended > 0 ? (data.present / attended) * 100 : 0,
        absentRate: attended > 0 ? (data.absent / attended) * 100 : 0,
        cancelledRate: data.total > 0 ? (data.cancelled / data.total) * 100 : 0,
        ...data
      };
    }).sort((a, b) => b.total - a.total);
  }, [filteredAppointments, professionalDict]);

  // 2. Creator (Operator/Secretario) Breakdown
  const operatorStats = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredAppointments.forEach(apt => {
      const creator = apt.createdBy || 'Sistema';
      counts[creator] = (counts[creator] || 0) + 1;
    });

    return Object.entries(counts).map(([operator, count]) => {
      // Find role of operator if exists in users
      const user = users.find(u => u.fullName === operator || u.username === operator);
      let roleLabel = 'Administración';
      if (user) {
        if (user.role === 'admin') roleLabel = 'Admin';
        else if (user.role === 'receptionist') roleLabel = 'Recepcionista';
        else if (user.role === 'odontologist') roleLabel = 'Odontólogo';
        else if (user.role === 'master') roleLabel = 'Master';
      } else if (operator === 'Administrador Central') {
        roleLabel = 'Administrador Global';
      }

      return {
        name: operator,
        role: roleLabel,
        count,
        percentage: metrics.total > 0 ? (count / metrics.total) * 100 : 0
      };
    }).sort((a, b) => b.count - a.count);
  }, [filteredAppointments, users, metrics.total]);

  // 3. Professional Breakdown
  const professionalStats = useMemo(() => {
    const counts: Record<number, { total: number; present: number; absent: number; cancelled: number; cancellationReasons: string[] }> = {};

    filteredAppointments.forEach(apt => {
      if (!counts[apt.professionalId]) {
        counts[apt.professionalId] = { total: 0, present: 0, absent: 0, cancelled: 0, cancellationReasons: [] };
      }
      counts[apt.professionalId].total += 1;
      if (apt.status === 'present') counts[apt.professionalId].present += 1;
      else if (apt.status === 'absent') counts[apt.professionalId].absent += 1;
      else if (apt.status === 'cancelled') {
        counts[apt.professionalId].cancelled += 1;
        if (apt.cancellationReason) {
          counts[apt.professionalId].cancellationReasons.push(apt.cancellationReason);
        }
      }
    });

    return Object.entries(counts).map(([profIdStr, data]) => {
      const profId = parseInt(profIdStr, 10);
      const profInfo = professionalDict[profId] || { name: `Profesional #${profId}`, specialty: 'General' };
      const attended = data.present + data.absent;

      // Top cancellation reasons string
      const uniqueReasons = Array.from(new Set(data.cancellationReasons)).slice(0, 2).join(', ');

      return {
        id: profId,
        name: profInfo.name,
        specialty: profInfo.specialty,
        total: data.total,
        presentRate: attended > 0 ? (data.present / attended) * 100 : 0,
        absentRate: attended > 0 ? (data.absent / attended) * 100 : 0,
        cancelledRate: data.total > 0 ? (data.cancelled / data.total) * 100 : 0,
        reasonsSummary: uniqueReasons || 'Ninguno especificado',
        ...data
      };
    }).sort((a, b) => b.total - a.total);
  }, [filteredAppointments, professionalDict]);

  return (
    <div className="space-y-6 text-left font-sans animate-fade-in">
      
      {/* Segmented Filters & Time Selection Bar */}
      <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        
        {/* Left: Timeframe Button Row */}
        <div className="flex bg-white dark:bg-slate-905 p-1 rounded-lg border border-slate-150 dark:border-slate-700 flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setTimeFrame('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
              timeFrame === 'all'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            Histórico completo
          </button>
          <button
            type="button"
            onClick={() => setTimeFrame('year')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
              timeFrame === 'year'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            Este año
          </button>
          <button
            type="button"
            onClick={() => setTimeFrame('month')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
              timeFrame === 'month'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            Este mes
          </button>
          <button
            type="button"
            onClick={() => setTimeFrame('last30')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
              timeFrame === 'last30'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            Últimos 30 días
          </button>
        </div>

        {/* Right: Dropdown Selects */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {/* Professional filter select */}
          <div className="w-full sm:w-auto flex flex-col">
            <label className="text-[9px] uppercase font-bold tracking-wider text-slate-450 dark:text-slate-400 mb-0.5 ml-1">Especialista</label>
            <select
              value={selectedProfId}
              onChange={e => setSelectedProfId(e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10))}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-250 dark:border-slate-650 bg-white dark:bg-slate-750 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-48"
            >
              <option value="all">Todos los Especialistas</option>
              {professionals.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Specialty filter select */}
          <div className="w-full sm:w-auto flex flex-col">
            <label className="text-[9px] uppercase font-bold tracking-wider text-slate-450 dark:text-slate-400 mb-0.5 ml-1">Especialidad</label>
            <select
              value={selectedSpecialty}
              onChange={e => setSelectedSpecialty(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-250 dark:border-slate-650 bg-white dark:bg-slate-750 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-44"
            >
              <option value="all">Todas las Especialidades</option>
              {specialties.map(spec => (
                <option key={spec} value={spec}>{spec}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* METRIC CARD BENTO MATRIX */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-100 dark:border-slate-700/50 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Turnos dados</span>
            <div className="p-1 px-1.5 bg-indigo-50 dark:bg-indigo-950/20 rounded text-indigo-600 dark:text-indigo-400 text-xs font-bold font-mono">
              Registrados
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 font-mono">{metrics.total}</span>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-400 mt-2 font-medium">
            Planificados / Citados en este rango de tiempo.
          </p>
        </div>

        {/* Metric 2 */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-100 dark:border-slate-700/50 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Presentismo (Show-Rate)</span>
            <div className="p-1 px-1.5 bg-green-50 dark:bg-green-950/20 rounded text-green-700 dark:text-green-400 text-xs font-bold font-mono">
              Asistencia
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-green-600 dark:text-green-450 font-mono">{metrics.attendanceRate.toFixed(1)}%</span>
            <span className="text-xs text-slate-400 font-medium">({metrics.present} de {metrics.present + metrics.absent})</span>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-400 mt-2 font-medium">
            Proporción de pacientes que asistieron a su cita dental.
          </p>
        </div>

        {/* Metric 3 */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-100 dark:border-slate-700/50 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ausentismo (No-Show)</span>
            <div className="p-1 px-1.5 bg-red-50 dark:bg-red-950/20 rounded text-red-600 dark:text-red-400 text-xs font-bold font-mono">
              Faltaron
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-red-550 dark:text-red-450 font-mono">{metrics.absenceRate.toFixed(1)}%</span>
            <span className="text-xs text-slate-400 font-medium">({metrics.absent} de {metrics.present + metrics.absent})</span>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-400 mt-2 font-medium">
            Pacientes ausentes sin aviso sobre el total de citaciones.
          </p>
        </div>

        {/* Metric 4 */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-100 dark:border-slate-700/50 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cancelaciones</span>
            <div className="p-1 px-1.5 bg-slate-105 dark:bg-slate-700/50 rounded text-slate-550 dark:text-slate-300 text-xs font-bold font-mono">
              Tasa de Cancelación
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-600 dark:text-slate-400 font-mono">{metrics.cancellationRate.toFixed(1)}%</span>
            <span className="text-xs text-slate-400 font-medium">({metrics.cancelled} de {metrics.total})</span>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-400 mt-2 font-medium">
            Turnos que fueron cancelados y guardados con motivo.
          </p>
        </div>
      </div>

      {/* COMPOSITION VISUAL MIX BAR */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-100 dark:border-slate-700/50 shadow-sm space-y-2">
        <div className="flex justify-between items-center text-xs font-bold text-slate-600 dark:text-slate-300">
          <span>Distribución Porcentual del Estado de Citas ({metrics.total} turnos totales):</span>
          <div className="flex gap-4">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-green-500"></span> Presentes ({metrics.present})</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-500"></span> Ausentes ({metrics.absent})</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-400"></span> Programados ({metrics.scheduled})</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-slate-400"></span> Cancelados ({metrics.cancelled})</span>
          </div>
        </div>
        <div className="h-5 rounded-lg overflow-hidden flex font-mono text-[10px] text-white font-extrabold shadow-inner select-none bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          {metrics.total === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 italic">No hay datos de distribución para representar</div>
          ) : (
            <>
              {metrics.present > 0 && (
                <div 
                  style={{ width: `${(metrics.present / metrics.total) * 100}%` }}
                  className="bg-green-505 dark:bg-green-600 flex items-center justify-center min-w-[20px] transition-all duration-500 hover:opacity-90"
                  title={`Presentes: ${metrics.present} (${((metrics.present / metrics.total) * 100).toFixed(1)}%)`}
                >
                  {((metrics.present / metrics.total) * 100) > 6 && `${((metrics.present / metrics.total) * 100).toFixed(0)}%`}
                </div>
              )}
              {metrics.absent > 0 && (
                <div 
                  style={{ width: `${(metrics.absent / metrics.total) * 100}%` }}
                  className="bg-red-505 dark:bg-red-600 flex items-center justify-center min-w-[20px] transition-all duration-500 hover:opacity-90"
                  title={`Ausentes: ${metrics.absent} (${((metrics.absent / metrics.total) * 100).toFixed(1)}%)`}
                >
                  {((metrics.absent / metrics.total) * 100) > 6 && `${((metrics.absent / metrics.total) * 100).toFixed(0)}%`}
                </div>
              )}
              {metrics.scheduled > 0 && (
                <div 
                  style={{ width: `${(metrics.scheduled / metrics.total) * 100}%` }}
                  className="bg-amber-400 dark:bg-amber-500 flex items-center justify-center min-w-[20px] transition-all duration-500 hover:opacity-90 text-slate-850"
                  title={`Programados: ${metrics.scheduled} (${((metrics.scheduled / metrics.total) * 100).toFixed(1)}%)`}
                >
                  {((metrics.scheduled / metrics.total) * 100) > 6 && `${((metrics.scheduled / metrics.total) * 100).toFixed(0)}%`}
                </div>
              )}
              {metrics.cancelled > 0 && (
                <div 
                  style={{ width: `${(metrics.cancelled / metrics.total) * 100}%` }}
                  className="bg-slate-400 flex items-center justify-center min-w-[20px] transition-all duration-500 hover:opacity-90 text-slate-850"
                  title={`Cancelados: ${metrics.cancelled} (${((metrics.cancelled / metrics.total) * 100).toFixed(1)}%)`}
                >
                  {((metrics.cancelled / metrics.total) * 100) > 6 && `${((metrics.cancelled / metrics.total) * 100).toFixed(0)}%`}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* LOWER GRID: SPECIALTY BREAKDOWN AND OPERATORS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Turnos por Especialidad */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700/50 shadow-sm space-y-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">🏷️ Turnos por Especialidad Médica</h3>
            <p className="text-xs text-slate-450 dark:text-slate-400 mt-0.5">Demanda de turnos para cada área terapéutica.</p>
          </div>

          {specialtyStats.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-450 italic">No hay registros de especialidad en el periodo cargado</div>
          ) : (
            <div className="space-y-4">
              {specialtyStats.map(spec => {
                const specPercentage = metrics.total > 0 ? (spec.total / metrics.total) * 100 : 0;
                return (
                  <div key={spec.name} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300">{spec.name}</span>
                      <span className="text-slate-500 dark:text-slate-400 font-medium">
                        <strong className="text-slate-800 dark:text-slate-100 font-mono">{spec.total}</strong> dadas ({specPercentage.toFixed(1)}%)
                      </span>
                    </div>
                    
                    {/* Multi-layered progress gauge representing Presentism (green) vs Absentism (red) inside the bar slice */}
                    <div className="relative w-full h-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full overflow-hidden flex select-none">
                      {spec.total === 0 ? (
                        <div className="flex-1 bg-slate-205"></div>
                      ) : (
                        <>
                          <div 
                            style={{ width: `${(spec.present / spec.total) * 100}%` }} 
                            className="bg-green-500 h-full transition-all"
                            title={`Presentes: ${spec.present}`}
                          />
                          <div 
                            style={{ width: `${(spec.absent / spec.total) * 100}%` }} 
                            className="bg-red-500 h-full transition-all"
                            title={`Ausentes: ${spec.absent}`}
                          />
                          <div 
                            style={{ width: `${(spec.scheduled / spec.total) * 105}%` }} 
                            className="bg-amber-400 h-full transition-all"
                            title={`Próximos: ${spec.scheduled}`}
                          />
                          <div 
                            style={{ width: `${(spec.cancelled / spec.total) * 100}%` }} 
                            className="bg-slate-400 h-full transition-all"
                            title={`Cancelados: ${spec.cancelled}`}
                          />
                        </>
                      )}
                    </div>
                    {/* Small metrics label */}
                    <div className="flex justify-between text-[11px] text-slate-400 font-sans px-1">
                      <span>✓ Asistió: <strong className="text-green-600 font-mono">{spec.presentRate.toFixed(0)}%</strong></span>
                      <span>✗ Faltó: <strong className="text-red-500 font-mono">{spec.absentRate.toFixed(0)}%</strong></span>
                      <span>⚠ Cancelado: <strong className="text-slate-500 font-mono">{spec.cancelledRate.toFixed(0)}%</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Turnos por Perfil Administrativo/Secretario */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700/50 shadow-sm space-y-4 pb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">👤 Turnos Otorgados por Administración / Operador</h3>
            <p className="text-xs text-slate-450 dark:text-slate-400 mt-0.5">Productividad e historial de otorgamientos por secretario/odontólogo.</p>
          </div>

          {operatorStats.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-450 italic">No se registran datos de operadores de carga de agenda</div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700/60 max-h-[300px] overflow-y-auto pr-1">
              {operatorStats.map((op, i) => {
                // Generate simple unique bg color based on name/index for initials
                const colorBgs = ['bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300', 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-400', 'bg-teal-100 text-teal-800 dark:bg-teal-950/30 dark:text-teal-400', 'bg-purple-100 text-purple-800 dark:bg-purple-950/30 dark:text-purple-400'];
                const appliedBg = colorBgs[i % colorBgs.length];

                return (
                  <div key={op.name} className="py-2.5 flex items-center justify-between font-sans">
                    <div className="flex items-center gap-3">
                      {/* Initials bubble avatar */}
                      <div className={`w-9 h-9 rounded-full font-bold text-xs flex items-center justify-center select-none ${appliedBg}`}>
                        {op.name.split(' ').map(n => n.charAt(0)).join('').substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-bold text-slate-700 dark:text-slate-200 text-xs block">{op.name}</span>
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-400 font-semibold uppercase mt-0.5 inline-block">{op.role}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-extrabold text-slate-800 dark:text-slate-100 text-sm font-mono block">{op.count} <span className="text-xs font-normal text-slate-400">turnos</span></span>
                      <span className="text-[10px] text-slate-450 font-semibold">({op.percentage.toFixed(1)}% del total)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* DETAILED ANALYSIS: DESEMPEÑO DETALLADO POR PROFESIONAL */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-100 dark:border-slate-700/50 overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">🩺 Desempeño Clínico e Índices de Presentismo por Especialista</h3>
          <p className="text-xs text-slate-450 dark:text-slate-400 mt-0.5">
            Análisis detallado de cada dentista y cirujano, incluyendo sus show-rates (asistencia) y motivos frecuentes de cancelaciones de pacientes.
          </p>
        </div>

        {professionalStats.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 italic">No hay especialistas que tengan cargado turnos en el rango indicado</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-left font-sans text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-550 dark:text-slate-400 uppercase tracking-widest font-bold text-[10px]">
                <tr>
                  <th className="px-6 py-4">Especialista y Área</th>
                  <th className="px-6 py-4 text-center">Total Turnos</th>
                  <th className="px-6 py-4 text-center">Asistieron</th>
                  <th className="px-6 py-4 text-center">Ausentes</th>
                  <th className="px-6 py-4 text-center">Cancelaron</th>
                  <th className="px-6 py-4 text-center">Índice Presentismo</th>
                  <th className="px-6 py-4">Principales Motivos de Cancelación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 dark:divide-slate-700">
                {professionalStats.map(prof => {
                  let indicatorBg = 'text-red-500 bg-red-50 dark:bg-red-950/20';
                  if (prof.presentRate >= 80) indicatorBg = 'text-green-700 bg-green-50 dark:bg-green-950/20';
                  else if (prof.presentRate >= 50) indicatorBg = 'text-amber-700 bg-amber-50 dark:bg-amber-950/20';

                  return (
                    <tr key={prof.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 text-slate-700 dark:text-slate-300">
                      <td className="px-6 py-3.5">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">{prof.name}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">{prof.specialty}</span>
                      </td>
                      <td className="px-6 py-3.5 text-center font-mono font-bold text-slate-800 dark:text-slate-150">{prof.total}</td>
                      <td className="px-6 py-3.5 text-center">
                        <span className="font-semibold text-green-600 block">{prof.present}</span>
                        <span className="text-[10px] text-slate-400">Pacientes</span>
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <span className="font-semibold text-red-550 block">{prof.absent}</span>
                        <span className="text-[10px] text-slate-400">Inasistencias</span>
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <span className="font-semibold text-slate-500 block">{prof.cancelled}</span>
                        <span className="text-[10px] text-slate-400">Tasa: {prof.cancelledRate.toFixed(0)}%</span>
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <div className={`p-1 px-2.5 rounded-full inline-block text-xs font-bold font-mono ${indicatorBg}`}>
                          {prof.presentRate.toFixed(1)}%
                        </div>
                      </td>
                      <td className="px-6 py-3.5 max-w-[200px] truncate italic text-slate-450 dark:text-slate-400" title={prof.reasonsSummary}>
                        {prof.reasonsSummary}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default StatsDashboard;
