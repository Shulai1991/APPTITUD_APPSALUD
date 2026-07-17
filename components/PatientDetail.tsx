
import React, { useState, useRef } from 'react';
import type { Patient, ClinicalHistoryEntry, Invoice, Prescription, ClinicSettings, User, Appointment, AppointmentStatus, Professional, Certificate } from '../types';
import Odontogram from './Odontogram';
import Modal from './Modal';
import InvoiceCreator from './InvoiceCreator';
import PrescriptionCreator from './PrescriptionCreator';
import ClinicalHistoryForm from './ClinicalHistoryForm';
import CertificateCreator from './CertificateCreator';
import { UserIcon, ClipboardDocumentListIcon, DocumentPlusIcon, CurrencyDollarIcon, PencilSquareIcon, PhoneIcon, EnvelopeIcon, CakeIcon, ArrowDownTrayIcon, PaperAirplaneIcon, PlusIcon, XMarkIcon, DocumentArrowDownIcon, CalendarDaysIcon, DocumentTextIcon } from './icons';

declare global {
    interface Window {
        jspdf: any;
    }
}

interface PatientDetailProps {
  patient: Patient;
  onUpdatePatient: (patient: Patient) => void;
  onEditPatient: (patient: Patient) => void;
  clinicSettings: ClinicSettings;
  currentUser?: User;
  appointments: Appointment[];
  professionals: Professional[];
  onUpdateAppointmentStatus: (appointmentId: number, status: AppointmentStatus, cancellationReason?: string) => void;
}

type Tab = 'history' | 'odontogram' | 'billing' | 'prescription' | 'appointments' | 'certificates';

