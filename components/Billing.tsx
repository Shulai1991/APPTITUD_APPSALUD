import React, { useState } from 'react';
import type { Patient, Invoice, InvoicePayment } from '../types';
import { CurrencyDollarIcon, PlusIcon, XMarkIcon, PaperAirplaneIcon, DocumentArrowDownIcon } from './icons';
import InvoiceCreator from './InvoiceCreator';
import Modal from './Modal';

interface BillingProps {
  patients: Patient[];
  currentUser: any;
  clinicSettings: any;
  onUpdatePatient: (updatedPatient: Patient) => void;
}

const Billing: React.FC<BillingProps> = ({
  patients,
  currentUser,
  clinicSettings,
  onUpdatePatient,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'partial'>('all');
  
  // State for recording a new payment
  const [selectedInvoice, setSelectedInvoice] = useState<{ patient: Patient; invoice: Invoice } | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'efectivo' | 'transferencia' | 'qr' | 'tarjeta' | 'otro'>('efectivo');
  const [transactionNo, setTransactionNo] = useState('');
  const [payDate, setPayDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [payTime, setPayTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });

  // State for generating a new invoice
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [selectedPatientForInvoice, setSelectedPatientForInvoice] = useState<Patient | null>(null);
  const [patientSearchQuery, setPatientSearchQuery] = useState('');

  // Calculate global stats across all patients' invoices
  let totalInvoiced = 0;
  let totalPaid = 0;
  
  const allInvoicesWithPatients: { patient: Patient; invoice: Invoice }[] = [];

  patients.forEach(patient => {
    if (patient.invoices) {
      patient.invoices.forEach(invoice => {
        allInvoicesWithPatients.push({ patient, invoice });
        totalInvoiced += invoice.total;
        
        // Sum up existing payments
        if (invoice.payments) {
          invoice.payments.forEach(payment => {
            totalPaid += payment.amount;
          });
        } else if (invoice.status === 'paid') {
          totalPaid += invoice.total; // Legacy paid status without payments list
        }
      });
    }
  });

  const totalPending = totalInvoiced - totalPaid;

  // Filter invoices based on search term and selected status
  const filteredInvoices = allInvoicesWithPatients.filter(({ patient, invoice }) => {
    const patientName = `${patient.name} ${patient.lastName}`.toLowerCase();
    const patientDni = patient.dni.toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = patientName.includes(searchLower) || patientDni.includes(searchLower) || String(invoice.id).includes(searchLower);

    if (!matchesSearch) return false;

    if (statusFilter === 'all') return true;
    return invoice.status === statusFilter;
  });

  // Handle saving a new payment/seña
  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Por favor ingrese un monto válido.');
      return;
    }

    const { patient, invoice } = selectedInvoice;
    
    // Create new payment record
    const newPayment: InvoicePayment = {
      amount,
      method: payMethod,
      transactionNumber: transactionNo ? transactionNo : undefined,
      date: payDate,
      time: payTime,
    };

    // Calculate updated payments list
    const currentPayments = invoice.payments || [];
    
    // Add backward compatibility for fully-paid invoice without explicit payment list
    if (currentPayments.length === 0 && invoice.status === 'paid') {
      currentPayments.push({
        amount: invoice.total,
        method: 'efectivo',
        date: invoice.date,
        time: '12:00',
        transactionNumber: 'PREV-PAGO'
      });
    }

    const updatedPayments = [...currentPayments, newPayment];
    const totalPaymentsSum = updatedPayments.reduce((sum, p) => sum + p.amount, 0);

    // Determine new status
    let newStatus: 'paid' | 'pending' | 'partial' = 'pending';
    if (totalPaymentsSum >= invoice.total) {
      newStatus = 'paid';
    } else if (totalPaymentsSum > 0) {
      newStatus = 'partial';
    }

    // Create updated invoice object
    const updatedInvoice: Invoice = {
      ...invoice,
      status: newStatus,
      payments: updatedPayments,
    };

    // Replace invoice in patient's list
    const updatedInvoices = patient.invoices.map(inv => inv.id === invoice.id ? updatedInvoice : inv);
    
    // Update patient
    const updatedPatient: Patient = {
      ...patient,
      invoices: updatedInvoices,
    };

    onUpdatePatient(updatedPatient);

    // Reset and close modal
    setSelectedInvoice(null);
    setPayAmount('');
    setPayMethod('efectivo');
    setTransactionNo('');
  };

  const openPaymentModal = (patient: Patient, invoice: Invoice) => {
    // Calculate remaining balance to pay
    const currentPayments = invoice.payments || [];
    const sumPaid = currentPayments.reduce((sum, p) => sum + p.amount, 0);
    const balance = Math.max(0, invoice.total - sumPaid);

    setSelectedInvoice({ patient, invoice });
    setPayAmount(balance.toFixed(2));
    setPayMethod('efectivo');
    setTransactionNo('');
    setPayDate(new Date().toISOString().split('T')[0]);
    const now = new Date();
    setPayTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
  };

  // Generate WhatsApp text for billing reminders or status
  const sendWhatsAppReceipt = (patient: Patient, invoice: Invoice) => {
    const currentPayments = invoice.payments || [];
    const sumPaid = currentPayments.reduce((sum, p) => sum + p.amount, 0);
    const balance = Math.max(0, invoice.total - sumPaid);
    
    let message = `Estimado/a *${patient.name} ${patient.lastName}*,\n\nLe enviamos el estado de cuenta de su *Factura #${invoice.id}* emitida por *${clinicSettings.name}*.\n\n`;
    message += `📅 *Fecha:* ${invoice.date}\n`;
    message += `💵 *Monto Total:* $${invoice.total.toFixed(2)}\n`;
    
    if (currentPayments.length > 0) {
      message += `\n*Pagos y Señas registradas:*\n`;
      currentPayments.forEach((p, idx) => {
        message += `- ${p.date} ${p.time}: $${p.amount.toFixed(2)} por ${p.method.toUpperCase()} ${p.transactionNumber ? `(Trans. ${p.transactionNumber})` : ''}\n`;
      });
    }

    message += `\n📌 *Estado Actual:* ${invoice.status === 'paid' ? '✅ PAGADO' : invoice.status === 'partial' ? '⚠️ PAGO PARCIAL' : '❌ PENDIENTE DE PAGO'}\n`;
    message += `💰 *Saldo Pendiente:* $${balance.toFixed(2)}\n\n`;
    message += `Muchas gracias por confiar en nosotros.\n*${clinicSettings.name}*`;

    window.open(`https://wa.me/${patient.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-premium flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Total Facturado</span>
            <span className="text-2xl font-extrabold text-slate-850 dark:text-slate-50 mt-1 block">${totalInvoiced.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="p-3.5 rounded-xl bg-teal-500/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400">
            <CurrencyDollarIcon className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-premium flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Total Cobrado (Caja / Señas)</span>
            <span className="text-2xl font-extrabold text-green-600 dark:text-green-400 mt-1 block">${totalPaid.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="p-3.5 rounded-xl bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-premium flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Total Pendiente de Cobro</span>
            <span className="text-2xl font-extrabold text-amber-600 dark:text-amber-500 mt-1 block">${totalPending.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="p-3.5 rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Control Panel: Filters, Search & New Invoice */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-premium flex flex-col xl:flex-row xl:items-center justify-between gap-4 font-sans">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 flex-1">
          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Buscar por paciente, DNI o # de factura..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-sm transition"
            />
            <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-slate-100 text-slate-650 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                statusFilter === 'pending'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-650 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              Pendientes
            </button>
            <button
              onClick={() => setStatusFilter('partial')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                statusFilter === 'partial'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-650 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              Con Seña / Pago Parcial
            </button>
            <button
              onClick={() => setStatusFilter('paid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                statusFilter === 'paid'
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-650 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              Saldadas / Pagadas
            </button>
          </div>
        </div>

        <button
          onClick={() => setIsCreateInvoiceOpen(true)}
          className="flex items-center justify-center space-x-2 bg-primary hover:bg-primary-600 text-white font-bold py-2 px-4 rounded-xl transition shadow-sm hover:shadow-md cursor-pointer text-xs sm:text-sm shrink-0"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Generar Factura</span>
        </button>
      </div>

      {/* Invoices List / Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-premium overflow-hidden">
        {filteredInvoices.length === 0 ? (
          <div className="text-center py-16 px-4 font-sans">
            <svg className="mx-auto h-12 w-12 text-slate-350 dark:text-slate-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182.577-.437 1.28-.659 2.003-.659 1.519 0 2.98.835 3.96 2.088v-2.148c-1.246-1.168-3.04-1.89-4.96-1.89-3.326 0-6.19 2.501-6.19 6.22 0 3.469 2.373 5.868 5.433 6.22" />
            </svg>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">No se encontraron facturas o comprobantes.</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Intente cambiar el filtro de estado o la búsqueda.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700/65 font-sans">
            {filteredInvoices.map(({ patient, invoice }) => {
              const currentPayments = invoice.payments || [];
              const totalPaidOnInvoice = currentPayments.reduce((sum, p) => sum + p.amount, 0);
              const remainingBalance = Math.max(0, invoice.total - totalPaidOnInvoice);

              return (
                <div key={invoice.id} className="p-5 hover:bg-slate-50/55 dark:hover:bg-slate-700/10 transition duration-150">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Invoice Meta and Patient Info */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-primary text-sm">Factura #{invoice.id}</span>
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded font-mono">{invoice.date}</span>
                        
                        {/* Dynamic Status Badges */}
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
                            Pendiente de Cobro
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex items-center gap-3">
                        <img src={patient.avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full border border-slate-150 object-cover" />
                        <div>
                          <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                            {patient.name} {patient.lastName}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            DNI: {patient.dni} | Tel: {patient.phone}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Financial details and Action buttons */}
                    <div className="flex flex-row sm:items-center justify-between lg:justify-end gap-6 border-t lg:border-t-0 border-slate-100 dark:border-slate-700/50 pt-3 lg:pt-0">
                      <div className="text-left lg:text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Monto Facturado</span>
                        <span className="text-lg font-extrabold text-slate-850 dark:text-slate-100">${invoice.total.toFixed(2)}</span>
                        {invoice.status === 'partial' && (
                          <span className="text-[10.5px] text-amber-600 font-bold block mt-0.5">Saldo: ${remainingBalance.toFixed(2)}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2.5">
                        {invoice.status !== 'paid' && (
                          <button
                            onClick={() => openPaymentModal(patient, invoice)}
                            className="bg-primary hover:bg-primary-600 text-white text-xs font-bold py-2 px-3.5 rounded-xl transition shadow-sm hover:shadow-md cursor-pointer flex items-center gap-1"
                          >
                            <PlusIcon className="w-3.5 h-3.5" />
                            <span>Registrar Pago / Seña</span>
                          </button>
                        )}
                        
                        <button
                          onClick={() => sendWhatsAppReceipt(patient, invoice)}
                          title="Enviar Comprobante/Recordatorio por WhatsApp"
                          className="p-2 bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 rounded-xl transition cursor-pointer"
                        >
                          <PaperAirplaneIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Breakdown of items and payments */}
                  <div className="mt-4 bg-slate-50 dark:bg-slate-900/55 rounded-xl p-4 border border-slate-150 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Items */}
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1.5">Detalle de Conceptos</span>
                      <ul className="space-y-1">
                        {invoice.items.map((item, idx) => (
                          <li key={idx} className="text-xs text-slate-650 dark:text-slate-350 flex justify-between">
                            <span>{item.description} (x{item.quantity})</span>
                            <span className="font-semibold">${(item.quantity * item.price).toFixed(2)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Payments History */}
                    <div className="border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-850 pt-3 md:pt-0 md:pl-4">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1.5">Historial de Pagos / Señas</span>
                      {currentPayments.length === 0 ? (
                        <p className="text-xs italic text-slate-400 dark:text-slate-500">No se registran cobros parciales para esta factura.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                          {currentPayments.map((p, idx) => (
                            <div key={idx} className="text-xs bg-white dark:bg-slate-800 p-2 rounded border border-slate-100 dark:border-slate-700/60 flex flex-col gap-0.5">
                              <div className="flex justify-between font-bold text-slate-750 dark:text-slate-200">
                                <span className="text-green-600 dark:text-green-400">+ ${p.amount.toFixed(2)}</span>
                                <span className="capitalize text-[10px] bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded text-slate-500">{p.method}</span>
                              </div>
                              <div className="flex justify-between text-[10px] text-slate-400 font-sans mt-0.5">
                                <span>{p.date} a las {p.time} hs</span>
                                {p.transactionNumber && <span className="font-mono">Ref: #{p.transactionNumber}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal for Recording a Payment */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full shadow-2xl border border-slate-150 dark:border-slate-700/60 overflow-hidden animate-fade-in font-sans">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-850">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Registrar Pago / Seña</h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wide font-extrabold mt-0.5">Factura #{selectedInvoice.invoice.id}</p>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Paciente</label>
                <p className="text-sm font-extrabold text-slate-700 dark:text-slate-200">{selectedInvoice.patient.name} {selectedInvoice.patient.lastName}</p>
                <p className="text-[11px] text-slate-500">Monto total de factura: <strong className="font-bold">${selectedInvoice.invoice.total.toFixed(2)}</strong></p>
              </div>

              <div>
                <label htmlFor="payAmount" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Monto de la Seña / Pago parcial ($)</label>
                <input
                  type="number"
                  id="payAmount"
                  name="payAmount"
                  required
                  step="0.01"
                  min="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-sm font-extrabold text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="payDate" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Fecha</label>
                  <input
                    type="date"
                    id="payDate"
                    name="payDate"
                    required
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="payTime" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Hora</label>
                  <input
                    type="time"
                    id="payTime"
                    name="payTime"
                    required
                    value={payTime}
                    onChange={(e) => setPayTime(e.target.value)}
                    className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-xs"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="payMethod" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Método de Pago</label>
                <select
                  id="payMethod"
                  name="payMethod"
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as any)}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-xs capitalize font-bold text-slate-700 dark:text-slate-300"
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia Bancaria</option>
                  <option value="qr">QR / Pago Virtual</option>
                  <option value="tarjeta">Tarjeta (Débito/Crédito)</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              <div>
                <label htmlFor="transactionNo" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Número de Transacción / Comprobante
                </label>
                <input
                  type="text"
                  id="transactionNo"
                  name="transactionNo"
                  placeholder="Ej: TX-984321, CBU ref..."
                  value={transactionNo}
                  onChange={(e) => setTransactionNo(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-xs font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-650 dark:text-slate-350 rounded-xl font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-900 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary hover:bg-primary-600 text-white font-bold text-xs rounded-xl transition shadow-sm hover:shadow-md cursor-pointer"
                >
                  Confirmar Pago / Seña
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for Generating an Invoice */}
      <Modal
        isOpen={isCreateInvoiceOpen}
        onClose={() => {
          setIsCreateInvoiceOpen(false);
          setSelectedPatientForInvoice(null);
          setPatientSearchQuery('');
        }}
        title="Generar Nueva Factura"
      >
        {!selectedPatientForInvoice ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Seleccione el Paciente
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar por nombre, apellido o DNI..."
                  value={patientSearchQuery}
                  onChange={(e) => setPatientSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-sm font-semibold"
                />
                <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 no-scrollbar">
              {patients.filter(p => {
                const fullName = `${p.name} ${p.lastName}`.toLowerCase();
                const query = patientSearchQuery.toLowerCase();
                return fullName.includes(query) || p.dni.toLowerCase().includes(query);
              }).length === 0 ? (
                <div className="text-center py-8 text-slate-400 italic text-xs">
                  No se encontraron pacientes para esa búsqueda.
                </div>
              ) : (
                patients
                  .filter(p => {
                    const fullName = `${p.name} ${p.lastName}`.toLowerCase();
                    const query = patientSearchQuery.toLowerCase();
                    return fullName.includes(query) || p.dni.toLowerCase().includes(query);
                  })
                  .map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPatientForInvoice(p)}
                      className="w-full p-3 bg-slate-50 hover:bg-slate-100/80 dark:bg-slate-900/40 dark:hover:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl flex items-center justify-between text-left transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img src={p.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                        <div className="truncate">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                            {p.name} {p.lastName}
                          </p>
                          <p className="text-[10px] text-slate-500 font-medium">DNI: {p.dni}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-md shrink-0">
                        Seleccionar
                      </span>
                    </button>
                  ))
              )}
            </div>
            
            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => {
                  setIsCreateInvoiceOpen(false);
                  setPatientSearchQuery('');
                }}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-650 dark:text-slate-350 rounded-xl font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-900 transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-4 bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-150 dark:border-slate-800">
              <div className="flex items-center gap-2 min-w-0">
                <img src={selectedPatientForInvoice.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-250" />
                <div className="truncate">
                  <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200 truncate">
                    Facturando a: {selectedPatientForInvoice.name} {selectedPatientForInvoice.lastName}
                  </p>
                  <p className="text-[10px] text-slate-500 font-bold">DNI: {selectedPatientForInvoice.dni}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPatientForInvoice(null)}
                className="text-xs font-bold text-primary hover:underline cursor-pointer shrink-0"
              >
                Cambiar Paciente
              </button>
            </div>
            
            <InvoiceCreator
              patient={selectedPatientForInvoice}
              onSave={(newInvoice) => {
                const invoiceWithId: Invoice = {
                  ...newInvoice,
                  id: Date.now(),
                  payments: []
                };

                const updatedInvoices = [invoiceWithId, ...(selectedPatientForInvoice.invoices || [])];

                const updatedPatient: Patient = {
                  ...selectedPatientForInvoice,
                  invoices: updatedInvoices
                };

                onUpdatePatient(updatedPatient);

                setIsCreateInvoiceOpen(false);
                setSelectedPatientForInvoice(null);
                setPatientSearchQuery('');
              }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Billing;
