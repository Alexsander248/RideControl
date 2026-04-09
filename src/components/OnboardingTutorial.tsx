import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import {
  Bike,
  ChevronLeft,
  ChevronRight,
  Fuel,
  Home,
  Package,
  Plus,
  TrendingUp,
  Wrench,
  X,
} from "lucide-react";
import { useApp } from "../context/AppContext";

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetElement: string;
  route: string;
  icon: React.ComponentType<{ size?: number }>;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "garagem",
    title: "Garagem",
    description:
      "Aqui ficam suas motos cadastradas, com acesso rápido aos detalhes de cada uma.",
    targetElement: ".tutorial-garagem",
    route: "/garagem?tutorial=1",
    icon: Bike,
  },
  {
    id: "garagem-add",
    title: "Adicionar Moto",
    description: "Use o botão + para cadastrar uma nova moto na sua garagem.",
    targetElement: ".tutorial-garagem-add",
    route: "/garagem?tutorial=1",
    icon: Plus,
  },
  {
    id: "add-bike",
    title: "Cadastrar Moto",
    description:
      "Nesta tela você cadastra uma moto com foto, modelo, ano, quilometragem e valor de compra.",
    targetElement: ".tutorial-add-bike",
    route: "/adicionar-moto?tutorial=1",
    icon: Bike,
  },
  {
    id: "garage-with-bike",
    title: "Moto Cadastrada",
    description:
      "Após salvar, a moto passa a aparecer na garagem para gerenciamento e consulta.",
    targetElement: ".tutorial-garagem",
    route: "/garagem?tutorial=1",
    icon: Bike,
  },
  {
    id: "quick-actions",
    title: "Ações Rápidas",
    description:
      "Use o botão + para abrir atalhos e registrar informações sem sair da tela principal.",
    targetElement: ".tutorial-quick-action",
    route: "/?tutorial=1",
    icon: Plus,
  },
  {
    id: "add-expense",
    title: "Adicionar Gastos",
    description:
      "Nesta tela você registra seus gastos e escolhe a categoria adequada para cada lançamento.",
    targetElement: ".tutorial-add-expense",
    route: "/adicionar-gasto?type=Combustivel&tutorial=1&bikeId=tutorial-bike",
    icon: Fuel,
  },
  {
    id: "add-expense-combustivel",
    title: "Categoria Combustível",
    description:
      "Use Combustível para registrar abastecimentos com valor, litros e quilometragem.",
    targetElement: ".tutorial-expense-category-Combustivel",
    route: "/adicionar-gasto?type=Combustivel&tutorial=1&bikeId=tutorial-bike",
    icon: Fuel,
  },
  {
    id: "add-expense-manutencao",
    title: "Categoria Manutenção",
    description:
      "Use Manutenção para serviços como revisão, troca de óleo e ajustes mecânicos.",
    targetElement: ".tutorial-expense-category-Manutencao",
    route: "/adicionar-gasto?type=Manutencao&tutorial=1&bikeId=tutorial-bike",
    icon: Wrench,
  },
  {
    id: "add-expense-pecas",
    title: "Categoria Peças",
    description: "Use Peças para compras de componentes e reposições da moto.",
    targetElement: ".tutorial-expense-category-Pecas",
    route: "/adicionar-gasto?type=Pecas&tutorial=1&bikeId=tutorial-bike",
    icon: Package,
  },
  {
    id: "add-expense-outros",
    title: "Categoria Outros",
    description:
      "Use Outros para despesas que não se encaixam nas categorias principais.",
    targetElement: ".tutorial-expense-category-Outros",
    route: "/adicionar-gasto?type=Outros&tutorial=1&bikeId=tutorial-bike",
    icon: Plus,
  },
  {
    id: "diagnostico",
    title: "Relatórios",
    description:
      "No diagnóstico você acompanha indicadores, gráficos e atividades para análise de custos.",
    targetElement: ".tutorial-diagnostico",
    route: "/diagnostico?tutorial=1",
    icon: TrendingUp,
  },
  {
    id: "painel",
    title: "Painel Inicial",
    description:
      "No painel você visualiza o resumo geral do app com visão rápida das informações principais.",
    targetElement: ".tutorial-painel",
    route: "/?tutorial=1",
    icon: Home,
  },
];

