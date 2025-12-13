import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter, Button } from './ui';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
  confirmText?: string;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  isDestructive = false,
  confirmText
}) => {
  const { t } = useTranslation();

  return (
    <Modal isOpen={isOpen} onClose={onCancel} size="sm">
      <ModalHeader>
        <ModalTitle>
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-full ${isDestructive ? 'bg-red-500/10 text-red-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
              {isDestructive ? <Trash2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            {title}
          </div>
        </ModalTitle>
      </ModalHeader>

      <ModalBody>
        <p className="text-slate-400 text-sm leading-relaxed">
          {message}
        </p>
      </ModalBody>

      <ModalFooter>
        <Button variant="ghost" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button
          variant={isDestructive ? 'danger' : 'primary'}
          onClick={onConfirm}
        >
          {confirmText || (isDestructive ? t('common.delete') : t('common.confirm'))}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default ConfirmModal;
