import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';

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
    padding: 20,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a365d',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#4a5568',
    textAlign: 'center',
    marginBottom: 24,
  },
  quantityContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  quantityButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f7fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  selectedQuantity: {
    backgroundColor: '#3182ce',
    borderColor: '#3182ce',
  },
  quantityText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4a5568',
  },
  selectedQuantityText: {
    color: '#fff',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  skipButton: {
    backgroundColor: '#f7fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  confirmButton: {
    backgroundColor: '#3182ce',
  },
  skipButtonText: {
    color: '#4a5568',
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default QuantityUpdateModal;
