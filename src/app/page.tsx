'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import jsPDF from 'jspdf';

// --- TIPOS ---
interface VariantGroup {
  variant_id: number;
  images: string[];
}

interface PokemonData {
  id: number;
  name: string;
  groups: VariantGroup[];
}

interface DisplayCard {
  uniqKey: string;
  id: number;
  name: string;
  variantId: number;
  images: string[];
}

const ITEMS_PER_PAGE = 40;

export default function Home() {
  const [rawData, setRawData] = useState<PokemonData[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Estado para feedback visual mientras se genera el PDF
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  // Estado para el modal de confirmar borrado
  const [showClearModal, setShowClearModal] = useState(false);

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const observerTarget = useRef<HTMLDivElement>(null);

  // 1. Cargar datos
  useEffect(() => {
    fetch('/pokedex_fit.json')
      .then((res) => res.json())
      .then((data) => {
        setRawData(data);
        setLoading(false);
      })
      .catch(err => console.error("Error cargando JSON:", err));
  }, []);

  // 2.a. Aplanamiento Total (Fuente de verdad para el PDF)
  // Esta lista contiene SIEMPRE todos los pokemones, sin importar la búsqueda.
  const allPokemonFlat = useMemo(() => {
    const result: DisplayCard[] = [];
    for (const poke of rawData) {
      if (!poke.groups) continue;
      for (const group of poke.groups) {
        result.push({
          uniqKey: `${poke.id}-${group.variant_id}`,
          id: poke.id,
          name: poke.name,
          variantId: group.variant_id,
          images: group.images
        });
      }
    }
    return result;
  }, [rawData]);

  // 2.b. Filtrado para Vista (Depende de la búsqueda)
  // Usamos 'allPokemonFlat' como base y filtramos según lo que escribas.
  const fullFilteredList = useMemo(() => {
    const term = search.toLowerCase();

    // Si no hay búsqueda, mostramos todo
    if (!term) return allPokemonFlat;

    return allPokemonFlat.filter((item) =>
      item.name.toLowerCase().includes(term) ||
      item.id.toString().includes(term)
    );
  }, [search, allPokemonFlat]);

  // 3. Recorte visible
  const visibleList = useMemo(() => {
    return fullFilteredList.slice(0, visibleCount);
  }, [fullFilteredList, visibleCount]);

  // 4. Infinite Scroll
  const loadMore = useCallback(() => {
    if (visibleCount < fullFilteredList.length) {
      setVisibleCount(prev => prev + ITEMS_PER_PAGE);
    }
  }, [visibleCount, fullFilteredList.length]);

  // 5. Observer: Detecta cuando el usuario ve el final de la lista
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { threshold: 1.0 }
    );

    const currentTarget = observerTarget.current;

    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      // Usamos la variable local en la limpieza
      if (currentTarget) observer.unobserve(currentTarget);
    };
  }, [loadMore]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setVisibleCount(ITEMS_PER_PAGE);
    window.scrollTo(0, 0);
  };

  const toggleSelection = (uniqKey: string) => {
    setSelectedKeys((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(uniqKey)) newSet.delete(uniqKey);
      else newSet.add(uniqKey);
      return newSet;
    });
  };

  const handleClearSelection = () => {
    setSelectedKeys(new Set());
    setShowClearModal(false);
  };

  // --- HELPER: CONVERTIR URL A BASE64 ---
  const getBase64FromUrl = async (url: string): Promise<string> => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error("Error cargando imagen para PDF:", url, error);
      return "";
    }
  };

  // --- LÓGICA DE EXPORTACIÓN PDF ---
  const handleExportPDF = async () => {
    setIsGeneratingPdf(true);

    // 1. Preparar datos
    const itemsToExport = allPokemonFlat
      .filter((item) => selectedKeys.has(item.uniqKey))
      .map((item) => ({ ...item, tag: "Pokémon Fit" }));

    if (itemsToExport.length === 0) {
      setIsGeneratingPdf(false);
      return;
    }

    // 2. Configurar PDF (A4 Vertical)
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 20;

    // Título
    doc.setFontSize(18);
    doc.text("Lista de Compras - Pokémon Fit", 14, yPos);
    yPos += 10;

    // Línea separadora
    doc.setLineWidth(0.5);
    doc.line(10, yPos - 5, pageWidth - 10, yPos - 5);

    // 3. Iterar Items
    for (let i = 0; i < itemsToExport.length; i++) {
      const item = itemsToExport[i];

      // Verificar si cabe en la página
      if (yPos + 50 > pageHeight) {
        doc.addPage();
        yPos = 20;
      }

      // -- Datos del Item --
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      const titulo = `${item.name} (#${item.id})`;
      doc.text(titulo, 14, yPos);

      // Tag
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text(`Tag: ${item.tag}`, 14, yPos + 5);

      // Variante
      if (item.variantId > 0) {
        doc.text(`Variante: ${item.variantId}`, 14, yPos + 10);
      }
      doc.setTextColor(0);

      // -- Imágenes --
      let xImg = 60;
      const imgSize = 25;

      for (const imgUrl of item.images) {
        const imgBase64 = await getBase64FromUrl(imgUrl);

        if (imgBase64) {
          if (xImg + imgSize > pageWidth - 10) {
              xImg = 60;
              yPos += imgSize + 2;
          }

          try {
            doc.addImage(imgBase64, "JPEG", xImg, yPos, imgSize, imgSize);
            xImg += imgSize + 2;
          } catch (e) {
            console.error("Error agregando imagen al PDF", e);
          }
        }
      }

      yPos += 35;
      doc.setDrawColor(220);
      doc.line(10, yPos - 5, pageWidth - 10, yPos - 5);
      doc.setDrawColor(0);
    }

    // 4. Footer Final
    if (yPos + 20 < pageHeight) {
      yPos += 10;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(`CANTIDAD TOTAL: ${itemsToExport.length}`, 14, yPos);
    } else {
      doc.addPage();
      doc.text(`CANTIDAD TOTAL: ${itemsToExport.length}`, 14, 20);
    }

    // 5. Guardar y Limpiar
    doc.save("pokemon_fit_list.pdf");
    setSelectedKeys(new Set()); // <--- LIMPIAR CARRITO
    setIsGeneratingPdf(false);
  };

  if (loading) return <div className="p-10 text-center text-gray-500">Cargando Pokedex...</div>;

  return (
    <main className="min-h-screen bg-gray-100 pb-32">
      {/* HEADER */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md px-4 py-3 shadow-sm border-b border-gray-200 text-gray-600">
        <div className="relative">
          <input
            id='searchBar'
            type="text"
            placeholder="Buscar (Nombre o N°)..."
            className="w-full p-3 pr-10 rounded-xl bg-gray-100 text-lg border border-transparent focus:bg-white focus:border-blue-500 focus:ring-0 transition-all outline-none"
            value={search}
            onChange={handleSearchChange}
          />
          {/* Botón X para borrar (solo si hay texto) */}
          {search && (
            <span
              onClick={() => {
                setSearch('');
                setVisibleCount(ITEMS_PER_PAGE); // Reseteamos paginación al borrar
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer p-0.5 bg-gray-100 rounded-3xl"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </span>
          )}
        </div>

        <div className="text-xs text-gray-400 mt-2 text-right">
          Mostrando {visibleList.length} de {fullFilteredList.length} Pokémon
        </div>
      </div>

      {/* GRILLA */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 p-3">
        {visibleList.map((item) => (
          <PokemonCard
            key={item.uniqKey}
            item={item}
            isSelected={selectedKeys.has(item.uniqKey)}
            onToggle={() => toggleSelection(item.uniqKey)}
          />
        ))}
      </div>

      {/* ESTADOS */}
      {visibleList.length === 0 && (
        <div className="text-center py-20 text-gray-400">No se encontraron Pokémon.</div>
      )}
      {visibleList.length < fullFilteredList.length && (
        <div ref={observerTarget} className="h-20 flex items-center justify-center text-gray-400 text-sm">
          Cargando más...
        </div>
      )}

      {/* --- BARRA FLOTANTE DE EXPORTACIÓN --- */}
      {selectedKeys.size > 0 && (
        <div className="fixed bottom-6 left-4 right-4 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-gray-900 text-white rounded-2xl shadow-xl p-4 flex items-center justify-between backdrop-blur-sm bg-opacity-90">
            <div className="flex flex-col ml-2">
              <span className="text-sm text-gray-400 font-medium">Seleccionados</span>
              <span className="text-xl font-bold">{selectedKeys.size} Peluches</span>
            </div>

            <div className="flex items-center gap-3">
              {/* BOTÓN ELIMINAR SELECCIÓN */}
              <button
                onClick={() => setShowClearModal(true)}
                disabled={isGeneratingPdf}
                className="p-3 rounded-xl bg-gray-800 text-red-400 hover:bg-gray-700 hover:text-red-300 transition-colors disabled:opacity-50"
                aria-label="Eliminar selección"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>

              {/* BOTÓN EXPORTAR */}
              <button
                onClick={handleExportPDF}
                disabled={isGeneratingPdf}
                className={`
                  px-6 py-3 rounded-xl font-bold text-sm shadow-lg transition-all
                  ${isGeneratingPdf
                    ? 'bg-gray-500 cursor-not-allowed'
                    : 'bg-white text-black hover:bg-gray-100 active:scale-95'
                  }
                `}
              >
                {isGeneratingPdf ? 'Generando...' : 'Exportar PDF'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL CONFIRMAR BORRADO --- */}
      {showClearModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full transform transition-all scale-100">
            <h3 className="text-lg font-bold text-gray-900 mb-2">¿Limpiar carrito?</h3>
            <p className="text-gray-500 mb-6">
              Se eliminarán los {selectedKeys.size} peluches seleccionados de tu lista de exportación.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowClearModal(false)}
                className="px-4 py-2 rounded-lg text-gray-600 font-medium hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleClearSelection}
                className="px-4 py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 shadow-md transition-colors"
              >
                Sí, limpiar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// --- COMPONENTE TARJETA ---
function PokemonCard({ item, isSelected, onToggle }: { item: DisplayCard; isSelected: boolean; onToggle: () => void; }) {
  return (
    <div
      onClick={onToggle}
      className={`relative bg-white rounded-xl overflow-hidden flex flex-col h-full cursor-pointer transition-all duration-200 ${isSelected ? 'ring-2 ring-blue-500 shadow-md transform scale-[0.98]' : 'shadow-sm border border-gray-100'}`}
    >
      <div className={`absolute top-2 left-2 z-10 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${isSelected ? 'bg-blue-500 text-white scale-100' : 'bg-gray-200/50 text-transparent scale-90'}`}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </div>
      <div className="relative aspect-square bg-gray-50 group">
        <div className="flex overflow-x-auto snap-x snap-mandatory w-full h-full scrollbar-hide">
          {item.images.map((imgSrc, idx) => (
            <img key={idx} src={imgSrc} loading="lazy" alt={`${item.name} vista ${idx}`} className="w-full h-full object-contain shrink-0 snap-center p-2 pointer-events-none" />
          ))}
        </div>
        {item.images.length > 1 && (
          <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm pointer-events-none">+{item.images.length - 1}</div>
        )}
      </div>
      <div className={`p-3 border-t relative transition-colors ${isSelected ? 'bg-blue-50 border-blue-100' : 'border-gray-50'}`}>
        {item.variantId > 0 && (
          <span className="absolute top-1 right-3 bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded border border-indigo-200">Var. {item.variantId}</span>
        )}
        <div className="flex justify-between items-baseline mb-1"><span className="text-xs font-bold text-gray-400">#{item.id}</span></div>
        <h3 className="text-sm font-bold text-gray-800 leading-tight">{item.name}</h3>
      </div>
    </div>
  );
}
