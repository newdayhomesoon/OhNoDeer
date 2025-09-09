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
    case 'squirrel':
      return '🐿️';
    case 'rabbit':
      return '🐇';
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
  const animalLabel = {
    deer: 'Deer',
    bear: 'Bear',
    moose_elk: 'Moose/Elk',
    raccoon: 'Raccoon',
    squirrel: 'Squirrel',
    rabbit: 'Rabbit',
    other: 'Animal',
  }[animalType];

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            How many {animalLabel.toLowerCase()}
            {animalType !== 'other' ? 's' : ''} did you see?
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
                  {quantity} {quantity === 1 ? animalLabel : `${animalLabel}s`}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[styles.quantityButton, styles.manyButton]}
              onPress={() => onSelect(4)}>
              <Text style={[styles.quantityText, styles.manyText]}>4+</Text>
              <Text style={styles.quantitySubtext}>
                Many {animalLabel.toLowerCase()}
                {animalType !== 'other' ? 's' : ''}
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
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 24,
    color: '#1a365d',
    textAlign: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
    marginTop: 4,
  },
  quantityContainer: {
    width: '100%',
    paddingHorizontal: 10,
    marginBottom: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  quantityButton: {
    width: '48%',
    height: 100,
    borderRadius: 16,
    backgroundColor: '#f0f4f8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    padding: 10,
  },
  animalsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 8,
    minHeight: 40,
    alignItems: 'center',
  },
  animalImage: {
    width: 30,
    height: 30,
    margin: 2,
  },
  manyText: {
    fontSize: 22,
    marginBottom: 6,
    color: '#334155',
  },
  quantitySubtext: {
    fontSize: 14,
    color: '#475569',
  },
  manyButton: {
    backgroundColor: '#f1f5f9',
    borderStyle: 'dashed',
    borderColor: '#94a3b8',
    borderWidth: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  backButton: {
    backgroundColor: '#e2e8f0',
  },
  cancelButton: {
    backgroundColor: '#fef2f2',
  },
  backButtonText: {
    color: '#475569',
    fontWeight: '600',
  },
  cancelButtonText: {
    color: '#dc2626',
    fontWeight: '600',
  },
});

export default QuantitySelectionModal;
