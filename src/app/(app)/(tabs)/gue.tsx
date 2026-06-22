import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { PageLayout } from '@/components/ui/page-layout';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { Colors } from '@/constants/theme';

const SHADOW_OFFSET = 3;

export default function GueScreen() {
  const [loading, setLoading] = useState(false);
  const session = useAuthStore((s) => s.session);
  const user = session?.user;

  const displayName =
    user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'UserDuit';
  const email = user?.email || '';

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
  };

  return (
    <PageLayout>
      <View style={styles.inner}>
        <View style={styles.profile}>
          <View style={styles.avatarOuter}>
            <View style={styles.avatarShadow} pointerEvents="none" />
            <View style={styles.avatar}>
              <MaterialCommunityIcons name="account" size={36} color={Colors.black} />
            </View>
          </View>
          <View style={styles.info}>
            <ThemedText style={styles.name}>{displayName}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {email}
            </ThemedText>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.menu}>
          <View style={styles.menuOuter}>
            <View style={styles.menuShadow} pointerEvents="none" />
            <Pressable style={styles.menuItem}>
              <MaterialCommunityIcons name="export-variant" size={22} color={Colors.black} />
              <ThemedText style={styles.menuText}>Export Data</ThemedText>
            </Pressable>
          </View>
          <View style={styles.menuOuter}>
            <View style={styles.menuShadow} pointerEvents="none" />
            <Pressable style={styles.menuItem}>
              <MaterialCommunityIcons name="delete-outline" size={22} color={Colors.black} />
              <ThemedText style={styles.menuText}>Hapus Cache</ThemedText>
            </Pressable>
          </View>

          <View style={styles.logoutOuter}>
            <View style={styles.logoutShadow} pointerEvents="none" />
            <Pressable
              style={styles.logoutBtn}
              onPress={handleLogout}
              disabled={loading}
            >
              <MaterialCommunityIcons name="logout" size={20} color={Colors.white} />
              <ThemedText style={styles.logoutText}>
                {loading ? 'Tunggu...' : 'Keluar'}
              </ThemedText>
            </Pressable>
          </View>
        </View>

        <View style={styles.spacer} />
      </View>
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  inner: {
    flex: 1,
    paddingBottom: 32,
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 28,
  },
  avatarOuter: {
    position: 'relative',
    paddingRight: SHADOW_OFFSET,
    paddingBottom: SHADOW_OFFSET,
  },
  avatarShadow: {
    position: 'absolute',
    top: SHADOW_OFFSET,
    left: SHADOW_OFFSET,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    backgroundColor: Colors.black,
    borderWidth: 2,
    borderColor: Colors.black,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.black,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: 700,
    lineHeight: 28,
  },
  divider: {
    height: 2,
    backgroundColor: Colors.black,
    marginBottom: 24,
  },
  menu: {
    gap: 12,
  },
  menuOuter: {
    position: 'relative',
    paddingRight: SHADOW_OFFSET,
    paddingBottom: SHADOW_OFFSET,
  },
  menuShadow: {
    position: 'absolute',
    top: SHADOW_OFFSET,
    left: SHADOW_OFFSET,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    backgroundColor: Colors.black,
    borderWidth: 2,
    borderColor: Colors.black,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: 12,
    backgroundColor: Colors.white,
  },
  logoutOuter: {
    position: 'relative',
    paddingRight: SHADOW_OFFSET,
    paddingBottom: SHADOW_OFFSET,
    marginTop: 4,
  },
  logoutShadow: {
    position: 'absolute',
    top: SHADOW_OFFSET,
    left: SHADOW_OFFSET,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    backgroundColor: Colors.black,
    borderWidth: 2,
    borderColor: Colors.black,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: 12,
    backgroundColor: Colors.danger,
  },
  menuText: {
    fontSize: 16,
    fontWeight: 700,
    lineHeight: 24,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: 700,
    lineHeight: 24,
    color: Colors.white,
  },
  spacer: {
    flex: 1,
  },
});
