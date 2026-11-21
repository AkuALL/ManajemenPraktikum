import { Alert, Platform } from 'react-native';

export type ConfirmActionOptions = {
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
};

type ConfirmDialogHandler = (options: ConfirmActionOptions) => void;

let activeConfirmHandler: ConfirmDialogHandler | null = null;

/** Mendaftarkan host modal konfirmasi global agar confirmAction memakai dialog aplikasi. */
export function registerConfirmDialogHandler(handler: ConfirmDialogHandler): () => void {
  activeConfirmHandler = handler;
  return () => {
    if (activeConfirmHandler === handler) {
      activeConfirmHandler = null;
    }
  };
}

export function showAlert(title: string, message: string): void {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert(`${title}\n\n${message}`);
    }
    return;
  }

  Alert.alert(title, message);
}

export function confirmAction(options: ConfirmActionOptions): void {
  if (activeConfirmHandler) {
    activeConfirmHandler(options);
    return;
  }

  const { title, message, confirmText, cancelText = 'Batal', destructive = false, onConfirm, onCancel } =
    options;

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      if (window.confirm(`${title}\n\n${message}`)) {
        onConfirm();
      } else {
        onCancel?.();
      }
      return;
    }
    onConfirm();
    return;
  }

  Alert.alert(title, message, [
    { text: cancelText, style: 'cancel', onPress: onCancel },
    {
      text: confirmText,
      style: destructive ? 'destructive' : 'default',
      onPress: onConfirm,
    },
  ]);
}
