import React, { useState, useEffect } from 'react';
import type { User } from '../types';
import { CurrencyDollarIcon, PlusIcon, TrashIcon } from './icons';
import ConfirmDialog from './ConfirmDialog';

export interface PriceListItem {
  id: string;
  name: string;
  category: string; // Specialty
  price: number;
}

interface PriceListProps {
  currentUser: User;
  items: PriceListItem[];
  onAddItem: (item: PriceListItem) => void;
  onDeleteItem: (id: string) => void;
  onUpdateItemPrice: (id: string, newPrice: number) => void;
  onUpdateItemCode: (oldId: string, newId: string) => void;
}

export const DEFAULT_PRICE_LIST: PriceListItem[] = [
  // Odontología General y Estética
  { id: 'dg-01', name: 'Consulta y Diagnóstico Inicial', category: 'Odontología General y Estética', price: 15000 },
  { id: 'dg-02', name: 'Limpieza Prounda (Tartrectomía + Profilaxis)', category: 'Odontología General y Estética', price: 25000 },
  { id: 'dg-03', name: 'Restauración con Resina Estética (Composite)', category: 'Odontología General y Estética', price: 30000 },
  { id: 'dg-04', name: 'Blanqueamiento Dental Premium (Sillón + Kit)', category: 'Odontología General y Estética', price: 60000 },
  
  // Ortodoncia e Implantes
  { id: 'oi-01', name: 'Estudio de Ortodoncia Pre-Tratamiento', category: 'Ortodoncia e Implantes', price: 35000 },
  { id: 'oi-02', name: 'Colocación de Implante de Titanio', category: 'Ortodoncia e Implantes', price: 180000 },
  { id: 'oi-03', name: 'Ajuste y Control Mensual de Ortodoncia', category: 'Ortodoncia e Implantes', price: 20000 },
  { id: 'oi-04', name: 'Corona de Porcelana sobre Implante', category: 'Ortodoncia e Implantes', price: 110000 },

  // Odontopediatría
  { id: 'op-01', name: 'Primera Consulta Odontopediátrica con Motivación', category: 'Odontopediatría', price: 18000 },
  { id: 'op-02', name: 'Aplicación Profesional de Fluoruro', category: 'Odontopediatría', price: 12000 },
  { id: 'op-03', name: 'Sellador de Fosas y Fisuras (por pieza)', category: 'Odontopediatría', price: 14500 },

  // Cirugía y Endodoncia
  { id: 'ce-01', name: 'Extracción Dentaria Simple', category: 'Cirugía y Endodoncia', price: 28000 },
  { id: 'ce-02', name: 'Endodoncia de Conducto Único (Diente Anterior)', category: 'Cirugía y Endodoncia', price: 45000 },
  { id: 'ce-03', name: 'Endodoncia Multirradicular (Diente Posterior)', category: 'Cirugía y Endodoncia', price: 65000 },
];

