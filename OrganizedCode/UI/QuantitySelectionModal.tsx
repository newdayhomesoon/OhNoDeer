import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Image,
} from 'react-native';
import {Buffer} from 'buffer';
import {AnimalType} from '../CoreLogic/types';
import { theme } from '../../src/app-theme';

type QuantitySelectionModalProps = {
  visible: boolean;
  animalType: AnimalType;
  onSelect: (quantity: number) => void;
  onClose: () => void;
  onBack: () => void;
};

const getAnimalEmoji = (animal: AnimalType): string => {
  switch (animal) {
    case 'deer':
      return '🦌';
    case 'bear':
      return '🐻';
    case 'moose_elk':
      return '🫎';
    case 'raccoon':
      return '🦝';
    case 'rabbit':
      return '�';
    case 'small_mammals':
      return '�️';
    default:
      return '❓';
  }
};

const QuantitySelectionModal: React.FC<QuantitySelectionModalProps> = ({
  visible,
  animalType,
  onSelect,
  onClose,
  onBack,
}) => {
const animalLabel = (animal: AnimalType): string => {
  switch (animal) {
    case 'deer':
      return 'Deer';
    case 'bear':
      return 'Bear';
    case 'moose_elk':
      return 'Moose/Elk';
    case 'raccoon':
      return 'Raccoon';
    case 'rabbit':
      return 'Rabbit';
    case 'small_mammals':
      return 'Small Mammals';
    default:
      return 'Unknown';
  }
};  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            How many {animalLabel(animalType).toLowerCase()}s did you see?
          </Text>

          <View style={styles.quantityContainer}>
            {[1, 2, 3].map(quantity => (
              <TouchableOpacity
                key={quantity}
                style={styles.quantityButton}
                onPress={() => onSelect(quantity)}>
                <View style={styles.animalsContainer}>
                  {Array(quantity)
                    .fill(0)
                    .map((_, i) => (
                      <Image
                        key={i}
                        source={{
                          uri: `data:image/svg+xml;base64,${Buffer.from(
                            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                            <text x="12" y="16" font-size="14" text-anchor="middle">${getAnimalEmoji(
                              animalType,
                            )}</text>
                          </svg>`,
                            'utf8',
                          ).toString('base64')}`,
                        }}
                        style={styles.animalImage}
                        resizeMode="contain"
                      />
                    ))}
                </View>
                <Text style={styles.quantityText}>
                  {quantity} {quantity === 1 ? animalLabel(animalType) : `${animalLabel(animalType)}s`}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[styles.quantityButton, styles.manyButton]}
              onPress={() => onSelect(4)}>
              <Text style={[styles.quantityText, styles.manyText]}>4+</Text>
              <Text style={styles.quantitySubtext}>
                Many {animalLabel(animalType).toLowerCase()}s
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.backButton]}
              onPress={onBack}>
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.m,
  },
  modalContent: {
    backgroundColor: theme.colors.primaryBackground,
    borderRadius: 20,
    padding: theme.spacing.xl,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: theme.fontSize.h2,
    fontWeight: '700',
    marginBottom: theme.spacing.xl,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    fontFamily: theme.fontFamily.lato,
  },
  quantityText: {
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginTop: theme.spacing.s,
    fontFamily: theme.fontFamily.openSans,
  },
  quantityContainer: {
    width: '100%',
    paddingHorizontal: theme.spacing.s,
    marginBottom: theme.spacing.l,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  quantityButton: {
    width: '48%',
    height: 100,
    borderRadius: 16,
    backgroundColor: theme.colors.secondaryBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.m,
    padding: theme.spacing.s,
  },
  animalsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: theme.spacing.s,
    minHeight: 40,
    alignItems: 'center',
  },
  animalImage: {
    width: 30,
    height: 30,
    margin: theme.spacing.s,
  },
  manyText: {
    fontSize: theme.fontSize.h2,
    marginBottom: theme.spacing.s,
    color: theme.colors.textPrimary,
    fontFamily: theme.fontFamily.lato,
  },
  quantitySubtext: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.textSecondary,
    fontFamily: theme.fontFamily.openSans,
  },
  manyButton: {
    backgroundColor: theme.colors.secondaryBackground,
    borderStyle: 'dashed',
    borderColor: theme.colors.textSecondary,
    borderWidth: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: theme.spacing.s,
  },
  actionButton: {
    paddingVertical: theme.spacing.m,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: 25,
    flex: 1,
    alignItems: 'center',
    marginHorizontal: theme.spacing.s,
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelButton: {
    backgroundColor: theme.colors.error,
  },
  backButtonText: {
    color: theme.colors.textSecondary,
    fontWeight: '600',
    fontFamily: theme.fontFamily.openSans,
  },
  cancelButtonText: {
    color: theme.colors.textPrimary,
    fontWeight: '600',
    fontFamily: theme.fontFamily.openSans,
  },
});

export default QuantitySelectionModal;
