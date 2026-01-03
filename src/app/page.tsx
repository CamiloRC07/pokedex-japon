'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';

// --- TIPOS (Iguales a los tuyos) ---
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

const ITEMS_PER_PAGE = 40; // Cantidad de carga inicial y por scroll

export default function Home() {
  const [rawData, setRawData] = useState<PokemonData[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // ESTADO NUEVO: Controla cuántos items mostramos actualmente
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  // REF NUEVO: Para detectar cuando llegamos al final de la página
  const observerTarget = useRef<HTMLDivElement>(null);

  // 1. Cargar datos al inicio
  useEffect(() => {
    fetch('/pokedex_fit.json')
      .then((res) => res.json())
      .then((data) => {
        setRawData(data);
        setLoading(false);
      })
      .catch(err => console.error("Error cargando JSON:", err));
  }, []);

  // 2. Lógica de Filtrado y Aplanamiento (Calcula TODOS los resultados posibles)
  // Renombrado a 'fullFilteredList' para diferenciarlo de lo que se ve
  const fullFilteredList = useMemo(() => {
    const term = search.toLowerCase();
    const result: DisplayCard[] = [];

    const filteredPokemon = rawData.filter((p) => 
      p.name.toLowerCase().includes(term) || 
      p.id.toString().includes(term)
    );

    for (const poke of filteredPokemon) {
      if (!poke.groups || poke.groups.length === 0) continue;
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
  }, [search, rawData]);

  // 3. Lógica de Recorte (Lo que realmente pintamos en el DOM)
  const visibleList = useMemo(() => {
    return fullFilteredList.slice(0, visibleCount);
  }, [fullFilteredList, visibleCount]);

  // 4. Función para cargar más (Infinite Scroll)
  const loadMore = useCallback(() => {
    if (visibleCount < fullFilteredList.length) {
      setVisibleCount(prev => prev + ITEMS_PER_PAGE);
    }
  }, [visibleCount, fullFilteredList.length]);

  // 5. Observer: Detecta cuando el usuario ve el final de la lista
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 1.0 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) observer.unobserve(observerTarget.current);
    };
  }, [loadMore]);

  // 6. SOLUCIÓN AL ERROR: Resetear scroll en el evento del Input
  // Esto evita el ciclo infinito de renders del useEffect anterior
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setVisibleCount(ITEMS_PER_PAGE); // Reseteamos la paginación
    window.scrollTo(0, 0); // Volvemos arriba
  };

  if (loading) return <div className="p-10 text-center text-gray-500">Cargando Pokedex...</div>;

  return (
    <main className="min-h-screen bg-gray-100 pb-20">

      {/* --- HEADER / BUSCADOR --- */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md px-4 py-3 shadow-sm border-b border-gray-200 text-gray-600">
        <input
          type="text"
          placeholder="Buscar (Nombre o N°)..."
          className="w-full p-3 rounded-xl bg-gray-100 text-lg border border-transparent focus:bg-white focus:border-blue-500 focus:ring-0 transition-all outline-none"
          value={search}
          onChange={handleSearchChange} /* <--- USAMOS LA NUEVA FUNCIÓN AQUÍ */
        />
        <div className="text-xs text-gray-400 mt-2 text-right">
          Mostrando {visibleList.length} de {fullFilteredList.length} Pokémon
        </div>
      </div>

      {/* --- GRILLA --- */}
      {/* Mapeamos visibleList en lugar de la lista completa */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 p-3">
        {visibleList.map((item) => (
          <PokemonCard key={item.uniqKey} item={item} />
        ))}
      </div>

      {/* --- ESTADOS --- */}
      
      {/* 1. No hay resultados */}
      {visibleList.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          No se encontraron Pokémon.
        </div>
      )}

      {/* 2. Loader Invisible (Trigger del Scroll Infinito) */}
      {/* Solo aparece si hay más elementos por cargar */}
      {visibleList.length < fullFilteredList.length && (
        <div 
          ref={observerTarget} 
          className="h-20 flex items-center justify-center text-gray-400 text-sm"
        >
          Cargando más...
        </div>
      )}

    </main>
  );
}

// --- COMPONENTE TARJETA (Tu código original intacto) ---
function PokemonCard({ item }: { item: DisplayCard }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
      <div className="relative aspect-square bg-gray-50 group">
        <div className="flex overflow-x-auto snap-x snap-mandatory w-full h-full scrollbar-hide">
          {item.images.map((imgSrc, idx) => (
            <img
              key={idx}
              src={imgSrc}
              loading="lazy"
              alt={`${item.name} vista ${idx}`}
              className="w-full h-full object-contain flex-shrink-0 snap-center p-2"
            />
          ))}
        </div>
        {item.images.length > 1 && (
          <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm pointer-events-none">
            +{item.images.length - 1}
          </div>
        )}
      </div>
      <div className="p-3 border-t border-gray-50 relative">
        {item.variantId > 0 && (
          <span className="absolute top-1 right-3 bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded border border-indigo-200">
            Var. {item.variantId}
          </span>
        )}
        <div className="flex justify-between items-baseline mb-1">
          <span className="text-xs font-bold text-gray-400">#{item.id}</span>
        </div>
        <h3 className="text-sm font-bold text-gray-800 leading-tight">
          {item.name}
        </h3>
      </div>
    </div>
  );
}