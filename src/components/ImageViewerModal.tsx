import React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";

interface ImageViewerModalProps {
  isOpen: boolean;
  src: string;
  alt: string;
  onClose: () => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  isOpen,
  src,
  alt,
  onClose,
}) => {
  React.useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
            aria-label="Fechar visualização da imagem"
          />

          <motion.div
            className="relative z-10 w-full max-w-3xl"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
          >
            <div className="flex justify-end mb-4">
              <button
                type="button"
                onClick={onClose}
                className="p-3 rounded-full bg-white/10 text-white backdrop-blur-md transition-transform active:scale-95"
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            <img
              src={src}
              alt={alt}
              className="w-full max-h-[80vh] rounded-[28px] object-contain bg-black/30 shadow-2xl"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
