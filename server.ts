import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { initializeApp } from "firebase/app";
import { initializeFirestore, collection, doc, getDocs, getDoc, setDoc, query, where } from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Initialize Firebase client for server-side operations
  const firebaseApp = initializeApp(firebaseConfig);
  const db = initializeFirestore(firebaseApp, {
    ignoreUndefinedProperties: true
  }, firebaseConfig.firestoreDatabaseId);

  // Server-side Gemini client
  const apiKey = process.env.GEMINI_API_KEY;
  let ai: GoogleGenAI | null = null;
  if (apiKey) {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }

  // API Route for WhatsApp chatbot simulation
  app.post("/api/chatbot", async (req, res) => {
    const { 
      message, 
      systemInstruction, 
      history, 
      professionals, 
      appointments, 
      patient, 
      currentDate, 
      currentDayOfWeek 
    } = req.body;

    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(200).json({ 
          response: "⚠️ [Simulación de Chatbot] Hola! No se detectó la variable de entorno GEMINI_API_KEY configurada. Configure su API Key en la barra lateral para activar las respuestas inteligentes con Gemini. (Mensaje recibido: '" + message + "')" 
        });
      }

      if (!ai) {
        ai = new GoogleGenAI({
          apiKey: process.env.GEMINI_API_KEY,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });
      }

      // Convert history to format required by SDK
      const contents = history ? history.map((h: any) => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.text }]
      })) : [];

      // Add current user message at the end
      contents.push({
        role: 'user',
        parts: [{ text: message }]
      });

      // Build a rich system instruction if we have professionals
      let richSystemInstruction = systemInstruction || "Eres un amable asistente de la clínica odontológica AppSalud.";
      if (professionals) {
        let patientInfo = "";
        if (patient) {
          patientInfo = `
- Paciente REGISTRADO actual con el que estás conversando:
  * ID: ${patient.id}
  * Nombre: ${patient.name} ${patient.lastName}
  * DNI: ${patient.dni}
  * Teléfono: ${patient.phone}
`;
        } else {
          patientInfo = `
- Paciente ACTUAL: NO está registrado en el sistema (Paciente Nuevo).
  * ¡CRÍTICO! Para poder agendarle un turno a este paciente, debes pedirle de forma obligatoria sus datos personales para crearle una ficha en la clínica:
    1. Nombre y Apellido (ej. "Juan Pérez").
    2. DNI (ej. "40.123.456" o similar).
    3. Número de celular o teléfono de contacto.
  * No agendes el turno ni des por confirmado nada hasta haber recibido y validado que tienes estos tres datos indispensables.
  * Cuando el paciente te provea estos datos y confirmen el turno de mutuo acuerdo, debes incluir el objeto "newPatient" con los campos "name", "lastName", "dni" y "phone", además del objeto "booking".
`;
        }

        richSystemInstruction = `
${systemInstruction || "Eres SaludBot, el asistente virtual inteligente de nuestra clínica odontológica AppSalud."}

INFORMACIÓN IMPORTANTE PARA COMPORTAMIENTO Y TURNOS (¡CRÍTICO!):
- Fecha de hoy: ${currentDate || new Date().toISOString().split('T')[0]} (Hoy es: ${currentDayOfWeek || 'Lunes'}).
${patientInfo}

PROCESO OBLIGATORIO DE IDENTIFICACIÓN DEL PACIENTE (¡CRÍTICO!):
1. Siempre que un usuario solicite agendar un turno (tanto si ya está registrado en la base de datos como si es un paciente nuevo), debes preguntarle explícita y obligatoriamente: "¿Para quién es el turno? ¿Es para vos o para otra persona?".
2. Si responde que es para OTRA PERSONA (un tercero):
   - ¡CRÍTICO! No agendes el turno a nombre del paciente que está conversando.
   - Debes solicitarle de forma obligatoria los datos básicos de la otra persona:
     1. Nombre y Apellido (ej. "Pedro Gómez").
     2. DNI (ej. "35.987.654").
     3. Número de celular o teléfono de contacto.
   - No des por confirmado el turno ni incluyas el objeto "booking" en la respuesta JSON hasta haber recopilado estos tres datos básicos de la otra persona.
   - Cuando el turno esté confirmado de mutuo acuerdo para esa otra persona, debes incluir obligatoriamente el objeto "newPatient" con los datos de ese tercero en la respuesta JSON para crear su ficha en la clínica. En el objeto "booking", "patientId" debe quedar vacío o nulo para que el sistema le asigne la nueva ficha.
3. Si responde que es para ÉL/ELLA MISMO/A:
   - Si es el paciente REGISTRADO con datos arriba indicados, utiliza sus datos existentes (usa su "patientId" en el objeto "booking" y no incluyas "newPatient").
   - Si NO está registrado (es un Paciente Nuevo), solicítale obligatoriamente sus tres datos básicos (Nombre/Apellido, DNI y Celular) y cuando confirme el turno incluye el objeto "newPatient".
4. Una vez aclarado para quién es el turno y habiendo obtenido los datos personales correspondientes, debes solicitar y confirmar obligatoriamente el motivo de la consulta antes de cerrar el acuerdo.

ESPECIALISTAS DE LA CLÍNICA:
${JSON.stringify(professionals, null, 2)}

TURNOS RESERVADOS ACTUALMENTE (OCUPADOS, NO SE PUEDE AGENDAR CON EL MISMO ESPECIALISTA EN ESTA FECHA Y HORA):
${JSON.stringify(appointments, null, 2)}

REGLAS DE AGENDAMIENTO Y DISPONIBILIDAD:
1. Cuando el paciente te pida un turno, fíjate según cada especialista y su especialidad, los días disponibles.
2. Cada especialista tiene su especialidad, horario de inicio ("startHour"), horario de fin ("endHour"), y rango de intervalos ("slotInterval").
3. Verifica la disponibilidad laboral:
   - Días laborales: Revisa el "weeklySchedule" del especialista (0=Domingo, 1=Lunes, ..., 6=Sábado) para ver si "enabled" es true. Si no tiene "weeklySchedule" definido o está vacío, asume que atiende de Lunes a Viernes (días 1 a 5) de 08:00 a 18:00.
   - Rangos bloqueados ("blockedRanges"): Revisa que la fecha solicitada no coincida con vacaciones o bloqueos del especialista.
   - Conflictos con turnos existentes: Revisa que no haya un turno para el mismo "professionalId" a la misma fecha y hora en los "TURNOS RESERVADOS ACTUALMENTE".
4. Si el horario o día sugerido por el paciente no es válido o está ocupado, indícale amablemente que no está disponible y ofrécele las opciones de horarios libres más cercanas según su horario y turnos existentes.
5. Cuando el paciente acepte y confirme el agendamiento del turno de forma explícita, debes incluir obligatoriamente el objeto "booking" en la respuesta JSON. Si aún estás en negociación, respondiendo preguntas o si el turno no está confirmado de mutuo acuerdo, NO incluyas el objeto "booking" bajo ningún motivo.
6. Si el paciente final no estaba registrado (ya sea porque el paciente que chatea no tiene ficha, o porque el turno es para otra persona), debes incluir obligatoriamente el objeto "newPatient" con los datos proporcionados para que el sistema cree su ficha, además del objeto "booking".
        `;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: contents,
        config: {
          systemInstruction: richSystemInstruction,
          temperature: 0.7,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              response: {
                type: Type.STRING,
                description: "La respuesta amigable de WhatsApp en español de Argentina para el paciente. Usa negritas de markdown para fechas/horas y usa emojis."
              },
              booking: {
                type: Type.OBJECT,
                description: "Objeto que contiene los datos del turno confirmado para agendarlo realmente en la base de datos de la clínica. Llenar SOLO cuando confirmes de mutuo acuerdo el agendamiento de un turno libre.",
                properties: {
                  patientId: { type: Type.INTEGER, description: "ID del paciente si ya estaba registrado. Omitir o dejar nulo si es un nuevo paciente." },
                  professionalId: { type: Type.INTEGER },
                  date: { type: Type.STRING, description: "Fecha acordada en formato YYYY-MM-DD" },
                  time: { type: Type.STRING, description: "Hora acordada en formato HH:mm" },
                  reason: { type: Type.STRING, description: "Breve motivo o especialidad del turno" }
                },
                required: ["professionalId", "date", "time", "reason"]
              },
              newPatient: {
                type: Type.OBJECT,
                description: "Objeto que contiene los datos obligatorios del paciente nuevo recopilados durante la conversación. Completar únicamente cuando el paciente NO estaba registrado y te haya proporcionado su nombre/apellido, DNI y celular.",
                properties: {
                  name: { type: Type.STRING, description: "Nombre de pila del paciente" },
                  lastName: { type: Type.STRING, description: "Apellido del paciente" },
                  dni: { type: Type.STRING, description: "DNI del paciente (sólo números o formato con puntos)" },
                  phone: { type: Type.STRING, description: "Número de celular/teléfono de contacto" }
                },
                required: ["name", "lastName", "dni", "phone"]
              }
            },
            required: ["response"]
          }
        }
      });

      const responseText = response.text || "{}";
      res.json(JSON.parse(responseText));
    } catch (err: any) {
      console.error("Error calling Gemini API:", err);
      res.status(500).json({ error: err.message || "Error al procesar la solicitud con Gemini AI." });
    }
  });

  // ==========================================
  // REAL WHATSAPP CLOUD API INTEGRATION WEBHOOK
  // ==========================================

  // 1. Webhook Verification (GET)
  app.get("/api/whatsapp/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    // Default verify token if not configured
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "appsalud_token";

    if (mode === "subscribe" && token === verifyToken) {
      console.log("WhatsApp Webhook: Verified successfully with token:", verifyToken);
      return res.status(200).send(challenge);
    } else {
      console.warn("WhatsApp Webhook: Verification failed. Received token:", token);
      return res.sendStatus(403);
    }
  });

  // 2. Handle Incoming Messages (POST)
  app.post("/api/whatsapp/webhook", async (req, res) => {
    // Acknowledge receipt to Meta immediately (mandatory to prevent retries)
    res.status(200).send("EVENT_RECEIVED");

    try {
      const body = req.body;
      if (body.object !== "whatsapp_business_account") return;

      const entry = body.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;
      const messageObj = value?.messages?.[0];

      // Check if there is an active text message
      if (!messageObj || !messageObj.text?.body) return;

      const from = messageObj.from; // Sender's phone, e.g. "5491138449021"
      const messageText = messageObj.text.body;
      const phone_number_id = value.metadata?.phone_number_id;

      console.log(`WhatsApp Webhook: Received message from ${from}: "${messageText}" on phone_number_id ${phone_number_id}`);

      // Handle message with Gemini
      await handleWhatsAppIncomingMessage(from, messageText, phone_number_id);
    } catch (err: any) {
      console.error("WhatsApp Webhook: Error processing incoming event:", err);
    }
  });

  // Helper function to process WhatsApp message and call Gemini
  async function handleWhatsAppIncomingMessage(from: string, messageText: string, phone_number_id: string) {
    try {
      // Ensure Gemini API Key is configured
      if (!process.env.GEMINI_API_KEY) {
        console.warn("WhatsApp Webhook: GEMINI_API_KEY is not configured. Cannot process message.");
        return;
      }

      if (!ai) {
        ai = new GoogleGenAI({
          apiKey: process.env.GEMINI_API_KEY,
          httpOptions: {
            headers: { 'User-Agent': 'aistudio-build' }
          }
        });
      }

      // 1. Load Live Clinic Data from Firestore database
      const professionalsSnap = await getDocs(collection(db, "professionals"));
      const professionals: any[] = [];
      professionalsSnap.forEach(doc => {
        professionals.push({ id: Number(doc.id) || doc.id, ...doc.data() });
      });

      const appointmentsSnap = await getDocs(collection(db, "appointments"));
      const appointments: any[] = [];
      appointmentsSnap.forEach(doc => {
        appointments.push({ id: Number(doc.id) || doc.id, ...doc.data() });
      });

      const patientsSnap = await getDocs(collection(db, "patients"));
      const patients: any[] = [];
      patientsSnap.forEach(doc => {
        patients.push({ id: Number(doc.id) || doc.id, ...doc.data() });
      });

      // Load specific WhatsApp settings or generic guidelines if available
      let botGuidelines = "Saluda con entusiasmo, responde con brevedad y siempre invita al paciente a reservar un turno.";
      let botName = "SaludBot";
      try {
        const configSnap = await getDoc(doc(db, "system", "whatsapp_config"));
        if (configSnap.exists()) {
          const configData = configSnap.data();
          if (configData.settings) {
            botGuidelines = configData.settings.customGuidelines || botGuidelines;
            botName = configData.settings.botName || botName;
          }
        }
      } catch (e) {
        console.warn("WhatsApp Webhook: Could not load whatsapp_config, using defaults.");
      }

      // 2. Identify the Patient based on Phone Number
      const cleanWhatsAppPhone = from.replace(/\D/g, ""); // strip characters
      const matchedPatient = patients.find(p => {
        if (!p.phone) return false;
        const cleanPatientPhone = p.phone.replace(/\D/g, "");
        if (cleanPatientPhone.length < 6) return false;
        // Check if phone matches the ending of WhatsApp format or vice-versa
        return cleanWhatsAppPhone.endsWith(cleanPatientPhone) || cleanPatientPhone.endsWith(cleanWhatsAppPhone.slice(-8));
      });

      let patientInfo = "";
      if (matchedPatient) {
        patientInfo = `
- Paciente REGISTRADO actual con el que estás conversando:
  * ID: ${matchedPatient.id}
  * Nombre: ${matchedPatient.name} ${matchedPatient.lastName}
  * DNI: ${matchedPatient.dni}
  * Teléfono: ${matchedPatient.phone}
`;
        console.log(`WhatsApp Webhook: Matched existing patient ${matchedPatient.name} ${matchedPatient.lastName} for phone ${from}`);
      } else {
        patientInfo = `
- Paciente ACTUAL: NO está registrado en el sistema (Paciente Nuevo).
  * ¡CRÍTICO! Para poder agendarle un turno a este paciente, debes pedirle de forma obligatoria sus datos personales para crearle una ficha en la clínica:
    1. Nombre y Apellido (ej. "Juan Pérez").
    2. DNI (ej. "40.123.456" o similar).
    3. Número de celular o teléfono de contacto.
  * No agendes el turno ni des por confirmado nada hasta haber recibido y validado que tienes estos tres datos indispensables.
  * Cuando el paciente te provea estos datos y confirmen el turno de mutuo acuerdo, debes incluir el objeto "newPatient" con los campos "name", "lastName", "dni" y "phone", además del objeto "booking".
`;
        console.log(`WhatsApp Webhook: No registered patient found for phone ${from}. Treating as new patient.`);
      }

      // 3. Load or Create Session History in Firestore database for this phone number
      const sessionDocRef = doc(db, "whatsapp_sessions", from);
      const sessionDoc = await getDoc(sessionDocRef);
      let sessionHistory: any[] = [];
      if (sessionDoc.exists()) {
        sessionHistory = sessionDoc.data().history || [];
      }

      // Keep only the last 15 messages to stay within limits
      if (sessionHistory.length > 15) {
        sessionHistory = sessionHistory.slice(-15);
      }

      // Format history to GoogleGenAI SDK format
      const contents = sessionHistory.map((h: any) => ({
        role: h.role === "user" ? "user" : "model",
        parts: [{ text: h.text }]
      }));

      // Add the current user message
      contents.push({
        role: "user",
        parts: [{ text: messageText }]
      });

      // 4. Build system instruction
      const currentDate = new Date().toISOString().split("T")[0];
      const daysOfWeek = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
      const currentDayOfWeek = daysOfWeek[new Date().getDay()];

      const richSystemInstruction = `
Eres ${botName}, el chatbot inteligente oficial de la clínica odontológica AppSalud. Tu objetivo es interactuar con el paciente por WhatsApp para responder sus consultas y ayudarlo a agendar turnos de manera totalmente autónoma.

REGLAS DE CONDUCTA Y TONO:
- Sé sumamente amable, profesional y conciso. WhatsApp es un medio rápido, no envíes mensajes extremadamente largos.
- Usa negritas de markdown para resaltar fechas, horarios o nombres importantes.
- Utiliza emojis de forma cálida para que la conversación sea amena.
- Directrices personalizadas de la clínica: ${botGuidelines}

FECHA Y HORA ACTUAL:
- Hoy es: ${currentDayOfWeek}, ${currentDate}.

INFORMACIÓN DEL PACIENTE ACTUAL CON EL QUE CHATEAS:
${patientInfo}

PROCESO OBLIGATORIO DE IDENTIFICACIÓN DEL PACIENTE (¡CRÍTICO!):
1. Siempre que un usuario solicite agendar un turno (tanto si ya está registrado en la base de datos como si es un paciente nuevo), debes preguntarle explícita y obligatoriamente: "¿Para quién es el turno? ¿Es para vos o para otra persona?".
2. Si responde que es para OTRA PERSONA (un tercero):
   - ¡CRÍTICO! No agendes el turno a nombre del paciente que está conversando.
   - Debes solicitarle de forma obligatoria los datos básicos de la otra persona:
     1. Nombre y Apellido (ej. "Pedro Gómez").
     2. DNI (ej. "35.987.654").
     3. Número de celular o teléfono de contacto.
   - No des por confirmado el turno ni incluyas el objeto "booking" en la respuesta JSON hasta haber recopilado estos tres datos básicos de la otra persona.
   - Cuando el turno esté confirmado de mutuo acuerdo para esa otra persona, debes incluir obligatoriamente el objeto "newPatient" con los datos de ese tercero en la respuesta JSON para crear su ficha en la clínica. En el objeto "booking", "patientId" debe quedar vacío o nulo para que el sistema le asigne la nueva ficha.
3. Si responde que es para ÉL/ELLA MISMO/A:
   - Si es el paciente REGISTRADO con datos arriba indicados, utiliza sus datos existentes (usa su "patientId" en el objeto "booking" y no incluyas "newPatient").
   - Si NO está registrado (es un Paciente Nuevo), solicítale obligatoriamente sus tres datos básicos (Nombre/Apellido, DNI y Celular) y cuando confirme el turno incluye el objeto "newPatient".
4. Una vez aclarado para quién es el turno y habiendo obtenido los datos personales correspondientes, debes solicitar y confirmar obligatoriamente el motivo de la consulta antes de cerrar el acuerdo.

ESPECIALISTAS DE LA CLÍNICA:
${JSON.stringify(professionals, null, 2)}

TURNOS RESERVADOS ACTUALMENTE (OCUPADOS, NO SE PUEDE AGENDAR CON EL MISMO ESPECIALISTA EN ESTA FECHA Y HORA):
${JSON.stringify(appointments, null, 2)}

REGLAS DE AGENDAMIENTO Y DISPONIBILIDAD:
1. Cuando el paciente te pida un turno, fíjate según cada especialista y su especialidad, los días disponibles.
2. Cada especialista tiene su especialidad, horario de inicio ("startHour"), horario de fin ("endHour"), y rango de intervalos ("slotInterval").
3. Verifica la disponibilidad laboral:
   - Días laborales: Revisa el "weeklySchedule" del especialista (0=Domingo, 1=Lunes, ..., 6=Sábado) para ver si "enabled" es true. Si no tiene "weeklySchedule" definido o está vacío, asume que atiende de Lunes a Viernes (días 1 a 5) de 08:00 a 18:00.
   - Rangos bloqueados ("blockedRanges"): Revisa que la fecha solicitada no coincida con vacaciones o bloqueos del especialista.
   - Conflictos con turnos existentes: Revisa que no haya un turno para el mismo "professionalId" a la misma fecha y hora en los "TURNOS RESERVADOS ACTUALMENTE".
4. Si el horario o día sugerido por el paciente no es válido o está ocupado, indícale amablemente que no está disponible y ofrécele las opciones de horarios libres más cercanas según su horario y turnos existentes.
5. Cuando el paciente acepte y confirme el agendamiento del turno de forma explícita, debes incluir obligatoriamente el objeto "booking" en la respuesta JSON. Si aún estás en negociación, respondiendo preguntas o si el turno no está confirmado de mutuo acuerdo, NO incluyas el objeto "booking" bajo ningún motivo.
6. Si el paciente final no estaba registrado (ya sea porque el paciente que chatea no tiene ficha, o porque el turno es para otra persona), debes incluir obligatoriamente el objeto "newPatient" con los datos proporcionados para que el sistema cree su ficha, además del objeto "booking".
`;

      // 5. Generate content with Gemini
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contents,
        config: {
          systemInstruction: richSystemInstruction,
          temperature: 0.5,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              response: {
                type: Type.STRING,
                description: "La respuesta amigable de WhatsApp en español de Argentina para el paciente. Usa negritas de markdown para fechas/horas y usa emojis."
              },
              booking: {
                type: Type.OBJECT,
                description: "Objeto que contiene los datos del turno confirmado para agendarlo realmente en la base de datos de la clínica. Llenar SOLO cuando confirmes de mutuo acuerdo el agendamiento de un turno libre.",
                properties: {
                  patientId: { type: Type.INTEGER, description: "ID del paciente si ya estaba registrado. Omitir o dejar nulo si es un nuevo paciente." },
                  professionalId: { type: Type.INTEGER },
                  date: { type: Type.STRING, description: "Fecha acordada en formato YYYY-MM-DD" },
                  time: { type: Type.STRING, description: "Hora acordada en formato HH:mm" },
                  reason: { type: Type.STRING, description: "Breve motivo o especialidad del turno" }
                },
                required: ["professionalId", "date", "time", "reason"]
              },
              newPatient: {
                type: Type.OBJECT,
                description: "Objeto que contiene los datos obligatorios del paciente nuevo recopilados durante la conversación. Completar únicamente cuando el paciente NO estaba registrado y te haya proporcionado su nombre/apellido, DNI y celular.",
                properties: {
                  name: { type: Type.STRING, description: "Nombre de pila del paciente" },
                  lastName: { type: Type.STRING, description: "Apellido del paciente" },
                  dni: { type: Type.STRING, description: "DNI del paciente (sólo números o formato con puntos)" },
                  phone: { type: Type.STRING, description: "Número de celular/teléfono de contacto" }
                },
                required: ["name", "lastName", "dni", "phone"]
              }
            },
            required: ["response"]
          }
        }
      });

      const parsedResult = JSON.parse(response.text || "{}");
      const replyText = parsedResult.response || "Hola, recibí tu mensaje pero no pude procesarlo correctamente. ¿Me repites por favor?";

      let finalPatientId = matchedPatient ? Number(matchedPatient.id) : null;
      let finalPatientName = matchedPatient ? `${matchedPatient.name} ${matchedPatient.lastName}` : "";

      // 6. Database Operations - New Patient Registration
      if (parsedResult.newPatient) {
        const np = parsedResult.newPatient;
        const newId = Date.now();
        const patientData = {
          id: newId,
          name: np.name,
          lastName: np.lastName,
          phone: np.phone || from,
          dni: np.dni,
          avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${np.name}`,
          healthInsurance: "Particular",
          insuranceId: "",
          clinicalHistory: [],
          odontogram: [],
          invoices: [],
          prescriptions: [],
          centerId: "default-center"
        };
        await setDoc(doc(db, "patients", String(newId)), patientData);
        console.log("WhatsApp Webhook: Saved new patient to Firestore database:", patientData);
        finalPatientId = newId;
        finalPatientName = `${np.name} ${np.lastName}`;
      }

      // 7. Database Operations - Booking Creation
      if (parsedResult.booking) {
        const b = parsedResult.booking;
        const appointmentId = Date.now() + 1; // offset to guarantee unique id
        const appointmentData = {
          id: appointmentId,
          patientId: finalPatientId || b.patientId || Date.now(),
          patientName: finalPatientName || "Paciente WhatsApp",
          date: b.date,
          time: b.time,
          reason: b.reason,
          status: "scheduled",
          professionalId: Number(b.professionalId),
          centerId: "default-center",
          createdBy: "WhatsApp Bot"
        };
        await setDoc(doc(db, "appointments", String(appointmentId)), appointmentData);
        console.log("WhatsApp Webhook: Saved new appointment to Firestore database:", appointmentData);
      }

      // 8. Send WhatsApp reply back via Meta Graph API
      const whatsappAccessToken = process.env.WHATSAPP_ACCESS_TOKEN;
      if (whatsappAccessToken && phone_number_id) {
        const url = `https://graph.facebook.com/v18.0/${phone_number_id}/messages`;
        const metaResponse = await fetch(url, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${whatsappAccessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: from,
            type: "text",
            text: {
              preview_url: false,
              body: replyText
            }
          })
        });

        if (!metaResponse.ok) {
          const errBody = await metaResponse.json();
          console.error("WhatsApp Webhook: Meta API Error response:", JSON.stringify(errBody, null, 2));
        } else {
          console.log(`WhatsApp Webhook: Message sent successfully to ${from}`);
        }
      } else {
        console.warn("WhatsApp Webhook: Cannot send real reply because WHATSAPP_ACCESS_TOKEN or phone_number_id is missing. (Message to send:", replyText, ")");
      }

      // 9. Persist History to Firestore database
      sessionHistory.push({ role: "user", text: messageText });
      sessionHistory.push({ role: "model", text: replyText });
      await setDoc(sessionDocRef, {
        history: sessionHistory,
        updatedAt: new Date().toISOString()
      });

    } catch (err: any) {
      console.error("WhatsApp Webhook: Error in handleWhatsAppIncomingMessage:", err);
    }
  }

  // API Route for Jotform and External AI Agents integrations
  app.get("/api/jotform-webhook", async (req, res) => {
    try {
      // 1. Fetch professionals
      const professionalsSnap = await getDocs(collection(db, "professionals"));
      const professionalsList: any[] = [];
      professionalsSnap.forEach(docSnap => {
        professionalsList.push({ id: Number(docSnap.id) || docSnap.id, ...docSnap.data() });
      });

      // 2. Fetch future appointments to know what is busy
      const appointmentsSnap = await getDocs(collection(db, "appointments"));
      const busySlots: any[] = [];
      const todayStr = new Date().toISOString().split("T")[0];
      
      appointmentsSnap.forEach(docSnap => {
        const appt = docSnap.data();
        if (appt.date >= todayStr && appt.status !== "cancelled") {
          busySlots.push({
            date: appt.date,
            time: appt.time,
            professionalId: Number(appt.professionalId),
            professionalName: appt.professionalName || ""
          });
        }
      });

      // Helper to format weekly schedule
      const daysOfWeekSpanish = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
      
      const mappedProfessionals = professionalsList.map(p => {
        let scheduleText = "";
        
        if (p.weeklySchedule && Array.isArray(p.weeklySchedule)) {
          const activeDays = p.weeklySchedule
            .filter((d: any) => d.enabled)
            .map((d: any) => {
              const dayName = daysOfWeekSpanish[d.dayOfWeek] || `Día ${d.dayOfWeek}`;
              return `${dayName} (${d.startHour} a ${d.endHour})`;
            });
          if (activeDays.length > 0) {
            scheduleText = activeDays.join(", ");
          }
        }

        if (!scheduleText) {
          scheduleText = `Lunes a Viernes de ${p.startHour || "08:00"} a ${p.endHour || "18:00"}`;
        }

        // Clean doctor's name to prevent "undefined"
        const cleanLastName = p.lastName || "";
        const cleanName = p.name || "Profesional";
        let displayName = cleanName;
        if (!displayName.toLowerCase().startsWith("dr")) {
          displayName = `Dr/a. ${displayName}`;
        }
        if (cleanLastName && !displayName.includes(cleanLastName)) {
          displayName = `${displayName} ${cleanLastName}`;
        }

        return {
          id: p.id,
          name: displayName,
          specialty: p.specialty || "General",
          generalHours: `${p.startHour || "08:00"} a ${p.endHour || "18:00"}`,
          detailedSchedule: scheduleText,
          slotDurationMinutes: p.slotInterval || 30
        };
      });

      // Group professionals by specialty
      const specialtiesMap: { [key: string]: string[] } = {};
      mappedProfessionals.forEach(p => {
        const spec = p.specialty;
        if (!specialtiesMap[spec]) {
          specialtiesMap[spec] = [];
        }
        specialtiesMap[spec].push(`${p.name} (ID: ${p.id}) - Horarios de Atención: ${p.detailedSchedule}`);
      });

      const uniqueSpecialties = Object.keys(specialtiesMap);

      res.status(200).json({
        success: true,
        message: "Conexión exitosa con la agenda de la clínica médica.",
        clinicName: "Ecodiagnóstico",
        todayDate: todayStr,
        todayDayOfWeek: daysOfWeekSpanish[new Date().getDay()],
        availableSpecialties: uniqueSpecialties,
        specialtiesAndDoctors: specialtiesMap,
        availableProfessionals: mappedProfessionals,
        busySlots: busySlots,
        instructionsForLorena: {
          greeting: "Hola Lorena, eres la asistente virtual de Ecodiagnóstico. Usa esta información para responder con total precisión a los pacientes.",
          rules: [
            "1. Cuando el paciente te salude o pregunte qué especialidades hay, menciónale las especialidades disponibles en el campo 'availableSpecialties' de forma clara y profesional.",
            "2. Cuando el paciente elija una especialidad o pregunte por un médico, dile qué doctores atienden en esa especialidad y detalla sus días y horarios exactos de atención (indicados en 'detailedSchedule').",
            "3. IMPORTANTE: Los pacientes no saben qué días atienden los profesionales. Debes sugerirle activamente días y horarios disponibles para el doctor seleccionado.",
            "4. Antes de ofrecer una fecha y hora, verifica en 'busySlots' que no esté ocupada para ese professionalId en esa misma fecha y hora.",
            "5. Para calcular fechas relativas (ej. 'este jueves' o 'la semana que viene'), básate en que el día de hoy es: " + daysOfWeekSpanish[new Date().getDay()] + " " + todayStr + ".",
            "6. Una vez que el paciente acepte y confirme explícitamente un día y horario libre con un doctor, debes proceder a registrar el turno llamando a la herramienta 'POST' (ENVIAR) con los datos del paciente (nombre, apellido, DNI, teléfono, fecha YYYY-MM-DD, hora HH:MM y el ID del profesional)."
          ]
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/jotform-webhook", async (req, res) => {
    console.log("Jotform Webhook received payload:", JSON.stringify(req.body, null, 2));

    try {
      const payload = req.body;

      // 1. Fetch professionals from Firestore to do matching
      const professionalsSnap = await getDocs(collection(db, "professionals"));
      const professionalsList: any[] = [];
      professionalsSnap.forEach(docSnap => {
        professionalsList.push({ id: Number(docSnap.id) || docSnap.id, ...docSnap.data() });
      });

      let extractedData: any = null;

      // 2. If Gemini is available, use it to intelligently parse fields from any format
      if (process.env.GEMINI_API_KEY) {
        if (!ai) {
          ai = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY,
            httpOptions: {
              headers: { 'User-Agent': 'aistudio-build' }
            }
          });
        }

        const currentDate = new Date().toISOString().split("T")[0];
        const daysOfWeek = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
        const currentDayOfWeek = daysOfWeek[new Date().getDay()];

        const promptText = `
Te proporcionaré el payload de una solicitud de webhook de un formulario de Jotform o contacto externo.
Tu tarea es analizar detalladamente todas las respuestas enviadas en el payload y extraer la información del paciente y de la reserva médica solicitada de forma inteligente.

PAYLOAD RECIBIDO:
${JSON.stringify(payload, null, 2)}

PROFESIONALES DE LA CLÍNICA:
${JSON.stringify(professionalsList, null, 2)}

REGLAS DE EXTRACCIÓN (¡SÉ INTELIGENTE!):
1. Extrae el nombre ("name") y apellido ("lastName") del paciente de forma separada. Si el campo contiene ambos, divídelos lógicamente.
2. Extrae el documento nacional de identidad ("dni") como un string numérico limpio (sin puntos ni guiones).
3. Extrae el número de teléfono/celular ("phone").
4. Extrae la fecha de reserva acordada ("date") en formato "YYYY-MM-DD". Si no está explícitamente completa o es relativa (ej: "este viernes"), calcula la fecha exacta en base a que hoy es: ${currentDayOfWeek}, ${currentDate}.
5. Extrae el horario ("time") en formato "HH:mm" (ej: "10:00").
6. Identifica el ID del profesional ("professionalId") comparando el nombre, apellido, especialidad o el ID brindado por el paciente contra la lista de profesionales de la clínica. Si no encuentras coincidencia, deja nulo.
7. Extrae el motivo de la consulta ("reason"). Si no se especifica, asume "Consulta General".

Devuelve ÚNICAMENTE un objeto JSON con el siguiente esquema sin formato markdown ni rodeos:
{
  "name": "Nombre",
  "lastName": "Apellido",
  "dni": "DNI",
  "phone": "Teléfono",
  "date": "YYYY-MM-DD",
  "time": "HH:mm",
  "professionalId": ID_NUMERICO_O_NULO,
  "reason": "Motivo"
}
`;

        const geminiResponse = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: promptText,
          config: {
            temperature: 0.1,
            responseMimeType: "application/json"
          }
        });

        try {
          extractedData = JSON.parse(geminiResponse.text || "{}");
          console.log("Jotform Webhook: Gemini parsed extracted data:", extractedData);
        } catch (parseErr) {
          console.error("Jotform Webhook: Failed to parse Gemini response text", parseErr);
        }
      }

      // 3. Fallback simple parsing if Gemini isn't available or fails
      if (!extractedData) {
        // Look for basic common keys
        const name = payload.name || payload.first_name || payload.nombre || "Paciente";
        const lastName = payload.lastName || payload.last_name || payload.apellido || "Jotform";
        const dni = String(payload.dni || payload.documento || payload.id || "0");
        const phone = payload.phone || payload.celular || payload.telefono || "";
        const date = payload.date || payload.fecha || new Date().toISOString().split("T")[0];
        const time = payload.time || payload.hora || payload.horario || "10:00";
        const reason = payload.reason || payload.motivo || "Consulta de Jotform";
        let professionalId = Number(payload.professionalId || payload.professional || 0);

        if (!professionalId && professionalsList.length > 0) {
          professionalId = professionalsList[0].id;
        }

        extractedData = {
          name,
          lastName,
          dni,
          phone,
          date,
          time,
          professionalId,
          reason
        };
      }

      // Validate basic inputs
      const { name, lastName, dni, phone, date, time, reason } = extractedData;
      let professionalId = extractedData.professionalId;

      if (!professionalId && professionalsList.length > 0) {
        professionalId = professionalsList[0].id; // Fallback to first doctor
      }

      const matchingPro = professionalsList.find(p => p.id === Number(professionalId));
      let professionalName = "Profesional de la Clínica";
      if (matchingPro) {
        let displayName = matchingPro.name || "Profesional";
        if (!displayName.toLowerCase().startsWith("dr")) {
          displayName = `Dr/a. ${displayName}`;
        }
        if (matchingPro.lastName && !displayName.includes(matchingPro.lastName)) {
          displayName = `${displayName} ${matchingPro.lastName}`;
        }
        professionalName = displayName;
      }

      // 4. Find or Create Patient in Firestore
      let finalPatientId = Date.now();
      let finalPatientName = `${name} ${lastName}`;

      // Check if patient already exists by DNI
      const patientsSnap = await getDocs(collection(db, "patients"));
      let matchedPatient: any = null;
      patientsSnap.forEach(docSnap => {
        const pData = docSnap.data();
        if (pData.dni && String(pData.dni).replace(/\D/g, "") === String(dni).replace(/\D/g, "")) {
          matchedPatient = { id: docSnap.id, ...pData };
        }
      });

      if (matchedPatient) {
        finalPatientId = Number(matchedPatient.id) || matchedPatient.id;
        finalPatientName = `${matchedPatient.name} ${matchedPatient.lastName}`;
        console.log(`Jotform Webhook: Existing patient matched: ID ${finalPatientId} (${finalPatientName})`);
      } else {
        // Create new patient
        const newPatientData = {
          id: finalPatientId,
          name: name,
          lastName: lastName,
          phone: phone,
          dni: dni,
          avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${name}`,
          healthInsurance: "Particular",
          insuranceId: "",
          clinicalHistory: [],
          odontogram: [],
          invoices: [],
          prescriptions: [],
          centerId: "default-center"
        };
        await setDoc(doc(db, "patients", String(finalPatientId)), newPatientData);
        console.log(`Jotform Webhook: Registered new patient: ${finalPatientName}`);
      }

      // 5. Create Appointment in Firestore
      const appointmentId = Date.now() + 2;
      const appointmentData = {
        id: appointmentId,
        patientId: finalPatientId,
        patientName: finalPatientName,
        date: date,
        time: time,
        reason: reason,
        status: "scheduled",
        professionalId: Number(professionalId),
        professionalName: professionalName,
        centerId: "default-center",
        createdBy: "Integración Jotform / Agente IA"
      };

      await setDoc(doc(db, "appointments", String(appointmentId)), appointmentData);
      console.log("Jotform Webhook: Appointment scheduled successfully:", appointmentData);

      res.status(200).json({
        success: true,
        message: "Cita agendada correctamente a través del webhook de Jotform",
        appointment: appointmentData
      });

    } catch (webhookErr: any) {
      console.error("Jotform Webhook Error:", webhookErr);
      res.status(500).json({
        success: false,
        error: webhookErr.message || "Error al procesar el webhook de Jotform"
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
