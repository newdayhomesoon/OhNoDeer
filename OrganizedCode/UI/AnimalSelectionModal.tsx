import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ScrollView,
} from 'react-native';
import {AnimalCategories, AnimalType} from '../CoreLogic/types';

interface AnimalSelectionModalProps {
  visible: boolean;
  onSelect: (animal: AnimalType) => void;
  onClose: () => void;
}

const AnimalSelectionModal: React.FC<AnimalSelectionModalProps> = ({
  visible,
  onSelect,
  onClose,
}) => {
  const renderAnimalButton = (animal: AnimalType) => (
    <TouchableOpacity
      key={animal}
      style={styles.animalButton}
      onPress={() => onSelect(animal)}>
      <Text style={styles.animalEmoji}>{getAnimalEmoji(animal)}</Text>
      <Text style={styles.animalLabel}>{getAnimalLabel(animal)}</Text>
    </TouchableOpacity>
  );

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
  const getAnimalLabel = (animal: AnimalType): string => {
    return {
      deer: 'Deer',
      bear: 'Bear',
      moose_elk: 'Moose/Elk',
      raccoon: 'Raccoon',
      squirrel: 'Squirrel',
      rabbit: 'Rabbit',
      other: 'Other',
    }[animal];
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>What did you see?</Text>

          <ScrollView
            style={styles.animalsScrollContainer}
            showsVerticalScrollIndicator={false}>
            <View style={styles.animalsContainer}>
              {Object.entries(AnimalCategories).map(([key, category]) => (
                <View key={key} style={styles.animalGroup}>
                  <Text style={styles.categoryLabel}>{category.label}</Text>
                  <View style={styles.animalRow}>
                    {category.types.map(renderAnimalButton)}
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'rgba(10, 25, 41, 0.95)',
    borderRadius: 25,
    padding: 30,
    width: '95%',
    maxWidth: 450,
    maxHeight: '80%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 30,
    color: '#fff',
    textAlign: 'center',
  },
  animalsScrollContainer: {
    width: '100%',
    maxHeight: '60%',
  },
  animalsContainer: {
    width: '100%',
    paddingBottom: 10,
  },
  animalGroup: {
    marginBottom: 20,
  },
  categoryLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 10,
    paddingLeft: 8,
  },
  animalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
    justifyContent: 'center',
  },
  animalButton: {
    width: 110,
    height: 120,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    margin: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  animalLabel: {
    marginTop: 6,
    fontSize: 14,
    textAlign: 'center',
    color: '#fff',
    fontWeight: '600',
  },
  animalEmoji: {
    fontSize: 40,
    textAlign: 'center',
    marginBottom: 5,
  },
  cancelButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    width: '100%',
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});

export default AnimalSelectionModal;
