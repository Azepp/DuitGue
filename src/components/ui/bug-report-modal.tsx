import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/toast';

type BugReportModalProps = {
  visible: boolean;
  onClose: () => void;
  userEmail?: string;
};

export function BugReportModal({ visible, onClose, userEmail }: BugReportModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);
  const { showToast } = useToast();

  const canSend = title.trim().length > 0 && description.trim().length > 0 && !sending;

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);

    try {
      const { error } = await supabase.functions.invoke('send-bug-report', {
        body: {
          title: title.trim(),
          description: description.trim(),
          userEmail,
        },
      });

      if (error) throw error;

      showToast('Laporan berhasil dikirim! Makasih yak 👊', 'success');
      setTitle('');
      setDescription('');
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Gagal kirim laporan. Coba lagi ya!', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdropTouch} onPress={onClose} />

        <View style={styles.card}>
          <View style={styles.header}>
            <MaterialCommunityIcons name="bug-outline" size={24} color={Colors.black} />
            <ThemedText style={styles.headerTitle}>Lapor Bug</ThemedText>
            <Pressable onPress={onClose} hitSlop={12}>
              <MaterialCommunityIcons name="close" size={22} color={Colors.black} />
            </Pressable>
          </View>

          <ThemedText style={styles.label}>Judul Bug</ThemedText>
          <View style={styles.inputOuter}>
            <View style={styles.inputShadow} pointerEvents="none" />
            <TextInput
              style={styles.input}
              placeholderTextColor={Colors.gray}
              placeholder="Contoh: Gabisa logout..."
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
          </View>

          <ThemedText style={styles.label}>Deskripsi</ThemedText>
          <View style={styles.inputOuter}>
            <View style={styles.inputShadow} pointerEvents="none" />
            <TextInput
              style={[styles.input, styles.inputArea]}
              placeholderTextColor={Colors.gray}
              placeholder="Jelasin detail bug nya..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />
          </View>

          <View style={styles.actions}>
            <View style={styles.cancelOuter}>
              <View style={styles.cancelShadow} pointerEvents="none" />
              <Pressable
                style={styles.cancelBtn}
                onPress={onClose}
                disabled={sending}
              >
                <ThemedText style={styles.cancelText}>Batal</ThemedText>
              </Pressable>
            </View>

            <View style={styles.sendOuter}>
              <View style={styles.sendShadow} pointerEvents="none" />
              <Pressable
                style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
                onPress={handleSend}
                disabled={!canSend}
              >
                {sending ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <ThemedText style={styles.sendText}>Kirim</ThemedText>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const SHADOW_OFFSET = 3;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  backdropTouch: {
    position: 'absolute',
    inset: 0,
  },
  card: {
    width: '88%',
    maxWidth: 400,
    backgroundColor: Colors.white,
    borderWidth: 3,
    borderColor: Colors.black,
    borderRadius: 16,
    padding: Spacing.four,
    shadowColor: Colors.black,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.four,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: Colors.black,
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    color: Colors.black,
    marginBottom: Spacing.two,
    marginTop: Spacing.one,
  },
  inputOuter: {
    position: 'relative',
    paddingRight: SHADOW_OFFSET,
    paddingBottom: SHADOW_OFFSET,
    marginBottom: Spacing.two,
  },
  inputShadow: {
    position: 'absolute',
    top: SHADOW_OFFSET,
    left: SHADOW_OFFSET,
    right: 0,
    bottom: 0,
    borderRadius: 10,
    backgroundColor: Colors.black,
    borderWidth: 2,
    borderColor: Colors.black,
  },
  input: {
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: 10,
    paddingVertical: Spacing.twoHalf,
    paddingHorizontal: Spacing.three,
    fontSize: 15,
    fontFamily: Fonts.medium,
    color: Colors.black,
    backgroundColor: Colors.white,
  },
  inputArea: {
    minHeight: 100,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.twoHalf,
    marginTop: Spacing.two,
  },
  cancelOuter: {
    flex: 1,
    position: 'relative',
    paddingRight: SHADOW_OFFSET,
    paddingBottom: SHADOW_OFFSET,
  },
  cancelShadow: {
    position: 'absolute',
    top: SHADOW_OFFSET,
    left: SHADOW_OFFSET,
    right: 0,
    bottom: 0,
    borderRadius: 10,
    backgroundColor: Colors.black,
    borderWidth: 2,
    borderColor: Colors.black,
  },
  cancelBtn: {
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: 10,
    paddingVertical: Spacing.twoHalf,
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  cancelText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: Colors.black,
  },
  sendOuter: {
    flex: 1,
    position: 'relative',
    paddingRight: SHADOW_OFFSET,
    paddingBottom: SHADOW_OFFSET,
  },
  sendShadow: {
    position: 'absolute',
    top: SHADOW_OFFSET,
    left: SHADOW_OFFSET,
    right: 0,
    bottom: 0,
    borderRadius: 10,
    backgroundColor: Colors.black,
    borderWidth: 2,
    borderColor: Colors.black,
  },
  sendBtn: {
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: 10,
    paddingVertical: Spacing.twoHalf,
    alignItems: 'center',
    backgroundColor: Colors.primary,
  },
  sendBtnDisabled: {
    backgroundColor: Colors.gray,
  },
  sendText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: Colors.black,
  },
});
