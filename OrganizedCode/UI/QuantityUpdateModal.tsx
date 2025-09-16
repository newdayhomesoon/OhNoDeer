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
import { AnimalType } from '../CoreLogic/types';

interface QuantityUpdateModalProps {
  visible: boolean;
  animalType: string;
  onConfirm: (animalType: AnimalType, quantity: number) => void;
  onSkip: () => void;
}

const QuantityUpdateModal: React.FC<QuantityUpdateModalProps> = ({
  visible,
  animalType,
  onConfirm,
  onSkip,
}) => {
  const [selectedAnimal, setSelectedAnimal] = useState<AnimalType>('deer');
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  const handleConfirm = () => {
    onConfirm(selectedAnimal, selectedQuantity);
  };

  const handleSkip = () => {
    onSkip();
  };

  const wildlifeOptions = [
    { key: 'deer', label: 'Deer', icon: '🦌' },
    { key: 'bear', label: 'Bear', icon: '🐻' },
    { key: 'moose_elk', label: 'Moose', icon: '🫎' },
    { key: 'raccoon', label: 'Raccoon', icon: '🦝' },
    { key: 'rabbit', label: 'Rabbit', icon: '🐰' },
    { key: 'small_mammals', label: 'Small Mammals', icon: '🐿️' },
  ];

  const quantities = [1, 2, 3, 4, 5];

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={handleSkip}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Please choose what you saw</Text>
          
          {/* Success Message */}
          <View style={styles.successContainer}>
            <Text style={styles.successIcon}>✅</Text>
            <Text style={styles.successTitle}>Report Submitted!</Text>
            <Text style={styles.successMessage}>
              Your wildlife sighting has been reported. Please provide more details below.
            </Text>
          </View>

          {/* Wildlife Selection */}
          <Text style={styles.sectionTitle}>What type of wildlife did you see?</Text>
          <View style={styles.wildlifeContainer}>
            {wildlifeOptions.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.wildlifeButton,
                  selectedAnimal === option.key && styles.selectedWildlife,
                ]}
                onPress={() => setSelectedAnimal(option.key as AnimalType)}>
                <Text style={styles.wildlifeIcon}>{option.icon}</Text>
                <Text
                  style={[
                    styles.wildlifeText,
                    selectedAnimal === option.key && styles.selectedWildlifeText,
                  ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Quantity Selection */}
          <Text style={styles.sectionTitle}>How many did you see?</Text>
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
              <Text style={styles.confirmButtonText}>Update Report</Text>
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
    marginBottom: theme.spacing.m,
    textAlign: 'center',
    fontFamily: theme.fontFamily.lato,
  },
  successContainer: {
    backgroundColor: theme.colors.secondaryBackground,
    borderRadius: 12,
    padding: theme.spacing.m,
    marginBottom: theme.spacing.xl,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(92, 124, 158, 0.3)',
  },
  successIcon: {
    fontSize: 32,
    marginBottom: theme.spacing.s,
  },
  successTitle: {
    fontSize: theme.fontSize.h3,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.s,
    fontFamily: theme.fontFamily.lato,
  },
  successMessage: {
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: theme.fontFamily.openSans,
  },
  sectionTitle: {
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.m,
    textAlign: 'center',
    fontFamily: theme.fontFamily.lato,
  },
  wildlifeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: theme.spacing.xl,
  },
  wildlifeButton: {
    width: 70,
    height: 70,
    borderRadius: 12,
    backgroundColor: theme.colors.secondaryBackground,
    justifyContent: 'center',
    alignItems: 'center',
    margin: theme.spacing.s,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  selectedWildlife: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  wildlifeIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  wildlifeText: {
    fontSize: theme.fontSize.caption,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    fontFamily: theme.fontFamily.openSans,
  },
  selectedWildlifeText: {
    color: theme.colors.textPrimary,
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
