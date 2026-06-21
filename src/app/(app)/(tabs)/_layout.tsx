import { useState } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { Tabs, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';

const FAB_SIZE = 68;

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const [fabPressed, setFabPressed] = useState(false);

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.white,
          tabBarStyle: {
            backgroundColor: Colors.black,
            borderTopWidth: 2,
            borderTopColor: Colors.black,
            height: 80 + insets.bottom,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: 300,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Rumah',
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons name="home-outline" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="grafik"
          options={{
            title: 'Grafik',
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons name="chart-donut-variant" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="empty"
          options={{
            title: '',
            tabBarButton: () => <View style={{ flex: 1 }} />,
          }}
        />
        <Tabs.Screen
          name="laporan"
          options={{
            title: 'Laporan',
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons name="file-document-outline" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="gue"
          options={{
            title: 'Gue',
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons name="account-outline" size={24} color={color} />
            ),
          }}
        />
      </Tabs>

      <View style={[styles.fabPosition, { bottom: insets.bottom + 36 }]} pointerEvents="box-none">
        <View style={styles.fabOuter}>
          <View style={styles.fabShadow} pointerEvents="none" />
          <Pressable
            onPress={() => router.push('/(app)/add-transaction')}
            onPressIn={() => setFabPressed(true)}
            onPressOut={() => setFabPressed(false)}
            style={[styles.fab, fabPressed && styles.fabPressed]}
          >
            <MaterialCommunityIcons name="plus" size={28} color={Colors.black} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fabPosition: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 100,
  },
  fabOuter: {
    position: 'relative',
    paddingRight: 3,
    paddingBottom: 3,
  },
  fabShadow: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: 0,
    bottom: 0,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: Colors.black,
    borderWidth: 3,
    borderColor: Colors.black,
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: Colors.primary,
    borderWidth: 3,
    borderColor: Colors.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabPressed: {
    transform: [{ translateX: 3 }, { translateY: 3 }],
  },
});
