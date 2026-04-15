import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useApp } from "@/lib/app-context";
import { calcMonthEarnings } from "@/lib/storage";
import { useColors } from "@/hooks/use-colors";

const MONTH_NAMES = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];
const DAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  // Monday = 0
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function formatDate(year: number, month: number, day: number): string {
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { waybills, cargos, loading } = useApp();

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDayOffset = getFirstDayOfWeek(viewYear, viewMonth);

  // Map of date string -> earnings
  const earningsMap = useMemo(() => {
    const map: Record<string, number> = {};
    waybills.forEach((w) => {
      map[w.date] = w.totalEarnings;
    });
    return map;
  }, [waybills]);

  const monthEarnings = useMemo(
    () => calcMonthEarnings(waybills, viewYear, viewMonth),
    [waybills, viewYear, viewMonth]
  );

  const selectedDate = selectedDay
    ? formatDate(viewYear, viewMonth, selectedDay)
    : null;
  const dayEarnings = selectedDate ? (earningsMap[selectedDate] ?? 0) : 0;
  const hasWaybill = selectedDate ? !!waybills.find((w) => w.date === selectedDate) : false;

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
    setSelectedDay(null);
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
    setSelectedDay(null);
  }

  function handleDayPress(day: number) {
    setSelectedDay(day);
    const date = formatDate(viewYear, viewMonth, day);
    router.push({ pathname: "/waybill", params: { date } });
  }

  // Build calendar grid (nulls = empty cells before first day)
  const calendarCells: (number | null)[] = [
    ...Array(firstDayOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (calendarCells.length % 7 !== 0) calendarCells.push(null);

  const isToday = (day: number) =>
    day === today.getDate() &&
    viewMonth === today.getMonth() &&
    viewYear === today.getFullYear();

  const styles = makeStyles(colors);

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer containerClassName="bg-background">
      <FlatList
        data={[]}
        renderItem={null}
        ListHeaderComponent={
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.appTitle}>Путевой Лист</Text>
            </View>

            {/* Earnings Cards */}
            <View style={styles.earningsRow}>
              <View style={[styles.earningsCard, styles.earningsCardDay]}>
                <Text style={styles.earningsLabel}>Выбранный день</Text>
                <Text style={styles.earningsValue}>
                  {dayEarnings.toFixed(2)} ₽
                </Text>
                {selectedDay && (
                  <Text style={styles.earningsDate}>
                    {selectedDay} {MONTH_NAMES[viewMonth]}
                  </Text>
                )}
              </View>
              <View style={[styles.earningsCard, styles.earningsCardMonth]}>
                <Text style={styles.earningsLabel}>За месяц</Text>
                <Text style={[styles.earningsValue, styles.earningsValueMonth]}>
                  {monthEarnings.toFixed(2)} ₽
                </Text>
                <Text style={styles.earningsDate}>{MONTH_NAMES[viewMonth]}</Text>
              </View>
            </View>

            {/* Month Navigation */}
            <View style={styles.monthNav}>
              <TouchableOpacity onPress={prevMonth} style={styles.navBtn} activeOpacity={0.7}>
                <Text style={styles.navBtnText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.monthTitle}>
                {MONTH_NAMES[viewMonth]} {viewYear}
              </Text>
              <TouchableOpacity onPress={nextMonth} style={styles.navBtn} activeOpacity={0.7}>
                <Text style={styles.navBtnText}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Day Names */}
            <View style={styles.dayNamesRow}>
              {DAY_NAMES.map((d) => (
                <Text key={d} style={styles.dayName}>{d}</Text>
              ))}
            </View>

            {/* Calendar Grid */}
            <View style={styles.calendarGrid}>
              {calendarCells.map((day, idx) => {
                if (!day) {
                  return <View key={`empty-${idx}`} style={styles.dayCell} />;
                }
                const date = formatDate(viewYear, viewMonth, day);
                const hasEntry = !!earningsMap[date];
                const isSelected = day === selectedDay;
                const todayFlag = isToday(day);
                const isSat = (firstDayOffset + day - 1) % 7 === 5;
                const isSun = (firstDayOffset + day - 1) % 7 === 6;

                return (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayCell,
                      isSelected && styles.dayCellSelected,
                      todayFlag && !isSelected && styles.dayCellToday,
                    ]}
                    onPress={() => handleDayPress(day)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        isSelected && styles.dayTextSelected,
                        todayFlag && !isSelected && styles.dayTextToday,
                        isSat && !isSelected && styles.dayTextSat,
                        isSun && !isSelected && styles.dayTextSun,
                      ]}
                    >
                      {day}
                    </Text>
                    {hasEntry && (
                      <View
                        style={[
                          styles.dot,
                          isSelected ? styles.dotSelected : styles.dotDefault,
                        ]}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Open Waybill Button */}
            {selectedDay && (
              <TouchableOpacity
                style={styles.openBtn}
                onPress={() => {
                  const date = formatDate(viewYear, viewMonth, selectedDay);
                  router.push({ pathname: "/waybill", params: { date } });
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.openBtnText}>
                  {hasWaybill ? "Открыть путевой лист" : "Создать путевой лист"} —{" "}
                  {selectedDay} {MONTH_NAMES[viewMonth]}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        }
        keyExtractor={() => "header"}
        showsVerticalScrollIndicator={false}
      />
    </ScreenContainer>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    container: {
      padding: 16,
      paddingBottom: 32,
    },
    header: {
      marginBottom: 16,
      alignItems: "center",
    },
    appTitle: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.foreground,
      letterSpacing: 0.5,
    },
    earningsRow: {
      flexDirection: "row",
      gap: 12,
      marginBottom: 20,
    },
    earningsCard: {
      flex: 1,
      borderRadius: 14,
      padding: 14,
      backgroundColor: colors.surface,
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    earningsCardDay: {
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
    },
    earningsCardMonth: {
      borderLeftWidth: 3,
      borderLeftColor: colors.accent,
    },
    earningsLabel: {
      fontSize: 11,
      color: colors.muted,
      marginBottom: 4,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    earningsValue: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.primary,
    },
    earningsValueMonth: {
      color: colors.accent,
    },
    earningsDate: {
      fontSize: 11,
      color: colors.muted,
      marginTop: 2,
    },
    monthNav: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    navBtn: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 18,
      backgroundColor: colors.surface,
    },
    navBtnText: {
      fontSize: 22,
      color: colors.primary,
      fontWeight: "600",
      lineHeight: 26,
    },
    monthTitle: {
      fontSize: 17,
      fontWeight: "600",
      color: colors.foreground,
    },
    dayNamesRow: {
      flexDirection: "row",
      marginBottom: 4,
    },
    dayName: {
      flex: 1,
      textAlign: "center",
      fontSize: 12,
      color: colors.muted,
      fontWeight: "600",
    },
    calendarGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    dayCell: {
      width: `${100 / 7}%`,
      aspectRatio: 1,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 8,
    },
    dayCellSelected: {
      backgroundColor: colors.primary,
    },
    dayCellToday: {
      borderWidth: 1.5,
      borderColor: colors.primary,
    },
    dayText: {
      fontSize: 15,
      color: colors.foreground,
      fontWeight: "400",
    },
    dayTextSelected: {
      color: "#fff",
      fontWeight: "700",
    },
    dayTextToday: {
      color: colors.primary,
      fontWeight: "700",
    },
    dayTextSat: {
      color: "#000",
    },
    dayTextSun: {
      color: "#EF4444",
    },
    dot: {
      width: 5,
      height: 5,
      borderRadius: 3,
      marginTop: 2,
    },
    dotDefault: {
      backgroundColor: colors.accent,
    },
    dotSelected: {
      backgroundColor: "#fff",
    },
    openBtn: {
      marginTop: 20,
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
    },
    openBtnText: {
      color: "#fff",
      fontSize: 15,
      fontWeight: "600",
    },
  });
}
