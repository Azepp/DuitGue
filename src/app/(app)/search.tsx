import { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import { Colors, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { formatRupiah } from '@/lib/utils';
import { ThemedText } from '@/components/themed-text';

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

type TransactionWithCategory = {
  id: string;
  category_id: string;
  amount: number;
  type: 'pengeluaran' | 'pemasukan';
  note: string | null;
  date: string;
  categories: { name: string; icon: string; color: string } | null;
};

type Category = {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'pengeluaran' | 'pemasukan';
};

type FilterType = 'pengeluaran' | 'semua' | 'pemasukan';

const SHADOW_OFFSET = 3;

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id;

  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<FilterType>('semua');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  const { data: allCategories } = useQuery({
    queryKey: ['categories', 'all', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', userId)
        .order('name');
      return (data ?? []) as Category[];
    },
    enabled: !!userId,
  });

  const { data: allTransactions } = useQuery({
    queryKey: ['transactions', 'search', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('transactions')
        .select('*, categories(name, icon, color)')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });
      return (data ?? []) as TransactionWithCategory[];
    },
    enabled: !!userId,
  });

  const filteredTransactions = useMemo(() => {
    if (!allTransactions) return [];
    return allTransactions.filter((tx) => {
      if (typeFilter !== 'semua') {
        const dbType = typeFilter === 'pemasukan' ? 'pemasukan' : 'pengeluaran';
        if (tx.type !== dbType) return false;
      }
      if (selectedCategoryIds.length > 0 && !selectedCategoryIds.includes(tx.category_id)) return false;
      if (searchText.trim()) {
        const q = searchText.toLowerCase();
        const catName = tx.categories?.name?.toLowerCase() ?? '';
        const note = tx.note?.toLowerCase() ?? '';
        const amount = formatRupiah(tx.amount).toLowerCase();
        if (!catName.includes(q) && !note.includes(q) && !amount.includes(q)) return false;
      }
      return true;
    });
  }, [allTransactions, typeFilter, selectedCategoryIds, searchText]);

  const dailyGroups = useMemo(() => {
    const groups: Record<string, TransactionWithCategory[]> = {};
    for (const t of filteredTransactions) {
      if (!groups[t.date]) groups[t.date] = [];
      groups[t.date].push(t);
    }
    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, transactions]) => {
        const d = new Date(date + 'T00:00:00');
        const day = d.getDate();
        const monthName = MONTHS[d.getMonth()];
        const dayName = d.toLocaleDateString('id-ID', { weekday: 'long' });
        const label = `${day} ${monthName} - ${dayName}`;
        const totalPengeluaran = transactions
          .filter((t) => t.type === 'pengeluaran')
          .reduce((s, t) => s + t.amount, 0);
        const totalPemasukan = transactions
          .filter((t) => t.type === 'pemasukan')
          .reduce((s, t) => s + t.amount, 0);
        return { date, dayName: label, transactions, totalPengeluaran, totalPemasukan };
      });
  }, [filteredTransactions]);

  const toggleCategory = (catId: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId],
    );
  };

  const categories = allCategories ?? [];

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          header: () => (
            <View style={[styles.headerBar, { paddingTop: 12 + insets.top }]}>
              <TouchableOpacity onPress={() => router.back()}>
                <ThemedText style={styles.gajadiText}>Gajadi</ThemedText>
              </TouchableOpacity>
              <ThemedText style={styles.headerTitle}>Cari</ThemedText>
            </View>
          ),
        }}
      />

      <View style={styles.searchContainer}>
        <View style={styles.searchInputOuter}>
          <View style={styles.searchInputShadow} pointerEvents="none" />
          <View style={styles.searchInputRow}>
            <MaterialCommunityIcons name="magnify" size={20} color={Colors.gray} />
            <TextInput
              style={styles.searchInput}
              value={searchText}
              onChangeText={setSearchText}
              placeholder="cari apa saja..."
              placeholderTextColor={Colors.gray}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <MaterialCommunityIcons name="close-circle" size={20} color={Colors.gray} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <View style={styles.toggleBar}>
        <View style={styles.toggleWrapper}>
          <View style={styles.toggleShadow} pointerEvents="none" />
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleChip, styles.toggleChipLeft, typeFilter === 'semua' && { backgroundColor: Colors.black }]}
              onPress={() => setTypeFilter('semua')}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleText, typeFilter === 'semua' && styles.toggleTextActive]}>Semua</Text>
            </TouchableOpacity>
            <View style={styles.toggleDivider} />
            <TouchableOpacity
              style={[styles.toggleChip, typeFilter === 'pengeluaran' && { backgroundColor: Colors.danger }]}
              onPress={() => setTypeFilter('pengeluaran')}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleText, typeFilter === 'pengeluaran' && styles.toggleTextActive]}>Pengeluaran</Text>
            </TouchableOpacity>
            <View style={styles.toggleDivider} />
            <TouchableOpacity
              style={[styles.toggleChip, styles.toggleChipRight, typeFilter === 'pemasukan' && { backgroundColor: Colors.success }]}
              onPress={() => setTypeFilter('pemasukan')}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleText, typeFilter === 'pemasukan' && styles.toggleTextActive]}>Pemasukan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.categoryRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {categories.map((cat) => {
            const isSelected = selectedCategoryIds.includes(cat.id);
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryChip, isSelected && { backgroundColor: cat.color }]}
                onPress={() => toggleCategory(cat.id)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name={cat.icon as any} size={16} color={isSelected ? Colors.white : Colors.black} />
                <Text style={[styles.categoryChipText, isSelected && { color: Colors.white }]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {dailyGroups.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="receipt-outline" size={48} color={Colors.gray} />
            <Text style={styles.emptyText}>Gak ada transaksi yang cocok</Text>
          </View>
        ) : (
          dailyGroups.map((group) => (
            <View key={group.date}>
              <View style={styles.dateHeader}>
                <Text style={styles.dateLabel}>{group.dayName}</Text>
                <View style={styles.dateTotals}>
                  <Text style={styles.datePengeluaran}>Pengeluaran {formatRupiah(group.totalPengeluaran)}</Text>
                  <Text style={styles.datePemasukan}>Pemasukan {formatRupiah(group.totalPemasukan)}</Text>
                </View>
              </View>
              {group.transactions.map((tx) => {
                const cat = tx.categories;
                const color = cat?.color || Colors.gray;
                const isPengeluaran = tx.type === 'pengeluaran';
                return (
                  <View key={tx.id} style={styles.txShadow}>
                    <View style={styles.txShadowFill} pointerEvents="none" />
                    <View style={styles.txCard}>
                      <View style={styles.txMainRow}>
                        <View style={[styles.txIcon, { backgroundColor: color }]}>
                          <MaterialCommunityIcons name={(cat?.icon || 'help-circle-outline') as any} size={20} color={Colors.white} />
                        </View>
                        <View style={styles.txInfo}>
                          <Text style={styles.txName}>{cat?.name || 'Kategori'}</Text>
                          {tx.note ? <Text style={styles.txNote}>{tx.note}</Text> : null}
                        </View>
                        <Text style={[styles.txAmount, { color: isPengeluaran ? Colors.danger : Colors.success }]}>
                          {isPengeluaran ? '-' : '+'}
                          {formatRupiah(tx.amount)}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.pageX,
    paddingVertical: Spacing.three,
    backgroundColor: Colors.background,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.black,
  },
  gajadiText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.black,
    textDecorationLine: 'underline',
  },
  searchContainer: {
    paddingHorizontal: Spacing.pageX,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
  },
  searchInputOuter: {
    position: 'relative',
    paddingRight: SHADOW_OFFSET,
    paddingBottom: SHADOW_OFFSET,
  },
  searchInputShadow: {
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
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: 16,
    paddingHorizontal: 14,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.black,
    paddingVertical: 12,
  },
  toggleBar: {
    paddingHorizontal: Spacing.pageX,
    paddingVertical: Spacing.twoHalf,
  },
  toggleWrapper: {
    paddingRight: 4,
    paddingBottom: 4,
  },
  toggleShadow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 0,
    bottom: 0,
    borderRadius: 10,
    backgroundColor: Colors.black,
  },
  toggleContainer: {
    flexDirection: 'row',
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: Colors.white,
  },
  toggleChip: {
    flex: 1,
    paddingVertical: Spacing.twoHalf,
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  toggleChipLeft: {},
  toggleChipRight: {},
  toggleDivider: {
    width: 3,
    backgroundColor: Colors.black,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.black,
  },
  toggleTextActive: {
    color: Colors.white,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: Spacing.pageX,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
  },
  categoryScroll: {
    gap: Spacing.two,
    alignItems: 'center',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.black,
    backgroundColor: Colors.white,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.black,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.pageX,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.six,
  },
  dateHeader: {
    marginBottom: Spacing.one,
    marginTop: Spacing.two,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.black,
    marginBottom: Spacing.one,
  },
  dateTotals: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  datePengeluaran: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.black,
  },
  datePemasukan: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.black,
  },
  txShadow: {
    marginBottom: Spacing.two,
    paddingRight: SHADOW_OFFSET,
    paddingBottom: SHADOW_OFFSET,
  },
  txShadowFill: {
    position: 'absolute',
    top: SHADOW_OFFSET,
    left: SHADOW_OFFSET,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    backgroundColor: Colors.black,
  },
  txCard: {
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: 12,
    backgroundColor: Colors.white,
  },
  txMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.twoHalf,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.black,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.twoHalf,
  },
  txInfo: {
    flex: 1,
  },
  txName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.black,
  },
  txNote: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.six,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray,
    marginTop: Spacing.two,
  },
});
