import React, { useState, useRef, useEffect } from 'react';
import type { Patient, ClinicSettings, User } from '../types';
import { ToothCondition } from '../types';
import { ODONTOGRAM_LAYOUT, TOOTH_CONDITIONS_OPTIONS, TOOTH_SVG_PATHS, TOOTH_TYPE_MAP } from '../constants';
import { XMarkIcon, PencilSquareIcon } from './icons';

interface OdontogramProps {
  patient: Patient;
  onUpdatePatient: (patient: Patient) => void;
  clinicSettings?: ClinicSettings;
  currentUser?: User;
}

const DEFAULT_CONSENT_TEMPLATE = `CONSENTIMIENTO INFORMADO PARA TRATAMIENTO ODONTOLÓGICO

Por la presente, expreso de manera libre y voluntaria mi consentimiento para que el equipo profesional de este centro odontológico realice el diagnóstico y tratamiento indicado en mi plan de atención.

He sido plenamente informado/a sobre el diagnóstico, la naturaleza del procedimiento recomendado, los beneficios esperados, las alternativas viables y los riesgos potenciales (los cuales incluyen, sin limitarse a: molestias postoperatorias directas, sangrado leve, infecciones localizadas o sensibilidad dental temporaria).

Comprendo que la odontología no es una ciencia exacta y que no se pueden garantizar resultados perfectos de modo absoluto. Confirmo que he podido realizar todas las preguntas necesarias, obteniendo respuestas satisfactorias y claras.

Me comprometo a seguir rigurosamente las indicaciones y cuidados post-tratamiento indicados por el profesional odontólogo, asumiendo la responsabilidad de concurrir a los controles estipulados y reportar de inmediato cualquier complicación imprevista.`;

