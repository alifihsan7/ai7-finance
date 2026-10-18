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
        <p className="text-xs sm:text-sm text-slateText-secondary leading-relaxed">
          {message}
        </p>

        <div className="flex justify-end gap-3 pt-2 border-t border-obsidian-border/50">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 text-xs sm:text-sm font-medium text-slateText-secondary hover:text-slateText-primary border border-obsidian-border hover:border-obsidian-borderStrong rounded-xl transition"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition inline-flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50 ${
              danger
                ? "bg-coralFall text-[#0B0D11] hover:brightness-110"
                : "bg-amberGold text-[#0B0D11] hover:brightness-110"
            }`}
          >
            {loading ? "Memproses..." : confirmText}
          </button>
        </div>
      </div>
    </CustomModal>
  );
}