const PatientDetail: React.FC<PatientDetailProps> = ({ 
  patient, 
  onUpdatePatient, 
  onEditPatient, 
  clinicSettings, 
  currentUser,
  appointments = [],
  professionals = [],
  onUpdateAppointmentStatus
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('history');
  const [isInvoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [isPrescriptionModalOpen, setPrescriptionModalOpen] = useState(false);
  const [isHistoryModalOpen, setHistoryModalOpen] = useState(false);
  const [isCertificateModalOpen, setCertificateModalOpen] = useState(false);
  const [editingHistoryEntry, setEditingHistoryEntry] = useState<ClinicalHistoryEntry | null>(null);
  const [cancellingDetailAptId, setCancellingDetailAptId] = useState<number | null>(null);
  const [detailCancellationReason, setDetailCancellationReason] = useState('');
  const [appointmentFilter, setAppointmentFilter] = useState<'all' | 'present' | 'scheduled' | 'absent_or_cancelled'>('all');
  const [selectedConsentEntry, setSelectedConsentEntry] = useState<ClinicalHistoryEntry | null>(null);
  const [deletingConsentEntry, setDeletingConsentEntry] = useState<ClinicalHistoryEntry | null>(null);
  const [deletionReason, setDeletionReason] = useState('');
  
  // States and handlers for partial payments/señas
  const [detailPayInvoice, setDetailPayInvoice] = useState<Invoice | null>(null);
  const [detailPayAmount, setDetailPayAmount] = useState('');
  const [detailPayMethod, setDetailPayMethod] = useState<'efectivo' | 'transferencia' | 'qr' | 'tarjeta' | 'otro'>('efectivo');
  const [detailTransactionNo, setDetailTransactionNo] = useState('');
  const [detailPayDate, setDetailPayDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [detailPayTime, setDetailPayTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });

  const handleSaveDetailPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailPayInvoice) return;

    const amount = parseFloat(detailPayAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Por favor ingrese un monto válido.');
      return;
    }

    const newPayment: InvoicePayment = {
      amount,
      method: detailPayMethod,
      transactionNumber: detailTransactionNo ? detailTransactionNo : undefined,
      date: detailPayDate,
      time: detailPayTime,
    };

    const currentPayments = detailPayInvoice.payments || [];
    
    // Compatibility for legacy paid invoices without payments list
    if (currentPayments.length === 0 && detailPayInvoice.status === 'paid') {
      currentPayments.push({
        amount: detailPayInvoice.total,
        method: 'efectivo',
        date: detailPayInvoice.date,
        time: '12:00',
        transactionNumber: 'PREV-PAGO'
      });
    }

    const updatedPayments = [...currentPayments, newPayment];
    const totalPaymentsSum = updatedPayments.reduce((sum, p) => sum + p.amount, 0);

    let newStatus: 'paid' | 'pending' | 'partial' = 'pending';
    if (totalPaymentsSum >= detailPayInvoice.total) {
      newStatus = 'paid';
    } else if (totalPaymentsSum > 0) {
      newStatus = 'partial';
    }

    const updatedInvoice: Invoice = {
      ...detailPayInvoice,
      status: newStatus,
      payments: updatedPayments,
    };

    const updatedInvoices = patient.invoices.map(inv => inv.id === detailPayInvoice.id ? updatedInvoice : inv);
    const updatedPatient: Patient = {
      ...patient,
      invoices: updatedInvoices,
    };

    onUpdatePatient(updatedPatient);
    setDetailPayInvoice(null);
    setDetailPayAmount('');
    setDetailPayMethod('efectivo');
    setDetailTransactionNo('');
  };

  const openDetailPaymentModal = (invoice: Invoice) => {
    const currentPayments = invoice.payments || [];
    const sumPaid = currentPayments.reduce((sum, p) => sum + p.amount, 0);
    const balance = Math.max(0, invoice.total - sumPaid);

    setDetailPayInvoice(invoice);
    setDetailPayAmount(balance.toFixed(2));
    setDetailPayMethod('efectivo');
    setDetailTransactionNo('');
    setDetailPayDate(new Date().toISOString().split('T')[0]);
    const now = new Date();
    setDetailPayTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleConfirmDeleteConsent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletingConsentEntry) return;
    if (!deletionReason.trim()) {
      alert("Por favor ingrese el motivo por el cual elimina este consentimiento.");
      return;
    }

    const stampDate = new Date().toLocaleDateString('es-AR') + ' ' + new Date().toLocaleTimeString('es-AR');

    const updatedHistory = patient.clinicalHistory.map((entry) => {
      if (entry.isConsent && entry.signatureTimestamp === deletingConsentEntry.signatureTimestamp) {
        return {
          ...entry,
          isConsentDeleted: true,
          consentDeletionReason: deletionReason,
          consentDeletionTimestamp: stampDate,
        };
      }
      return entry;
    });

    onUpdatePatient({
      ...patient,
      clinicalHistory: updatedHistory,
    });

    setDeletingConsentEntry(null);
    setDeletionReason('');
    alert("El consentimiento informado ha sido eliminado de forma electrónica con el motivo indicado.");
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const newEntry: ClinicalHistoryEntry = {
        date: new Date().toISOString().split('T')[0],
        description: `Archivo adjunto: ${file.name}`,
        file: { name: file.name, url: URL.createObjectURL(file) },
      };
      const updatedPatient = {
        ...patient,
        clinicalHistory: [newEntry, ...patient.clinicalHistory],
      };
      onUpdatePatient(updatedPatient);
    }
  };
  
  const handleAddInvoice = (newInvoice: Omit<Invoice, 'id'>) => {
    const updatedPatient: Patient = {
        ...patient,
        invoices: [{ ...newInvoice, id: Date.now() }, ...patient.invoices]
    };
    onUpdatePatient(updatedPatient);
    setInvoiceModalOpen(false);
  };
  
  const handleAddPrescription = (newPrescription: Omit<Prescription, 'id'>) => {
      const updatedPatient: Patient = {
        ...patient,
        prescriptions: [{...newPrescription, id: Date.now()}, ...patient.prescriptions]
      };
      onUpdatePatient(updatedPatient);
      setPrescriptionModalOpen(false);
  };

  const handleAddHistoryEntry = (newEntry: Omit<ClinicalHistoryEntry, 'file'>) => {
    let updatedHistory;
    if (newEntry.id) {
      // It's an edit!
      updatedHistory = patient.clinicalHistory.map(entry => {
        if (entry.id === newEntry.id) {
          return { ...entry, ...newEntry };
        }
        return entry;
      });
    } else {
      // New entry (generate a timestamp ID)
      const entryWithId = { ...newEntry, id: Date.now() };
      updatedHistory = [entryWithId, ...patient.clinicalHistory];
    }

    const updatedPatient = {
        ...patient,
        clinicalHistory: updatedHistory,
    };
    onUpdatePatient(updatedPatient);
    setHistoryModalOpen(false);
    setEditingHistoryEntry(null);
  };

  const handleToggleInvoiceStatus = (invoiceId: number) => {
    const updatedInvoices = patient.invoices.map(inv => {
        if (inv.id === invoiceId) {
            return { ...inv, status: inv.status === 'pending' ? 'paid' : 'pending' };
        }
        return inv;
    });
    const updatedPatient = {
        ...patient,
        invoices: updatedInvoices
    };
    onUpdatePatient(updatedPatient);
  };
  
  const generateInvoicePdf = (invoice: Invoice) => {
    if (!window.jspdf) {
      alert("La librería para generar PDF no está cargada.");
      return null;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const pageW = doc.internal.pageSize.getWidth();
    const margin = 15;

    // 1. Clinic Logo & Info
    if (clinicSettings.logo) {
      try {
        let logoW = 40;
        let logoH = 20;
        let logoY = 10;
        try {
          const imgProps = doc.getImageProperties(clinicSettings.logo);
          const ratio = imgProps.width / imgProps.height;
          // Bounding box: maxWidth = 50, maxHeight = 24
          const maxWidth = 50;
          const maxHeight = 24;
          if (ratio > maxWidth / maxHeight) {
            logoW = maxWidth;
            logoH = maxWidth / ratio;
          } else {
            logoH = maxHeight;
            logoW = maxHeight * ratio;
          }
          // Center vertically in the space between y=8 and y=36
          logoY = 8 + (28 - logoH) / 2;
        } catch (propsError) {
          console.warn("Could not read logo image properties, using default ratio", propsError);
        }
        doc.addImage(clinicSettings.logo, 'PNG', margin, logoY, logoW, logoH);
      } catch (e) {
        console.error("Error al agregar el logo al PDF", e);
      }
    }
    doc.setFontSize(18);
    doc.text(clinicSettings.name, pageW - margin, 15, { align: 'right' });
    doc.setFontSize(10);
    doc.text(clinicSettings.address, pageW - margin, 22, { align: 'right' });
    doc.text(`Tel: ${clinicSettings.phone}`, pageW - margin, 27, { align: 'right' });
    doc.text(`CUIL: ${clinicSettings.cuil}`, pageW - margin, 32, { align: 'right' });
    doc.line(margin, 40, pageW - margin, 40);

    // 2. Invoice Title & Patient Info
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(`FACTURA #${invoice.id}`, margin, 55);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Facturar a:', margin, 65);
    doc.setFont('helvetica', 'bold');
    doc.text(`${patient.name} ${patient.lastName}`, margin, 70);
    doc.setFont('helvetica', 'normal');
    doc.text(`DNI: ${patient.dni}`, margin, 75);

    doc.text('Fecha:', pageW - margin - 30, 65);
    doc.setFont('helvetica', 'bold');
    doc.text(invoice.date, pageW - margin, 65, { align: 'right' });
    doc.line(margin, 85, pageW - margin, 85);

    // 3. Items Table (manual)
    let y = 95;
    // Header
    doc.setFont('helvetica', 'bold');
    doc.text('Descripción', margin, y);
    doc.text('Cant.', pageW - margin - 50, y);
    doc.text('Precio Unit.', pageW - margin - 25, y);
    doc.text('Total', pageW - margin, y, { align: 'right' });
    y += 7;
    doc.setFont('helvetica', 'normal');
    // Rows
    invoice.items.forEach(item => {
      doc.text(item.description, margin, y);
      doc.text(item.quantity.toString(), pageW - margin - 50, y);
      doc.text(`$${item.price.toFixed(2)}`, pageW - margin - 25, y);
      doc.text(`$${(item.quantity * item.price).toFixed(2)}`, pageW - margin, y, { align: 'right' });
      y += 7;
    });

    // 4. Total & Payments
    y += 10;
    doc.line(pageW / 2, y, pageW - margin, y);
    y += 7;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Total Facturado:', pageW - margin - 60, y);
    doc.text(`$${invoice.total.toFixed(2)}`, pageW - margin, y, { align: 'right' });
    y += 7;

    const currentPayments = invoice.payments || [];
    if (currentPayments.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Historial de Pagos / Señas:', margin, y);
      y += 5;
      
      currentPayments.forEach((p, idx) => {
        doc.setFontSize(9);
        doc.text(`${p.date} - ${p.method.toUpperCase()} ${p.transactionNumber ? `(Ref. #${p.transactionNumber})` : ''}`, margin + 5, y);
        doc.text(`$${p.amount.toFixed(2)}`, pageW - margin, y, { align: 'right' });
        y += 5;
      });

      y += 5;
      const totalPaidSum = currentPayments.reduce((sum, p) => sum + p.amount, 0);
      const remainingBalance = Math.max(0, invoice.total - totalPaidSum);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Total Cobrado:', pageW - margin - 60, y);
      doc.text(`$${totalPaidSum.toFixed(2)}`, pageW - margin, y, { align: 'right' });
      y += 6;
      doc.text('Saldo Restante:', pageW - margin - 60, y);
      doc.text(`$${remainingBalance.toFixed(2)}`, pageW - margin, y, { align: 'right' });
    } else if (invoice.status === 'paid') {
      // Legacy paid status backward compatibility
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Estado de Pago: SALDADO / PAGADO', pageW - margin - 90, y);
    } else {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Estado de Pago: PENDIENTE', pageW - margin - 90, y);
    }
    
    return doc;
  };

  const handleDownloadInvoice = (invoice: Invoice) => {
    const doc = generateInvoicePdf(invoice);
    if (doc) {
      doc.save(`Factura-${invoice.id}-${patient.lastName}.pdf`);
    }
  };

  const handleWhatsAppInvoice = (invoice: Invoice) => {
    const itemsList = invoice.items.map(item => `• ${item.description} (x${item.quantity}) - $${item.price.toFixed(2)}`).join('\n');
    const paymentStatusText = invoice.status === 'paid' ? 'Pagado ✅' : 'Pendiente de Pago ⏳';
    const message = `Estimado/a *${patient.name} ${patient.lastName}*,\n\nLe enviamos el detalle de su *Factura #${invoice.id}* emitida por *${clinicSettings.name}*.\n\n📅 *Fecha:* ${invoice.date}\n💵 *Monto Total:* $${invoice.total.toFixed(2)}\n📌 *Estado de Pago:* ${paymentStatusText}\n\n*Detalle de conceptos:*\n${itemsList}\n\nPor favor, descargue su factura oficial en formato PDF y responda a este mensaje ante cualquier consulta.\n\nMuchas gracias por confiar en nosotros.\n*${clinicSettings.name}*`;
    
    const cleanPhone = patient.phone.replace(/[^0-9]/g, '');
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
    
    const link = document.createElement('a');
    link.href = whatsappUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    alert("Se abrirá WhatsApp para enviar los detalles de la factura. Primero descargue el PDF con el botón de descarga si desea adjuntarlo en el chat.");
  };

  const generateCertificatePdf = (cert: Certificate) => {
    if (!window.jspdf) {
      alert("La librería para generar PDF no está cargada.");
      return null;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const pageW = doc.internal.pageSize.getWidth();
    const margin = 20;

    // 1. Clinic Logo & Info
    if (clinicSettings.logo) {
      try {
        let logoW = 35;
        let logoH = 17.5;
        let logoY = 15;
        try {
          const imgProps = doc.getImageProperties(clinicSettings.logo);
          const ratio = imgProps.width / imgProps.height;
          // Bounding box: maxWidth = 48, maxHeight = 23
          const maxWidth = 48;
          const maxHeight = 23;
          if (ratio > maxWidth / maxHeight) {
            logoW = maxWidth;
            logoH = maxWidth / ratio;
          } else {
            logoH = maxHeight;
            logoW = maxHeight * ratio;
          }
          // Center vertically in the space between y=10 and y=36
          logoY = 10 + (26 - logoH) / 2;
        } catch (propsError) {
          console.warn("Could not read logo image properties, using default ratio", propsError);
        }
        doc.addImage(clinicSettings.logo, 'PNG', margin, logoY, logoW, logoH);
      } catch (e) {
        console.error("Error al agregar el logo al PDF", e);
      }
    }
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(clinicSettings.name, pageW - margin, 20, { align: 'right' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(clinicSettings.address, pageW - margin, 25, { align: 'right' });
    doc.text(`Tel: ${clinicSettings.phone}`, pageW - margin, 29, { align: 'right' });
    doc.text(`CUIL: ${clinicSettings.cuil}`, pageW - margin, 33, { align: 'right' });
    doc.line(margin, 38, pageW - margin, 38);

    // 2. Certificate Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('CONSTANCIA DE ATENCIÓN MÉDICA', pageW / 2, 55, { align: 'center' });

    // 3. Certificate Body Content
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    let textY = 70;
    
    const introText = `Por la presente se deja constancia de que el/la paciente ${patient.name} ${patient.lastName}, con DNI ${patient.dni}, fue asistido/a en nuestro centro médico el día ${cert.date.split('-').reverse().join('/')} a las ${cert.time} hs.`;
    const splitIntro = doc.splitTextToSize(introText, pageW - (margin * 2));
    doc.text(splitIntro, margin, textY);
    textY += splitIntro.length * 6 + 10;

    doc.setFont('helvetica', 'bold');
    doc.text('Diagnóstico y observaciones clínicas:', margin, textY);
    textY += 6;
    doc.setFont('helvetica', 'normal');
    const splitDiag = doc.splitTextToSize(cert.diagnosis, pageW - (margin * 2));
    doc.text(splitDiag, margin, textY);
    textY += splitDiag.length * 6 + 12;

    if (cert.restDays) {
      doc.setFont('helvetica', 'bold');
      doc.text(`Recomendación médica: Se indica reposo físico por el término de ${cert.restDays} días a partir de la fecha de atención.`, margin, textY);
      textY += 15;
    }

    doc.setFontSize(10);
    doc.text('Para ser presentado ante quien corresponda.', margin, textY);
    
    // 4. Professional Signature Box at bottom
    let sigY = 160;
    doc.line(pageW - margin - 70, sigY, pageW - margin, sigY);
    doc.setFont('helvetica', 'bold');
    doc.text(`Dr/a. ${cert.professionalName}`, pageW - margin - 35, sigY + 5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text(`${cert.professionalLicense || 'M.P. No informada'}`, pageW - margin - 35, sigY + 10, { align: 'center' });
    doc.text('Firma y Sello Profesional', pageW - margin - 35, sigY + 15, { align: 'center' });

    return doc;
  };

  const handleDownloadCertificate = (cert: Certificate) => {
    const doc = generateCertificatePdf(cert);
    if (doc) {
      doc.save(`Constancia-Medica-${patient.lastName}-${cert.date}.pdf`);
    }
  };

  const handleAddCertificate = (newCertificate: Omit<Certificate, 'id'>) => {
    const updatedPatient: Patient = {
      ...patient,
      certificates: [{ ...newCertificate, id: Date.now() }, ...(patient.certificates || [])],
    };
    onUpdatePatient(updatedPatient);
    setCertificateModalOpen(false);
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = (currentUser?.role === 'patient') ? [
    { id: 'history', label: 'Historia Clínica', icon: <ClipboardDocumentListIcon /> },
    { id: 'certificates', label: 'Constancias', icon: <DocumentTextIcon /> }
  ] : [
    { id: 'history', label: 'Historia Clínica', icon: <ClipboardDocumentListIcon /> },
    { id: 'odontogram', label: 'Odontograma', icon: <UserIcon /> },
    { id: 'certificates', label: 'Constancias', icon: <DocumentTextIcon /> },
    { id: 'appointments', label: 'Historial de Turnos', icon: <CalendarDaysIcon /> },
    { id: 'prescription', label: 'Recetas', icon: <PencilSquareIcon /> },
  ];

  return (
    <div className="animate-fade-in space-y-4">
      <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-sm border border-slate-150 dark:border-slate-700/80 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left space-y-3 sm:space-y-0 sm:space-x-4">
            <img src={patient.avatarUrl} alt="Patient Avatar" className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full border-4 border-primary-200 object-cover flex-shrink-0" />
            <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-2xl md:text-3xl font-bold text-slate-800 dark:text-white truncate">{patient.name} {patient.lastName}</h2>
                <div className="mt-1.5 grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-350 font-sans">
                    <div className="flex items-center justify-center sm:justify-start space-x-1.5 truncate">
                      <UserIcon className="w-4 h-4 text-primary flex-shrink-0"/>
                      <span>DNI: {patient.dni}</span>
                    </div>
                    <div className="flex items-center justify-center sm:justify-start space-x-1.5 truncate"><PhoneIcon className="w-4 h-4 text-primary flex-shrink-0"/><span>{patient.phone}</span></div>
                    {patient.email && <div className="flex items-center justify-center sm:justify-start space-x-1.5 truncate"><EnvelopeIcon className="w-4 h-4 text-primary flex-shrink-0"/><span>{patient.email}</span></div>}
                    {patient.address && (
                      <div className="flex items-center justify-center sm:justify-start space-x-1.5 truncate">
                        <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>{patient.address}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-center sm:justify-start space-x-1.5 col-span-1 xs:col-span-2 lg:col-span-3 truncate"><ClipboardDocumentListIcon className="w-4 h-4 text-primary flex-shrink-0"/><span>{patient.healthInsurance} ({patient.insuranceId})</span></div>
                </div>
            </div>
        </div>
         {currentUser?.role !== 'patient' && (
           <button onClick={() => onEditPatient(patient)} className="flex-shrink-0 flex items-center space-x-1 text-xs bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold py-1.5 px-3 rounded-lg transition-colors cursor-pointer w-full sm:w-auto justify-center">
              <PencilSquareIcon className="w-3.5 h-3.5" /><span>Editar Ficha</span>
          </button>
         )}
      </div>

      <div>
        <div className="border-b border-slate-200 dark:border-slate-700 overflow-x-auto scrollbar-none scroll-smooth">
          <nav className="-mb-px flex space-x-3 sm:space-x-6 min-w-max pb-0.5" aria-label="Tabs">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-primary text-primary font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200'
                } whitespace-nowrap py-3 px-1 border-b-2 text-xs sm:text-sm flex items-center space-x-1.5 transition-colors cursor-pointer`}
              >
                {React.cloneElement(tab.icon, { className: 'w-4 h-4 flex-shrink-0' })}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-6">
          {activeTab === 'history' && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md space-y-6">
              {currentUser?.permissions.canViewClinicalHistory === false ? (
                <div className="py-12 text-center space-y-4">
                  <div className="mx-auto w-16 h-16 rounded-full bg-red-50 dark:bg-red-950/20 flex items-center justify-center text-red-500 text-2xl">
                    🔒
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">Acceso Médico Restringido</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto px-4">
                      Su cuenta (rol: <strong className="uppercase font-bold">{currentUser.role}</strong>) no posee permisos especiales para visualizar o modificar la historia clínica confidencial de este paciente.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center pb-4 border-b border-slate-150 dark:border-slate-700">
                    <h3 className="text-xl font-semibold text-slate-800 dark:text-white">Historia Clínica</h3>
                    {currentUser?.role !== 'patient' && (
                      <div className="flex space-x-2">
                          <button onClick={() => setHistoryModalOpen(true)} className="flex items-center space-x-1 sm:space-x-2 bg-primary hover:bg-primary-600 text-white text-xs font-bold py-2 px-3 sm:px-4 rounded-lg transition-colors cursor-pointer">
                              <PlusIcon className="w-4 h-4" /><span>Agregar Entrada</span>
                          </button>
                          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf" />
                          <button onClick={() => fileInputRef.current?.click()} className="flex items-center space-x-1 sm:space-x-2 bg-slate-600 hover:bg-slate-700 text-white text-xs font-bold py-2 px-3 sm:px-4 rounded-lg transition-colors cursor-pointer">
                              <DocumentPlusIcon className="w-4 h-4" /><span>Adjuntar PDF</span>
                          </button>
                      </div>
                    )}
                  </div>

                  {/* Consultas y Especialidades a las cuales concurrió */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-2">
                      <span>🏥 Consultas y Especialidades Asistidas</span>
                      <span className="text-xs bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300 px-2.5 py-0.5 rounded-full font-bold">
                        {appointments.filter(apt => apt.patientId === patient.id && apt.status === 'present').length}
                      </span>
                    </h4>
                    {appointments.filter(apt => apt.patientId === patient.id && apt.status === 'present').length === 0 ? (
                      <p className="text-xs text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-150 dark:border-slate-700/60">
                        El paciente todavía no posee turnos en estado "Presente".
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 font-sans">
                        {appointments
                          .filter(apt => apt.patientId === patient.id && apt.status === 'present')
                          .sort((a, b) => new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime())
                          .map(apt => {
                            const prof = professionals.find(p => p.id === apt.professionalId);
                            return (
                              <div key={apt.id} className="p-4 rounded-lg border border-teal-100 dark:border-teal-900/30 bg-teal-50/20 dark:bg-teal-950/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                <div>
                                  <span className="font-bold text-teal-700 dark:text-teal-400 block sm:inline mr-2 text-[13px]">
                                    {apt.date.split('-').reverse().join('/')} - {apt.time} hs
                                  </span>
                                  <span className="font-bold text-slate-800 dark:text-slate-100 text-[13px]">
                                    {prof?.name || `Profesional #${apt.professionalId}`}
                                  </span>
                                  <span className="ml-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] px-2 py-0.5 rounded font-medium">
                                    {prof?.specialty || 'General'}
                                  </span>
                                  {apt.reason && (
                                    <p className="text-slate-600 dark:text-slate-350 mt-1.5 pl-3.5 border-l-2 border-teal-300 dark:border-teal-800 text-xs">
                                      Motivo de Consulta: <span className="italic font-medium">{apt.reason}</span>
                                    </p>
                                  )}
                                </div>
                                <span className="self-start sm:self-center bg-green-150 text-green-800 dark:bg-green-950/40 dark:text-green-300 px-3 py-1 rounded-full font-extrabold text-[10px] tracking-wider uppercase">
                                  CONCURRIÓ
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>

                  {/* Evoluciones y Clínicos Adicionales */}
                  <div className="pt-4 space-y-3">
                    <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-2">
                      <span>📝 Evoluciones Clínicas y Archivos</span>
                      <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2.5 py-0.5 rounded-full font-bold">
                        {patient.clinicalHistory.length}
                      </span>
                    </h4>
                    {patient.clinicalHistory.length === 0 ? (
                      <p className="text-xs text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-150 dark:border-slate-700/60">
                        No se registran evoluciones clínicas o archivos guardados.
                      </p>
                    ) : (
                      <ul className="space-y-4">
                        {patient.clinicalHistory.map((entry, index) => (
                          <li key={index} className="p-4 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-left">
                            <div className="flex justify-between items-start mb-2 border-b border-slate-100 dark:border-slate-800/60 pb-1.5 gap-2">
                              <div>
                                <p className="font-bold text-xs text-primary flex items-center gap-1.5 flex-wrap">
                                  <span>📅 {entry.date.split('-').reverse().join('/')}</span>
                                  {entry.time && <span className="font-mono text-slate-550 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">🕒 {entry.time} hs</span>}
                                </p>
                                {entry.professionalName && (
                                  <p className="text-[11px] text-indigo-650 dark:text-indigo-400 font-bold mt-1 whitespace-nowrap">
                                    👩‍⚕️ Profesional: <span className="text-slate-700 dark:text-slate-300 font-extrabold uppercase">{entry.professionalName}</span>
                                    {entry.professionalLicense && (
                                      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono ml-1.5 font-normal">
                                        (M.P. {entry.professionalLicense})
                                      </span>
                                    )}
                                  </p>
                                )}
                              </div>
                              {(() => {
                                const entryEditable = !entry.isConsent && !entry.file && (() => {
                                  if (!entry.createdAtISO) {
                                    try {
                                      const dateStr = entry.date;
                                      const timeStr = entry.time || '00:00';
                                      const parsedDate = new Date(`${dateStr}T${timeStr}`);
                                      const hoursDiff = (Date.now() - parsedDate.getTime()) / (1000 * 60 * 60);
                                      return hoursDiff >= 0 && hoursDiff < 24;
                                    } catch {
                                      return false;
                                    }
                                  }
                                  const hoursDiff = (Date.now() - new Date(entry.createdAtISO).getTime()) / (1000 * 60 * 60);
                                  return hoursDiff >= 0 && hoursDiff < 24;
                                })();

                                return (
                                  <div className="flex items-center gap-2">
                                    {entryEditable && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingHistoryEntry(entry);
                                          setHistoryModalOpen(true);
                                        }}
                                        className="text-[10px] font-extrabold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 px-2 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer border border-indigo-100/50 dark:border-indigo-900/20"
                                      >
                                        ✏️ Editar
                                      </button>
                                    )}
                                    {entry.isConsent && (
                                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-extrabold uppercase tracking-wide ${entry.isConsentDeleted ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400' : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400'}`}>
                                        {entry.isConsentDeleted ? 'CONSENTIMIENTO ELIMINADO' : 'CONFORMIDAD BIOMÉTRICA'}
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                            {entry.isConsent ? (
                              <div className="space-y-3 text-sm">
                                {entry.isConsentDeleted ? (
                                  <div className="p-3 bg-red-50/50 dark:bg-red-950/10 border border-red-100 dark:border-red-900/60 rounded-lg">
                                    <div className="flex items-start gap-2">
                                      <span className="text-red-500 font-bold">⚠️</span>
                                      <div>
                                        <h5 className="font-bold text-red-700 dark:text-red-400 text-xs uppercase tracking-wide">
                                          {entry.consentTitle || "Consentimiento Informado"} - [REVOCADO / ELIMINADO]
                                        </h5>
                                        <p className="text-[11px] text-slate-505 dark:text-slate-400 mt-1">
                                          Firmante: <span className="font-bold text-slate-705 dark:text-slate-300">{entry.signatureName?.toUpperCase()}</span> (DNI {entry.signatureDni}) firmado originalmente el {entry.signatureTimestamp}.
                                        </p>
                                        <div className="text-[11px] bg-red-100/50 dark:bg-red-950/45 p-2.5 rounded border border-red-200/50 dark:border-red-900/40 text-red-800 dark:text-red-205 mt-2 font-bold font-sans">
                                          🚫 Motivo de eliminación: <span className="font-mono font-medium">{entry.consentDeletionReason}</span>
                                          <span className="block text-[9px] text-slate-500 dark:text-slate-400 font-extrabold mt-1.5 uppercase tracking-wider">Registrado por especialista el: {entry.consentDeletionTimestamp}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/25 border border-indigo-100 dark:border-indigo-900 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                    <div className="flex-1">
                                      <h5 className="font-bold text-slate-800 dark:text-slate-105 text-xs">
                                        {entry.consentTitle || "Consentimiento Informado Firmado"}
                                      </h5>
                                      <p className="text-[11px] text-slate-505 dark:text-slate-400 mt-1">
                                        Firmante: <strong className="text-slate-705 dark:text-slate-300">{entry.signatureName?.toUpperCase()}</strong> (DNI {entry.signatureDni}) registrado el {entry.signatureTimestamp}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2 mt-2 sm:mt-0">
                                      <button
                                        type="button"
                                        onClick={() => setSelectedConsentEntry(entry)}
                                        className="bg-indigo-650 hover:bg-indigo-700 text-white font-extrabold text-xs py-1.5 px-3 rounded shadow transition-colors shrink-0 cursor-pointer"
                                      >
                                        📄 Ver Documento Rúbrica
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setDeletingConsentEntry(entry);
                                          setDeletionReason('');
                                        }}
                                        className="bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/30 text-red-650 dark:text-red-400 font-extrabold text-xs py-1.5 px-3 rounded border border-red-200 dark:border-red-900 transition-colors shrink-0 cursor-pointer"
                                      >
                                        🗑 Eliminar
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : entry.reason ? (
                                <div className="space-y-3 text-sm">
                                    <div>
                                        <strong className="text-slate-600 dark:text-slate-300">Motivo de Consulta:</strong>
                                        <p className="text-slate-800 dark:text-slate-200 pl-2">{entry.reason}</p>
                                    </div>
                                    {entry.diagnosis && (
                                        <div>
                                            <strong className="text-slate-600 dark:text-slate-300">Diagnóstico:</strong>
                                            <p className="text-slate-800 dark:text-slate-200 pl-2">{entry.diagnosis}</p>
                                        </div>
                                    )}
                                    {entry.procedures && entry.procedures.length > 0 && (
                                        <div>
                                            <strong className="text-slate-600 dark:text-slate-300">Procedimientos Realizados:</strong>
                                            <ul className="list-disc list-inside pl-2 text-slate-800 dark:text-slate-200">
                                                {entry.procedures.map((proc, i) => <li key={i}>{proc}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                    {entry.suggestedTreatment && (
                                        <div>
                                            <strong className="text-slate-600 dark:text-slate-300">Tratamiento Sugerido:</strong>
                                            <p className="text-slate-800 dark:text-slate-200 pl-2">{entry.suggestedTreatment}</p>
                                        </div>
                                    )}
                                    {entry.professionalName && (
                                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 mt-1">
                                            <strong className="text-indigo-600 dark:text-indigo-400">Profesional Tratante:</strong>
                                            <p className="text-slate-800 dark:text-slate-200 pl-2 font-bold uppercase text-xs mt-0.5">
                                                👩‍⚕️ {entry.professionalName} {entry.professionalLicense && <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-normal ml-1.5">(M.P. {entry.professionalLicense})</span>}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-800 dark:text-slate-200">{entry.description}</p>
                            )}
                            {entry.file && !entry.isConsent && <a href={entry.file.url} target="_blank" rel="noopener noreferrer" className="text-sm text-cyan-600 hover:underline flex items-center space-x-1 mt-3"><ArrowDownTrayIcon /><span>{entry.file.name}</span></a>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
          {activeTab === 'odontogram' && <Odontogram patient={patient} onUpdatePatient={onUpdatePatient} clinicSettings={clinicSettings} currentUser={currentUser} />}
          {activeTab === 'certificates' && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-slate-150 dark:border-slate-700 flex-wrap gap-3">
                <div>
                  <h3 className="text-xl font-semibold text-slate-800 dark:text-white">Constancias de Atención</h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">Historial de certificados médicos emitidos para el paciente.</p>
                </div>
                {currentUser?.role !== 'patient' && (
                  currentUser?.role !== 'receptionist' ? (
                    <button 
                      onClick={() => setCertificateModalOpen(true)} 
                      className="flex items-center space-x-2 bg-primary hover:bg-primary-600 text-white font-bold py-2 px-4 rounded-lg transition-colors cursor-pointer text-xs sm:text-sm"
                    >
                      <PlusIcon className="w-4 h-4" /><span>Emitir Constancia</span>
                    </button>
                  ) : (
                    <span className="text-[11px] font-semibold text-rose-500 bg-rose-50 dark:bg-rose-950/30 px-3 py-1.5 rounded-lg border border-rose-100 dark:border-rose-900/35">
                       ⚠️ Recepcionistas no autorizados para emitir constancias
                    </span>
                  )
                )}
              </div>
              
              <div className="space-y-4">
                {(!patient.certificates || patient.certificates.length === 0) ? (
                  <div className="text-center py-12 border border-slate-200 dark:border-slate-700/80 rounded-xl bg-slate-50/20 dark:bg-slate-900/10">
                    <DocumentTextIcon className="mx-auto h-12 w-12 text-slate-350 dark:text-slate-550 mb-3" />
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                      No se registran constancias de atención.
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-550 mt-1">
                      Las constancias médicas firmadas aparecerán listadas aquí.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {patient.certificates.map(cert => (
                      <div key={cert.id} className="p-4 border rounded-xl border-slate-150 dark:border-slate-700/60 bg-slate-50/40 dark:bg-slate-900/10 flex flex-col sm:flex-row justify-between items-start gap-4 hover:shadow-sm transition-all duration-150">
                        <div className="space-y-2.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="bg-primary/10 text-primary dark:bg-primary/20 dark:text-teal-300 text-xs font-black px-2.5 py-1 rounded-lg">
                              📅 {cert.date.split('-').reverse().join('/')} - {cert.time} hs
                            </span>
                            {cert.restDays && (
                              <span className="bg-amber-500/10 text-amber-750 dark:bg-amber-550/25 dark:text-amber-300 text-[10px] px-2.5 py-1 rounded-lg font-black uppercase tracking-wider">
                                🛌 {cert.restDays} {cert.restDays === 1 ? 'Día' : 'Días'} de reposo
                              </span>
                            )}
                          </div>
                          
                          <div className="text-xs text-slate-700 dark:text-slate-300 pl-3 border-l-2 border-slate-300 dark:border-slate-600">
                            <strong className="block text-slate-450 dark:text-slate-500 text-[10px] uppercase font-black tracking-wider mb-0.5">Diagnóstico y observaciones:</strong>
                            <p className="leading-relaxed font-medium text-slate-750 dark:text-slate-205 whitespace-pre-wrap">{cert.diagnosis}</p>
                          </div>
                          
                          <div className="bg-white/60 dark:bg-slate-900/30 p-2 rounded-lg border border-slate-100 dark:border-slate-800 text-[10.5px] text-slate-500 dark:text-slate-400 flex items-center justify-between gap-3">
                            <div>
                              Emitido por: <strong className="text-slate-750 dark:text-slate-250 font-bold uppercase">Dr/a. {cert.professionalName}</strong>
                            </div>
                            <div className="font-mono text-[9.5px]">
                              M.P. {cert.professionalLicense || 'N/A'}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex sm:flex-col items-center sm:items-end gap-2 w-full sm:w-auto shrink-0 justify-end pt-1">
                          <button
                            onClick={() => handleDownloadCertificate(cert)}
                            className="flex-1 sm:flex-none flex items-center justify-center space-x-1 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold py-2 px-3.5 rounded-lg transition-colors cursor-pointer shadow-sm"
                            title="Descargar PDF Oficial"
                          >
                            <DocumentArrowDownIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                            <span>Descargar PDF</span>
                          </button>
                          
                          <button
                            onClick={() => {
                              const restText = cert.restDays ? `\nSe recomienda reposo por: ${cert.restDays} días.` : '';
                              const text = `*CONSTANCIA DE ATENCIÓN* \n\nPor la presente se deja constancia de que el/la paciente *${patient.name} ${patient.lastName}* fue atendido/a en el día de hoy, *${cert.date.split('-').reverse().join('/')}* a las *${cert.time} hs*.\n\n*Diagnóstico:* ${cert.diagnosis}${restText}\n\nDr/a. ${cert.professionalName} - M.P. ${cert.professionalLicense || 'N/A'}`;
                              window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                            }}
                            className="flex-1 sm:flex-none flex items-center justify-center space-x-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-2 px-3.5 rounded-lg transition-colors cursor-pointer shadow-sm"
                            title="Compartir por WhatsApp"
                          >
                            <PaperAirplaneIcon className="w-4 h-4" />
                            <span>WhatsApp</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          {activeTab === 'billing' && (
             <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md font-sans">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="text-xl font-semibold text-slate-800 dark:text-white">Facturación</h3>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">Historial de facturas y pagos del paciente.</p>
                    </div>
                    <button onClick={() => setInvoiceModalOpen(true)} className="flex items-center space-x-2 bg-primary hover:bg-primary-600 text-white font-bold py-2 px-4 rounded-lg transition-colors cursor-pointer text-xs sm:text-sm shadow-sm">
                        <PlusIcon className="w-4 h-4" /><span>Crear Factura</span>
                    </button>
                </div>
                <div className="space-y-4">
                    {(!patient.invoices || patient.invoices.length === 0) ? (
                        <div className="text-center py-12 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/20">
                            <CurrencyDollarIcon className="mx-auto h-12 w-12 text-slate-350 dark:text-slate-650 mb-2" />
                            <p className="text-sm font-bold text-slate-500">No se registran facturas emitidas para este paciente.</p>
                        </div>
                    ) : (
                        patient.invoices.map(invoice => {
                            const currentPayments = invoice.payments || [];
                            const totalPaidOnInvoice = currentPayments.reduce((sum, p) => sum + p.amount, 0);
                            const remainingBalance = Math.max(0, invoice.total - totalPaidOnInvoice);

                            return (
                                <div key={invoice.id} className="p-4 border rounded-xl border-slate-200 dark:border-slate-700/80 bg-slate-50/10 dark:bg-slate-900/10 hover:border-slate-300 dark:hover:border-slate-600 transition">
                                    <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-extrabold text-primary text-sm">Factura #{invoice.id}</span>
                                                <span className="text-[10px] bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded font-mono font-bold">{invoice.date}</span>
                                                
                                                {/* Status badges */}
                                                {invoice.status === 'paid' && (
                                                    <span className="text-[10px] font-bold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-2.5 py-0.5 rounded-full">
                                                        Saldado / Pagado
                                                    </span>
                                                )}
                                                {invoice.status === 'partial' && (
                                                    <span className="text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 px-2.5 py-0.5 rounded-full">
                                                        Pago Parcial / Seña (${totalPaidOnInvoice.toFixed(2)})
                                                    </span>
                                                )}
                                                {invoice.status === 'pending' && (
                                                    <span className="text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 px-2.5 py-0.5 rounded-full">
                                                        Pendiente de Pago
                                                    </span>
                                                )}
                                            </div>

                                            <ul className="mt-3 text-xs space-y-1 text-slate-650 dark:text-slate-350">
                                                {invoice.items.map((item, idx) => (
                                                    <li key={idx} className="flex justify-between max-w-md">
                                                        <span>• {item.description} (x{item.quantity})</span>
                                                        <span className="font-semibold">${(item.quantity * item.price).toFixed(2)}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <div className="text-right flex-shrink-0 w-full md:w-auto flex flex-col items-end border-t md:border-t-0 border-slate-100 dark:border-slate-800 pt-3 md:pt-0">
                                            <span className="text-[10px] text-slate-450 dark:text-slate-500 uppercase font-black tracking-wider block">Monto Total</span>
                                            <span className="font-extrabold text-xl text-slate-800 dark:text-white block">${invoice.total.toFixed(2)}</span>
                                            
                                            {invoice.status === 'partial' && (
                                                <span className="text-xs text-amber-600 font-bold block mt-0.5">Saldo Pendiente: ${remainingBalance.toFixed(2)}</span>
                                            )}

                                            <div className="flex items-center gap-2 mt-3 flex-wrap justify-end">
                                                {invoice.status !== 'paid' && (
                                                    <button 
                                                        onClick={() => openDetailPaymentModal(invoice)}
                                                        className="text-[10.5px] font-bold px-2.5 py-1.5 rounded-lg bg-primary hover:bg-primary-600 text-white transition shadow-sm cursor-pointer"
                                                    >
                                                        Registrar Seña / Pago
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => handleToggleInvoiceStatus(invoice.id)} 
                                                    title={invoice.status === 'paid' ? "Marcar como Pendiente" : "Marcar como Pagada Directamente"} 
                                                    className="text-[10.5px] font-bold px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                                                >
                                                    {invoice.status === 'paid' ? 'Desmarcar' : 'Forzar Pagada'}
                                                </button>
                                                <button onClick={() => handleDownloadInvoice(invoice)} title="Descargar Factura PDF" className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition cursor-pointer">
                                                    <DocumentArrowDownIcon className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleWhatsAppInvoice(invoice)} title="Enviar por WhatsApp" className="p-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 dark:bg-green-950/40 dark:hover:bg-green-900/60 dark:text-green-400 transition cursor-pointer">
                                                    <PaperAirplaneIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Small inner box showing payment breakdowns */}
                                    {currentPayments.length > 0 && (
                                        <div className="mt-3 bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 p-3 rounded-lg">
                                            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1.5">Pagos y Señas Registrados:</span>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                                {currentPayments.map((p, idx) => (
                                                    <div key={idx} className="text-xs p-2 bg-slate-50 dark:bg-slate-900/40 rounded border border-slate-100 dark:border-slate-800 flex flex-col gap-0.5">
                                                        <div className="flex justify-between font-bold text-slate-700 dark:text-slate-250">
                                                            <span className="text-green-600 dark:text-green-400">+ ${p.amount.toFixed(2)}</span>
                                                            <span className="capitalize text-[9.5px] bg-slate-150 dark:bg-slate-800 px-1.5 py-0.2 rounded text-slate-500 font-mono">{p.method}</span>
                                                        </div>
                                                        <div className="flex justify-between text-[9px] text-slate-400 font-sans mt-0.5">
                                                            <span>{p.date} - {p.time} hs</span>
                                                            {p.transactionNumber && <span className="font-mono">Ref: #{p.transactionNumber}</span>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Inner payment creation modal */}
                {detailPayInvoice && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full shadow-2xl border border-slate-150 dark:border-slate-700/60 overflow-hidden animate-fade-in text-left">
                            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-850">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-150">Registrar Pago / Seña</h3>
                                    <p className="text-[9.5px] text-slate-400 dark:text-slate-500 uppercase tracking-wide font-extrabold mt-0.5">Factura #{detailPayInvoice.id}</p>
                                </div>
                                <button
                                    onClick={() => setDetailPayInvoice(null)}
                                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition p-1 rounded-full hover:bg-slate-100"
                                >
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSaveDetailPayment} className="p-6 space-y-3.5">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Paciente</label>
                                    <p className="text-sm font-extrabold text-slate-700 dark:text-slate-200">{patient.name} {patient.lastName}</p>
                                    <p className="text-[11px] text-slate-500">Monto total de factura: <strong className="font-bold">${detailPayInvoice.total.toFixed(2)}</strong></p>
                                </div>

                                <div>
                                    <label htmlFor="detailPayAmount" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Monto de la Seña / Pago parcial ($)</label>
                                    <input
                                        type="number"
                                        id="detailPayAmount"
                                        name="detailPayAmount"
                                        required
                                        step="0.01"
                                        min="0.01"
                                        value={detailPayAmount}
                                        onChange={(e) => setDetailPayAmount(e.target.value)}
                                        className="w-full p-2 border border-slate-250 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-primary text-xs font-bold"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="detailPayDate" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Fecha</label>
                                        <input
                                            type="date"
                                            id="detailPayDate"
                                            name="detailPayDate"
                                            required
                                            value={detailPayDate}
                                            onChange={(e) => setDetailPayDate(e.target.value)}
                                            className="w-full p-1.5 border border-slate-250 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="detailPayTime" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Hora</label>
                                        <input
                                            type="time"
                                            id="detailPayTime"
                                            name="detailPayTime"
                                            required
                                            value={detailPayTime}
                                            onChange={(e) => setDetailPayTime(e.target.value)}
                                            className="w-full p-1.5 border border-slate-250 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="detailPayMethod" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Método de Pago</label>
                                    <select
                                        id="detailPayMethod"
                                        name="detailPayMethod"
                                        value={detailPayMethod}
                                        onChange={(e) => setDetailPayMethod(e.target.value as any)}
                                        className="w-full p-2 border border-slate-250 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-primary text-xs font-bold text-slate-700 dark:text-slate-300 capitalize"
                                    >
                                        <option value="efectivo">Efectivo</option>
                                        <option value="transferencia">Transferencia Bancaria</option>
                                        <option value="qr">QR / Pago Virtual</option>
                                        <option value="tarjeta">Tarjeta (Débito/Crédito)</option>
                                        <option value="otro">Otro</option>
                                    </select>
                                </div>

                                <div>
                                    <label htmlFor="detailTransactionNo" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Número de Transacción / Comprobante</label>
                                    <input
                                        type="text"
                                        id="detailTransactionNo"
                                        name="detailTransactionNo"
                                        placeholder="Ej: TX-984321..."
                                        value={detailTransactionNo}
                                        onChange={(e) => setDetailTransactionNo(e.target.value)}
                                        className="w-full p-2 border border-slate-250 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-primary text-xs font-mono"
                                    />
                                </div>

                                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700/60">
                                    <button
                                        type="button"
                                        onClick={() => setDetailPayInvoice(null)}
                                        className="px-3.5 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-650 dark:text-slate-350 rounded-lg font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-900 transition cursor-pointer"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-1.5 bg-primary hover:bg-primary-600 text-white font-bold text-xs rounded-lg transition shadow-sm cursor-pointer"
                                    >
                                        Guardar Pago
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
             </div>
          )}
          {activeTab === 'prescription' && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold">Recetas</h3>
                    {currentUser?.role !== 'receptionist' ? (
                        <button onClick={() => setPrescriptionModalOpen(true)} className="flex items-center space-x-2 bg-primary hover:bg-primary-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                           <PlusIcon /><span>Crear Receta</span>
                        </button>
                    ) : (
                        <span className="text-xs font-semibold text-rose-500 bg-rose-50 dark:bg-rose-950/30 px-3 py-1.5 rounded-lg border border-rose-100 dark:border-rose-900/35">
                           ⚠️ Recepcionistas no autorizados para crear recetas
                        </span>
                    )}
                </div>
                <div className="space-y-4">
                    {patient.prescriptions.map(p => (
                        <div key={p.id} className="p-4 border rounded-md border-slate-200 dark:border-slate-700">
                           <div className="flex justify-between items-center">
                                <p className="font-semibold text-primary">{p.date} - {p.medication}</p>
                                <button
                                 onClick={() => {
                                    const text = `Receta para ${patient.name} ${patient.lastName}:\n\nMedicamento: ${p.medication}\nDosis: ${p.dosage}\nInstrucciones: ${p.instructions}`;
                                    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                                 }}
                                 className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white text-xs font-bold py-1 px-3 rounded-full transition-colors">
                                  <PaperAirplaneIcon /><span>Enviar</span>
                                </button>
                           </div>
                           <p className="text-sm"><strong>Dosis:</strong> {p.dosage}</p>
                           <p className="text-sm"><strong>Instrucciones:</strong> {p.instructions}</p>
                        </div>
                    ))}
                </div>
            </div>
          )}
          {activeTab === 'appointments' && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3 gap-2">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <span>📅 Historial de Turnos y Presentismo</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-sans">
                    Turnos programados, asistencias (presente) e inasistencias unificadas en un único panel de control.
                  </p>
                </div>
              </div>

              {/* Stats Widgets */}
              {(() => {
                const patientApts = appointments.filter(apt => apt.patientId === patient.id);
                const totalApts = patientApts.length;
                const presentApts = patientApts.filter(apt => apt.status === 'present').length;
                const scheduledApts = patientApts.filter(apt => apt.status === 'scheduled').length;
                const absentOrCancelled = patientApts.filter(apt => apt.status === 'absent' || apt.status === 'cancelled').length;

                const filteredApts = patientApts
                  .filter(apt => {
                    if (appointmentFilter === 'present') return apt.status === 'present';
                    if (appointmentFilter === 'scheduled') return apt.status === 'scheduled';
                    if (appointmentFilter === 'absent_or_cancelled') return apt.status === 'absent' || apt.status === 'cancelled';
                    return true;
                  })
                  .sort((a, b) => new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime());

                return (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {/* STAT 1: Total */}
                      <button
                        type="button"
                        onClick={() => setAppointmentFilter('all')}
                        className={`p-4 rounded-xl border transition-all text-left group ${appointmentFilter === 'all' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-slate-150 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/10 hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}
                      >
                        <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Total Turnos</p>
                        <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">{totalApts}</p>
                        <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1.5 font-medium group-hover:underline">Haga clic para ver todos</p>
                      </button>

                      {/* STAT 2: Presentes (Asistidos) */}
                      <button
                        type="button"
                        onClick={() => setAppointmentFilter('present')}
                        className={`p-4 rounded-xl border transition-all text-left group ${appointmentFilter === 'present' ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20 ring-1 ring-emerald-500' : 'border-slate-150 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/10 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/10'}`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">Presentes (Asistió)</p>
                          <span className="flex-shrink-0 w-2 h-2 rounded-full bg-emerald-550 animate-pulse"></span>
                        </div>
                        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-450 mt-1">{presentApts}</p>
                        <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-1.5 font-medium group-hover:underline">Haga clic para ver presentes</p>
                      </button>

                      {/* STAT 3: Planificados */}
                      <button
                        type="button"
                        onClick={() => setAppointmentFilter('scheduled')}
                        className={`p-4 rounded-xl border transition-all text-left group ${appointmentFilter === 'scheduled' ? 'border-amber-500 bg-amber-50/20 dark:bg-amber-950/20 ring-1 ring-amber-500' : 'border-slate-150 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/10 hover:bg-amber-50/20 dark:hover:bg-amber-950/10'}`}
                      >
                        <p className="text-amber-700 dark:text-amber-400 text-xs font-bold uppercase tracking-wider">Pendientes (Planificado)</p>
                        <p className="text-2xl font-black text-amber-600 dark:text-amber-450 mt-1">{scheduledApts}</p>
                        <p className="text-[10px] text-amber-650/85 dark:text-amber-400/80 mt-1.5 font-medium group-hover:underline">Haga clic para ver pendientes</p>
                      </button>

                      {/* STAT 4: Ausentes & Cancelados */}
                      <button
                        type="button"
                        onClick={() => setAppointmentFilter('absent_or_cancelled')}
                        className={`p-4 rounded-xl border transition-all text-left group ${appointmentFilter === 'absent_or_cancelled' ? 'border-rose-500 bg-rose-50/20 dark:bg-rose-950/20 ring-1 ring-rose-500' : 'border-slate-150 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/10 hover:bg-rose-50/20 dark:hover:bg-rose-950/10'}`}
                      >
                        <p className="text-rose-700 dark:text-rose-400 text-xs font-bold uppercase tracking-wider">Inasistencias / Cancelados</p>
                        <p className="text-2xl font-black text-rose-600 dark:text-rose-450 mt-1">{absentOrCancelled}</p>
                        <p className="text-[10px] text-rose-650/85 dark:text-rose-400/80 mt-1.5 font-medium group-hover:underline">Haga clic para ver inasistidos</p>
                      </button>
                    </div>

                    {/* Filter Navigation / Quick Selection Bar */}
                    <div className="flex border-b border-slate-150 dark:border-slate-700 pt-1">
                      <button
                        type="button"
                        onClick={() => setAppointmentFilter('all')}
                        className={`px-4 py-2 border-b-2 font-bold text-xs transition duration-150 cursor-pointer ${appointmentFilter === 'all' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'}`}
                      >
                        Todos ({totalApts})
                      </button>
                      <button
                        type="button"
                        onClick={() => setAppointmentFilter('present')}
                        className={`px-4 py-2 border-b-2 font-bold text-xs transition duration-150 cursor-pointer ${appointmentFilter === 'present' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'}`}
                      >
                        Presentes ({presentApts})
                      </button>
                      <button
                        type="button"
                        onClick={() => setAppointmentFilter('scheduled')}
                        className={`px-4 py-2 border-b-2 font-bold text-xs transition duration-150 cursor-pointer ${appointmentFilter === 'scheduled' ? 'border-amber-500 text-amber-600 dark:text-amber-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'}`}
                      >
                        Pendientes ({scheduledApts})
                      </button>
                      <button
                        type="button"
                        onClick={() => setAppointmentFilter('absent_or_cancelled')}
                        className={`px-4 py-2 border-b-2 font-bold text-xs transition duration-150 cursor-pointer ${appointmentFilter === 'absent_or_cancelled' ? 'border-rose-500 text-rose-600 dark:text-rose-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'}`}
                      >
                        Inasistidos / Cancelados ({absentOrCancelled})
                      </button>
                    </div>

                    {filteredApts.length === 0 ? (
                      <div className="text-center py-12 border border-slate-200 dark:border-slate-700/80 rounded-xl bg-slate-50/20 dark:bg-slate-900/10">
                        <svg className="mx-auto h-12 w-12 text-slate-350 dark:text-slate-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                        </svg>
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 font-sans">
                          No se encontraron turnos con el filtro seleccionado.
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-550 mt-1 font-sans">
                          {appointmentFilter === 'present' ? 'El paciente no registra turnos asistidos o con estado "Presente".' : 
                           appointmentFilter === 'scheduled' ? 'El paciente no registra turnos pendientes de atención.' :
                           appointmentFilter === 'absent_or_cancelled' ? 'El paciente no registra turnos ausentes o cancelados.' :
                           'El paciente no registra ningún turno en el sistema.'}
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 uppercase tracking-wider font-bold">
                              <th className="py-3 px-2">Fecha y Hora</th>
                              <th className="py-3 px-2">Profesional</th>
                              <th className="py-3 px-2">Motivo</th>
                              <th className="py-3 px-2">Otorgado por</th>
                              <th className="py-3 px-2">Estado</th>
                              <th className="py-3 px-2 text-right">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-150 dark:divide-slate-750 font-sans">
                            {filteredApts.map(apt => {
                              const prof = professionals.find(p => p.id === apt.professionalId);
                              
                              // Style status badge
                              let badgeStyle = "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
                              let labelText = "Planificado 📅";
                              if (apt.status === "present") {
                                badgeStyle = "bg-green-100 text-green-800 dark:text-green-900/40 dark:text-green-300";
                                labelText = "Presente ✅";
                              } else if (apt.status === "absent") {
                                badgeStyle = "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
                                labelText = "Ausente ❌";
                              } else if (apt.status === "cancelled") {
                                badgeStyle = "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-350";
                                labelText = "Cancelado ✕";
                              }

                              return (
                                <tr key={apt.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-750/30 ${apt.status === 'cancelled' ? 'opacity-65' : ''}`}>
                                  <td className="py-3.5 px-2 font-semibold">
                                    <span className="block">{apt.date.split('-').reverse().join('/')}</span>
                                    <span className="text-[10px] text-slate-450 dark:text-slate-400 font-normal">{apt.time} hs</span>
                                  </td>
                                  <td className="py-3.5 px-2">
                                    <span className="font-semibold block">{prof?.name || `Profesional #${apt.professionalId}`}</span>
                                    <span className="text-[10px] text-slate-450 dark:text-slate-400 font-normal">{prof?.specialty || 'General'}</span>
                                  </td>
                                  <td className="py-3.5 px-2 max-w-[150px] truncate" title={apt.reason || 'Consulta'}>
                                    {apt.reason || 'Consulta'}
                                  </td>
                                  <td className="py-3.5 px-2">
                                    <span className="font-medium text-slate-600 dark:text-slate-350">{apt.createdBy || 'Sistema'}</span>
                                  </td>
                                  <td className="py-3.5 px-2">
                                    <div className="space-y-1">
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeStyle}`}>
                                        {labelText}
                                      </span>
                                      {apt.status === "cancelled" && apt.cancellationReason && (
                                        <span className="block text-[10px] italic text-red-500 font-normal max-w-[150px] leading-tight" title={apt.cancellationReason}>
                                          Motivo: {apt.cancellationReason}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-2 text-right">
                                    {apt.status === 'scheduled' && onUpdateAppointmentStatus && (
                                      <div className="flex items-center justify-end gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => onUpdateAppointmentStatus(apt.id, 'present')}
                                          className="px-2 py-1 rounded bg-green-100 hover:bg-green-200 text-green-800 dark:bg-green-950/45 dark:hover:bg-green-900/60 dark:text-green-300 font-bold text-[10px] transition cursor-pointer"
                                          title="Marcar como Presente"
                                        >
                                          Presente
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => onUpdateAppointmentStatus(apt.id, 'absent')}
                                          className="px-2 py-1 rounded bg-red-100 hover:bg-red-200 text-red-800 dark:bg-red-950/45 dark:hover:bg-red-900/60 dark:text-red-300 font-bold text-[10px] transition cursor-pointer"
                                          title="Marcar como Ausente"
                                        >
                                          Ausente
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setCancellingDetailAptId(apt.id);
                                            setDetailCancellationReason('');
                                          }}
                                          className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-300 font-bold text-[10px] transition cursor-pointer"
                                          title="Cancelar Turno"
                                        >
                                          Cancelar
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </div>
      <Modal isOpen={isInvoiceModalOpen} onClose={() => setInvoiceModalOpen(false)} title="Crear Nueva Factura">
        <InvoiceCreator patient={patient} onSave={handleAddInvoice} />
      </Modal>
      <Modal isOpen={isPrescriptionModalOpen} onClose={() => setPrescriptionModalOpen(false)} title="Crear Nueva Receta">
          <PrescriptionCreator patient={patient} onSave={handleAddPrescription} />
      </Modal>
      <Modal isOpen={isCertificateModalOpen} onClose={() => setCertificateModalOpen(false)} title="Emitir Constancia de Atención">
          <CertificateCreator patient={patient} currentUser={currentUser} onSave={handleAddCertificate} />
      </Modal>
       <Modal 
          isOpen={isHistoryModalOpen} 
          onClose={() => {
            setHistoryModalOpen(false);
            setEditingHistoryEntry(null);
          }} 
          title={editingHistoryEntry ? "Editar Entrada en Historia Clínica" : "Nueva Entrada en Historia Clínica"}
       >
          <ClinicalHistoryForm 
            onSave={handleAddHistoryEntry} 
            onCancel={() => {
              setHistoryModalOpen(false);
              setEditingHistoryEntry(null);
            }} 
            professionals={professionals} 
            currentUser={currentUser} 
            initialEntry={editingHistoryEntry || undefined} 
          />
      </Modal>
      
      {/* Modal de Cancelación desde Ficha del Paciente */}
      <Modal 
        isOpen={cancellingDetailAptId !== null} 
        onClose={() => setCancellingDetailAptId(null)} 
        title="Cancelar Turno"
      >
        <form onSubmit={(e) => {
          e.preventDefault();
          if (cancellingDetailAptId !== null && onUpdateAppointmentStatus) {
            onUpdateAppointmentStatus(cancellingDetailAptId, 'cancelled', detailCancellationReason);
            setCancellingDetailAptId(null);
            setDetailCancellationReason('');
          }
        }} className="space-y-4 text-left">
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
            Por favor, indique el motivo por el cual se cancela este turno. Esta información se registrará a perpetuidad en el historial del paciente.
          </p>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Motivo de Cancelación <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={detailCancellationReason}
              onChange={(e) => setDetailCancellationReason(e.target.value)}
              placeholder="Ej. Problemas de salud, viaje, reprogramación del paciente..."
              className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-650 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 dark:text-slate-100 bg-transparent"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setCancellingDetailAptId(null)}
              className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg transition text-center cursor-pointer"
            >
              Cerrar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition shadow-md text-center cursor-pointer"
            >
              Confirmar Cancelación
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de Eliminación de Consentimiento */}
      <Modal
        isOpen={deletingConsentEntry !== null}
        onClose={() => {
          setDeletingConsentEntry(null);
          setDeletionReason('');
        }}
        title="Anular/Eliminar Consentimiento"
      >
        <form onSubmit={handleConfirmDeleteConsent} className="space-y-4 text-left">
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal font-sans">
            Por razones de auditoría interna de salud digital, el consentimiento no se elimina físicamente de la base de datos, sino que quedará registrado de forma transparente como <strong className="text-red-600 dark:text-red-400">REVOCADO / ELIMINADO</strong> con el motivo correspondiente.
          </p>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Motivo de Eliminación <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={deletionReason}
              onChange={(e) => setDeletionReason(e.target.value)}
              placeholder="Ej. No se realiza la extracción, revocación por el paciente..."
              className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-650 focus:ring-1 focus:ring-red-550 focus:border-red-550 dark:text-slate-100 bg-slate-50 dark:bg-slate-900"
              id="input-deletion-reason"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setDeletingConsentEntry(null);
                setDeletionReason('');
              }}
              className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg transition text-center cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition shadow-md text-center cursor-pointer font-sans"
            >
              Confirmar Eliminación
            </button>
          </div>
        </form>
      </Modal>

      {/* Visualización de Consentimiento Histórico */}
      {selectedConsentEntry && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" id="consent-view-modal">
          <div className="bg-slate-100 dark:bg-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] border border-slate-200 dark:border-slate-800 overflow-hidden" id="consent-view-container">
            <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <span className="text-xl">📄</span>
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">Documento de Consentimiento Histórico</h3>
                  <p className="text-[10px] text-slate-400 font-bold">Verifique la rúbrica registrada en el expediente clínico digital.</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedConsentEntry(null)}
                className="text-slate-400 hover:text-slate-650 dark:hover:text-slate-300 p-1 bg-slate-100 dark:bg-slate-700 rounded-full transition-colors"
                id="btn-close-consent-preview"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 select-none bg-slate-50 dark:bg-slate-950/20" id="consent-view-content">
              <div className="bg-white dark:bg-slate-800 p-8 sm:p-12 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 max-w-2xl mx-auto font-sans leading-relaxed text-slate-800 dark:text-slate-200 text-xs relative">
                <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-xl"></div>
                
                {/* Header */}
                <div className="flex justify-between items-start border-b pb-4 mb-4 border-slate-200 dark:border-slate-705">
                  <div>
                    <h4 className="text-xs font-black uppercase text-indigo-700 dark:text-indigo-400">
                      {clinicSettings?.name || "Consultorio Odontológico"}
                    </h4>
                    <p className="text-[9px] text-slate-400">{clinicSettings?.address}</p>
                    <p className="text-[9px] text-slate-400">Tel: {clinicSettings?.phone} CUIT: {clinicSettings?.cuil}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded font-mono font-bold tracking-wider">
                      REGISTRO DE CONSENTIMIENTO
                    </span>
                    <p className="text-[9px] text-slate-400 mt-1">Fecha Firma: {selectedConsentEntry.date.split('-').reverse().join('/')}</p>
                  </div>
                </div>

                <h3 className="text-xs font-black text-center text-slate-900 dark:text-white uppercase tracking-wider mb-4 border-b pb-2 border-slate-105">
                  {selectedConsentEntry.consentTitle || "CONSENTIMIENTO INFORMADO ODONTOLÓGICO"}
                </h3>

                {/* Body Content */}
                <div className="space-y-3 text-justify text-[10.5px] text-slate-700 dark:text-slate-300 max-h-[220px] overflow-y-auto pr-2 border-b border-slate-100 dark:border-slate-700 pb-4 mb-4 font-sans">
                  {(selectedConsentEntry.consentText || '')
                    .split('\n')
                    .map((p, idx) => (
                      p.trim() ? (
                        <p key={idx} className="indent-4 leading-relaxed">{p}</p>
                      ) : (
                        <div key={idx} className="h-2"></div>
                      )
                    ))}
                </div>

                {/* Rúbricas e Información del Firmante */}
                <div className="mt-4 pt-2">
                  <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                    ✔ Registro de Conformidad y Firma Electrónica
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <div className="space-y-1.5 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-[11px] leading-relaxed">
                      <div>
                        <strong className="text-slate-500 dark:text-slate-400">Firmante:</strong>{" "}
                        <span className="font-extrabold text-slate-805 dark:text-slate-100 text-xs">{selectedConsentEntry.signatureName?.toUpperCase()}</span>
                      </div>
                      <div>
                        <strong className="text-slate-500 dark:text-slate-400">DNI:</strong>{" "}
                        <span className="font-mono font-extrabold text-slate-800 dark:text-slate-100">{selectedConsentEntry.signatureDni}</span>
                      </div>
                      <div>
                        <strong className="text-slate-500 dark:text-slate-400">Fecha de Firma:</strong>{" "}
                        <span className="text-slate-700 dark:text-slate-300">{selectedConsentEntry.signatureTimestamp}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-center">
                      <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400 mb-1">Rúbrica Táctil Digitalizada</p>
                      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 flex items-center justify-center h-[90px] w-full">
                        {selectedConsentEntry.signatureImage ? (
                          <img 
                            src={selectedConsentEntry.signatureImage} 
                            alt="Firma del paciente" 
                            className="h-full max-w-full object-contain filter dark:brightness-105"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="text-xs text-slate-400 italic">No se registró trazo</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedConsentEntry(null)}
                className="bg-indigo-650 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg shadow transition-colors text-sm cursor-pointer"
              >
                Cerrar Documento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDetail;