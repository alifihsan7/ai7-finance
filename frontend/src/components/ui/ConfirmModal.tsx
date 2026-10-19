import React from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { CustomModal } from "./CustomModal";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  loading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Konfirmasi Tindakan",
  message = "Apakah kamu yakin ingin melanjutkan tindakan ini?",
  confirmText = "Konfirmasi",
  cancelText = "Batal",
  danger = true,
  loading = false,
}: ConfirmModalProps) {
  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      icon={danger ? <Trash2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
      accent={danger ? "coral" : "amber"}
      maxWidth="sm"
    >
      <div className="space-y-5">
        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
          {message}
        </p>

        <div className="flex justify-end gap-3 pt-3 border-t border-white/[0.08]">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 text-xs sm:text-sm font-medium text-zinc-400 hover:text-white border border-white/[0.08] hover:border-white/[0.16] rounded-2xl transition cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-5 py-2.5 text-xs sm:text-sm font-bold rounded-2xl transition inline-flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50 ${
              danger
                ? "bg-coralFall text-slate-950 hover:brightness-110"
                : "bg-amberGold text-slate-950 hover:bg-amber-300"
            }`}
          >
            {loading ? "Memproses..." : confirmText}
          </button>
        </div>
      </div>
    </CustomModal>
  );
}
