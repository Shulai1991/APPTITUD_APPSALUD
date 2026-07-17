import React, { useState, useEffect, useRef } from 'react';
import { PaperAirplaneIcon, PlusIcon, TrashIcon, XMarkIcon } from './icons';
import type { Patient, Appointment, Professional, User } from '../types';
import { ToothCondition } from '../types';
import { saveAppointmentToFirestore, savePatientToFirestore } from '../firebaseSync';
import { createOdontogram } from '../constants';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

interface ChatbotSettings {
  isEnabled: boolean;
  phoneNumber: string;
  botName: string;
  customGuidelines: string;
  autoRemindersEnabled: boolean;
  reminderTemplate: string;
  reminderTimeHours: number;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
}

interface WhatsappChatbotProps {
  patients?: Patient[];
  professionals?: Professional[];
  appointments?: Appointment[];
  currentCenterId?: string | null;
  currentUser?: User | null;
}

const WhatsappChatbot: React.FC<WhatsappChatbotProps> = ({
  patients = [],
  professionals = [],
  appointments = [],
  currentCenterId = null,
  currentUser = null
}) => {
  // Connection state
  const [isConnected, setIsConnected] = useState<boolean>(() => {
    return localStorage.getItem('whatsapp_chatbot_connected') === 'true';
  });
  const [isLinking, setIsLinking] = useState(false);
  const [qrCodeProgress, setQrCodeProgress] = useState(0);
  const [showRealInstructions, setShowRealInstructions] = useState(false);

  // Web Widget configuration states
  const [welcomeMessage, setWelcomeMessage] = useState('Hola, quisiera solicitar un turno para la clínica.');
  const [widgetType, setWidgetType] = useState<'badge' | 'circle'>('badge');
  const [widgetPosition, setWidgetPosition] = useState<'right' | 'left'>('right');
  const [widgetText, setWidgetText] = useState('Reservar Turno 💬');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedEmbedLink, setCopiedEmbedLink] = useState(false);
  const [copiedEmbedIframe, setCopiedEmbedIframe] = useState(false);
  const [copiedJotformWebhookUrl, setCopiedJotformWebhookUrl] = useState(false);
  const [currentOrigin, setCurrentOrigin] = useState('https://appsalud.live');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentOrigin(window.location.origin);
    }
  }, []);

  // Bot Settings
  const [settings, setSettings] = useState<ChatbotSettings>(() => {
    const saved = localStorage.getItem('whatsapp_chatbot_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // use default
      }
    }
    return {
      isEnabled: true,
      phoneNumber: '+54 9 11 3844-9021',
      botName: 'SaludBot',
      customGuidelines: 'Saluda con entusiasmo, responde con brevedad, y siempre invita al paciente a reservar un turno si tiene dolores agudos.',
      autoRemindersEnabled: true,
      reminderTemplate: 'Hola [Nombre], te recordamos que tienes un turno agendado para el día [Fecha] a las [Hora] hs con el/la Dr/a [Especialista]. Por favor confirma tu asistencia respondiendo SI o NO. ¡Gracias!',
      reminderTimeHours: 24,
    };
  });

  // FAQs List
  const [faqs, setFaqs] = useState<FAQ[]>(() => {
    const saved = localStorage.getItem('whatsapp_chatbot_faqs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // use default
      }
    }
    return [
      { id: '1', question: '¿Dónde están ubicados?', answer: 'Estamos ubicados en Av. Santa Fe 1234, Piso 2, Palermo, Ciudad Autónoma de Buenos Aires.' },
      { id: '2', question: '¿Cuáles son los horarios de atención?', answer: 'Atendemos de Lunes a Viernes de 08:00 a 20:00 hs, y Sábados de 09:00 a 13:00 hs.' },
      { id: '3', question: '¿Qué obras sociales o prepagas aceptan?', answer: 'Aceptamos OSDE (planes 210, 310 y 410), Swiss Medical, Galeno, Medicus y de forma particular con reintegros.' },
      { id: '4', question: '¿Cómo puedo agendar un turno?', answer: 'Puedes agendar un turno contactándonos directamente a este número o ingresando a la sección Agenda en nuestra plataforma.' },
    ];
  });

  // New FAQ inputs
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [isAddingFaq, setIsAddingFaq] = useState(false);

  // Simulated Patient Selection State
  const [selectedPatientId, setSelectedPatientId] = useState<number | string | null>(null);

  useEffect(() => {
    if (patients && patients.length > 0 && selectedPatientId === null) {
      setSelectedPatientId(patients[0].id);
    }
  }, [patients, selectedPatientId]);

  const selectedPatient = selectedPatientId === 'new_unregistered'
    ? null
    : (patients?.find(p => p.id === Number(selectedPatientId)) || null);

  // Chat Simulation States
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { id: 'start', sender: 'bot', text: '¡Hola! Soy el asistente virtual de la clínica. ¿En qué puedo ayudarte hoy?', timestamp: 'Ahora' }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load configuration from Firestore on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const { getDoc } = await import('firebase/firestore');
        const docSnap = await getDoc(doc(db, 'system', 'whatsapp_config'));
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.settings) setSettings(data.settings);
          if (data.faqs) setFaqs(data.faqs);
        }
      } catch (e) {
        console.warn("Failed to load WhatsApp config from Firestore:", e);
      }
    };
    loadConfig();
  }, []);

  // Persist settings
  useEffect(() => {
    localStorage.setItem('whatsapp_chatbot_settings', JSON.stringify(settings));
    // Sync to Firestore for real webhook usage
    try {
      setDoc(doc(db, 'system', 'whatsapp_config'), {
        settings,
        faqs,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.warn("Could not sync settings to Firestore:", e);
    }
  }, [settings]);

  // Persist FAQs
  useEffect(() => {
    localStorage.setItem('whatsapp_chatbot_faqs', JSON.stringify(faqs));
    // Sync to Firestore for real webhook usage
    try {
      setDoc(doc(db, 'system', 'whatsapp_config'), {
        settings,
        faqs,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.warn("Could not sync FAQs to Firestore:", e);
    }
  }, [faqs]);

  // Persist connection state
  useEffect(() => {
    localStorage.setItem('whatsapp_chatbot_connected', isConnected ? 'true' : 'false');
  }, [isConnected]);

  // Scroll to chat bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isTyping]);

  // QR linking simulator
  const handleStartLinking = () => {
    setIsLinking(true);
    setQrCodeProgress(0);
    const interval = setInterval(() => {
      setQrCodeProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsLinking(false);
          setIsConnected(true);
          return 100;
        }
        return prev + 10;
      });
    }, 400);
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setQrCodeProgress(0);
  };

  // Add FAQ
  const handleAddFaq = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim() || !newAnswer.trim()) return;

    const newFaq: FAQ = {
      id: Date.now().toString(),
      question: newQuestion.trim(),
      answer: newAnswer.trim(),
    };

    setFaqs([...faqs, newFaq]);
    setNewQuestion('');
    setNewAnswer('');
    setIsAddingFaq(false);
  };

  // Delete FAQ
  const handleDeleteFaq = (id: string) => {
    setFaqs(faqs.filter(f => f.id !== id));
  };

  // Chat Submission & Gemini call
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

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

    if (!isConnected) {
      setTimeout(() => {
        setIsTyping(false);
        const botMessage: ChatMessage = {
          id: Date.now().toString() + '-bot',
          sender: 'bot',
          text: `⚠️ *[Línea de WhatsApp Desconectada]*\n\nEl chatbot *${settings.botName}* no se encuentra operativo porque no has vinculado tu línea telefónica.\n\nPor favor, ingresa tu número en el panel de la izquierda y haz clic en el botón **"Sincronizar Línea Móvil"** para activarlo.`,
          timestamp: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
        };
        setChatHistory(prev => [...prev, botMessage]);
      }, 800);
      return;
    }

    // Build the system instruction dynamically
    const faqsFormatted = faqs.map(f => `P: "${f.question}" -> R: "${f.answer}"`).join('\n');
    const fullSystemInstruction = `
      Eres "${settings.botName}", el asistente virtual inteligente de nuestra clínica odontológica.
      Tu celular vinculado es "${settings.phoneNumber}".
      Instrucciones generales de la clínica:
      - Responde cordialmente en español de Argentina.
      - Sé sumamente breve, profesional y directo. No uses más de 2 o 3 oraciones por respuesta.
      - Usa emojis oportunos (🦷, 📅, 📍, 📞) para que el chat de WhatsApp se sienta natural.
      
      Reglas de respuesta del administrador:
      "${settings.customGuidelines}"

      Preguntas Frecuentes de la clínica (responde con esta información si el paciente pregunta por estos temas):
      ${faqsFormatted}

      Si la consulta es sobre agendar un turno o ver especialistas, guíalos amablemente indicando que pueden solicitarlo aquí mismo o que un recepcionista humano tomará el control del chat de ser necesario.
    `;

    try {
      // Map chat history for context
      const apiHistory = chatHistory
        .filter(msg => msg.id !== 'start')
        .map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'model',
          text: msg.text
        }));

      const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const todayDate = new Date();
      const currentDateString = todayDate.toISOString().split('T')[0]; // YYYY-MM-DD
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
          patient: selectedPatient,
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

      // If new patient was returned from Gemini, perform actual Firestore registration
      let resolvedPatientId = data.booking?.patientId;
      let resolvedPatientName = selectedPatient ? `${selectedPatient.name} ${selectedPatient.lastName}` : 'Paciente Simulado';

      if (data.newPatient) {
        const newPatientId = Math.floor(100000 + Math.random() * 900000); // 6-digit random number
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
          centerId: currentCenterId || undefined,
          validationStatus: 'unvalidated'
        };

        await savePatientToFirestore(patientData);
        resolvedPatientId = newPatientId;
        resolvedPatientName = `${data.newPatient.name} ${data.newPatient.lastName}`;

        // Auto-select the newly created patient in our simulator dropdown
        setSelectedPatientId(newPatientId);

        // Show a nice system message about registration
        setTimeout(() => {
          setChatHistory(prev => [...prev, {
            id: Date.now().toString() + '-sys-pat',
            sender: 'bot',
            text: `👤 *[Sistema - Ficha Creada]*\nSe ha registrado con éxito la ficha médica de *${data.newPatient.name} ${data.newPatient.lastName}* (DNI: *${data.newPatient.dni}*, Tel: *${data.newPatient.phone}*).`,
            timestamp: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
          }]);
        }, 600);
      }

      // If booking was returned from Gemini, perform actual Firestore scheduling
      if (data.booking) {
        const { professionalId, date, time, reason } = data.booking;
        const prof = professionals.find(p => p.id === professionalId);
        const profName = prof ? prof.name : 'Especialista';

        const finalPatientId = resolvedPatientId || selectedPatient?.id || 0;

        const newAppointment: Appointment = {
          id: Date.now(),
          patientId: finalPatientId,
          patientName: resolvedPatientName,
          date: date,
          time: time,
          reason: reason || 'Consulta desde Chatbot',
          status: 'scheduled',
          professionalId: professionalId,
          centerId: currentCenterId || undefined,
          createdBy: 'SaludBot'
        };

        await saveAppointmentToFirestore(newAppointment);

        setTimeout(() => {
          setChatHistory(prev => [...prev, {
            id: Date.now().toString() + '-system',
            sender: 'bot',
            text: `📅 *[Sistema - Turno Confirmado]*\n¡Turno agendado con éxito en la agenda real para el día *${date}* a las *${time} hs* con el/la especialista *${profName}* para el paciente *${resolvedPatientName}*!`,
            timestamp: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
          }]);
        }, 1200);
      }

    } catch (err) {
      console.error(err);
      setIsTyping(false);
      setChatHistory(prev => [...prev, {
        id: Date.now().toString() + '-error',
        sender: 'bot',
        text: '⚠️ Ocurrió un error al contactar al motor de inteligencia artificial. Verifique su conexión.',
        timestamp: 'Ahora'
      }]);
    }
  };

  const handleClearHistory = () => {
    setChatHistory([
      { id: 'start', sender: 'bot', text: 'Conversación reiniciada. ¡Hola! ¿En qué puedo ayudarte hoy?', timestamp: 'Ahora' }
    ]);
  };

  const cleanPhone = settings.phoneNumber.replace(/\D/g, '');
  const shareUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(welcomeMessage)}`;
  const embedCode = `<!-- Botón Flotante de WhatsApp AppSalud -->
