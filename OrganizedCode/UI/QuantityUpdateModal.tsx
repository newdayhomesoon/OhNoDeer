import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { theme } from '../../src/app-theme';

interface QuantityUpdateModalProps {
  visible: boolean;
  animalType: string;
  onConfirm: (quantity: number) => void;
  onSkip: () => void;
}

const QuantityUpdateModal: React.FC<QuantityUpdateModalProps> = ({
  visible,
  animalType,
  onConfirm,
  onSkip,
}) => {
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  const handleConfirm = () => {
    onConfirm(selectedQuantity);
  };

  const handleSkip = () => {
    onSkip();
  };

  const quantities = [1, 2, 3, 4, 5];

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={handleSkip}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Update Quantity</Text>
          <Text style={styles.subtitle}>
            How many {animalType}s did you see?
          </Text>

          <View style={styles.quantityContainer}>
            {quantities.map(quantity => (
              <TouchableOpacity
                key={quantity}
                style={[
                  styles.quantityButton,
                  selectedQuantity === quantity && styles.selectedQuantity,
                ]}
                onPress={() => setSelectedQuantity(quantity)}>
                <Text
                  style={[
                    styles.quantityText,
                    selectedQuantity === quantity &&
                      styles.selectedQuantityText,
                  ]}>
                  {quantity}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.skipButton]}
              onPress={handleSkip}>
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.confirmButton]}
              onPress={handleConfirm}>
              <Text style={styles.confirmButtonText}>Update</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.m,
  },
  modal: {
    backgroundColor: theme.colors.primaryBackground,
    borderRadius: 16,
    padding: theme.spacing.xl,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  title: {
    fontSize: theme.fontSize.h2,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.s,
    fontFamily: theme.fontFamily.lato,
  },
  subtitle: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    fontFamily: theme.fontFamily.openSans,
  },
  quantityContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: theme.spacing.xl,
  },
  quantityButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.secondaryBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: theme.spacing.s,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  selectedQuantity: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  quantityText: {
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontFamily: theme.fontFamily.openSans,
  },
  selectedQuantityText: {
    color: theme.colors.textPrimary,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: theme.spacing.m,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: theme.spacing.s,
  },
  skipButton: {
    backgroundColor: theme.colors.secondaryBackground,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  confirmButton: {
    backgroundColor: theme.colors.accent,
  },
  skipButtonText: {
    color: theme.colors.textSecondary,
    fontWeight: '600',
    fontFamily: theme.fontFamily.openSans,
  },
  confirmButtonText: {
    color: theme.colors.textPrimary,
    fontWeight: '600',
    fontFamily: theme.fontFamily.openSans,
  },
});

export default QuantityUpdateModal;
