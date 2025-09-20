import { useState } from 'react';
import MessageModal, { MessageType, MessageModalProps } from './MessageModal';

export interface MessageOptions {
  type?: MessageType;
  title: string;
  message: string;
  buttons?: Array<{
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
  }>;
}

export const useMessageModal = () => {
  const [modalProps, setModalProps] = useState<MessageModalProps>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    buttons: [{ text: 'OK', onPress: () => {} }],
  });

  const showMessage = (options: MessageOptions) => {
    const { type = 'info', title, message, buttons = [{ text: 'OK' }] } = options;

    setModalProps({
      visible: true,
      type,
      title,
      message,
      buttons: buttons.map(button => ({
        text: button.text,
        onPress: () => {
          button.onPress?.();
          hideMessage();
        },
        style: button.style,
      })),
      onRequestClose: hideMessage,
    });
  };

  const hideMessage = () => {
    setModalProps(prev => ({ ...prev, visible: false }));
  };

  const MessageModalComponent = () => {
    return modalProps.visible ? <MessageModal {...modalProps} /> : null;
  };

  return {
    showMessage,
    hideMessage,
    MessageModalComponent,
  };
};

// Utility function to replace Alert.alert calls
export const showAlert = (
  title: string,
  message?: string,
  buttons?: Array<{
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
  }>,
  type: MessageType = 'info'
) => {
  // This would need to be called from a component that has access to the modal
  // For now, we'll create a global instance
  console.warn('showAlert called - this should be replaced with useMessageModal hook in components');
};

// Helper functions for common alert types
export const showErrorAlert = (title: string, message: string) => ({
  type: 'error' as MessageType,
  title,
  message,
});

export const showSuccessAlert = (title: string, message: string) => ({
  type: 'success' as MessageType,
  title,
  message,
});

export const showWarningAlert = (title: string, message: string) => ({
  type: 'warning' as MessageType,
  title,
  message,
});

export const showInfoAlert = (title: string, message: string) => ({
  type: 'info' as MessageType,
  title,
  message,
});