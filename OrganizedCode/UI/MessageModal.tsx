import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { theme } from '../../src/app-theme';

export type MessageType = 'error' | 'success' | 'warning' | 'info';

export interface MessageModalProps {
  visible: boolean;
  type: MessageType;
  title: string;
  message: string;
  buttons?: Array<{
    text: string;
    onPress: () => void;
    style?: 'default' | 'cancel' | 'destructive';
  }>;
  onRequestClose?: () => void;
}

const MessageModal: React.FC<MessageModalProps> = ({
  visible,
  type,
  title,
  message,
  buttons = [{ text: 'OK', onPress: () => {} }],
  onRequestClose,
}) => {
  const getIcon = () => {
    switch (type) {
      case 'error':
        return '❌';
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return 'ℹ️';
    }
  };

  const getTitleColor = () => {
    switch (type) {
      case 'error':
        return theme.colors.error;
      case 'success':
        return '#10b981'; // Green
      case 'warning':
        return theme.colors.warning;
      case 'info':
        return theme.colors.accent;
      default:
        return theme.colors.textPrimary;
    }
  };

  const getButtonStyle = (buttonStyle?: string) => {
    switch (buttonStyle) {
      case 'cancel':
        return styles.cancelButton;
      case 'destructive':
        return styles.destructiveButton;
      default:
        return styles.primaryButton;
    }
  };

  const getButtonTextStyle = (buttonStyle?: string) => {
    switch (buttonStyle) {
      case 'cancel':
        return styles.cancelButtonText;
      case 'destructive':
        return styles.destructiveButtonText;
      default:
        return styles.primaryButtonText;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>{getIcon()}</Text>
          </View>

          <Text style={[styles.title, { color: getTitleColor() }]}>
            {title}
          </Text>

          <Text style={styles.message}>
            {message}
          </Text>

          <View style={styles.buttonContainer}>
            {buttons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.button,
                  getButtonStyle(button.style),
                  index < buttons.length - 1 && styles.buttonMargin,
                ]}
                onPress={button.onPress}
              >
                <Text style={[
                  styles.buttonText,
                  getButtonTextStyle(button.style)
                ]}>
                  {button.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.l,
  },
  modalContainer: {
    backgroundColor: theme.colors.secondaryBackground,
    borderRadius: 20,
    padding: theme.spacing.xl,
    alignItems: 'center',
    maxWidth: 380,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  iconContainer: {
    marginBottom: theme.spacing.m,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontSize: theme.fontSize.h2,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: theme.spacing.m,
    fontFamily: theme.fontFamily.lato,
  },
  message: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing.xl,
    fontFamily: theme.fontFamily.openSans,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: theme.spacing.m,
    paddingHorizontal: theme.spacing.l,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonText: {
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    fontFamily: theme.fontFamily.openSans,
  },
  buttonMargin: {
    marginRight: theme.spacing.s,
  },
  primaryButton: {
    backgroundColor: theme.colors.accent,
  },
  primaryButtonText: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    fontFamily: theme.fontFamily.openSans,
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  cancelButtonText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    fontFamily: theme.fontFamily.openSans,
  },
  destructiveButton: {
    backgroundColor: theme.colors.error,
  },
  destructiveButtonText: {
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    fontFamily: theme.fontFamily.openSans,
  },
});

export default MessageModal;