import React, { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Home,
  Bike,
  TrendingUp,
  Plus,
  User,
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
    id: "painel",
    title: "Seu Painel",
    description:
      "Aqui você vê um resumo rápido dos seus gastos totais, quantidade de motos e tarefas aguardando atenção.",
    targetElement: ".tutorial-painel",
    route: "/",
    icon: Home,
  },
  {
    id: "garagem",
    title: "Garagem",
    description:
      "Gerencie todas as suas motos aqui. Adicione novas, visualize detalhes e acompanhe manutenção.",
    targetElement: ".tutorial-garagem",
    route: "/garagem",
    icon: Bike,
  },
  {
    id: "diagnostico",
    title: "Relatórios",
    description:
      "Visualize gráficos detalhados sobre seus gastos e acompanhe padrões de manutenção.",
    targetElement: ".tutorial-diagnostico",
    route: "/diagnostico",
    icon: TrendingUp,
  },
  {
    id: "quick-actions",
    title: "Ações Rápidas",
    description:
      "Use o botão + para adicionar rapidamente motos, gastos ou tarefas sem sair da home.",
    targetElement: ".tutorial-quick-action",
    route: "/",
    icon: Plus,
  },
  {
    id: "perfil",
    title: "Seu Perfil",
    description:
      "Acesse suas informações pessoais, notificações, modo escuro e outras configurações.",
    targetElement: ".tutorial-perfil",
    route: "/",
    icon: User,
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

  // Navegar para a rota correta se não estiver lá - apenas quando o step muda
  useEffect(() => {
    // Evitar navegação repetida para o mesmo step
    if (lastNavigatedStepRef.current !== currentStep) {
      navigate(step.route);
      lastNavigatedStepRef.current = currentStep;
    }
  }, [currentStep, step.route, navigate]);

  useEffect(() => {
    // Pequeno delay para garantir que o elemento foi renderizado após navegação
    const timer = setTimeout(() => {
      const updateHighlight = () => {
        const element = document.querySelector(step.targetElement);
        if (element) {
          const rect = element.getBoundingClientRect();
          setHighlight({
            top: rect.top + window.scrollY,
            left: rect.left + window.scrollX,
            width: rect.width,
            height: rect.height,
          });
        } else {
          setHighlight(null);
        }
      };

      updateHighlight();
      window.addEventListener("resize", updateHighlight);
      return () => window.removeEventListener("resize", updateHighlight);
    }, 300);

    return () => clearTimeout(timer);
  }, [step.targetElement, currentStep]);

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      markTutorialViewed();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    markTutorialViewed();
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] pointer-events-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Overlay opaco que bloqueia interação com fundo */}
        <div
          className="absolute inset-0 bg-black/40 pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        />

        {/* Highlight com spotlight */}
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

            {/* Tooltip */}
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

                  // Se houver espaço abaixo (tooltip + gap)
                  if (bottomSpace >= tooltipHeight + gap) {
                    return highlight.top + highlight.height + gap;
                  }
                  // Se houver espaço acima (tooltip + gap)
                  else if (topSpace >= tooltipHeight + gap) {
                    return highlight.top - tooltipHeight - gap;
                  }
                  // Se não couber em nenhum lugar, centralizar verticalmente
                  else {
                    return Math.max(
                      8,
                      window.innerHeight / 2 - tooltipHeight / 2,
                    );
                  }
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

              {/* Progress */}
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

              {/* Controls */}
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
