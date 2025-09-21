import React, {useEffect, useState} from 'react';
import { Modal, View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function DebugStorageScreen({ visible, onClose }: Props) {
  const [items, setItems] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!visible) return;
    const load = async () => {
      try {
        const keys = await AsyncStorage.getAllKeys();
        const relevant = keys.filter(k => k.includes('firebase') || k.toLowerCase().includes('cache') || k.includes('persist'));
        // ensure we always check persistence flag
        if (!relevant.includes('firebase_persistence_set_v1')) relevant.push('firebase_persistence_set_v1');
        const kv = await AsyncStorage.multiGet(relevant);
        const out: Record<string, any> = {};
        kv.forEach(([k, v]) => {
          try { out[k] = v ? JSON.parse(v) : v; } catch { out[k] = v; }
        });
        setItems(out);
      } catch (e) {
        setItems({ error: String(e) });
      }
    };
    load();
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>AsyncStorage Debug</Text>
          <ScrollView style={styles.scroll}>
            {Object.keys(items).length === 0 ? (
              <Text style={styles.item}>No items found</Text>
            ) : (
              Object.entries(items).map(([k, v]) => (
                <View key={k} style={styles.row}>
                  <Text style={styles.key}>{k}</Text>
                  <Text style={styles.value}>{typeof v === 'string' ? v : JSON.stringify(v, null, 2)}</Text>
                </View>
              ))
            )}
          </ScrollView>
          <View style={styles.buttons}>
            <TouchableOpacity onPress={onClose} style={styles.button}>
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  container: { width: '92%', maxHeight: '85%', backgroundColor: '#0a1929', borderRadius: 12, padding: 16 },
  title: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 12 },
  scroll: { marginBottom: 12 },
  row: { marginBottom: 10 },
  key: { color: '#9fb0d3', fontSize: 13, fontWeight: '600' },
  value: { color: '#e6eef8', fontSize: 12, marginTop: 4 },
  item: { color: '#e6eef8' },
  buttons: { flexDirection: 'row', justifyContent: 'flex-end' },
  button: { paddingVertical: 10, paddingHorizontal: 16, backgroundColor: '#1a365d', borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: '700' },
});
// Removed duplicate non-modal DebugStorageScreen implementation. File now only contains the modal-based DebugStorageScreen component above.
