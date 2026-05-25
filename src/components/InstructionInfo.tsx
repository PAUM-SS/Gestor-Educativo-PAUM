import React, { useState } from 'react';
import { Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface InfoPanelProps {
  title: string;
  content: string;
}

export default function InfoPanel({ title, content }: InfoPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-xs font-bold text-gb-accent uppercase tracking-wider hover:text-gb-primary transition-colors cursor-pointer"
      >
        <Info size={16} />
        {isOpen ? 'Ocultar Instrucciones' : `Instructivo: ${title}`}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 p-4 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-sm leading-relaxed"
          >
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-2 right-2 text-slate-400 hover:text-slate-600"
            >
              <X size={16} />
            </button>
            <p className="font-semibold text-gb-secondary mb-1">Guía de llenado:</p>
            <p>{content}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

