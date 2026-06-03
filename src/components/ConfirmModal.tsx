import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
    title?: string;
    message: string | ReactNode;
    confirmText?: string;
    isProcessing?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}
export function ConfirmModal({
    title = "Confirmar eliminación",
    message,
    confirmText = "Sí, dar de baja",
    isProcessing = false,
    onConfirm,
    onCancel
}: ConfirmModalProps) {
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onCancel} />
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full"
            >
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                        <AlertTriangle size={20} className="text-red-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 mb-1">{title}</h3>
                        <p className="text-sm text-slate-500">{message}</p>
                    </div>
                </div>
                <div className="flex gap-3 mt-6">
                    <button
                        onClick={onCancel}
                        disabled={isProcessing}
                        className="flex-1 h-10 rounded-xl font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors text-sm disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isProcessing}
                        className="flex-1 h-10 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition-colors text-sm disabled:opacity-50"
                    >
                        {isProcessing ? 'Eliminando...' : confirmText}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
