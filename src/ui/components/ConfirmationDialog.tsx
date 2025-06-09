import React from 'react';
import Button from './Button';

interface ConfirmationDialogProps {
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  onConfirm,
  onCancel,
  title,
  message
}) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
    <div className="bg-gray-900 border border-cyan-400/30 rounded-xl p-6 max-w-md w-full mx-4 shadow-glow-sm">
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-neutral-300 mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <Button variant="default" size="small" onClick={onCancel}>Cancel</Button>
        <Button variant="brand" size="small" onClick={onConfirm}>Confirm</Button>
      </div>
    </div>
  </div>
);

export default ConfirmationDialog;