const PriceList: React.FC<PriceListProps> = ({
  currentUser,
  items,
  onAddItem,
  onDeleteItem,
  onUpdateItemPrice,
  onUpdateItemCode
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

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

  // Pagination state and page size limit setup
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Reset page when search term or category filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory]);
  
  // Add item form state
  const [newPracticeCode, setNewPracticeCode] = useState('');
  const [newPracticeName, setNewPracticeName] = useState('');
  const [newPracticeCategory, setNewPracticeCategory] = useState('Odontología General y Estética');
  const [newPracticeCustomCategory, setNewPracticeCustomCategory] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [newPracticePrice, setNewPracticePrice] = useState<number | ''>('');

  // Editable price and code state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState<number | ''>('');
  const [editingCodeValue, setEditingCodeValue] = useState<string>('');

  // Permission selector
  const canEdit = currentUser.role === 'admin' || currentUser.role === 'master';

  // Get all unique categories (specialties)
  const categories = Array.from(new Set(items.map(item => item.category)));

  // Filtered items
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const activePage = Math.min(currentPage, Math.max(1, totalPages));
  const startIndex = (activePage - 1) * itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      alert('Solo los administradores pueden añadir nuevas prácticas.');
      return;
    }
    if (!newPracticeName.trim()) {
      alert('Por favor ingrese el nombre de la práctica o consulta.');
      return;
    }
    if (newPracticePrice === '' || newPracticePrice < 0) {
      alert('Por favor ingrese un precio válido (mayor o igual a 0).');
      return;
    }

    const finalCode = newPracticeCode.trim().toLowerCase();
    if (finalCode) {
      const exists = items.some(item => item.id.toLowerCase() === finalCode);
      if (exists) {
        alert('Este código de práctica ya existe en el catálogo.');
        return;
      }
    }

    const finalCategory = isCustomCategory 
      ? (newPracticeCustomCategory.trim() || 'Otros')
      : newPracticeCategory;

    onAddItem({
      id: finalCode || `cust-${Math.floor(1000 + Math.random() * 9000).toString()}`,
      name: newPracticeName.trim(),
      category: finalCategory,
      price: Number(newPracticePrice)
    });

    // Reset fields
    setNewPracticeCode('');
    setNewPracticeName('');
    setNewPracticePrice('');
    setNewPracticeCustomCategory('');
    setIsCustomCategory(false);
  };

  const startEditPrice = (item: PriceListItem) => {
    setEditingItemId(item.id);
    setEditingPriceValue(item.price);
    setEditingCodeValue(item.id);
  };

  const saveEditedPrice = (id: string) => {
    if (editingPriceValue === '' || editingPriceValue < 0) {
      alert('Precio inválido.');
      return;
    }
    
    const finalNewId = editingCodeValue.trim();
    if (!finalNewId) {
      alert('El código no puede estar vacío.');
      return;
    }

    if (finalNewId.toLowerCase() !== id.toLowerCase()) {
      const exists = items.some(item => item.id.toLowerCase() === finalNewId.toLowerCase());
      if (exists) {
        alert('Este código ya está asignado a otra práctica.');
        return;
      }
      onUpdateItemCode(id, finalNewId);
    }

    onUpdateItemPrice(finalNewId, Number(editingPriceValue));
    setEditingItemId(null);
    setEditingPriceValue('');
    setEditingCodeValue('');
  };

  return (
    <div className="space-y-4">
      {/* Header and overview */}
      <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700/80">
        <h2 className="text-base sm:text-lg md:text-xl font-bold font-sans flex items-center gap-1.5 mb-1.5">
          <CurrencyDollarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" />
          <span>Aranceles de Prácticas y Consultas</span>
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
          Consulte y administre el catálogo tarifario oficial para las consultas y prácticas médicas desarrolladas. Los valores se cargan por especialidad odontológica.
        </p>
        <div className="mt-2 flex items-center gap-2">
          <span className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 sm:py-1 rounded-full ${
            canEdit 
              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900' 
              : 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 border border-amber-100 dark:border-amber-900'
          }`}>
            Rol actual: {canEdit ? 'Administrador (Edición Habilitada)' : 'Secretaría / Profesional (Solo Visualización)'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main List Column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Controls: Search and category switch */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700/80 flex flex-col md:flex-row gap-4 items-center">
            {/* Search Input */}
            <div className="w-full md:flex-1 relative">
              <input
                type="text"
                placeholder="Buscar práctica o tratamiento..."
                className="w-full px-4 h-10 pl-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 font-sans"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <svg className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            {/* Specialty switch */}
            <div className="w-full md:w-auto flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider hidden md:inline">Especialidad:</span>
              <select
                className="w-full md:w-auto h-10 px-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-primary/40 font-sans"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="all">Todas las especialidades</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table display grouped or simple list */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700/80 overflow-hidden">
            {filteredItems.length === 0 ? (
              <div className="p-12 text-center text-slate-400 dark:text-slate-500 font-sans">
                <CurrencyDollarIcon className="w-12 h-12 stroke-1 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                <p className="font-semibold text-base">No se hallaron prácticas</p>
                <p className="text-xs">Intente cambiar la especialidad o modificar el término de búsqueda.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse font-sans text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-700/40 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase border-b border-slate-100 dark:border-slate-700">
                      <th className="px-4 py-3">Código</th>
                      <th className="px-4 py-3">Práctica / Consulta</th>
                      <th className="px-4 py-3">Especialidad</th>
                      <th className="px-4 py-3 text-right">Precio</th>
                      {canEdit && <th className="px-4 py-3 text-center">Acciones</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-705">
                    {paginatedItems.map((item) => {
                      const isEditingPrice = editingItemId === item.id;
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750/30 transition-colors">
                          <td className="px-4 py-3.5 font-mono text-xs text-slate-400 dark:text-slate-500">
                            {isEditingPrice ? (
                              <input
                                type="text"
                                className="w-20 h-8 px-1.5 border border-primary text-xs font-mono rounded bg-white dark:bg-slate-900 border-2 outline-none focus:ring-0 uppercase"
                                value={editingCodeValue}
                                onChange={(e) => setEditingCodeValue(e.target.value)}
                              />
                            ) : (
                              <span>{item.id}</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 font-bold text-slate-800 dark:text-slate-100">{item.name}</td>
                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                              {item.category}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right font-medium">
                            {isEditingPrice ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <span className="text-slate-400">$</span>
                                <input
                                  type="number"
                                  className="w-24 h-8 px-2 border border-primary text-right text-sm rounded bg-white dark:bg-slate-900 border-2 outline-none focus:ring-0"
                                  value={editingPriceValue}
                                  onChange={(e) => setEditingPriceValue(e.target.value === '' ? '' : Number(e.target.value))}
                                  autoFocus
                                />
                              </div>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-450 font-bold text-sm">
                                ${new Intl.NumberFormat('es-AR').format(item.price)}
                              </span>
                            )}
                          </td>
                          {canEdit && (
                            <td className="px-4 py-3.5 text-center">
                              <div className="inline-flex items-center gap-1.5 justify-center">
                                {isEditingPrice ? (
                                  <>
                                    <button
                                      onClick={() => saveEditedPrice(item.id)}
                                      className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/40 rounded transition"
                                      title="Guardar"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingItemId(null);
                                        setEditingPriceValue('');
                                      }}
                                      className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition"
                                      title="Cancelar"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => startEditPrice(item)}
                                      className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-700 rounded transition"
                                      title="Modificar precio"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => {
                                        setConfirmState({
                                          isOpen: true,
                                          title: 'Eliminar Práctica',
                                          message: `¿Está seguro de eliminar la práctica "${item.name}"?`,
                                          danger: true,
                                          onConfirm: () => {
                                            onDeleteItem(item.id);
                                            setConfirmState(prev => ({ ...prev, isOpen: false }));
                                          }
                                        });
                                      }}
                                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition"
                                      title="Eliminar de la lista de precios"
                                    >
                                      <TrashIcon className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-705/30 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between font-sans text-xs select-none">
                  <div className="text-slate-500 dark:text-slate-400 font-medium">
                    Mostrando <strong className="text-slate-705 dark:text-slate-200 font-bold">{startIndex + 1}</strong> a <strong className="text-slate-705 dark:text-slate-200 font-bold">{Math.min(startIndex + itemsPerPage, filteredItems.length)}</strong> de <strong className="text-slate-705 dark:text-slate-200 font-bold">{filteredItems.length}</strong> prácticas
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={activePage === 1}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-705 dark:text-slate-300 font-semibold transition disabled:opacity-50 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                    >
                      Anterior
                    </button>
                    <span className="text-slate-550 dark:text-slate-400 font-medium">
                      Página <strong className="font-bold text-slate-700 dark:text-slate-100">{activePage}</strong> de <strong className="font-bold text-slate-700 dark:text-slate-100">{totalPages}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={activePage === totalPages}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-705 dark:text-slate-300 font-semibold transition disabled:opacity-50 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              )}
              </>
            )}
          </div>
        </div>

        {/* Form and info Column */}
        <div className="space-y-6">
          {/* Create new item Form (only visible and interactive for edit enabled personnel) */}
          {canEdit ? (
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/80">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 font-sans flex items-center gap-2 mb-4">
                <PlusIcon className="w-5 h-5 text-primary" />
                <span>Agregar Consulta o Práctica</span>
              </h3>
              
              <form onSubmit={handleCreateItem} className="space-y-4 font-sans text-sm">
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 font-bold text-xs uppercase mb-1.5">Nombre de la Práctica *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Cirugía de Tercer Molar Retenido"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/45"
                    value={newPracticeName}
                    onChange={(e) => setNewPracticeName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-slate-400 font-bold text-xs uppercase mb-1.5">Código de la Práctica (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej. dg-05 (En blanco para auto-generar)"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-primary/45"
                    value={newPracticeCode}
                    onChange={(e) => setNewPracticeCode(e.target.value)}
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-slate-500 dark:text-slate-400 font-bold text-xs uppercase">Especialidad (Categoría) *</label>
                    <button
                      type="button"
                      className="text-xs text-primary dark:text-primary-400 hover:underline font-semibold"
                      onClick={() => setIsCustomCategory(!isCustomCategory)}
                    >
                      {isCustomCategory ? "Elegir existente" : "Ingresar nueva"}
                    </button>
                  </div>

                  {isCustomCategory ? (
                    <input
                      type="text"
                      required
                      placeholder="Nueva especialidad (ej. Ortodoncia)"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/45"
                      value={newPracticeCustomCategory}
                      onChange={(e) => setNewPracticeCustomCategory(e.target.value)}
                    />
                  ) : (
                    <select
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/45"
                      value={newPracticeCategory}
                      onChange={(e) => setNewPracticeCategory(e.target.value)}
                    >
                      <option value="Odontología General y Estética">Odontología General y Estética</option>
                      <option value="Ortodoncia e Implantes">Ortodoncia e Implantes</option>
                      <option value="Odontopediatría">Odontopediatría</option>
                      <option value="Cirugía y Endodoncia">Cirugía y Endodoncia</option>
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-slate-400 font-bold text-xs uppercase mb-1.5">Precio ($ ARS) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400">$</span>
                    <input
                      type="number"
                      required
                      min="0"
                      placeholder="0"
                      className="w-full pl-7 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/45"
                      value={newPracticePrice}
                      onChange={(e) => setNewPracticePrice(e.target.value === '' ? '' : Number(e.target.value))}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-2.5 px-4 rounded-lg shadow-sm hover:shadow transition duration-200 flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Agregar Práctica</span>
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-150 dark:border-slate-700/60 font-sans text-sm space-y-3 text-slate-500 dark:text-slate-400">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-350 flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Acceso Limitado</span>
              </h3>
              <p className="text-xs leading-relaxed">
                Usted posee el rol de <strong>{currentUser.role === 'receptionist' ? 'Secretario/a (Recepción)' : currentUser.role}</strong>. Como tal, tiene permisos para visualizar esta tabla de aranceles oficiales, mas no para modificar los valores o agregar nuevas prácticas.
              </p>
              <p className="text-xs leading-relaxed">
                Si detecta algún valor desactualizado o requiere incorporar un tratamiento omitido, por favor contacte al sector de <strong>Administración</strong> de la sede para que efectúe la carga correspondiente.
              </p>
            </div>
          )}

          {/* Sede indicator & Statistics Card */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/80 font-sans">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 uppercase tracking-wider text-xs text-slate-400">
              Información del Catálogo
            </h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700/50">
                <span className="text-slate-500 text-sm">Total Prácticas</span>
                <span className="font-bold text-slate-800 dark:text-slate-150">{items.length}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700/50">
                <span className="text-slate-500 text-sm font-sans">Especialidades</span>
                <span className="font-bold text-slate-800 dark:text-slate-150">{categories.length}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-500 text-sm">Precio Máximo</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  ${new Intl.NumberFormat('es-AR').format(items.length > 0 ? Math.max(...items.map(i => i.price)) : 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

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

export default PriceList;
