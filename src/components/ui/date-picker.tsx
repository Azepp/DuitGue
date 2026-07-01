import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from "@/components/themed-text";
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Colors, Fonts, Spacing } from '@/constants/theme';

const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

function getMonthData(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return { firstDay, daysInMonth };
}

type NeoDatePickerProps = {
  visible: boolean;
  date: Date;
  onDateChange: (date: Date) => void;
  onClose: () => void;
};

const CELL_SIZE = 36;

export function NeoDatePicker({ visible, date, onDateChange, onClose }: NeoDatePickerProps) {
  const [viewYear, setViewYear] = useState(date.getFullYear());
  const [viewMonth, setViewMonth] = useState(date.getMonth());

  const { firstDay, daysInMonth } = useMemo(
    () => getMonthData(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  const rows = useMemo(() => {
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    const result: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      const row = cells.slice(i, i + 7);
      while (row.length < 7) row.push(null);
      result.push(row);
    }
    return result;
  }, [firstDay, daysInMonth]);

  const today = new Date();
  const selectedStr = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  });

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDate = (day: number) => {
    const selected = new Date(viewYear, viewMonth, day);
    onDateChange(selected);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.container}>
          <View style={styles.shadowFill} pointerEvents="none" />
          <View style={styles.inner}>
            <View style={styles.header}>
              <TouchableOpacity onPress={handlePrevMonth} activeOpacity={0.8} style={styles.arrowBtn}>
                <MaterialCommunityIcons name="chevron-left" size={22} color={Colors.black} />
              </TouchableOpacity>
              <ThemedText style={styles.monthLabel}>{monthLabel}</ThemedText>
              <TouchableOpacity onPress={handleNextMonth} activeOpacity={0.8} style={styles.arrowBtn}>
                <MaterialCommunityIcons name="chevron-right" size={22} color={Colors.black} />
              </TouchableOpacity>
            </View>

            <View style={styles.dayNames}>
              {DAY_NAMES.map((name) => (
                <ThemedText key={name} style={styles.dayName}>{name}</ThemedText>
              ))}
            </View>

            <View style={styles.grid}>
              {rows.map((row, ri) => (
                <View key={ri} style={styles.gridRow}>
                  {row.map((day, ci) => {
                    if (day === null) {
                      return <View key={`e-${ri}-${ci}`} style={styles.cell} />;
                    }

                    const dayStr = `${viewYear}-${viewMonth}-${day}`;
                    const isSelected = dayStr === selectedStr;
                    const isToday = dayStr === todayStr;

                    return (
                      <TouchableOpacity
                        key={day}
                        style={styles.cell}
                        onPress={() => handleSelectDate(day)}
                        activeOpacity={0.8}
                      >
                        <View style={[styles.dayCircle, isSelected && styles.dayCircleSelected]}>
                          <ThemedText style={[styles.dayText, isToday && !isSelected && styles.dayTextToday]}>
                            {day}
                          </ThemedText>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
              <ThemedText style={styles.closeBtnText}>Tutup</ThemedText>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  container: {
    width: 300,
    paddingRight: 4,
    paddingBottom: 4,
  },
  shadowFill: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    backgroundColor: Colors.black,
  },
  inner: {
    backgroundColor: Colors.white,
    borderWidth: 2.5,
    borderColor: Colors.black,
    borderRadius: 16,
    padding: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  arrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.black,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthLabel: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: Colors.black,
  },
  dayNames: {
    flexDirection: 'row',
    marginBottom: Spacing.one,
  },
  dayName: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: Colors.black,
    paddingVertical: 2,
  },
  grid: {
    gap: Spacing.half,
  },
  gridRow: {
    flexDirection: 'row',
    gap: Spacing.half,
  },
  cell: {
    flex: 1,
    height: CELL_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCircle: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: CELL_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dayCircleSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.black,
  },
  dayText: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    color: Colors.black,
  },
  dayTextToday: {
    color: Colors.blue,
  },
  closeBtn: {
    marginTop: Spacing.two,
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: 10,
    backgroundColor: Colors.background,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: Colors.black,
  },
});