<div id="appsalud-whatsapp-widget" style="position: fixed; bottom: 24px; ${widgetPosition}: 24px; z-index: 999999; font-family: system-ui, -apple-system, sans-serif;">
  <a href="${shareUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 8px; background-color: #25D366; color: white; ${widgetType === 'badge' ? 'padding: 12px 20px; border-radius: 50px;' : 'width: 60px; height: 60px; border-radius: 50%;'} box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: all 0.3s ease;" onmouseover="this.style.transform='scale(1.06)'; this.style.box-shadow='0 6px 18px rgba(0,0,0,0.2)';" onmouseout="this.style.transform='scale(1)'; this.style.box-shadow='0 4px 12px rgba(0,0,0,0.15)';">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="fill: white; color: white; display: inline-block; vertical-align: middle;"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
    ${widgetType === 'badge' ? `<span style="font-weight: 700; font-size: 14px; white-space: nowrap; font-family: sans-serif; display: inline-block; vertical-align: middle;">${widgetText}</span>` : ''}
  </a>
</div>`;

  const liveEmbedUrl = `${currentOrigin}?embed=true`;
  const iframeEmbedCode = `<!-- Chatbot Inteligente Interactivo AppSalud -->
<iframe src="${liveEmbedUrl}" style="border: none; width: 100%; height: 650px; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08);" title="Asistente de Autoatención Inteligente"></iframe>`;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 font-sans">
      
      {/* Configuration Column */}
      <div className="xl:col-span-7 space-y-6">
        
        {/* WhatsApp Phone Connection Card */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-premium">
          <div className="flex justify-between items-center pb-4 border-b border-slate-150 dark:border-slate-700">
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Vincular Celular WhatsApp</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Integración de pasarela para chatbot y recordatorios</p>
            </div>
            
            <div className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-rose-500'}`}></span>
              <span className="text-xs font-extrabold uppercase tracking-wide">
                {isConnected ? 'Sincronizado' : 'Desconectado'}
              </span>
            </div>
          </div>

          <div className="mt-5 flex flex-col md:flex-row gap-6 items-center">
            {/* Left side: status / QR */}
            <div className="shrink-0">
              {isConnected ? (
                <div className="bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400 p-6 rounded-2xl flex flex-col items-center justify-center border border-green-500/15 w-44 h-44 text-center">
                  <svg className="w-16 h-16 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span className="text-xs font-bold font-mono">{settings.phoneNumber}</span>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold mt-1 uppercase">Línea Oficial Sincronizada</span>
                </div>
              ) : isLinking ? (
                <div className="relative border border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl w-44 h-44 flex flex-col items-center justify-center">
                  <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/80 flex flex-col items-center justify-center p-3 text-center">
                    <svg className="animate-spin h-8 w-8 text-primary mb-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-350">Vinculando... {qrCodeProgress}%</span>
                  </div>
                  {/* Blurred mock QR */}
                  <div className="w-32 h-32 bg-slate-300 dark:bg-slate-700 rounded-lg blur-xs opacity-50"></div>
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-900 rounded-2xl w-44 h-44 flex flex-col items-center justify-center">
                  {/* Mock QR Code Pattern */}
                  <div className="grid grid-cols-5 gap-1.5 w-32 h-32 opacity-75">
                    {Array.from({ length: 25 }).map((_, i) => (
                      <div key={i} className={`rounded-sm ${(i * 7 + 13) % 5 === 0 || i < 5 || i % 5 === 0 || i > 20 ? 'bg-slate-800 dark:bg-slate-200' : 'bg-transparent'}`}></div>
                    ))}
                  </div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase mt-2">QR de Simulación</span>
                </div>
              )}
            </div>

            {/* Right side: instructions & action */}
            <div className="flex-1 space-y-3 w-full">
              <div className="space-y-1">
                <label htmlFor="phoneNumber" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Número de Teléfono a Vincular</label>
                <input
                  type="text"
                  id="phoneNumber"
                  name="phoneNumber"
                  value={settings.phoneNumber}
                  onChange={(e) => setSettings({ ...settings, phoneNumber: e.target.value })}
                  disabled={isConnected || isLinking}
                  className="w-full max-w-xs p-2 border border-slate-250 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 focus:outline-none text-xs font-mono font-bold text-slate-700 dark:text-slate-200"
                />
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-400 p-3 rounded-xl text-xs space-y-1">
                <span className="font-bold block text-[10px] uppercase tracking-wide text-amber-600 dark:text-amber-500">💡 Simulación de Vinculación</span>
                <p>El código QR es un simulador visual. Para probar de forma simulada de inmediato, ingrese cualquier número y presione <strong>"Sincronizar Línea Móvil"</strong>.</p>
              </div>

              {/* Real WhatsApp Cloud API Accordion */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowRealInstructions(!showRealInstructions)}
                  className="w-full flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900 text-left transition cursor-pointer"
                >
                  <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    ⚡ ¿Cómo vincular su número comercial real? (WhatsApp Cloud API)
                  </span>
                  <svg
                    className={`w-4 h-4 text-slate-500 transition-transform ${showRealInstructions ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showRealInstructions && (
                  <div className="p-4 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-650 dark:text-slate-350 space-y-3.5 leading-relaxed">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      Siga estos sencillos pasos para sincronizar su cuenta comercial real de WhatsApp en producción de forma autónoma:
                    </p>

                    <div className="space-y-3 font-medium">
                      <div className="flex gap-2.5">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary font-bold text-[10px] shrink-0 mt-0.5">1</span>
                        <div>
                          <p className="font-bold text-slate-700 dark:text-slate-200">Configure las credenciales en "Settings / Variables de Entorno"</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">Defina las siguientes variables en su panel de administración de claves secretas del entorno:</p>
                          <ul className="list-disc pl-4 mt-1 space-y-1 font-mono text-[10px] text-slate-600 dark:text-slate-400">
                            <li><strong className="text-slate-700 dark:text-slate-300">WHATSAPP_ACCESS_TOKEN</strong>: Su token permanente de Meta Developers.</li>
                            <li><strong className="text-slate-700 dark:text-slate-300">WHATSAPP_PHONE_NUMBER_ID</strong>: Identificador del número de teléfono en Meta.</li>
                            <li><strong className="text-slate-700 dark:text-slate-300">WHATSAPP_VERIFY_TOKEN</strong>: Cualquier palabra secreta de verificación (por defecto: <code className="bg-slate-200 dark:bg-slate-800 px-1 rounded">appsalud_token</code>).</li>
                          </ul>
                        </div>
                      </div>

                      <div className="flex gap-2.5">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary font-bold text-[10px] shrink-0 mt-0.5">2</span>
                        <div>
                          <p className="font-bold text-slate-700 dark:text-slate-200">Configure el Webhook en el portal de Meta Developers</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">Vaya a la configuración de WhatsApp de su App en Meta y configure el webhook con estos datos:</p>
                          <ul className="list-disc pl-4 mt-1 space-y-1 text-[11px]">
                            <li>
                              <strong className="text-slate-750 dark:text-slate-350">Callback URL:</strong>{" "}
                              <code className="bg-slate-150 dark:bg-slate-800 px-1 py-0.5 rounded font-mono font-bold text-primary break-all select-all text-[10px]">
                                {window.location.origin}/api/whatsapp/webhook
                              </code>
                            </li>
                            <li>
                              <strong className="text-slate-750 dark:text-slate-350">Verify Token:</strong> El mismo token secreto que definió (ej. <code className="bg-slate-200 dark:bg-slate-800 px-1 rounded font-mono">appsalud_token</code>).
                            </li>
                          </ul>
                        </div>
                      </div>

                      <div className="flex gap-2.5">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary font-bold text-[10px] shrink-0 mt-0.5">3</span>
                        <div>
                          <p className="font-bold text-slate-700 dark:text-slate-200">Suscríbase al evento de mensajes</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">En el portal de Meta, haga clic en "Subscribirse" en el campo <code className="bg-slate-200 dark:bg-slate-800 px-1 rounded font-mono font-bold">messages</code> para habilitar la recepción en tiempo real.</p>
                        </div>
                      </div>
                    </div>

                    <p className="bg-green-500/10 dark:bg-green-500/20 text-green-700 dark:text-green-400 p-2.5 rounded-xl text-[11px] font-semibold border border-green-500/10">
                      ✅ Una vez configurado, cualquier mensaje recibido en su número comercial de WhatsApp será respondido automáticamente por la Inteligencia Artificial de SaludBot, gestionando turnos y sincronizando pacientes en tiempo real de forma segura.
                    </p>
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                {isConnected 
                  ? 'Su teléfono móvil está conectado con el sistema de mensajería automatizada de AppSalud. Las respuestas automáticas y los recordatorios están operativos.' 
                  : 'Para habilitar las respuestas de simulación interactiva local en la barra lateral derecha, simplemente presione "Sincronizar Línea Móvil" para activar el asistente de pruebas.'}
              </p>

              <div className="pt-2 flex gap-3">
                {!isConnected ? (
                  <button
                    onClick={handleStartLinking}
                    disabled={isLinking}
                    className="px-4 py-2 bg-primary hover:bg-primary-600 text-white font-bold text-xs rounded-xl transition shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    Sincronizar Línea Móvil
                  </button>
                ) : (
                  <button
                    onClick={handleDisconnect}
                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 font-bold text-xs rounded-xl border border-rose-200/40 transition cursor-pointer"
                  >
                    Desvincular Línea
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Generador de Botón de WhatsApp para tu Sitio Web */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-premium">
          <div className="pb-4 border-b border-slate-150 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span>🔌 Integrar Chatbot en tu Sitio Web</span>
              <span className="px-2 py-0.5 bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 text-[9px] rounded-full font-black uppercase">¡En Vivo!</span>
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Generador de enlace directo y botón flotante para pacientes</p>
          </div>

          <div className="mt-5 space-y-5">
            <div className="space-y-3.5">
              <div>
                <label htmlFor="widgetWelcomeMessageInput" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Mensaje de bienvenida predefinido</label>
                <input
                  type="text"
                  id="widgetWelcomeMessageInput"
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  className="w-full p-2 border border-slate-250 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 focus:outline-none text-xs font-semibold text-slate-805 dark:text-slate-100"
                  placeholder="Ej: Hola, quiero sacar un turno..."
                />
                <p className="text-[10px] text-slate-400 mt-1">Este mensaje se autocompletará en el chat del paciente cuando haga clic en el botón.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="widgetTypeSelect" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Tipo de Botón</label>
                  <select
                    id="widgetTypeSelect"
                    value={widgetType}
                    onChange={(e) => setWidgetType(e.target.value as 'badge' | 'circle')}
                    className="w-full p-2 border border-slate-250 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 focus:outline-none text-xs font-bold text-slate-800 dark:text-slate-200"
                  >
                    <option value="badge">Etiqueta con Texto</option>
                    <option value="circle">Círculo Flotante (Compacto)</option>
                  </select>
                </div>

                {widgetType === 'badge' && (
                  <div>
                    <label htmlFor="widgetTextInput" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Texto del Botón</label>
                    <input
                      type="text"
                      id="widgetTextInput"
                      value={widgetText}
                      onChange={(e) => setWidgetText(e.target.value)}
                      className="w-full p-2 border border-slate-250 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 focus:outline-none text-xs font-bold text-slate-800 dark:text-slate-200"
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="widgetPositionSelect" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Posición en Pantalla</label>
                  <select
                    id="widgetPositionSelect"
                    value={widgetPosition}
                    onChange={(e) => setWidgetPosition(e.target.value as 'right' | 'left')}
                    className="w-full p-2 border border-slate-250 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 focus:outline-none text-xs font-bold text-slate-800 dark:text-slate-200"
                  >
                    <option value="right">Inferior Derecha</option>
                    <option value="left">Inferior Izquierda</option>
                  </select>
                </div>
              </div>
            </div>

            {/* DIRECT INTEGRATION PANELS */}
            <div className="space-y-6">
              
              {/* Opción 1: Chatbot Interactivo Incrustado */}
              <div className="p-5 bg-gradient-to-br from-emerald-50/50 to-emerald-100/30 dark:from-slate-900 dark:to-slate-900/80 rounded-2xl border border-emerald-500/30 dark:border-slate-700/80 space-y-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                    ✨
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      Opción A: Chatbot Inteligente Incrustado (Recomendado para Canva)
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed mt-1 font-semibold">
                      Permite que tus pacientes interactúen con la inteligencia artificial directamente desde tu página de Canva (o cualquier otro constructor como Wix, WordPress, etc.) para reservar turnos en tiempo real.
                    </p>
                  </div>
                </div>

                {/* Canva Direct Link */}
                <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-2.5">
                  <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
                    🎨 Incrustar Directo en tu Web de Canva (¡Es Sencillo!)
                  </span>
                  <div className="text-[11px] text-slate-500 leading-relaxed font-semibold space-y-1.5">
                    <p>Si no encuentras el botón de incrustar directo, puedes usar cualquiera de estos dos métodos ultra rápidos:</p>
                    <ol className="list-decimal pl-4 space-y-1 text-slate-600 dark:text-slate-350">
                      <li>
                        <strong className="text-slate-800 dark:text-slate-100">Método 1 (Pegado Directo - El más fácil):</strong> Copia el enlace de abajo, ve al editor de tu diseño o sitio web de Canva, haz clic en la hoja y presiona <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-250 dark:border-slate-700 rounded text-[9px] font-mono font-black">Ctrl + V</kbd> (o <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-250 dark:border-slate-700 rounded text-[9px] font-mono font-black">Cmd + V</kbd> en Mac). ¡Canva creará la ventana interactiva del chatbot inmediatamente!
                      </li>
                      <li>
                        <strong className="text-slate-800 dark:text-slate-100">Método 2 (Buscador de Apps):</strong> En la barra lateral izquierda de Canva, haz clic en <strong className="text-slate-800 dark:text-slate-100">"Apps"</strong> (Aplicaciones) → escribe <strong className="text-slate-800 dark:text-slate-100">"Incrustados"</strong> (o <strong className="text-slate-800 dark:text-slate-100">"Embeds"</strong>) en la barra de búsqueda → selecciona la aplicación con icono de llave/enlace, pega este enlace de abajo ¡y listo!
                      </li>
                    </ol>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      readOnly
                      value={liveEmbedUrl}
                      className="flex-1 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono select-all text-slate-700 dark:text-slate-300 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(liveEmbedUrl);
                        setCopiedEmbedLink(true);
                        setTimeout(() => setCopiedEmbedLink(false), 2000);
                      }}
                      className="px-4 py-2 bg-primary hover:bg-primary-600 text-white text-xs font-extrabold rounded-lg transition shrink-0 cursor-pointer shadow-sm"
                    >
                      {copiedEmbedLink ? '¡Copiado! ✓' : 'Copiar Enlace para Canva'}
                    </button>
                  </div>
                </div>

                {/* Iframe HTML Code */}
                <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-2.5">
                  <span className="text-[10px] font-black text-slate-450 dark:text-slate-400 uppercase tracking-wide block">
                    💻 Código HTML Iframe (Para Webs Propias, Wix, WordPress o HTML)
                  </span>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Copia y pega este fragmento en tu sección de código HTML personalizado para insertar la herramienta:
                  </p>
                  <div className="relative">
                    <pre className="p-3 bg-slate-950 text-emerald-400 rounded-xl text-[10px] font-mono overflow-x-auto leading-relaxed max-h-36 border border-slate-850">
                      {iframeEmbedCode}
                    </pre>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(iframeEmbedCode);
                        setCopiedEmbedIframe(true);
                        setTimeout(() => setCopiedEmbedIframe(false), 2000);
                      }}
                      className="absolute top-2 right-2 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-[10px] font-extrabold rounded-md transition cursor-pointer"
                    >
                      {copiedEmbedIframe ? '¡Copiado! ✓' : 'Copiar Código'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Opción 2: Botón de WhatsApp Tradicional */}
              <div className="p-5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-300 dark:bg-slate-800 text-slate-600 dark:text-slate-350 flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                    💬
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800 dark:text-slate-100">
                      Opción B: Botón Flotante de WhatsApp (Redirección)
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed mt-1 font-semibold">
                      Si prefieres un botón flotante clásico de WhatsApp que dirija a tu número con un mensaje de bienvenida predefinido.
                    </p>
                  </div>
                </div>

                {/* Direct Link Panel */}
                <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-2.5">
                  <span className="text-[10px] font-black text-slate-450 dark:text-slate-350 uppercase tracking-wide block">🔗 Enlace Directo de WhatsApp</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={shareUrl}
                      className="flex-1 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono select-all text-slate-700 dark:text-slate-300 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(shareUrl);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                      }}
                      className="px-4 py-2 bg-primary hover:bg-primary-600 text-white text-xs font-extrabold rounded-lg transition shrink-0 cursor-pointer shadow-sm"
                    >
                      {copiedLink ? '¡Copiado! ✓' : 'Copiar'}
                    </button>
                  </div>
                </div>

                {/* Copyable HTML Widget Code */}
                <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-2.5">
                  <span className="text-[10px] font-black text-slate-450 dark:text-slate-350 uppercase tracking-wide block">💻 Código HTML de Botón Flotante</span>
                  <div className="relative">
                    <pre className="p-3 bg-slate-950 text-emerald-400 rounded-xl text-[10px] font-mono overflow-x-auto leading-relaxed max-h-36 border border-slate-850">
                      {embedCode}
                    </pre>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(embedCode);
                        setCopiedCode(true);
                        setTimeout(() => setCopiedCode(false), 2000);
                      }}
                      className="absolute top-2 right-2 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-[10px] font-extrabold rounded-md transition cursor-pointer"
                    >
                      {copiedCode ? '¡Copiado! ✓' : 'Copiar Código'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Opción 3: Conectar con Jotform y Agentes IA Externos (Webhook) */}
              <div className="p-5 bg-gradient-to-br from-violet-50/50 to-violet-100/30 dark:from-slate-900 dark:to-slate-900/80 rounded-2xl border border-violet-500/30 dark:border-slate-700/80 space-y-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-violet-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                    🔌
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      Opción C: Interoperabilidad con Jotform y Agentes de IA Externos
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed mt-1 font-semibold">
                      ¿Creaste un formulario en Jotform o un agente de IA en otra plataforma? Puedes enlazarlos directamente con nuestra agenda en tiempo real usando un Webhook de entrada.
                    </p>
                  </div>
                </div>

                {/* Webhook URL Panel */}
                <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-2.5">
                  <span className="text-[10px] font-black text-violet-600 dark:text-violet-400 uppercase tracking-wide flex items-center gap-1.5">
                    🔗 Tu URL de Webhook de Entrada
                  </span>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                    Copia esta dirección única y colócala en la configuración de integraciones de Jotform (o en la acción de tu Agente de IA externo):
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${currentOrigin}/api/jotform-webhook`}
                      className="flex-1 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono select-all text-slate-700 dark:text-slate-300 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`${currentOrigin}/api/jotform-webhook`);
                        setCopiedJotformWebhookUrl(true);
                        setTimeout(() => setCopiedJotformWebhookUrl(false), 2000);
                      }}
                      className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-extrabold rounded-lg transition shrink-0 cursor-pointer shadow-sm"
                    >
                      {copiedJotformWebhookUrl ? '¡Copiado! ✓' : 'Copiar Webhook'}
                    </button>
                  </div>
                </div>

                {/* Instructions for Jotform and External AI agents */}
                <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-4">
                  <span className="text-[10px] font-black text-violet-600 dark:text-violet-400 uppercase tracking-wide block">
                    🤖 Guía de Configuración para Lorena (Tu Agente de IA en Jotform)
                  </span>
                  
                  <div className="text-[11px] text-slate-500 leading-relaxed font-semibold space-y-3">
                    <p className="text-xs text-slate-700 dark:text-slate-200">
                      Para que Lorena pueda <strong>ver los turnos libres</strong> y <strong>agendar citas automáticamente</strong>, debes crearle dos Herramientas (Tools) en Jotform:
                    </p>

                    <div className="space-y-3.5 pl-2 border-l-2 border-violet-200 dark:border-violet-800">
                      {/* Herramienta 1: GET */}
                      <div className="space-y-1">
                        <h5 className="text-[11px] font-black text-violet-700 dark:text-violet-350 uppercase flex items-center gap-1.5">
                          🟢 Paso 1: Herramienta de Consulta (GET)
                        </h5>
                        <p className="text-[10px] text-slate-400 font-medium">
                          Sirve para que Lorena conozca a los médicos, especialidades y horarios ocupados.
                        </p>
                        <ul className="list-disc pl-4 text-slate-650 dark:text-slate-350 space-y-1 text-[10.5px]">
                          <li>Crea una nueva herramienta de tipo <strong>"Enviar solicitud de API"</strong>.</li>
                          <li>Configura el método en <strong className="text-slate-800 dark:text-slate-100">"CONSEGUIR" (GET)</strong>.</li>
                          <li>Pega la URL completa con el endpoint: <br />
                            <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-900 border border-slate-250 dark:border-slate-850 rounded font-mono text-[9px] text-violet-600 block mt-1 break-all">
                              {currentOrigin}/api/jotform-webhook
                            </code>
                          </li>
                          <li>En la pestaña <strong>"Mensaje del agente"</strong>, escribe: <br />
                            <em className="text-slate-450 dark:text-slate-400">"Consulta la agenda médica para ver los doctores, especialidades, horarios disponibles y turnos ocupados."</em>
                          </li>
                        </ul>
                      </div>

                      {/* Herramienta 2: POST */}
                      <div className="space-y-1">
                        <h5 className="text-[11px] font-black text-emerald-700 dark:text-emerald-400 uppercase flex items-center gap-1.5">
                          🔵 Paso 2: Herramienta de Reserva (POST)
                        </h5>
                        <p className="text-[10px] text-slate-400 font-medium">
                          Sirve para agendar la cita en tiempo real una vez que el paciente confirma el horario.
                        </p>
                        <ul className="list-disc pl-4 text-slate-650 dark:text-slate-350 space-y-1 text-[10.5px]">
                          <li>Crea otra herramienta de API.</li>
                          <li>Configura el método en <strong className="text-slate-800 dark:text-slate-100">"ENVIAR" (POST)</strong>.</li>
                          <li>Pega exactamente la misma URL: <br />
                            <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-900 border border-slate-250 dark:border-slate-850 rounded font-mono text-[9px] text-emerald-600 block mt-1 break-all">
                              {currentOrigin}/api/jotform-webhook
                            </code>
                          </li>
                          <li>En <strong>"Datos de solicitud"</strong> → haz clic en la pestaña <strong className="text-slate-800 dark:text-slate-100">"Valores generados por IA"</strong> y agrega los siguientes campos (Llaves) para que Jotform los extraiga de la conversación con el paciente:
                            <div className="grid grid-cols-2 gap-1.5 mt-2 max-w-xs font-mono text-[9.5px]">
                              <div className="bg-slate-50 dark:bg-slate-900 p-1 px-2 border rounded border-slate-150 dark:border-slate-800"><span className="text-slate-400">Llave:</span> name</div>
                              <div className="bg-slate-50 dark:bg-slate-900 p-1 px-2 border rounded border-slate-150 dark:border-slate-800 text-slate-450">Valor: Nombre</div>
                              <div className="bg-slate-50 dark:bg-slate-900 p-1 px-2 border rounded border-slate-150 dark:border-slate-800"><span className="text-slate-400">Llave:</span> lastName</div>
                              <div className="bg-slate-50 dark:bg-slate-900 p-1 px-2 border rounded border-slate-150 dark:border-slate-800 text-slate-450">Valor: Apellido</div>
                              <div className="bg-slate-50 dark:bg-slate-900 p-1 px-2 border rounded border-slate-150 dark:border-slate-800"><span className="text-slate-400">Llave:</span> dni</div>
                              <div className="bg-slate-50 dark:bg-slate-900 p-1 px-2 border rounded border-slate-150 dark:border-slate-800 text-slate-450">Valor: DNI</div>
                              <div className="bg-slate-50 dark:bg-slate-900 p-1 px-2 border rounded border-slate-150 dark:border-slate-800"><span className="text-slate-400">Llave:</span> phone</div>
                              <div className="bg-slate-50 dark:bg-slate-900 p-1 px-2 border rounded border-slate-150 dark:border-slate-800 text-slate-450">Valor: Teléfono</div>
                              <div className="bg-slate-50 dark:bg-slate-900 p-1 px-2 border rounded border-slate-150 dark:border-slate-800"><span className="text-slate-400">Llave:</span> date</div>
                              <div className="bg-slate-50 dark:bg-slate-900 p-1 px-2 border rounded border-slate-150 dark:border-slate-800 text-slate-450">Valor: Fecha (AAAA-MM-DD)</div>
                              <div className="bg-slate-50 dark:bg-slate-900 p-1 px-2 border rounded border-slate-150 dark:border-slate-800"><span className="text-slate-400">Llave:</span> time</div>
                              <div className="bg-slate-50 dark:bg-slate-900 p-1 px-2 border rounded border-slate-150 dark:border-slate-800 text-slate-450">Valor: Hora (HH:MM)</div>
                              <div className="bg-slate-50 dark:bg-slate-900 p-1 px-2 border rounded border-slate-150 dark:border-slate-800"><span className="text-slate-400">Llave:</span> professionalId</div>
                              <div className="bg-slate-50 dark:bg-slate-900 p-1 px-2 border rounded border-slate-150 dark:border-slate-800 text-slate-450">Valor: ID Profesional</div>
                            </div>
                          </li>
                        </ul>
                      </div>
                    </div>

                    <div className="p-2.5 bg-violet-50/50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900 rounded-lg text-[10px] text-violet-700 dark:text-violet-300 mt-2">
                      💡 <strong className="font-extrabold">¡La IA se encarga de todo!</strong> Cuando configuras el POST, Jotform extraerá automáticamente los datos de la conversación con el paciente (nombre, DNI, teléfono, fecha, hora, etc.) y los enviará a nuestro sistema para que la cita quede confirmada al instante en tu agenda en tiempo real.
                    </div>

                    <div className="p-3 bg-amber-50 dark:bg-amber-955/20 border border-amber-200/60 dark:border-amber-900/40 rounded-lg text-[10px] text-amber-800 dark:text-amber-300 space-y-1.5">
                      <p className="font-bold flex items-center gap-1.5 text-[10.5px]">
                        ⚠️ NOTA IMPORTANTE PARA PRUEBAS (Entorno de Desarrollo):
                      </p>
                      <p className="font-semibold leading-relaxed text-[10px]">
                        Las URLs de previsualización de AI Studio (<code className="px-1 bg-amber-100/50 dark:bg-amber-950/50 rounded text-[9px] font-mono">ais-dev-...</code> y <code className="px-1 bg-amber-100/50 dark:bg-amber-950/50 rounded text-[9px] font-mono">ais-pre-...</code>) están <strong className="text-amber-900 dark:text-amber-200 font-extrabold">protegidas por cookies de seguridad del entorno de trabajo</strong>. 
                      </p>
                      <p className="font-semibold leading-relaxed text-[10px]">
                        Si Jotform o cualquier servidor externo intenta hacer un llamado a la API directamente en segundo plano, la seguridad de AI Studio redirigirá la petición a un control de cookies, devolviendo <strong className="text-amber-900 dark:text-amber-200 font-extrabold">código HTML en lugar de JSON</strong>.
                      </p>
                      <div className="pl-2 border-l-2 border-amber-350 dark:border-amber-850 font-semibold text-[9.5px] space-y-1 mt-1 leading-relaxed">
                        <p>
                          • <span className="font-bold">Para verificar que tu API funciona perfecto:</span> Abre la URL de consulta directamente en una pestaña nueva de tu navegador (donde ya tienes iniciada sesión). ¡Verás el JSON con toda la agenda al instante!
                        </p>
                        <p>
                          • <span className="font-bold">Para conectarlo en producción con Jotform:</span> Esta restricción de cookies desaparece por completo cuando <strong className="text-amber-900 dark:text-amber-200 font-extrabold">despliegas tu aplicación a producción</strong> (por ejemplo, en Cloud Run o a tu propio dominio público), permitiendo que Jotform acceda sin ningún inconveniente.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* API Payload for custom AI Agents */}
                <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-2.5">
                  <span className="text-[10px] font-black text-slate-450 dark:text-slate-400 uppercase tracking-wide block">
                    🤖 Integración Avanzada para Agentes de IA Externos (JSON directo)
                  </span>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Si tu agente de IA externo (Voiceflow, ManyChat, Make, custom scripts) realiza peticiones POST directas, puede enviar un payload JSON con estos campos opcionales:
                  </p>
                  <pre className="p-2.5 bg-slate-950 text-violet-400 rounded-lg text-[10px] font-mono overflow-x-auto leading-relaxed border border-slate-850">
{`{
  "name": "Juan",
  "lastName": "Pérez",
  "dni": "38450123",
  "phone": "+5491138449021",
  "date": "2026-07-20",
  "time": "10:00",
  "professionalIdentifier": "Dr. Facundo Gomez",
  "reason": "Limpieza Dental"
}`}
                  </pre>
                </div>
              </div>

            </div>

            {/* Interactive Preview Container */}
            <div className="p-4 bg-slate-100 dark:bg-slate-900/20 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center relative min-h-[140px] text-center overflow-hidden">
              <span className="text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider absolute top-2 left-3">Vista Previa del Botón en tu Web</span>
              
              <div className="p-3 max-w-sm">
                <p className="text-xs text-slate-500 mb-4 font-semibold">Así se verá el botón flotante en tu sitio real:</p>
                
                <div className="flex justify-center">
                  <a
                    href={shareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 bg-[#25D366] text-white hover:bg-[#20ba5a] active:scale-95 shadow-lg transition-all duration-300 cursor-pointer"
                    style={{
                      padding: widgetType === 'badge' ? '10px 18px' : '0',
                      width: widgetType === 'circle' ? '52px' : 'auto',
                      height: widgetType === 'circle' ? '52px' : 'auto',
                      borderRadius: widgetType === 'badge' ? '50px' : '50%',
                    }}
                  >
                    <svg className="w-5.5 h-5.5 shrink-0 fill-white text-white" viewBox="0 0 24 24">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                    </svg>
                    {widgetType === 'badge' && (
                      <span className="font-extrabold text-xs tracking-wide">{widgetText}</span>
                    )}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* WhatsApp Reminders Settings */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-premium">
          <div className="flex justify-between items-center pb-4 border-b border-slate-150 dark:border-slate-700">
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Recordatorios de Turnos por WhatsApp</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Configuración de recordatorios masivos programados</p>
            </div>
            
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={settings.autoRemindersEnabled}
                onChange={(e) => setSettings({ ...settings, autoRemindersEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-750 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:width-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
            </label>
          </div>

          {settings.autoRemindersEnabled && (
            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="reminderTimeHours" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Anticipación del Recordatorio</label>
                  <select
                    id="reminderTimeHours"
                    name="reminderTimeHours"
                    value={settings.reminderTimeHours}
                    onChange={(e) => setSettings({ ...settings, reminderTimeHours: parseInt(e.target.value) })}
                    className="w-full p-2 border border-slate-250 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 focus:outline-none text-xs font-bold"
                  >
                    <option value={12}>12 horas antes</option>
                    <option value={24}>24 horas antes (Recomendado)</option>
                    <option value={48}>48 horas antes</option>
                    <option value={72}>72 horas antes</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Frecuencia de Envío</label>
                  <span className="w-full p-2 bg-slate-100 dark:bg-slate-900 border border-slate-150 text-slate-500 font-semibold rounded-lg block text-xs">
                    ⚡ Automático en Segundo Plano
                  </span>
                </div>
              </div>

              <div>
                <label htmlFor="reminderTemplate" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Plantilla del Mensaje de Recordatorio</label>
                <textarea
                  id="reminderTemplate"
                  name="reminderTemplate"
                  rows={4}
                  value={settings.reminderTemplate}
                  onChange={(e) => setSettings({ ...settings, reminderTemplate: e.target.value })}
                  className="w-full p-3 border border-slate-250 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 focus:outline-none text-xs leading-relaxed font-sans"
                />
                <span className="text-[10px] text-slate-400 font-bold block mt-1.5 uppercase">Variables Disponibles: [Nombre] [Fecha] [Hora] [Especialista]</span>
              </div>
            </div>
          )}
        </div>

        {/* Chatbot Rules & Guidelines */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-premium">
          <div className="flex justify-between items-center pb-4 border-b border-slate-150 dark:border-slate-700">
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Personalizar SaludBot Inteligente</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Instrucciones de personalidad y guías de comportamiento del bot</p>
            </div>
            
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={settings.isEnabled}
                onChange={(e) => setSettings({ ...settings, isEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-750 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:width-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
            </label>
          </div>

          {settings.isEnabled && (
            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="botName" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Nombre del Asistente</label>
                  <input
                    type="text"
                    id="botName"
                    name="botName"
                    value={settings.botName}
                    onChange={(e) => setSettings({ ...settings, botName: e.target.value })}
                    className="w-full p-2 border border-slate-250 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 focus:outline-none text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Motor de AI Soportado</label>
                  <span className="w-full p-2 bg-slate-100 dark:bg-slate-900 border border-slate-150 text-slate-500 font-semibold rounded-lg block text-xs">
                    🤖 Gemini 3.5 Flash (Gratuito)
                  </span>
                </div>
              </div>

              <div>
                <label htmlFor="customGuidelines" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Directivas del Bot (Qué responder y tono)</label>
                <textarea
                  id="customGuidelines"
                  name="customGuidelines"
                  rows={3}
                  value={settings.customGuidelines}
                  onChange={(e) => setSettings({ ...settings, customGuidelines: e.target.value })}
                  className="w-full p-3 border border-slate-250 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 focus:outline-none text-xs leading-relaxed"
                  placeholder="Ej: Saluda cordialmente, responde de forma resumida, ofrece agendar turnos de forma empática."
                />
              </div>

              {/* FAQs Sub-section */}
              <div className="border-t border-slate-150 dark:border-slate-700/60 pt-4">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">Preguntas Frecuentes (Biblioteca de Conocimiento)</h4>
                    <p className="text-[10px] text-slate-400">Preguntas típicas de pacientes y las respuestas exactas que el bot usará para responder.</p>
                  </div>
                  <button
                    onClick={() => setIsAddingFaq(!isAddingFaq)}
                    className="p-1 text-primary hover:bg-primary/10 rounded-lg transition cursor-pointer"
                  >
                    {isAddingFaq ? <XMarkIcon className="w-5 h-5" /> : <PlusIcon className="w-5 h-5" />}
                  </button>
                </div>

                {isAddingFaq && (
                  <form onSubmit={handleAddFaq} className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-150 dark:border-slate-800 space-y-3 mb-3">
                    <div>
                      <label htmlFor="newQuestion" className="block text-[9.5px] font-black text-slate-400 uppercase tracking-wider mb-1">Pregunta del paciente</label>
                      <input
                        type="text"
                        id="newQuestion"
                        name="newQuestion"
                        required
                        placeholder="Ej: ¿Tienen estacionamiento?"
                        value={newQuestion}
                        onChange={(e) => setNewQuestion(e.target.value)}
                        className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-primary font-bold text-slate-850 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label htmlFor="newAnswer" className="block text-[9.5px] font-black text-slate-400 uppercase tracking-wider mb-1">Respuesta del Bot</label>
                      <textarea
                        id="newAnswer"
                        name="newAnswer"
                        required
                        rows={2}
                        placeholder="Ej: Sí, contamos con estacionamiento exclusivo gratuito para pacientes a la vuelta del centro, sobre la calle Mitre 450."
                        value={newAnswer}
                        onChange={(e) => setNewAnswer(e.target.value)}
                        className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsAddingFaq(false)}
                        className="px-3 py-1.5 border border-slate-200 text-slate-500 rounded-lg text-xs font-bold cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-3.5 py-1.5 bg-primary hover:bg-primary-600 text-white rounded-lg text-xs font-bold cursor-pointer"
                      >
                        Añadir FAQ
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {faqs.map(faq => (
                    <div key={faq.id} className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800 flex justify-between items-start gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">🔍 {faq.question}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed pl-4">{faq.answer}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteFaq(faq.id)}
                        className="text-slate-400 hover:text-rose-600 transition shrink-0 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Chatbot Simulator Column */}
      <div className="xl:col-span-5">
        
        {/* Patient Simulator Select */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-premium mb-4 max-w-[360px] mx-auto">
          <label htmlFor="simulatedPatientSelect" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            👤 Simular como Paciente:
          </label>
          <select
            id="simulatedPatientSelect"
            value={selectedPatientId || ''}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedPatientId(val === 'new_unregistered' ? 'new_unregistered' : Number(val));
            }}
            className="w-full p-2 border border-slate-250 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 focus:outline-none text-xs font-semibold text-slate-750 dark:text-slate-150"
          >
            {patients.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} {p.lastName} (DNI: {p.dni})
              </option>
            ))}
            <option value="new_unregistered">✨ Simular Paciente Nuevo (No Registrado)</option>
          </select>
        </div>

        {/* Mobile Mock Container */}
        <div className="bg-slate-900 p-3 pb-6 rounded-[3rem] shadow-2xl border-4 border-slate-850 h-[640px] max-w-[360px] mx-auto flex flex-col overflow-hidden relative">
          
          {/* Speaker, Notch */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-5 bg-slate-950 rounded-2xl flex items-center justify-center gap-1.5 z-20">
            <div className="w-8 h-1 bg-slate-800 rounded-full"></div>
            <div className="w-2.5 h-2.5 bg-slate-900 rounded-full border border-slate-800"></div>
          </div>

          {/* Screen Content Wrapper */}
          <div className="flex-1 bg-[#efeae2] dark:bg-slate-950 rounded-[2.2rem] flex flex-col overflow-hidden relative border border-slate-950 mt-2">
            
            {/* Simulated Whatsapp Header */}
            <div className="bg-[#075e54] text-white px-4 pt-8 pb-3 flex items-center justify-between shadow z-10 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-slate-200 text-[#075e54] flex items-center justify-center font-black text-sm uppercase shrink-0">
                  {settings.botName.substring(0, 2)}
                </div>
                <div>
                  <h4 className="text-xs font-black tracking-wide truncate max-w-[130px]">{settings.botName}</h4>
                  <p className="text-[9px] text-green-300 font-extrabold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block"></span>
                    <span>En línea</span>
                  </p>
                </div>
              </div>

              <button
                onClick={handleClearHistory}
                title="Reiniciar chat"
                className="text-[10px] font-bold bg-[#128c7e] hover:bg-[#25d366]/40 px-2 py-1 rounded transition text-green-100 cursor-pointer"
              >
                Limpiar
              </button>
            </div>

            {/* Simulated Chat Bubbles */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3 flex flex-col no-scrollbar">
              <div className="mx-auto my-1 text-[9px] bg-sky-100 text-sky-850 px-3 py-1 rounded-md shadow-sm font-bold uppercase tracking-wider text-center max-w-[200px]">
                🔒 Sándbox de simulación de WhatsApp AppSalud
              </div>

              {chatHistory.map((msg) => (
                <div
                  key={msg.id}
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-xs shadow-xs relative flex flex-col leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-[#d9fdd3] text-slate-800 self-end rounded-tr-none'
                      : 'bg-white text-slate-800 self-start rounded-tl-none border border-slate-100'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  <span className="text-[8px] text-slate-400 self-end mt-1 font-mono font-bold">{msg.timestamp}</span>
                </div>
              ))}

              {isTyping && (
                <div className="bg-white text-slate-800 rounded-xl rounded-tl-none border border-slate-100 px-3.5 py-2.5 text-xs self-start flex items-center gap-1 w-16 shadow-xs">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Simulated Whatsapp Footer Input */}
            <form onSubmit={handleSendMessage} className="p-2.5 bg-[#f0f0f0] dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 shrink-0">
              <input
                type="text"
                placeholder="Escribe un mensaje de prueba..."
                value={inputMessage}
                disabled={isTyping}
                onChange={(e) => setInputMessage(e.target.value)}
                className="flex-1 p-2 bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-750 rounded-full text-xs focus:outline-none focus:ring-1 focus:ring-[#075e54] text-slate-800 dark:text-slate-150"
              />
              <button
                type="submit"
                disabled={isTyping || !inputMessage.trim()}
                className="w-8 h-8 rounded-full bg-[#128c7e] hover:bg-[#075e54] text-white flex items-center justify-center shrink-0 transition disabled:opacity-50 cursor-pointer shadow-sm"
              >
                <PaperAirplaneIcon className="w-4 h-4 ml-0.5" />
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
};

export default WhatsappChatbot;
