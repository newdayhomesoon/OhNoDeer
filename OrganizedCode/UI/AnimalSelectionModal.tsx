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
import {theme} from '../../src/app-theme';

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
      case 'rabbit':
        return '�';
      case 'small_mammals':
        return '�️';
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
      rabbit: 'Rabbit',
      small_mammals: 'Small Mammals',
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
    padding: theme.spacing.m,
  },
  modalContent: {
    backgroundColor: theme.colors.primaryBackground,
    borderRadius: 25,
    padding: theme.spacing.xl,
    width: '95%',
    maxWidth: 450,
    maxHeight: '80%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: theme.fontSize.h1,
    fontWeight: '800',
    marginBottom: theme.spacing.xl,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    fontFamily: theme.fontFamily.lato,
  },
  animalsScrollContainer: {
    width: '100%',
    maxHeight: '60%',
  },
  animalsContainer: {
    width: '100%',
    paddingBottom: theme.spacing.s,
  },
  animalGroup: {
    marginBottom: theme.spacing.l,
  },
  categoryLabel: {
    fontSize: theme.fontSize.h3,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.s,
    paddingLeft: theme.spacing.s,
    fontFamily: theme.fontFamily.lato,
  },
  animalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: theme.spacing.s,
    justifyContent: 'center',
  },
  animalButton: {
    width: 110,
    height: 120,
    borderRadius: 15,
    backgroundColor: theme.colors.secondaryBackground,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.m,
    margin: theme.spacing.s,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  animalLabel: {
    marginTop: theme.spacing.s,
    fontSize: theme.fontSize.caption,
    textAlign: 'center',
    color: theme.colors.textPrimary,
    fontWeight: '600',
    fontFamily: theme.fontFamily.openSans,
  },
  animalEmoji: {
    fontSize: 40,
    textAlign: 'center',
    marginBottom: theme.spacing.s,
  },
  cancelButton: {
    backgroundColor: theme.colors.error,
    padding: theme.spacing.m,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: theme.spacing.s,
    width: '100%',
  },
  cancelButtonText: {
    color: theme.colors.textPrimary,
    fontWeight: '700',
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.openSans,
  },
});

export default AnimalSelectionModal;
