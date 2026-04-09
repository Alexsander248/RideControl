import React from "react";
import { useApp } from "../context/AppContext";
import { Plus, ChevronRight, Gauge, Star } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "motion/react";

export const Garage: React.FC = () => {
  const { bikes } = useApp();
  const location = useLocation();
  const isTutorialMode =
    new URLSearchParams(location.search).get("tutorial") === "1";

  const tutorialBike = {
    id: "tutorial-bike",
    name: "YAMAHA YZF R-3 321/ABS",
    model: "YZF R-3 321/ABS",
    year: 2021,
    currentKm: 100,
    photoUrl: "/icons/motoTutorial.jpg",
    purchasePrice: 26317,
    isFavorite: true,
  };

  const displayBikes = isTutorialMode ? [tutorialBike, ...bikes] : bikes;

  const sortedBikes = [...displayBikes].sort((a, b) => {
    if (Boolean(a.isFavorite) === Boolean(b.isFavorite)) return 0;
    return a.isFavorite ? -1 : 1;
  });

  return (
    <div className="p-6">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Garagem</h1>
          <p className="text-gray-500 font-medium">Gerencie suas motos</p>
        </div>
        <Link
          to="/adicionar-moto"
          className="tutorial-garagem-add bg-blue-500 text-white p-3 rounded-2xl shadow-lg shadow-blue-200 transition-transform active:scale-95"
        >
          <Plus size={24} />
        </Link>
      </header>

      <div className="tutorial-garagem space-y-4">
        {sortedBikes.length === 0 ? (
          <div className="bg-white rounded-[32px] p-12 text-center border-2 border-dashed border-gray-100">
            <div className="bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-500">
              <Plus size={32} />
            </div>
            <h3 className="text-lg font-bold mb-2">Nenhuma moto cadastrada</h3>
            <p className="text-gray-500 text-sm mb-6">
              Adicione sua primeira moto para começar a registrar gastos e
              manutenções.
            </p>
            <Link
              to="/adicionar-moto"
              className="inline-block bg-blue-500 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-blue-200"
            >
              Adicionar moto
            </Link>
          </div>
        ) : (
          sortedBikes.map((bike, index) => (
            <motion.div
              key={bike.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link
                to={`/moto/${bike.id}`}
                className="bg-white rounded-[32px] p-4 flex items-center gap-4 shadow-sm border border-gray-50 transition-transform active:scale-[0.98]"
              >
                <div className="w-24 h-24 rounded-[24px] overflow-hidden bg-gray-100 flex-shrink-0">
                  <img
                    src={
                      bike.photoUrl ||
                      `https://picsum.photos/seed/${bike.id}/200/200`
                    }
                    alt={bike.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <h3 className="text-lg font-bold truncate">{bike.name}</h3>
                    {bike.isFavorite && (
                      <Star
                        size={16}
                        className="text-yellow-500 shrink-0"
                        fill="currentColor"
                        aria-label="Moto favoritada"
                      />
                    )}
                  </div>
                  <p className="text-gray-500 text-sm mb-2">
                    {bike.model} - {bike.year}
                  </p>
                  <div className="flex items-center gap-1.5 text-blue-600 font-bold text-sm bg-blue-50 w-fit px-3 py-1 rounded-full">
                    <Gauge size={14} />
                    <span>{bike.currentKm.toLocaleString()} KM</span>
                  </div>
                </div>
                <div className="text-gray-300 pr-2">
                  <ChevronRight size={24} />
                </div>
              </Link>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};
