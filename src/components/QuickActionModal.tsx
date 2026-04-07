import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Fuel, Wrench, Package, CheckSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface QuickActionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickActionModal: React.FC<QuickActionModalProps> = ({
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();

  const actions = [
    {
      icon: Fuel,
      label: "Adicionar combustível",
      color: "bg-orange-500",
      path: "/adicionar-gasto?type=Combustivel",
    },
    {
      icon: Wrench,
      label: "Manutenção",
      color: "bg-blue-500",
      path: "/adicionar-gasto?type=Manutencao",
    },
    {
      icon: Package,
      label: "Peças",
      color: "bg-green-500",
      path: "/adicionar-gasto?type=Pecas",
    },
    {
      icon: CheckSquare,
      label: "Adicionar tarefas",
      color: "bg-purple-500",
      path: "/adicionar-tarefa",
    },
  ];

  const handleAction = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] p-8 z-[70] pb-12"
          >
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-bold">Ações rápidas</h2>
              <button
                onClick={onClose}
                className="p-2 bg-gray-100 rounded-full text-gray-500"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {actions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => handleAction(action.path)}
                  className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-gray-50 transition-transform active:scale-95"
                >
                  <div
                    className={`${action.color} p-4 rounded-xl text-white shadow-lg`}
                  >
                    <action.icon size={24} />
                  </div>
                  <span className="font-semibold text-sm">{action.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