// Internal SignaturePad component for capturing drawings smoothly
const SignaturePad: React.FC<{
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onDraw: () => void;
  onClear: () => void;
}> = ({ canvasRef, onDraw, onClear }) => {
  const [isDrawing, setIsDrawing] = useState(false);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const rect = canvas.getBoundingClientRect();
    let x, y;
    if ('touches' in e) {
      if (e.touches.length === 0) return;
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
      e.preventDefault(); // Prevent scrolling on mobile touch
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;
    if ('touches' in e) {
      if (e.touches.length === 0) return;
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
      e.preventDefault();
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
    onDraw();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  return (
    <div className="border-2 border-dashed border-slate-300 dark:border-slate-500 rounded-lg bg-slate-50 dark:bg-slate-950 overflow-hidden relative" style={{ height: '160px' }}>
      <canvas
        ref={canvasRef}
        width={450}
        height={160}
        className="w-full h-full cursor-crosshair touch-none bg-white dark:bg-slate-900"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
      <div className="absolute top-2 right-2 flex items-center gap-1.5 pointer-events-none">
        <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-black uppercase tracking-wider">
          Firma táctil / Tablet
        </span>
      </div>
      <button 
        type="button" 
        onClick={onClear} 
        className="absolute bottom-2 right-2 border border-slate-300 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-1 rounded text-[11px] font-bold shadow transition-colors"
      >
        Limpiar Trazo
      </button>
    </div>
  );
};

const ToothComponent: React.FC<{
  toothId: number;
  condition: ToothCondition;
  onClick: () => void;
}> = ({ toothId, condition, onClick }) => {
  const conditionColors: Record<ToothCondition, string> = {
    [ToothCondition.Healthy]: 'fill-white dark:fill-slate-300 stroke-slate-500 dark:stroke-slate-400',
    [ToothCondition.Caries]: 'fill-yellow-400 stroke-yellow-600',
    [ToothCondition.Extraction]: 'fill-red-500 stroke-red-700',
    [ToothCondition.Implant]: 'fill-blue-500 stroke-blue-700',
    [ToothCondition.Crown]: 'fill-purple-500 stroke-purple-700',
    [ToothCondition.Restoration]: 'fill-green-500 stroke-green-700',
  };

  const isUpper = toothId <= 16;
  const toothType = TOOTH_TYPE_MAP[toothId];
  const pathData = isUpper ? TOOTH_SVG_PATHS[toothType].upper : TOOTH_SVG_PATHS[toothType].lower;

  return (
    <div onClick={onClick} className="cursor-pointer group flex flex-col items-center p-1" id={`tooth-wrapper-${toothId}`}>
      <span className="text-xs mb-1 text-slate-600 dark:text-slate-300 font-medium">{toothId}</span>
      <svg viewBox="0 0 50 75" className="w-8 h-10">
        <path
          d={pathData}
          className={`${conditionColors[condition]} stroke-2 group-hover:opacity-80 transition-opacity`}
        />
      </svg>
    </div>
  );
};

const Odontogram: React.FC<OdontogramProps> = ({ patient, onUpdatePatient, clinicSettings, currentUser }) => {
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);

  // States for Consent Form Signing
  const [typedName, setTypedName] = useState(`${patient.name} ${patient.lastName}`);
  const [typedDni, setTypedDni] = useState(patient.dni);
  const [hasDrawn, setHasDrawn] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Synchronize state values when patient changes
  useEffect(() => {
    setTypedName(`${patient.name} ${patient.lastName}`);
    setTypedDni(patient.dni);
  }, [patient]);

  // Reset drawing flag when modal opens/closes
  useEffect(() => {
    if (!isConsentModalOpen) {
      setHasDrawn(false);
    }
  }, [isConsentModalOpen]);

  const handleToothClick = (toothId: number) => {
    setSelectedTooth(toothId);
  };
  
  const handleConditionChange = (condition: ToothCondition) => {
    if (selectedTooth === null) return;
    
    const todayDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const newHistoryEntry = {
      date: todayDate,
      condition,
      professionalName: currentUser ? currentUser.fullName : 'Sistema',
      professionalLicense: (currentUser?.role === 'odontologist' || currentUser?.role === 'specialist' || currentUser?.license) ? currentUser.license : undefined
    };

    const updatedOdontogram = patient.odontogram.map(tooth => {
      if (tooth.id === selectedTooth) {
        const existingHistory = tooth.history || [];
        return { 
          ...tooth, 
          condition,
          history: [newHistoryEntry, ...existingHistory]
        };
      }
      return tooth;
    });

    onUpdatePatient({ ...patient, odontogram: updatedOdontogram });
    setSelectedTooth(null);
  };

  const handleClearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSaveConsent = () => {
    if (!typedName.trim()) {
      alert("Por favor ingrese la aclaración (Nombre y Apellido).");
      return;
    }
    if (!typedDni.trim()) {
      alert("Por favor ingrese el número de DNI.");
      return;
    }
    if (!hasDrawn) {
      alert("❌ La firma rúbrica digital es obligatoria. Por favor, realice su firma táctil antes de registrar el consentimiento.");
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Retrieve signature image data URL
    const signatureUrl = canvas.toDataURL('image/png');

    const todayDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const stampDate = new Date().toLocaleDateString('es-AR') + ' ' + new Date().toLocaleTimeString('es-AR');

    const consentBody = clinicSettings?.consentTemplate || DEFAULT_CONSENT_TEMPLATE;

    // Create legal ClinicalHistoryEntry representation
    const newEntry = {
      date: todayDate,
      reason: "Firma de Consentimiento Informado",
      diagnosis: "Asentimiento y firma digital receptada con éxito",
      description: `El paciente ha evaluado las condiciones y rubricado digitalmente por pantalla táctil el Consentimiento Informado.\n\nFirmante: ${typedName.toUpperCase()}\nDNI: ${typedDni}\nFecha y hora de registro: ${stampDate}`,
      procedures: [
        "Homologación de Consentimiento Clínico",
        "Rúbrica Digital Biométrica / Táctil"
      ],
      suggestedTreatment: "Autorización de intervenciones odontológicas estipuladas en odontograma.",
      isConsent: true,
      consentTitle: "CONSENTIMIENTO INFORMADO PARA TRATAMIENTO ODONTOLÓGICO",
      consentText: consentBody,
      signatureImage: signatureUrl,
      signatureName: typedName,
      signatureDni: typedDni,
      signatureTimestamp: stampDate,
      file: {
        name: "Consentimiento_Firmado.pdf (Visualizar)",
        url: signatureUrl
      }
    };

    onUpdatePatient({
      ...patient,
      clinicalHistory: [newEntry, ...patient.clinicalHistory]
    });

    alert("¡Excelente! El consentimiento informado ha sido firmado y registrado correctamente en la Historia Clínica del paciente.");
    setIsConsentModalOpen(false);
  };

  const renderToothRow = (toothIds: number[]) => (
    <div className="flex justify-center items-end space-x-1">
      {toothIds.map(id => {
        const tooth = patient.odontogram.find(t => t.id === id);
        return tooth ? (
          <ToothComponent
            key={id}
            toothId={id}
            condition={tooth.condition}
            onClick={() => handleToothClick(id)}
          />
        ) : null;
      })}
    </div>
  );

  return (
    <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-lg shadow-md overflow-x-auto relative" id="odontogram-main-container">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">Odontograma Interactivo</h3>
            
            <button 
                type="button" 
                onClick={() => setIsConsentModalOpen(true)}
                className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-lg shadow-md transition-colors text-xs active:scale-95 cursor-pointer"
                id="btn-consentimiento-informado"
            >
                <span>📝 Firmar Consentimiento</span>
            </button>
        </div>

        <div className="min-w-[700px]">
            {/* Upper Arch */}
            <div className="flex w-full">
                <div className="w-1/2 text-center p-2 border-r border-slate-300 dark:border-slate-600">
                    <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">SUPERIOR DERECHA</h4>
                    {renderToothRow(ODONTOGRAM_LAYOUT.upperRight)}
                </div>
                <div className="w-1/2 text-center p-2">
                    <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">SUPERIOR IZQUIERDA</h4>
                    {renderToothRow(ODONTOGRAM_LAYOUT.upperLeft)}
                </div>
            </div>

            <div className="border-t-2 border-dashed border-slate-300 dark:border-slate-600 my-4"></div>

            {/* Lower Arch */}
            <div className="flex w-full">
                <div className="w-1/2 text-center p-2 border-r border-slate-300 dark:border-slate-600">
                    <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">INFERIOR DERECHA</h4>
                     {renderToothRow([...ODONTOGRAM_LAYOUT.lowerRight].reverse())}
                </div>
                <div className="w-1/2 text-center p-2">
                    <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">INFERIOR IZQUIERDA</h4>
                     {renderToothRow([...ODONTOGRAM_LAYOUT.lowerLeft].reverse())}
                </div>
            </div>
        </div>

        {selectedTooth !== null && (() => {
            const currentToothObj = patient.odontogram.find(t => t.id === selectedTooth);
            const currentCondition = currentToothObj ? currentToothObj.condition : ToothCondition.Healthy;
            const toothHistory = currentToothObj?.history || [];
            
            return (
                <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm shadow-2xl" id="tooth-modal-overlay">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden animate-fade-in" id="tooth-modal-container">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-2.5">
                                <span className="text-2xl">🦷</span>
                                <div>
                                    <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                                        Pieza Dental #{selectedTooth}
                                    </h3>
                                    <p className="text-[11px] text-slate-400 font-bold">
                                        Estado actual: <span className="text-primary dark:text-primary-400 font-extrabold">{currentCondition}</span>
                                    </p>
                                </div>
                            </div>
                            <button 
                                type="button" 
                                onClick={() => setSelectedTooth(null)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1.5 bg-slate-100 dark:bg-slate-700 rounded-full transition-colors"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6 text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                
                                {/* Left column: Actions / state changer */}
                                <div>
                                    <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-3">
                                        Seleccionar Nuevo Estado
                                    </h4>
                                    <div className="space-y-2">
                                        {TOOTH_CONDITIONS_OPTIONS.map(condition => {
                                            const isActive = condition === currentCondition;
                                            
                                            // Color schemes matching the tooth component fill
                                            const conditionColors: Record<ToothCondition, string> = {
                                                [ToothCondition.Healthy]: 'border-slate-300 dark:border-slate-705 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40',
                                                [ToothCondition.Caries]: 'border-yellow-300 text-yellow-700 bg-yellow-500/5 hover:bg-yellow-500/10 dark:text-yellow-400',
                                                [ToothCondition.Extraction]: 'border-red-300 text-red-700 bg-red-500/5 hover:bg-red-500/10 dark:text-red-400',
                                                [ToothCondition.Implant]: 'border-blue-300 text-blue-700 bg-blue-500/5 hover:bg-blue-500/10 dark:text-blue-400',
                                                [ToothCondition.Crown]: 'border-purple-300 text-purple-700 bg-purple-505/5 hover:bg-purple-500/10 dark:text-purple-400',
                                                [ToothCondition.Restoration]: 'border-green-305 text-green-700 bg-green-500/5 hover:bg-green-500/10 dark:text-green-400',
                                            };

                                            const activeClass = isActive 
                                                ? 'ring-2 ring-indigo-505 font-extrabold bg-indigo-50/40 dark:bg-indigo-950/30 border-indigo-500 dark:border-indigo-500' 
                                                : conditionColors[condition];

                                            return (
                                                <button
                                                    key={condition}
                                                    type="button"
                                                    onClick={() => handleConditionChange(condition)}
                                                    className={`w-full text-left p-2.5 rounded-lg border text-xs font-bold transition-all flex items-center justify-between ${activeClass}`}
                                                >
                                                    <span>{condition}</span>
                                                    {isActive && <span className="text-indigo-650 dark:text-indigo-400 font-extrabold text-xs">✓ Actual</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Right column: History track */}
                                <div className="flex flex-col">
                                    <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-3 flex items-center justify-between">
                                        <span>📜 Historial de Registros</span>
                                        <span className="font-mono text-[10px] bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 px-2.5 py-0.5 rounded-full font-bold">{toothHistory.length}</span>
                                    </h4>
                                    
                                    <div className="flex-1 max-h-[280px] overflow-y-auto pr-1 space-y-3 font-sans">
                                        {toothHistory.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-450 italic">
                                                <span className="text-xl mb-1">🔍</span>
                                                <p className="text-[11px]">No se registran cambios previos para esta pieza.</p>
                                                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Los cambios se guardan aquí cronológicamente.</p>
                                            </div>
                                        ) : (
                                            <div className="relative pl-3.5 border-l-2 border-indigo-100 dark:border-indigo-950/80 ml-2 space-y-4 py-1">
                                                {toothHistory.map((item, idx) => (
                                                    <div key={idx} className="relative">
                                                        {/* Dot indicator */}
                                                        <span className="absolute -left-[22px] top-1.5 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-white dark:ring-slate-900 border border-indigo-100 dark:border-indigo-950"></span>
                                                        
                                                        <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-100/80 dark:border-slate-800/50">
                                                            <div className="flex justify-between items-start">
                                                                <span className="font-extrabold text-xs text-indigo-700 dark:text-indigo-400">
                                                                    {item.condition}
                                                                </span>
                                                                <span className="text-[10px] font-mono text-slate-400">
                                                                    {item.date.split('-').reverse().join('/')}
                                                                </span>
                                                            </div>
                                                            <p className="text-[11px] text-slate-600 dark:text-slate-350 mt-1 font-bold">
                                                                👩‍⚕️ Atendió: <span className="text-slate-800 dark:text-slate-200 mt-0.5 font-extrabold text-xs">{item.professionalName}</span>
                                                                {item.professionalLicense && (
                                                                    <span className="text-[10px] whitespace-nowrap font-mono font-normal block text-indigo-600 dark:text-indigo-400 mt-0.5">
                                                                        M.P. {item.professionalLicense}
                                                                    </span>
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setSelectedTooth(null)}
                                className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-750 dark:hover:bg-slate-650 text-slate-800 dark:text-slate-200 font-bold py-2 px-4 rounded-lg transition-colors text-xs cursor-pointer"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )
        })()}

        {/* COMPREHENSIVE INFORMED CONSENT & SIGNATURE MODAL */}
        {isConsentModalOpen && (
            <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" id="consent-modal-overlay">
                <div className="bg-slate-100 dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] border border-slate-200 dark:border-slate-800 overflow-hidden animate-fade-in" id="consent-modal-container">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">📋</span>
                            <div>
                                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Rúbrica de Consentimiento Informado</h3>
                                <p className="text-[11px] text-slate-400">Habilite la tablet o mouse para que el paciente consienta la intervención odontológica.</p>
                            </div>
                        </div>
                        <button 
                            type="button" 
                            onClick={() => setIsConsentModalOpen(false)}
                            className="text-slate-400 hover:text-slate-650 dark:hover:text-slate-300 p-1 bg-slate-100 dark:bg-slate-700 rounded-full transition-colors"
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content Scroll Area - Simulated High-Fidelity PDF Page Structure */}
                    <div className="p-6 overflow-y-auto flex-1 space-y-6 select-none bg-slate-105" id="consent-modal-content">
                        
                        {/* THE PDF PREVIEW PAGE PANEL */}
                        <div className="bg-white dark:bg-slate-800 p-8 sm:p-12 rounded-xl shadow-lg border border-slate-200 dark:border-slate-750 max-w-3xl mx-auto font-sans relative text-slate-800 dark:text-slate-200 leading-relaxed text-xs">
                            
                            {/* PDF Decorative Top Margin bar */}
                            <div className="absolute top-0 left-0 right-0 h-1.5 bg-indigo-650 rounded-t-xl"></div>
                            
                            {/* PDF Header Block */}
                            <div className="flex justify-between items-start border-b pb-4 mb-6 border-slate-200 dark:border-slate-700 font-sans">
                                <div>
                                    <h4 className="text-sm font-extrabold uppercase tracking-tight text-indigo-750 dark:text-indigo-400">
                                        {clinicSettings?.name || "Consultorio Odontológico"}
                                    </h4>
                                    <p className="text-[10px] text-slate-400">{clinicSettings?.address || "Sede de Turnos"}</p>
                                    <p className="text-[10px] text-slate-400">Tel: {clinicSettings?.phone || "S/D"} CUIT: {clinicSettings?.cuil || "S/D"}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-[9px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-350 px-2.5 py-1 rounded font-mono font-bold">
                                        COD: CONS-INF-01
                                    </span>
                                    <p className="text-[10px] text-slate-400 mt-1">Fecha: {new Date().toLocaleDateString('es-AR')}</p>
                                </div>
                            </div>

                            {/* Document Title */}
                            <h2 className="text-sm font-black text-center text-slate-905 dark:text-white uppercase tracking-wider mb-6 pb-2 border-b-2 border-indigo-100 dark:border-indigo-950/40">
                                CONSENTIMIENTO INFORMADO PARA TRATAMIENTOS ODONTOLÓGICOS
                            </h2>

                            {/* DOCUMENT BODY FLOW */}
                            <div className="space-y-4 text-justify max-h-[250px] overflow-y-auto pr-2 border-b border-slate-100 dark:border-slate-700 pb-4 mb-6 leading-relaxed text-[11px] text-slate-750 dark:text-slate-300 font-sans">
                                {(clinicSettings?.consentTemplate || DEFAULT_CONSENT_TEMPLATE)
                                    .split('\n')
                                    .map((p, idx) => (
                                        p.trim() ? (
                                            <p key={idx} className="indent-4 leading-relaxed">{p}</p>
                                        ) : (
                                            <div key={idx} className="h-2"></div>
                                        )
                                    ))
                                }
                            </div>

                            {/* SIGNATURE BIOMETRIC SECTION */}
                            <div className="mt-6 pt-2 space-y-4">
                                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-150 uppercase tracking-wide border-b pb-1.5 border-slate-150 dark:border-slate-705 flex items-center gap-1.5">
                                    <span>👉 Firma de Conformidad y Declaración Jurada</span>
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    
                                    {/* Column 1: Verification Form Info */}
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">
                                                Aclaración (Nombre Completo)
                                            </label>
                                            <input 
                                                type="text" 
                                                value={typedName}
                                                onChange={(e) => setTypedName(e.target.value)}
                                                className="w-full p-2 border border-slate-300 dark:border-slate-650 rounded bg-slate-50 dark:bg-slate-900 font-bold text-xs"
                                                placeholder="Ej. Juan Pérez"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">
                                                DNI del Firmante
                                            </label>
                                            <input 
                                                type="text" 
                                                value={typedDni}
                                                onChange={(e) => setTypedDni(e.target.value)}
                                                className="w-full p-2 border border-slate-300 dark:border-slate-650 rounded bg-slate-50 dark:bg-slate-900 font-mono font-bold text-xs"
                                                placeholder="Ej. 35.123.456"
                                            />
                                        </div>

                                        <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded border border-slate-205 dark:border-slate-700/65 font-sans">
                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                                                🔐 <strong className="font-extrabold text-indigo-700 dark:text-indigo-400">Verificación de Legalidad:</strong> Esta rúbrica táctil, asociada al DNI del paciente, adquiere valor probatorio de consentimiento legal de acuerdo con el marco regulatorio vigente e historiales clínicos electrónicos de salud.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Column 2: Draw Area */}
                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">
                                            Firme abajo con stylus, dedo o mouse
                                        </label>
                                        <SignaturePad 
                                            canvasRef={canvasRef} 
                                            onDraw={() => setHasDrawn(true)}
                                            onClear={handleClearSignature} 
                                        />
                                    </div>
                                </div>
                            </div>

                        </div>

                    </div>

                    {/* Footer */}
                    <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setIsConsentModalOpen(false)}
                            className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold py-2 px-4 rounded-lg transition-colors text-sm cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveConsent}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-2 px-6 rounded-lg shadow-md hover:shadow-lg transition-all text-sm flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                            <span>✓ Registrar Firma Digital</span>
                        </button>
                    </div>

                </div>
            </div>
        )}
    </div>
  );
};

export default Odontogram;
