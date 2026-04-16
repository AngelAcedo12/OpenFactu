import React from 'react';
import { Button } from '@openfactu/ui';
import { Trash2, type LucideIcon } from 'lucide-react';
import { PrintTemplateButton } from './PrintTemplateButton';

export interface PrimaryAction {
  label: string;
  onClick: () => void;
  icon: LucideIcon;
  disabled?: boolean;
  isLoading?: boolean;
}

interface Props {
  docType: string;
  pdfUrl: string;
  onCancel?: () => void;
  showCancel?: boolean;
  cancelLabel?: string;
  isCancelling?: boolean;
  primary?: PrimaryAction;
}

export const DocumentActionBar: React.FC<Props> = ({
  docType,
  pdfUrl,
  onCancel,
  showCancel = true,
  cancelLabel = 'Cancelar',
  isCancelling,
  primary,
}) => {
  const PrimaryIcon = primary?.icon;
  return (
    <div className="flex items-center gap-2">
      {onCancel && showCancel && (
        <Button
          variant="outline"
          onClick={onCancel}
          isLoading={isCancelling}
          className="h-10 gap-2 border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:border-rose-300 dark:hover:border-rose-500/50"
        >
          <Trash2 size={16} />
          <span>{cancelLabel}</span>
        </Button>
      )}
      <PrintTemplateButton docType={docType} pdfUrl={pdfUrl} variant="secondary" />
      {primary && PrimaryIcon && (
        <Button
          onClick={primary.onClick}
          disabled={primary.disabled}
          isLoading={primary.isLoading}
          className="h-10 gap-2"
        >
          <PrimaryIcon size={16} />
          <span>{primary.label}</span>
        </Button>
      )}
    </div>
  );
};
