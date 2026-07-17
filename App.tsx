import React, { useState, useCallback, useMemo, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import PatientList from './components/PatientList';
import PatientDetail from './components/PatientDetail';
import Settings from './components/Settings';
import Calendar from './components/Calendar';
import Modal from './components/Modal';
import PatientForm from './components/PatientForm';
import AppointmentForm from './components/AppointmentForm';
import CameraModal from './components/CameraModal';
import Login from './components/Login';
import Backoffice from './components/Backoffice';
import MasterBackoffice from './components/MasterBackoffice';
import ClinicalHistorySearch from './components/ClinicalHistorySearch';
import { MOCK_PATIENTS, MOCK_APPOINTMENTS, createOdontogram, PROFESSIONALS, MOCK_USERS, MOCK_CENTERS, MASTER_USER } from './constants';
import type { Patient, View, ClinicSettings, Appointment, AppointmentStatus, Professional, User, MedicalCenter } from './types';
import { AppLogoIcon, SunIcon, MoonIcon, PaintbrushIcon, LayoutIcon } from './components/icons';
import PriceList, { DEFAULT_PRICE_LIST, PriceListItem } from './components/PriceList';
import Telemedicine from './components/Telemedicine';
import Billing from './components/Billing';
import WhatsappChatbot from './components/WhatsappChatbot';
import StandaloneChatbot from './components/StandaloneChatbot';
import {
  seedDatabaseIfEmpty,
  saveCenterToFirestore,
  deleteCenterFromFirestore,
  saveUserToFirestore,
  deleteUserFromFirestore,
  savePatientToFirestore,
  saveAppointmentToFirestore,
  removeAppointmentFromFirestore,
  saveProfessionalToFirestore,
  deleteProfessionalFromFirestore,
  savePriceLibraryItemToFirestore,
  deletePriceLibraryItemFromFirestore,
  saveClinicSettingsToFirestore,
  subscribeCenters,
  subscribeUsers,
  subscribePatients,
  subscribeAppointments,
  subscribeProfessionals,
  subscribePriceList,
  subscribeClinicSettings
} from './firebaseSync';

const App: React.FC = () => {
  const isEmbedMode = useMemo(() => {
    return window.location.search.includes('embed=true');
  }, []);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [priceListItems, setPriceListItems] = useState<PriceListItem[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [colorSkin, setColorSkin] = useState<string>(() => {
    return localStorage.getItem('clinic_color_skin') || 'emerald';
  });
  const [menuLayout, setMenuLayout] = useState<'sidebar' | 'topnav'>(() => {
    return (localStorage.getItem('clinic_menu_layout') as 'sidebar' | 'topnav') || 'sidebar';
  });
  const [patientViewMode, setPatientViewMode] = useState<'grid' | 'table'>(() => {
    return (localStorage.getItem('clinic_patient_view_mode') as 'grid' | 'table') || 'grid';
  });
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [prefilledApt, setPrefilledApt] = useState<{ date: string; time: string; professionalId: number } | null>(null);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [newAvatarFromCamera, setNewAvatarFromCamera] = useState<string | null>(null);
  const [patientToEdit, setPatientToEdit] = useState<Patient | null>(null);

  const skinStyles = useMemo(() => {
    const skins: Record<string, {
      primary: string;
      primaryRgb: string;
      hover: string;
      lightBg: string;
      lightBgHover: string;
      text: string;
      textLight: string;
      ring: string;
      border: string;
      gradientFrom: string;
      gradientTo: string;
    }> = {
      emerald: {
        primary: '#0d9488',
        primaryRgb: '13, 148, 136',
        hover: '#0f766e',
        lightBg: '#f0fdfa',
        lightBgHover: '#ccfbf1',
        text: '#0d9488',
        textLight: '#115e59',
        ring: 'rgba(13, 148, 136, 0.4)',
        border: '#0d9488',
        gradientFrom: '#0d9488',
        gradientTo: '#14b8a6',
      },
      blue: {
        primary: '#2563eb',
        primaryRgb: '37, 99, 235',
        hover: '#1d4ed8',
        lightBg: '#eff6ff',
        lightBgHover: '#dbeafe',
        text: '#2563eb',
        textLight: '#1e40af',
        ring: 'rgba(37, 99, 235, 0.4)',
        border: '#2563eb',
        gradientFrom: '#1e3a8a',
        gradientTo: '#3b82f6',
      },
      violet: {
        primary: '#7c3aed',
        primaryRgb: '124, 58, 237',
        hover: '#6d28d9',
        lightBg: '#f5f3ff',
        lightBgHover: '#ede9fe',
        text: '#7c3aed',
        textLight: '#5b21b6',
        ring: 'rgba(124, 58, 237, 0.4)',
        border: '#7c3aed',
        gradientFrom: '#4c1d95',
        gradientTo: '#8b5cf6',
      },
      rose: {
        primary: '#db2777',
        primaryRgb: '219, 39, 119',
        hover: '#be185d',
        lightBg: '#fdf2f8',
        lightBgHover: '#fce7f3',
        text: '#db2777',
        textLight: '#9d174d',
        ring: 'rgba(219, 39, 119, 0.4)',
        border: '#db2777',
        gradientFrom: '#881337',
        gradientTo: '#db2777',
      },
      amber: {
        primary: '#d97706',
        primaryRgb: '217, 119, 6',
        hover: '#b45309',
        lightBg: '#fffbeb',
        lightBgHover: '#fef3c7',
        text: '#d97706',
        textLight: '#78350f',
        ring: 'rgba(217, 119, 6, 0.4)',
        border: '#d97706',
        gradientFrom: '#78350f',
        gradientTo: '#fbbf24',
      },
      slate: {
        primary: '#475569',
        primaryRgb: '71, 85, 105',
        hover: '#334155',
        lightBg: '#f8fafc',
        lightBgHover: '#f1f5f9',
        text: '#475569',
        textLight: '#1e293b',
        ring: 'rgba(71, 85, 105, 0.4)',
        border: '#475569',
        gradientFrom: '#1e293b',
        gradientTo: '#64748b',
      }
    };

    const s = skins[colorSkin] || skins.emerald;

    return `
      :root {
        --color-skin-primary: ${s.primary};
        --color-skin-hover: ${s.hover};
        --color-skin-light: ${s.lightBg};
        --color-skin-light-hover: ${s.lightBgHover};
        --color-skin-text: ${s.text};
        --color-skin-text-light: ${s.textLight};
        --color-skin-ring: ${s.ring};
        --color-skin-border: ${s.border};
        --color-skin-grad-from: ${s.gradientFrom};
        --color-skin-grad-to: ${s.gradientTo};
      }
      
      /* Mapeos elegantes del ecosistema esmeralda a variables dinámicas */
      .bg-emerald-600, .bg-primary { background-color: var(--color-skin-primary) !important; }
      .hover\\:bg-emerald-700:hover, .hover\\:bg-primary-650:hover, .hover\\:bg-primary-600:hover { background-color: var(--color-skin-hover) !important; }
      .text-emerald-600, .text-primary, .dark\\:text-primary-450, .text-emerald-500, .dark\\:text-emerald-400, .dark\\:text-emerald-450 { color: var(--color-skin-primary) !important; }
      .text-emerald-750, .text-emerald-700, .text-emerald-800, .text-emerald-900 { color: var(--color-skin-text-light) !important; }
      
      .bg-emerald-50, .bg-emerald-50\\/40, .bg-emerald-500\\/10, .bg-emerald-500\\/15, .bg-primary\\/10, .dark\\:bg-primary-955\\/20, .dark\\:bg-primary-950\\/20 { background-color: rgba(${s.primaryRgb}, 0.1) !important; }
      .hover\\:bg-emerald-100:hover, .hover\\:bg-emerald-200:hover, .hover\\:bg-emerald-250:hover, .hover\\:bg-slate-50:hover { background-color: var(--color-skin-light-hover) !important; }
      .bg-emerald-100, .bg-emerald-200, .bg-emerald-250 { background-color: var(--color-skin-light-hover) !important; }
      
      .border-emerald-500, .border-primary { border-color: var(--color-skin-primary) !important; }
      .border-emerald-100, .border-emerald-200, .border-emerald-300, .border-primary\\/15 { border-color: rgba(${s.primaryRgb}, 0.2) !important; }
      
      .focus\\:ring-emerald-500:focus, .ring-emerald-500, .focus\\:ring-primary:focus { --tw-ring-color: var(--color-skin-ring) !important; }
      
      .from-emerald-600, .from-primary { --tw-gradient-from: var(--color-skin-grad-from) !important; --tw-gradient-to: var(--color-skin-grad-to, rgba(255,255,255,0)) !important; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to) !important; }
      
      /* Botones Generales de Estilos que requieran color principal */
      .bg-primary { background-color: var(--color-skin-primary) !important; }
      .hover\\:bg-primary-600:hover { background-color: var(--color-skin-hover) !important; }
      .text-primary { color: var(--color-skin-primary) !important; }
    `;
  }, [colorSkin]);

  // Global Multi-clinic lists
  const [centers, setCenters] = useState<MedicalCenter[]>(() => {
    const saved = localStorage.getItem('clinic_centers');
    return saved ? JSON.parse(saved) : MOCK_CENTERS;
  });

  const [currentCenterId, setCurrentCenterId] = useState<string | null>(() => {
    return localStorage.getItem('clinic_current_center_id');
  });

  const [loadedCenterId, setLoadedCenterId] = useState<string | null>(null);

  // Clinic config persistence (Scoped)
  const [clinicSettings, setClinicSettings] = useState<ClinicSettings>(() => {
    return {
      name: "Diseños con Apptitud",
      logo: null,
      address: "",
      cuil: "",
      phone: "",
      consentTemplate: `CONSENTIMIENTO INFORMADO PARA TRATAMIENTO ODONTOLÓGICO

Por la presente, expreso de manera libre y voluntaria mi consentimiento para que el equipo profesional de este centro odontológico realice el diagnóstico y tratamiento indicado en mi plan de atención.

He sido plenamente informado/a sobre el diagnóstico, la naturaleza del procedimiento recomendado, los beneficios esperados, las alternativas viables y los riesgos potenciales (los cuales incluyen, sin limitarse a: molestias postoperatorias directas, sangrado leve, infecciones localizadas o sensibilidad dental temporaria).

Comprendo que la odontología no es una ciencia exacta y que no se pueden garantizar resultados perfectos de modo absoluto. Confirmo que he podido realizar todas las preguntas necesarias, obteniendo respuestas satisfactorias y claras.

Me comprometo a seguir rigurosamente las indicaciones y cuidados post-tratamiento indicados por el profesional odontólogo, asumiendo la responsabilidad de concurrir a los controles estipulados y reportar de inmediato cualquier complicación imprevista.`,
    };
  });

  // Users list persistence (Global list containing multi-center users)
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('clinic_users');
    return saved ? JSON.parse(saved) : MOCK_USERS;
  });

  // Logged-in user state persistence
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('clinic_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Active view tracker
  const [view, setView] = useState<View>(() => {
    const savedUserStr = localStorage.getItem('clinic_current_user');
    if (savedUserStr) {
      const parsed: User = JSON.parse(savedUserStr);
      if (parsed.role === 'master') {
        return 'master_backoffice';
      }
      if (parsed.role === 'patient') {
        return 'patient_detail';
      }
      return parsed.permissions.canManageAppointments ? 'calendar' : 'patient_list';
    }
    return 'calendar';
  });

  // Establish real-time live database snapshot listeners on mount / logins
  useEffect(() => {
    // Subscribe immediately to ensure instant synchronization of multi-clinic metadata
    const unsubCenters = subscribeCenters((items) => {
      setCenters(items);
    });
    const unsubUsers = subscribeUsers((items) => {
      setUsers(items);
    });

    // Run the background authentication and database seeding asynchronously
    seedDatabaseIfEmpty().catch(err => {
      console.error("Firebase sync background seeding error:", err);
    });

    return () => {
      unsubCenters();
      unsubUsers();
    };
  }, []);

  // Save updated centers and users lists to local storage for fast cached load times
  useEffect(() => {
    localStorage.setItem('clinic_centers', JSON.stringify(centers));
  }, [centers]);

  useEffect(() => {
    localStorage.setItem('clinic_users', JSON.stringify(users));
  }, [users]);

  // Scoped real-time listeners for active branch/center
  useEffect(() => {
    if (!currentCenterId) return;

    const unsubPatients = subscribePatients(currentCenterId, (items) => {
      setPatients(items);
    });

    const unsubAppointments = subscribeAppointments(currentCenterId, (items) => {
      setAppointments(items);
    });

    const unsubProfessionals = subscribeProfessionals(currentCenterId, (items) => {
      setProfessionals(items);
    });

    const unsubPriceList = subscribePriceList(currentCenterId, (items) => {
      setPriceListItems(items);
    });

    const unsubSettings = subscribeClinicSettings(currentCenterId, (settings) => {
      setClinicSettings(settings);
    });

    setLoadedCenterId(currentCenterId);

    return () => {
      unsubPatients();
      unsubAppointments();
      unsubProfessionals();
      unsubPriceList();
      unsubSettings();
    };
  }, [currentCenterId]);

  // Sync current user session in real-time
  useEffect(() => {
    if (currentUser && currentUser.role !== 'master') {
      const match = users.find(u => u.id === currentUser.id);
      if (match) {
        if (!match.active) {
          handleLogout();
          alert('Su cuenta ha sido desactivada por el administrador.');
        } else {
          setCurrentUser(match);
          localStorage.setItem('clinic_current_user', JSON.stringify(match));
        }
      }
    }
  }, [users]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleLogin = (user: User, centerId: string | null) => {
    setCurrentUser(user);
    localStorage.setItem('clinic_current_user', JSON.stringify(user));
    setCurrentCenterId(centerId);
    if (centerId) {
      localStorage.setItem('clinic_current_center_id', centerId);
    } else {
      localStorage.removeItem('clinic_current_center_id');
    }
    
    // Determine landing view
    if (user.role === 'master') {
      setView('master_backoffice');
    } else if (user.role === 'patient') {
      setView('patient_detail');
    } else if (user.permissions.canManageAppointments) {
      setView('calendar');
    } else {
      setView('patient_list');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('clinic_current_user');
    setCurrentCenterId(null);
    localStorage.removeItem('clinic_current_center_id');
    setSelectedPatientId(null);
    setView('calendar');
  };
  const handleSelectPatient = useCallback((id: number) => {
    setSelectedPatientId(id);
    setView('patient_detail');
  }, []);

  const handleUpdatePatient = useCallback((updatedPatient: Patient) => {
    savePatientToFirestore(updatedPatient);
  }, []);
  
  const handleUpdateClinicSettings = useCallback((settings: ClinicSettings) => {
    if (currentCenterId) {
      saveClinicSettingsToFirestore(currentCenterId, settings);
      const activeCenterObj = centers.find(c => c.id === currentCenterId);
      if (activeCenterObj) {
        saveCenterToFirestore({
          ...activeCenterObj,
          name: settings.name,
          logo: settings.logo,
          address: settings.address,
          cuil: settings.cuil,
          phone: settings.phone
        });
      }
    }
    alert('Configuración guardada exitosamente.');
  }, [currentCenterId, centers]);

  const handleOpenNewPatientModal = () => {
    if (currentUser && !currentUser.permissions.canEditPatients) {
      alert('Seguridad: Su nivel de acceso no le permite registrar nuevos pacientes.');
      return;
    }
    setPatientToEdit(null);
    setNewAvatarFromCamera(null);
    setIsPatientModalOpen(true);
  };

  const handleOpenEditPatientModal = (patient: Patient) => {
    if (currentUser && !currentUser.permissions.canEditPatients) {
      alert('Seguridad: Su nivel de acceso no le permite editar registros de pacientes.');
      return;
    }
    setPatientToEdit(patient);
    setNewAvatarFromCamera(null);
    setIsPatientModalOpen(true);
  };

  const handleClosePatientModal = () => {
    setIsPatientModalOpen(false);
    setPatientToEdit(null);
    setNewAvatarFromCamera(null);
  };

  const handleOpenCameraModal = () => {
      setIsCameraModalOpen(true);
  };

  const handlePhotoCapture = (dataUrl: string) => {
      setNewAvatarFromCamera(dataUrl);
      setIsCameraModalOpen(false);
  };

  const handleSavePatient = (formData: Omit<Patient, 'id' | 'clinicalHistory' | 'odontogram' | 'invoices' | 'prescriptions'>) => {
    if (currentUser && !currentUser.permissions.canEditPatients) {
      alert('Error de Permisos: No posee autorización para guardar fichas de pacientes.');
      return;
    }

    if (patientToEdit) { // Editing existing patient
      const updatedPatient = { 
        ...patientToEdit, 
        ...formData,
        centerId: patientToEdit.centerId || currentCenterId || undefined
      };
      savePatientToFirestore(updatedPatient);
    } else { // Creating new patient
      const newPatient: Patient = {
        id: Date.now(),
        clinicalHistory: [],
        odontogram: createOdontogram(),
        invoices: [],
        prescriptions: [],
        centerId: currentCenterId || undefined,
        ...formData,
      };
      savePatientToFirestore(newPatient);
    }
    handleClosePatientModal();
  };
  
  const handleSaveAppointment = (appointmentData: Omit<Appointment, 'id' | 'status' | 'patientName'>) => {
      if (currentUser && !currentUser.permissions.canManageAppointments) {
        alert('Error de Permisos: No posee autorización para agendar citas.');
        return;
      }

      const patient = patients.find(p => p.id === appointmentData.patientId);
      if (!patient) return;

      const newAppointment: Appointment = {
          ...appointmentData,
          id: Date.now(),
          status: 'scheduled',
          patientName: `${patient.name} ${patient.lastName}`,
          centerId: currentCenterId || undefined,
          createdBy: currentUser ? (currentUser.fullName || currentUser.username) : 'Sistema',
      };
      saveAppointmentToFirestore(newAppointment);
      setIsAppointmentModalOpen(false);
      setPrefilledApt(null);
  };

  const handleUpdateAppointmentStatus = (appointmentId: number, status: AppointmentStatus, cancellationReason?: string) => {
      if (currentUser && !currentUser.permissions.canManageAppointments) {
        alert('Error de Permisos: No posee autorización para modificar el estado de citas.');
        return;
      }
      const apt = appointments.find(a => a.id === appointmentId);
      if (apt) {
        const updatedApt: Appointment = { ...apt, status };
        if (cancellationReason !== undefined) {
          updatedApt.cancellationReason = cancellationReason;
        } else if ('cancellationReason' in updatedApt) {
          delete updatedApt.cancellationReason;
        }
        
        // Sanitize object by removing any fields with local undefined values
        Object.keys(updatedApt).forEach(key => {
          if (updatedApt[key as keyof Appointment] === undefined) {
            delete updatedApt[key as keyof Appointment];
          }
        });

        saveAppointmentToFirestore(updatedApt);
      }
  };

  const selectedPatient = useMemo(() => {
    if (currentUser?.role === 'patient') {
      return patients.find(p => p.id === currentUser.id) || null;
    }
    return patients.find(p => p.id === selectedPatientId) || null;
  }, [patients, selectedPatientId, currentUser]);

  const renderView = () => {
    if (!currentUser) return null;

    if (currentUser.role === 'patient') {
      const ownPatient = patients.find(p => p.id === currentUser.id);
      if (ownPatient) {
        return (
          <PatientDetail 
            patient={ownPatient} 
            onUpdatePatient={handleUpdatePatient} 
            onEditPatient={handleOpenEditPatientModal} 
            clinicSettings={clinicSettings} 
            currentUser={currentUser}
            appointments={appointments}
            professionals={professionals}
            onUpdateAppointmentStatus={handleUpdateAppointmentStatus}
          />
        );
      }
    }

    switch (view) {
      case 'clinical_history_search':
        return (
          <ClinicalHistorySearch 
            patients={patients}
            onSelectPatient={handleSelectPatient}
          />
        );

      case 'backoffice':
        if (!currentUser.permissions.canAccessBackoffice) {
          setView('patient_list');
          return <PatientList patients={patients} onSelectPatient={handleSelectPatient} onAddPatient={handleOpenNewPatientModal} canEditPatients={currentUser.permissions.canEditPatients} appointments={appointments} professionals={professionals} viewMode={patientViewMode} />;
        }
        return (
          <Backoffice
            currentUser={currentUser}
            users={users}
            onUpdateUsers={(updatedUsers) => {
              // Identify deleted users and remove them from Firestore
              const deleted = users.filter(u => !updatedUsers.some(uu => uu.id === u.id));
              deleted.forEach(u => {
                deleteUserFromFirestore(u.id);
              });
              updatedUsers.forEach(u => saveUserToFirestore(u));
            }}
            clinicSettings={clinicSettings}
            onUpdateSettings={handleUpdateClinicSettings}
            professionals={professionals}
            onUpdateProfessionals={(updatedPros) => {
              // Identify deleted professionals and remove them from Firestore
              const deleted = professionals.filter(p => !updatedPros.some(up => up.id === p.id));
              deleted.forEach(p => {
                deleteProfessionalFromFirestore(p.id);
              });
              updatedPros.forEach(p => saveProfessionalToFirestore(p));
            }}
            appointments={appointments}
          />
        );

      case 'price_list':
        return (
          <PriceList
            currentUser={currentUser}
            items={priceListItems}
            onAddItem={(newItem) => {
              const fullItem: PriceListItem = {
                ...newItem,
                id: newItem.id || `cust-${Math.floor(1000 + Math.random() * 9000).toString()}`,
                centerId: currentCenterId || undefined
              };
              savePriceLibraryItemToFirestore(fullItem);
            }}
            onDeleteItem={(id) => {
              deletePriceLibraryItemFromFirestore(id);
            }}
            onUpdateItemPrice={(id, newPrice) => {
              const item = priceListItems.find(i => i.id === id);
              if (item) {
                savePriceLibraryItemToFirestore({ ...item, price: newPrice });
              }
            }}
            onUpdateItemCode={(oldId, newId) => {
              const item = priceListItems.find(i => i.id === oldId);
              if (item) {
                deletePriceLibraryItemFromFirestore(oldId).then(() => {
                  savePriceLibraryItemToFirestore({ ...item, id: newId });
                });
              }
            }}
          />
        );

      case 'billing':
        return (
          <Billing
            patients={patients}
            currentUser={currentUser}
            clinicSettings={clinicSettings}
            onUpdatePatient={handleUpdatePatient}
          />
        );

      case 'whatsapp_bot':
        return (
          <WhatsappChatbot
            patients={patients}
            professionals={professionals}
            appointments={appointments}
            currentCenterId={currentCenterId}
            currentUser={currentUser}
          />
        );

      case 'patient_detail':
        if (selectedPatient) {
          return (
            <PatientDetail 
              patient={selectedPatient} 
              onUpdatePatient={handleUpdatePatient} 
              onEditPatient={handleOpenEditPatientModal} 
              clinicSettings={clinicSettings} 
              currentUser={currentUser}
              appointments={appointments}
              professionals={professionals}
              onUpdateAppointmentStatus={handleUpdateAppointmentStatus}
            />
          );
        }
        setView('patient_list');
        return <PatientList patients={patients} onSelectPatient={handleSelectPatient} onAddPatient={handleOpenNewPatientModal} canEditPatients={currentUser.permissions.canEditPatients} appointments={appointments} professionals={professionals} viewMode={patientViewMode} />;

      case 'calendar':
        if (!currentUser.permissions.canManageAppointments) {
          setView('patient_list');
          return <PatientList patients={patients} onSelectPatient={handleSelectPatient} onAddPatient={handleOpenNewPatientModal} canEditPatients={currentUser.permissions.canEditPatients} appointments={appointments} professionals={professionals} viewMode={patientViewMode} />;
        }
        return (
          <Calendar 
              appointments={appointments} 
              patients={patients}
              professionals={professionals}
              clinicSettings={clinicSettings}
              onSelectPatient={handleSelectPatient}
              onAddPatient={handleOpenNewPatientModal}
              onAddAppointment={(date, time, professionalId) => {
                if (!currentUser.permissions.canManageAppointments) {
                  alert('No cuenta con privilegios de agenda.');
                  return;
                }
                setPrefilledApt({ date, time, professionalId });
                setIsAppointmentModalOpen(true);
              }}
              onUpdateAppointmentStatus={handleUpdateAppointmentStatus}
              onDeleteAppointment={(id) => {
                if (!currentUser.permissions.canManageAppointments) {
                  alert('No cuenta con privilegios de agenda.');
                  return;
                }
                removeAppointmentFromFirestore(id);
              }}
          />
        );

      case 'telemedicine': {
        const isProfessionalRole = currentUser.role === 'odontologist' || currentUser.role === 'specialist';
        const isTelemedicineEnabledForUser = !isProfessionalRole || professionals.some(p => {
          const cleanString = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
          const matchLicense = currentUser.license && p.license && currentUser.license.trim() === p.license.trim();
          const matchName = cleanString(currentUser.fullName).includes(cleanString(p.name)) || cleanString(p.name).includes(cleanString(currentUser.fullName));
          return (matchLicense || matchName) && p.telemedicineEnabled;
        });

        if (!clinicSettings.telemedicineModuleActive || !isTelemedicineEnabledForUser) {
          setView('calendar');
          return null;
        }
        return (
          <Telemedicine 
            appointments={appointments}
            patients={patients}
            professionals={professionals}
            currentUser={currentUser}
            onAddAppointment={(data) => {
              const mockApt: Appointment = {
                id: Date.now(),
                patientId: data.patientId,
                professionalId: data.professionalId,
                date: data.date,
                time: data.time,
                reason: data.reason,
                status: 'scheduled',
                patientName: (() => {
                  const p = patients.find(pat => pat.id === data.patientId);
                  return p ? `${p.name} ${p.lastName}` : 'Paciente';
                })(),
                centerId: currentCenterId || undefined,
                createdBy: currentUser ? (currentUser.fullName || currentUser.username) : 'Sistema',
                telemedicine: true,
                jitsiRoomUrl: data.jitsiRoomUrl
              };
              saveAppointmentToFirestore(mockApt);
            }}
            onUpdateAppointmentStatus={handleUpdateAppointmentStatus}
            onDeleteAppointment={(id) => {
              removeAppointmentFromFirestore(id);
            }}
            onUpdatePatient={handleUpdatePatient}
          />
        );
      }

      case 'patient_list':
      default:
        return <PatientList patients={patients} onSelectPatient={handleSelectPatient} onAddPatient={handleOpenNewPatientModal} canEditPatients={currentUser.permissions.canEditPatients} appointments={appointments} professionals={professionals} viewMode={patientViewMode} />;
    }
  };

  // If we are in embed mode, show the standalone patient-facing chatbot widget immediately
  if (isEmbedMode) {
    return (
      <div className="h-screen w-screen flex flex-col bg-[#efeae2] dark:bg-slate-950 overflow-hidden">
        <style dangerouslySetInnerHTML={{ __html: skinStyles }} />
        <StandaloneChatbot />
      </div>
    );
  }

  // If no user is logged in, show the Login screen
  if (!currentUser) {
    return <Login centers={centers} onLogin={handleLogin} users={users} patients={patients} />;
  }

  // Master Root Console View overrides everything for global managers
  if (currentUser.role === 'master') {
    return (
      <MasterBackoffice
        currentUser={currentUser}
        centers={centers}
        onUpdateCenters={(updatedCenters) => {
          // Instantly update local state and cache
          setCenters(updatedCenters);
          localStorage.setItem('clinic_centers', JSON.stringify(updatedCenters));

          // 1. Identify deleted centers
          const deleted = centers.filter(c => !updatedCenters.some(uc => uc.id === c.id));
          deleted.forEach(c => {
            console.log("Firestore sync: Deleting center", c.id);
            deleteCenterFromFirestore(c.id);
          });
          
          // 2. Identify new or modified centers
          const modifiedOrNew = updatedCenters.filter(uc => {
            const original = centers.find(c => c.id === uc.id);
            if (!original) return true; // New center
            return (
              original.name !== uc.name ||
              original.address !== uc.address ||
              original.phone !== uc.phone ||
              original.cuil !== uc.cuil ||
              original.active !== uc.active ||
              original.loginBannerDesktop !== uc.loginBannerDesktop ||
              original.loginBannerMobile !== uc.loginBannerMobile ||
              original.logo !== uc.logo
            );
          });

          modifiedOrNew.forEach(c => {
            console.log("Firestore sync: Saving/updating center", c.id);
            saveCenterToFirestore(c);
          });
        }}
        users={users}
        onUpdateUsers={(updatedUsers) => {
          // Instantly update local state and cache
          setUsers(updatedUsers);
          localStorage.setItem('clinic_users', JSON.stringify(updatedUsers));

          // 1. Identify deleted users
          const deleted = users.filter(u => !updatedUsers.some(uu => uu.id === u.id));
          deleted.forEach(u => {
            console.log("Firestore sync: Deleting user", u.id);
            deleteUserFromFirestore(u.id);
          });

          // 2. Identify new or modified users
          const modifiedOrNew = updatedUsers.filter(uu => {
            const original = users.find(u => u.id === uu.id);
            if (!original) return true; // New user
            return (
              original.username !== uu.username ||
              original.password !== uu.password ||
              original.fullName !== uu.fullName ||
              original.role !== uu.role ||
              original.active !== uu.active ||
              original.centerId !== uu.centerId ||
              original.license !== uu.license ||
              JSON.stringify(original.permissions) !== JSON.stringify(uu.permissions)
            );
          });

          modifiedOrNew.forEach(u => {
            console.log("Firestore sync: Saving/updating user", u.id);
            saveUserToFirestore(u);
          });
        }}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className={`h-screen bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 transition-colors duration-200 flex ${menuLayout === 'topnav' ? 'flex-col' : 'flex-row'}`}>
      <style dangerouslySetInnerHTML={{ __html: skinStyles }} />

      <Sidebar 
        view={view} 
        setView={setView} 
        currentUser={currentUser} 
        onLogout={handleLogout} 
        clinicLogo={clinicSettings.logo}
        clinicName={clinicSettings.name}
        telemedicineActive={clinicSettings.telemedicineModuleActive}
        professionals={professionals}
        layout={menuLayout}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        {menuLayout === 'topnav' ? (
          /* Mini Secondary header for topnav with breadcrumb-like page title and controls */
          <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700/60 p-2 sm:p-2.5 h-11 flex justify-between items-center z-10 px-3 sm:px-6">
            <div className="flex items-center min-w-0 gap-1.5">
              <span className="text-[10px] bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 py-0.5 px-2 rounded font-extrabold uppercase tracking-wide">Página</span>
              <span className="text-slate-350 dark:text-slate-650">/</span>
              <h2 className="text-[10.5px] font-bold text-slate-700 dark:text-slate-300 truncate uppercase mt-0.5 font-sans leading-none">
                {view === 'patient_list' && '📁 Directorio de Pacientes'}
                {view === 'patient_detail' && '📋 Expediente Médico'}
                {view === 'clinical_history_search' && '🔍 Historias Clínicas'}
                {view === 'billing' && '💵 Facturación y Caja'}
                {view === 'dashboard' && '📊 Reportes Analíticos'}
                {view === 'settings' && '⚙️ Configuración y Especialistas'}
                {view === 'calendar' && '📅 Agenda de la Clínica'}
                {view === 'backoffice' && '👥 Panel de Usuarios'}
                {view === 'master_backoffice' && '🛡️ Consola Global Master'}
                {view === 'price_list' && '🏷️ Aranceles y Prácticas'}
                {view === 'telemedicine' && '💻 Telemedicina del Centro'}
                {view === 'whatsapp_bot' && '🤖 Bot de WhatsApp y Recordatorios'}
              </h2>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsCustomizeModalOpen(true)}
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-500 dark:text-slate-300 cursor-pointer"
                title="Personalizar Skin y Vistas"
              >
                <PaintbrushIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer text-slate-500 dark:text-slate-300"
              >
                {isDarkMode ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
              </button>
            </div>
          </div>
        ) : (
          /* Sidebar standard layout header with titles and actions */
          <header className="bg-white dark:bg-slate-800 shadow-md p-2.5 sm:p-4 h-14 flex justify-between items-center z-10 font-sans border-b border-slate-150 dark:border-slate-700/40">
            <div className="flex items-center min-w-0 gap-2">
              <h1 className="text-xs sm:text-sm uppercase tracking-wider font-bold text-slate-700 dark:text-slate-200 truncate font-sans">
                {view === 'patient_list' && '📁 DIRECTORIO DE PACIENTES'}
                {view === 'patient_detail' && '📋 EXPEDIENTE MÉDICO DEL PACIENTE'}
                {view === 'clinical_history_search' && '🔍 BUSCADOR DE HISTORIAS CLÍNICAS'}
                {view === 'billing' && '💵 FACTURACIÓN, CAJA Y RECIBOS'}
                {view === 'dashboard' && '📊 TABLERO ANALÍTICO Y REPORTES'}
                {view === 'settings' && '⚙️ CONFIGURACIÓN Y ESPECIALISTAS'}
                {view === 'calendar' && '📅 AGENDA DE ESPECIALISTAS Y TURNOS'}
                {view === 'backoffice' && '👥 PANEL DE CONTROL DE USUARIOS'}
                {view === 'master_backoffice' && '🛡️ CONSOLA MASTER DE ADMINISTRACIÓN'}
                {view === 'price_list' && '🏷️ ARANCELES Y PRÁCTICAS'}
                {view === 'telemedicine' && '💻 TURNERA DE TELEMEDICINA Y VIDEOCONSULTAS'}
                {view === 'whatsapp_bot' && '🤖 CHATBOT INTELIGENTE Y RECORDATORIOS DE WHATSAPP'}
              </h1>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsCustomizeModalOpen(true)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-500 dark:text-slate-300 cursor-pointer"
                title="Personalizar Skin y Vistas"
              >
                <PaintbrushIcon className="w-4.5 h-4.5" />
              </button>
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer text-slate-500 dark:text-slate-300"
              >
                {isDarkMode ? <SunIcon className="w-4.5 h-4.5" /> : <MoonIcon className="w-4.5 h-4.5" />}
              </button>
            </div>
          </header>
        )}

        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            {renderView()}
        </div>
      </main>

      {/* APPARÈNCE / CUSTOM SKIN AND VIEWS MODAL */}
      <Modal
        isOpen={isCustomizeModalOpen}
        onClose={() => setIsCustomizeModalOpen(false)}
        title="🎨 Personalizar Apariencia y Vistas"
      >
        <div className="space-y-6 py-2 px-1 font-sans">
          
          {/* SECCIÓN 1: SELECCIÓN DE SKIN COLOR */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Seleccione el Skin / Paleta de Color
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { id: 'emerald', name: 'Esmeralda Dental', color: '#0d9488', desc: 'Clásico de salud' },
                { id: 'blue', name: 'Azul Clínico', color: '#2563eb', desc: 'Elegante y formal' },
                { id: 'violet', name: 'Violeta Lavanda', color: '#7c3aed', desc: 'Moderno y estético' },
                { id: 'rose', name: 'Rosa Fucsia', color: '#db2777', desc: 'Kinesiología y estética' },
                { id: 'amber', name: 'Dorado Premium', color: '#d97706', desc: 'Cálido y exclusivo' },
                { id: 'slate', name: 'Slate Carbono', color: '#475569', desc: 'Minimalista neutro' }
              ].map(skin => (
                <button
                  key={skin.id}
                  onClick={() => {
                    setColorSkin(skin.id);
                    localStorage.setItem('clinic_color_skin', skin.id);
                  }}
                  className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all cursor-pointer text-left ${
                    colorSkin === skin.id
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-slate-150 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-700/35 bg-white dark:bg-slate-800'
                  }`}
                >
                  <span 
                    className="w-5 h-5 rounded-full mb-2 border border-black/10 flex-shrink-0" 
                    style={{ backgroundColor: skin.color }} 
                  />
                  <span className="text-xs font-bold text-slate-850 dark:text-white text-center leading-snug">{skin.name}</span>
                  <span className="text-[9px] text-slate-450 dark:text-slate-400 mt-1 text-center font-medium">{skin.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* SECCIÓN 2: LAYOUT DE MENÚ DE NAVEGACIÓN */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
              Distribución del Menú Principal
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { 
                  id: 'sidebar', 
                  title: 'Panel Lateral (Sidebar)', 
                  desc: 'Menú tradicional a la izquierda ideal para pantallas grandes.',
                  icon: (
                    <div className="flex h-10 w-16 border border-slate-350 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-900 overflow-hidden">
                      <div className="w-4 bg-slate-200 dark:bg-slate-700 border-r border-slate-300 dark:border-slate-600" />
                      <div className="flex-1 bg-white dark:bg-slate-850" />
                    </div>
                  )
                },
                { 
                  id: 'topnav', 
                  title: 'Navegación Superior (Top Nav)', 
                  desc: 'Menu horizontal minimalista que despeja los laterales para mayor amplitud.',
                  icon: (
                    <div className="flex flex-col h-10 w-16 border border-slate-350 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-900 overflow-hidden font-sans">
                      <div className="h-2.5 bg-slate-200 dark:bg-slate-700 border-b border-slate-300 dark:border-slate-600" />
                      <div className="flex-1 bg-white dark:bg-slate-850" />
                    </div>
                  )
                }
              ].map(layoutOpt => (
                <button
                  key={layoutOpt.id}
                  onClick={() => {
                    setMenuLayout(layoutOpt.id as 'sidebar' | 'topnav');
                    localStorage.setItem('clinic_menu_layout', layoutOpt.id);
                  }}
                  className={`flex items-start p-3 rounded-xl border-2 gap-3 text-left transition-all cursor-pointer ${
                    menuLayout === layoutOpt.id
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-slate-150 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-705 bg-white dark:bg-slate-800'
                  }`}
                >
                  <div className="flex-shrink-0 mt-0.5">{layoutOpt.icon}</div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-850 dark:text-white">{layoutOpt.title}</h4>
                    <p className="text-[10px] text-slate-450 dark:text-slate-400 mt-0.5 leading-snug">{layoutOpt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* SECCIÓN 3: VISTA DE FICHAS DE PACIENTES */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
              Estilo de Vista (Pacientes)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { 
                  id: 'grid', 
                  title: 'Grilla Bento (Grid de Tarjetas)', 
                  desc: 'Visualiza fotos de perfil grandes, ficha rápida y datos de contacto de manera visual.',
                  icon: "🗂️"
                },
                { 
                  id: 'table', 
                  title: 'Lista Compacta (Tabla de Control)', 
                  desc: 'Formato tabular de alta densidad ideal para secretaría o recepción rápida.',
                  icon: "📊"
                }
              ].map(viewOpt => (
                <button
                  key={viewOpt.id}
                  onClick={() => {
                    setPatientViewMode(viewOpt.id as 'grid' | 'table');
                    localStorage.setItem('clinic_patient_view_mode', viewOpt.id);
                  }}
                  className={`flex items-start p-3 rounded-xl border-2 gap-3 text-left transition-all cursor-pointer ${
                    patientViewMode === viewOpt.id
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-slate-150 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-705 bg-white dark:bg-slate-800'
                  }`}
                >
                  <span className="text-xl flex-shrink-0 mt-0.5">{viewOpt.icon}</span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-850 dark:text-white">{viewOpt.title}</h4>
                    <p className="text-[10px] text-slate-450 dark:text-slate-400 mt-0.5 leading-snug">{viewOpt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-700/40 p-3 rounded-lg flex items-center justify-between gap-2 mt-4 text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
            <span>⚙️ Los cambios se aplican de forma inmediata y se recordarán en este dispositivo.</span>
            <button
              onClick={() => setIsCustomizeModalOpen(false)}
              className="bg-primary hover:bg-primary-600 text-white font-bold py-1.5 px-3 rounded text-xs transition cursor-pointer flex-shrink-0"
            >
              Entendido
            </button>
          </div>

        </div>
      </Modal>

      <Modal
        isOpen={isPatientModalOpen}
        onClose={handleClosePatientModal}
        title={patientToEdit ? "Editar Paciente" : "Nuevo Paciente"}
      >
        <PatientForm
            patient={patientToEdit}
            onSave={handleSavePatient}
            onCancel={handleClosePatientModal}
            onOpenCameraModal={handleOpenCameraModal}
            newAvatarFromCamera={newAvatarFromCamera}
        />
      </Modal>

      <Modal
        isOpen={isAppointmentModalOpen}
        onClose={() => {
          setIsAppointmentModalOpen(false);
          setPrefilledApt(null);
        }}
        title="Agendar Nueva Cita"
       >
         <AppointmentForm 
            patients={patients} 
            professionals={professionals}
            onSave={handleSaveAppointment}
            onCancel={() => {
              setIsAppointmentModalOpen(false);
              setPrefilledApt(null);
            }}
            prefilledData={prefilledApt}
            onAddPatient={handleOpenNewPatientModal}
        />
       </Modal>
       
       <CameraModal 
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={handlePhotoCapture}
       />
    </div>
  );
};

export default App;
