import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Modal } from 'react-native';
import { WebView } from 'react-native-webview';

interface ElevenLabsAgentProps {
  onEmergencyDetected?: () => void;
}

export default function ElevenLabsAgent({ onEmergencyDetected }: ElevenLabsAgentProps) {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <>
      {/* Floating Circle Button */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.icon}>🛡️</Text>
      </TouchableOpacity>

      {/* Modal with WebView */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          {/* Close Button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setModalVisible(false)}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>

          {/* WebView */}
          <WebView
            source={{ uri: 'https://elevenlabs.io/app/talk-to?agent_id=agent_1201kb8ctx8jfjpa8j2q4pde2ygt' }}
            style={styles.webview}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            mediaPlaybackRequiresUserAction={false}
            allowsInlineMediaPlayback={true}
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 9999,
  },
  icon: {
    fontSize: 32,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeButtonText: {
    fontSize: 28,
    color: 'white',
    fontWeight: '600',
  },
  webview: {
    flex: 1,
  },
});