interface Highlight {
  top: number;
  left: number;
  width: number;
  height: number;
}

export const OnboardingTutorial: React.FC = () => {
  const { markTutorialViewed } = useApp();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const lastNavigatedStepRef = useRef<number>(-1);

  const step = TUTORIAL_STEPS[currentStep];
  const Icon = step.icon;

  useEffect(() => {
    if (lastNavigatedStepRef.current !== currentStep) {
      navigate(step.route);
      lastNavigatedStepRef.current = currentStep;
    }
  }, [currentStep, navigate, step.route]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const updateHighlight = () => {
        const element = document.querySelector(step.targetElement);
        if (!element) {
          setHighlight(null);
          return;
        }

        const rect = element.getBoundingClientRect();
        setHighlight({
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height,
        });
      };

      updateHighlight();
      window.addEventListener("resize", updateHighlight);
      return () => window.removeEventListener("resize", updateHighlight);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [currentStep, step.targetElement]);

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
      return;
    }

    markTutorialViewed();
    navigate("/", { replace: true });
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    markTutorialViewed();
    navigate("/", { replace: true });
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] pointer-events-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div
          className="absolute inset-0 bg-black/40 pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        />

        {highlight && (
          <>
            <motion.div
              className="absolute bg-white/0 border-2 border-white rounded-[24px] pointer-events-auto"
              style={{
                top: highlight.top - 8,
                left: highlight.left - 8,
                width: highlight.width + 16,
                height: highlight.height + 16,
              }}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <motion.div
                className="absolute inset-0 rounded-[20px] border border-white/50"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{
                  duration: 2,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                }}
              />
            </motion.div>

            <motion.div
              className="fixed max-w-xs bg-white rounded-[24px] shadow-2xl shadow-black/20 p-6 pointer-events-auto"
              initial={{ opacity: 0, y: 12, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.92 }}
              transition={{ duration: 0.3, ease: "easeOut", delay: 0.1 }}
              style={{
                top: (() => {
                  const tooltipHeight = 280;
                  const gap = 16;
                  const bottomSpace =
                    window.innerHeight - (highlight.top + highlight.height);
                  const topSpace = highlight.top;

                  if (bottomSpace >= tooltipHeight + gap) {
                    return highlight.top + highlight.height + gap;
                  }
                  if (topSpace >= tooltipHeight + gap) {
                    return highlight.top - tooltipHeight - gap;
                  }
                  return Math.max(
                    8,
                    window.innerHeight / 2 - tooltipHeight / 2,
                  );
                })(),
                left: Math.max(
                  16,
                  Math.min(
                    highlight.left + highlight.width / 2 - 150,
                    window.innerWidth - 320,
                  ),
                ),
              }}
            >
              <div className="flex items-start gap-4 mb-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
                  <Icon size={22} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-black text-gray-900">
                    {step.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed mt-1">
                    {step.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-4">
                {TUTORIAL_STEPS.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-1 rounded-full flex-1 transition-colors ${
                      idx <= currentStep ? "bg-blue-500" : "bg-gray-200"
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleSkip}
                  className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Pular
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handlePrev}
                    disabled={currentStep === 0}
                    className="p-2 rounded-lg bg-gray-100 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white font-bold hover:bg-blue-600 transition-colors"
                  >
                    {currentStep === TUTORIAL_STEPS.length - 1 ? (
                      <>
                        <span>Concluir</span>
                        <X size={18} />
                      </>
                    ) : (
                      <>
                        <span>Próximo</span>
                        <ChevronRight size={18} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
