import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where, getDoc, doc } from 'firebase/firestore';
import { 
  savePatientToFirestore, 
  saveAppointmentToFirestore, 
  subscribeCenters,
  subscribePatients,
  subscribeAppointments,
  subscribeProfessionals,
  subscribeClinicSettings
} from '../firebaseSync';
import { createOdontogram } from '../constants';
import type { Patient, Appointment, Professional, ClinicSettings, MedicalCenter } from '../types';
import { PaperAirplaneIcon } from './icons';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
}

interface ChatbotSettings {
  isEnabled: boolean;
  botName: string;
  phoneNumber: string;
  customGuidelines: string;
  reminderTemplate: string;
  reminderTimeHours: number;
  autoRemindersEnabled: boolean;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

const StandaloneChatbot: React.FC = () => {
  // Database state
  const [centers, setCenters] = useState<MedicalCenter[]>([]);
  const [activeCenterId, setActiveCenterId] = useState<string | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [clinicSettings, setClinicSettings] = useState<ClinicSettings | null>(null);

  // Chatbot configurations loaded from Firestore
  const [botSettings, setBotSettings] = useState<ChatbotSettings>({
    isEnabled: true,
    botName: 'SaludBot Inteligente',
    phoneNumber: '+5491100000000',
    customGuidelines: 'Saluda cordialmente, responde de forma resumida, ofrece agendar turnos de forma empática.',
    reminderTemplate: 'Hola [Nombre], te recordamos tu turno el día [Fecha] a las [Hora] con el/la Dr/a. [Especialista]. Te esperamos.',
    reminderTimeHours: 24,
    autoRemindersEnabled: true,
  });
  const [faqs, setFaqs] = useState<FAQ[]>([]);

  // Local Chat states
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // Patient Context (the person interacting with the embedded bot)
  const [identifiedPatient, setIdentifiedPatient] = useState<Patient | null>(null);
  const [dniInput, setDniInput] = useState('');
  const [showDniModal, setShowDniModal] = useState(false);
  const [dniError, setDniError] = useState('');

  // Booking Confirmation Modal
  const [confirmedBooking, setConfirmedBooking] = useState<{
    date: string;
    time: string;
    professionalName: string;
    patientName: string;
  } | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // 1. Load active URL params (e.g. customized centerId if provided)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlCenterId = params.get('centerId');
    if (urlCenterId) {
      setActiveCenterId(urlCenterId);
    }
  }, []);

  // 2. Load basic lists and sync with active center
  useEffect(() => {
    const unsubCenters = subscribeCenters((items) => {
      setCenters(items);
      if (items.length > 0 && !activeCenterId) {
        // Fallback to first available center
        setActiveCenterId(items[0].id);
      }
    });

    return () => {
      unsubCenters();
    };
  }, [activeCenterId]);

  // 3. Load specific center data once activeCenterId is resolved
  useEffect(() => {
    if (!activeCenterId) return;

    const unsubPatients = subscribePatients(activeCenterId, (items) => {
      setPatients(items);
    });

    const unsubAppointments = subscribeAppointments(activeCenterId, (items) => {
      setAppointments(items);
    });

    const unsubProfessionals = subscribeProfessionals(activeCenterId, (items) => {
      setProfessionals(items);
    });

    const unsubSettings = subscribeClinicSettings(activeCenterId, (settings) => {
      if (settings) {
        setClinicSettings(settings);
      }
    });

    // Fetch customized Whatsapp Bot settings and FAQs from Firestore
    const loadBotSettings = async () => {
      try {
        const configSnap = await getDoc(doc(db, 'system', 'whatsapp_config'));
        if (configSnap.exists()) {
          const data = configSnap.data();
          if (data.settings) setBotSettings(data.settings);
          if (data.faqs) setFaqs(data.faqs);
        }
      } catch (err) {
        console.error('Error loading bot configuration from Firestore:', err);
      }
    };

    loadBotSettings();

    return () => {
      unsubPatients();
      unsubAppointments();
      unsubProfessionals();
      unsubSettings();
    };
  }, [activeCenterId]);

  // Initial welcome message
  useEffect(() => {
    const botName = botSettings.botName;
    const clinicName = clinicSettings?.name || 'nuestra clínica';
    
    setChatHistory([
      {
        id: 'welcome',
        sender: 'bot',
        text: `¡Hola! 👋 Soy **${botName}**, el asistente virtual de **${clinicName}**.\n\nEstoy aquí para responder tus consultas médicas y ayudarte a agendar, consultar o reprogramar tus turnos en tiempo real.\n\n¿En qué puedo ayudarte hoy?`,
        timestamp: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      }
    ]);
  }, [botSettings.botName, clinicSettings?.name]);

  // Auto scroll to chat bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isTyping]);

  // Handle existing patient login via DNI
  const handleDniLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setDniError('');
    if (!dniInput.trim()) return;

    const found = patients.find(p => p.dni === dniInput.trim());
    if (found) {
      setIdentifiedPatient(found);
      setShowDniModal(false);
      setDniInput('');
      
      const timeString = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
      setChatHistory(prev => [
        ...prev,
        {
          id: Date.now().toString() + '-system',
          sender: 'bot',
          text: `✅ ¡Hola de nuevo, **${found.name}**! He verificado tu ficha médica correctamente.\n\nYa podemos agendar o consultar tus turnos de forma personalizada. ¿Qué deseas hacer?`,
          timestamp: timeString,
        }
      ]);
    } else {
      setDniError('DNI no encontrado. Si eres un paciente nuevo, puedes iniciar el chat y te registraremos al reservar.');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isTyping) return;

    const userMsgText = inputMessage.trim();
    setInputMessage('');

    const timeString = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    const userMessage: ChatMessage = {
      id: Date.now().toString() + '-user',
      sender: 'user',
      text: userMsgText,
      timestamp: timeString,
    };

    setChatHistory(prev => [...prev, userMessage]);
    setIsTyping(true);

    // Build standard system instructions
    const faqsFormatted = faqs.map(f => `P: "${f.question}" -> R: "${f.answer}"`).join('\n');
    const fullSystemInstruction = `
      Eres "${botSettings.botName}", el asistente virtual inteligente de la clínica médica "${clinicSettings?.name || 'Nuestra Clínica'}".
      
      Instrucciones generales de la clínica:
      - Responde cordialmente en español de Argentina.
      - Sé sumamente breve, profesional y directo. No uses más de 2 o 3 oraciones por respuesta.
      - Usa emojis oportunos (🦷, 📅, 📍, 📞) para que el chat se sienta natural y moderno.
      
      Reglas de respuesta del administrador:
      "${botSettings.customGuidelines}"

      Preguntas Frecuentes de la clínica (responde con esta información si el paciente pregunta por estos temas):
      ${faqsFormatted}

      Si la consulta es sobre agendar un turno o ver especialistas, guíalos amablemente indicando que pueden solicitarlo aquí mismo.
    `;

    try {
      const apiHistory = chatHistory
        .filter(msg => msg.id !== 'welcome')
        .map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'model',
          text: msg.text
        }));

      const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const todayDate = new Date();
      const currentDateString = todayDate.toISOString().split('T')[0];
      const currentDayOfWeekString = days[todayDate.getDay()];

      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsgText,
          systemInstruction: fullSystemInstruction,
          history: apiHistory,
          professionals: professionals,
          appointments: appointments,
          patient: identifiedPatient,
          currentDate: currentDateString,
          currentDayOfWeek: currentDayOfWeekString
        })
      });

      const data = await res.json();
      setIsTyping(false);

      const botMessage: ChatMessage = {
        id: Date.now().toString() + '-bot',
        sender: 'bot',
        text: data.response || 'Disculpas, tengo problemas para procesar tu consulta en este momento.',
        timestamp: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      };
      setChatHistory(prev => [...prev, botMessage]);

      // If a new patient registration is triggered by Gemini
      let resolvedPatientId = data.booking?.patientId;
      let resolvedPatientName = identifiedPatient ? `${identifiedPatient.name} ${identifiedPatient.lastName}` : 'Paciente';

      if (data.newPatient) {
        const newPatientId = Math.floor(100000 + Math.random() * 900000);
        const patientData: Patient = {
          id: newPatientId,
          name: data.newPatient.name,
          lastName: data.newPatient.lastName,
          phone: data.newPatient.phone,
          dni: data.newPatient.dni,
          avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${data.newPatient.name}`,
          healthInsurance: 'Particular',
          insuranceId: '',
          clinicalHistory: [],
          odontogram: createOdontogram(),
          invoices: [],
          prescriptions: [],
          certificates: [],
          centerId: activeCenterId || undefined,
          validationStatus: 'unvalidated'
        };

        await savePatientToFirestore(patientData);
        setIdentifiedPatient(patientData);
        resolvedPatientId = newPatientId;
        resolvedPatientName = `${data.newPatient.name} ${data.newPatient.lastName}`;
      }

      // If a booking is confirmed by Gemini
      if (data.booking) {
        const matchingPro = professionals.find(p => p.id === Number(data.booking.professionalId));
        const proName = matchingPro ? `${matchingPro.name} ${matchingPro.lastName}` : 'Especialista';

        const newAppointment: Appointment = {
          id: Date.now(),
          patientId: Number(resolvedPatientId) || Number(identifiedPatient?.id) || 123456,
          patientName: resolvedPatientName,
          professionalId: Number(data.booking.professionalId),
          professionalName: proName,
          date: data.booking.date,
          time: data.booking.time,
          status: 'scheduled',
          centerId: activeCenterId || undefined,
          createdBy: botSettings.botName,
        };

        await saveAppointmentToFirestore(newAppointment);

        // Open beautiful visual success modal
        setConfirmedBooking({
          date: data.booking.date,
          time: data.booking.time,
          professionalName: proName,
          patientName: resolvedPatientName,
        });
      }

    } catch (err) {
      console.error('Error fetching chatbot API:', err);
      setIsTyping(false);
      setChatHistory(prev => [
        ...prev,
        {
          id: Date.now().toString() + '-err',
          sender: 'bot',
          text: '⚠️ Disculpa, en este momento el motor de inteligencia artificial no se encuentra disponible. Por favor intenta de nuevo en unos instantes.',
          timestamp: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
        }
      ]);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#efeae2] dark:bg-slate-950 font-sans select-none overflow-hidden relative">
      
      {/* Standalone Chatbot Header */}
      <div className="bg-primary text-white p-4 shadow-md flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center font-bold text-lg border border-white/10 shadow-sm">
            {botSettings.botName.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-sm font-black tracking-wide truncate max-w-[180px] sm:max-w-[280px]">
              {botSettings.botName}
            </h1>
            <p className="text-[10px] text-emerald-250 font-extrabold flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block"></span>
              <span>Asistente de {clinicSettings?.name || 'la Clínica'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {identifiedPatient ? (
            <div className="flex items-center gap-1.5 bg-white/15 px-2.5 py-1 rounded-full border border-white/10 max-w-[140px] sm:max-w-[200px]">
              <span className="text-[9px] text-white/90 font-black truncate">
                👤 {identifiedPatient.name}
              </span>
              <button 
                onClick={() => setIdentifiedPatient(null)}
                className="text-[9px] bg-white/20 hover:bg-white/40 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center cursor-pointer"
                title="Cerrar Sesión"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowDniModal(true)}
              className="px-3 py-1 bg-white/25 hover:bg-white/35 active:scale-95 text-white text-[10px] font-black rounded-lg border border-white/20 transition cursor-pointer shadow-sm"
            >
              🔑 Identificarse (DNI)
            </button>
          )}
        </div>
      </div>

      {/* Chat Messages Canvas */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        <div className="mx-auto my-2 text-[10px] bg-white/80 dark:bg-slate-900/85 border border-slate-200/50 dark:border-slate-800 text-slate-500 dark:text-slate-400 px-4 py-1.5 rounded-full shadow-sm font-bold uppercase tracking-wider text-center max-w-[340px]">
          💬 Chat de Autoatención Médica Inteligente
        </div>

        {chatHistory.map((msg) => (
          <div
            key={msg.id}
            className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm shadow-premium leading-relaxed relative flex flex-col ${
              msg.sender === 'user'
                ? 'bg-primary text-white self-end rounded-tr-none'
                : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 self-start rounded-tl-none border border-slate-150 dark:border-slate-800'
            }`}
          >
            <p className="whitespace-pre-wrap font-medium">{msg.text}</p>
            <span className={`text-[9px] self-end mt-1.5 font-bold font-mono ${msg.sender === 'user' ? 'text-white/70' : 'text-slate-400'}`}>
              {msg.timestamp}
            </span>
          </div>
        ))}

        {isTyping && (
          <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-2xl rounded-tl-none border border-slate-150 dark:border-slate-800 px-4 py-3 text-xs self-start flex items-center gap-1.5 w-20 shadow-premium">
            <span className="w-2 h-2 bg-slate-450 rounded-full animate-bounce"></span>
            <span className="w-2 h-2 bg-slate-450 rounded-full animate-bounce [animation-delay:0.2s]"></span>
            <span className="w-2 h-2 bg-slate-450 rounded-full animate-bounce [animation-delay:0.4s]"></span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Message Footer */}
      <form onSubmit={handleSendMessage} className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3 shrink-0">
        <input
          type="text"
          placeholder={isTyping ? "Espere que el bot responda..." : "Escribe un mensaje aquí para consultar o agendar..."}
          value={inputMessage}
          disabled={isTyping}
          onChange={(e) => setInputMessage(e.target.value)}
          className="flex-1 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-full text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-primary text-slate-800 dark:text-slate-100 placeholder-slate-400 font-medium"
        />
        <button
          type="submit"
          disabled={isTyping || !inputMessage.trim()}
          className="w-10 h-10 rounded-full bg-primary hover:bg-primary/90 text-white flex items-center justify-center shrink-0 transition disabled:opacity-50 cursor-pointer shadow-premium"
        >
          <PaperAirplaneIcon className="w-5 h-5 ml-0.5" />
        </button>
      </form>

      {/* DNI Identification Modal */}
      {showDniModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-55">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 p-6 w-full max-w-sm shadow-premium animate-in fade-in-50 zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">🔑 Identificación de Paciente</h3>
              <button 
                onClick={() => {
                  setShowDniModal(false);
                  setDniError('');
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDniLogin} className="mt-4 space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                Si ya tienes historia clínica con nosotros, ingresa tu número de documento nacional de identidad para vincular tu chat.
              </p>
              
              <div>
                <label htmlFor="dniEmbedInput" className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Tu número de DNI</label>
                <input
                  type="text"
                  id="dniEmbedInput"
                  value={dniInput}
                  onChange={(e) => setDniInput(e.target.value)}
                  className="w-full p-2.5 border border-slate-250 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-primary text-xs font-bold text-slate-800 dark:text-slate-100"
                  placeholder="Ej: 38450123"
                  autoFocus
                />
                {dniError && (
                  <p className="text-[10px] text-red-500 font-extrabold mt-1">⚠️ {dniError}</p>
                )}
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowDniModal(false);
                    setDniError('');
                  }}
                  className="flex-1 py-2 border border-slate-200 text-slate-500 dark:text-slate-400 text-xs font-bold rounded-lg cursor-pointer"
                >
                  Continuar como Invitado
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-primary hover:bg-primary-650 text-white text-xs font-black rounded-lg transition cursor-pointer"
                >
                  Verificar DNI
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Booking Confirmation Celebration Modal */}
      {confirmedBooking && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-55">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-emerald-500 p-6 w-full max-w-sm shadow-premium text-center animate-in fade-in-50 zoom-in-95 duration-200 relative overflow-hidden">
            {/* Top decorative stripe */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-500" />
            
            <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-2xl mb-4 shadow-sm border border-emerald-200/40">
              🎉
            </div>

            <h3 className="text-base font-black text-slate-850 dark:text-white">¡Turno Agendado con Éxito!</h3>
            <p className="text-xs text-slate-450 dark:text-slate-450 mt-1">Tu cita médica ha sido confirmada en nuestra agenda.</p>

            <div className="my-5 p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 text-left space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-bold uppercase text-[9px]">Paciente:</span>
                <span className="text-slate-800 dark:text-slate-200 font-black">{confirmedBooking.patientName}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-bold uppercase text-[9px]">Profesional:</span>
                <span className="text-slate-800 dark:text-slate-200 font-black">Dr/a. {confirmedBooking.professionalName}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-bold uppercase text-[9px]">Fecha:</span>
                <span className="text-slate-800 dark:text-slate-200 font-black">📅 {confirmedBooking.date}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-bold uppercase text-[9px]">Horario:</span>
                <span className="text-slate-800 dark:text-slate-200 font-black">⏰ {confirmedBooking.time} hs</span>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 leading-relaxed font-semibold mb-4">
              Te esperamos en nuestro centro médico. Recibirás un mensaje recordatorio automático de WhatsApp previo al día de tu turno.
            </p>

            <button
              onClick={() => setConfirmedBooking(null)}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-750 text-white text-xs font-black rounded-lg transition shadow-sm cursor-pointer"
            >
              Excelente, ¡Muchas Gracias!
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default StandaloneChatbot;
