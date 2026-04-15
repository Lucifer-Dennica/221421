import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  FlatList,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useApp } from "@/lib/app-context";
import {
  calcMonthEarnings,
  calcMonthKilometrage,
  calcMonthCargo,
  calcMonthFuel,
} from "@/lib/storage";
import { useColors } from "@/hooks/use-colors";

const MONTH_NAMES = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

export default function StatsScreen() {
  const colors = useColors();
  const { waybills, cargos, vehicles } = useApp();

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const monthEarnings = useMemo(
    () => calcMonthEarnings(waybills, viewYear, viewMonth),
    [waybills, viewYear, viewMonth]
  );

  const monthKm = useMemo(
    () => calcMonthKilometrage(waybills, viewYear, viewMonth),
    [waybills, viewYear, viewMonth]
  );

  const monthCargo = useMemo(
    () => calcMonthCargo(waybills, viewYear, viewMonth, cargos),
    [waybills, viewYear, viewMonth, cargos]
  );

  const monthFuel = useMemo(
    () => {
      // Берём первый автомобиль (в реальном приложении можно выбирать)
      const vehicle = vehicles.length > 0 ? vehicles[0] : undefined;
      return calcMonthFuel(waybills, viewYear, viewMonth, vehicle);
    },
    [waybills, viewYear, viewMonth, vehicles]
  );

  const cargoList = useMemo(() => {
    return Object.entries(monthCargo)
      .map(([cargoId, volume]) => {
        const cargo = cargos.find((c) => c.id === cargoId);
        return {
          cargoId,
          name: cargo?.name || "Неизвестный груз",
          volume,
          unit: cargo?.unit || "ед.",
        };
      })
      .sort((a, b) => b.volume - a.volume);
  }, [monthCargo, cargos]);

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  const styles = makeStyles(colors);

  return (
    <ScreenContainer containerClassName="bg-background">
      <FlatList
        data={[]}
        renderItem={null}
        ListHeaderComponent={
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.appTitle}>Статистика</Text>
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

            {/* Main Stats Cards */}
            <View style={styles.statsGrid}>
              {/* Earnings */}
              <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.statLabel, { color: colors.muted }]}>Заработок</Text>
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  {monthEarnings.toFixed(2)} ₽
                </Text>
              </View>

              {/* Total KM */}
              <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.statLabel, { color: colors.muted }]}>Общий пробег</Text>
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  {monthKm.total} км
                </Text>
              </View>

              {/* Loaded KM */}
              <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.statLabel, { color: colors.muted }]}>Груженый</Text>
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  {monthKm.loaded} км
                </Text>
              </View>

              {/* Empty KM */}
              <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.statLabel, { color: colors.muted }]}>Пустой</Text>
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  {monthKm.empty} км
                </Text>
              </View>

              {/* Fuel */}
              <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.statLabel, { color: colors.muted }]}>Топливо</Text>
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  {monthFuel.toFixed(1)} л
                </Text>
              </View>

              {/* Waybills Count */}
              <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.statLabel, { color: colors.muted }]}>Путевых листов</Text>
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  {waybills.filter((w) => w.date.startsWith(`${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`)).length}
                </Text>
              </View>
            </View>

            {/* Cargo Breakdown */}
            {cargoList.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                  Перевезено грузов
                </Text>
                {cargoList.map((item, idx) => (
                  <View
                    key={item.cargoId}
                    style={[
                      styles.cargoItem,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      idx === cargoList.length - 1 && styles.cargoItemLast,
                    ]}
                  >
                    <Text style={[styles.cargoName, { color: colors.foreground }]}>
                      {item.name}
                    </Text>
                    <Text style={[styles.cargoVolume, { color: colors.primary }]}>
                      {item.volume.toFixed(2)} {item.unit}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Empty State */}
            {cargoList.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: colors.muted }]}>
                  Нет данных за этот месяц
                </Text>
              </View>
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
    monthNav: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 20,
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
    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
      marginBottom: 20,
    },
    statCard: {
      width: `${100 / 2 - 6}%`,
      borderWidth: 1,
      borderRadius: 12,
      padding: 14,
      alignItems: "center",
    },
    statLabel: {
      fontSize: 11,
      fontWeight: "500",
      textTransform: "uppercase",
      letterSpacing: 0.4,
      marginBottom: 6,
    },
    statValue: {
      fontSize: 18,
      fontWeight: "700",
    },
    section: {
      marginTop: 20,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: "700",
      marginBottom: 10,
    },
    cargoItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderWidth: 1,
      borderRadius: 10,
      padding: 12,
      marginBottom: 8,
    },
    cargoItemLast: {
      marginBottom: 0,
    },
    cargoName: {
      fontSize: 14,
      fontWeight: "500",
    },
    cargoVolume: {
      fontSize: 14,
      fontWeight: "700",
    },
    emptyState: {
      marginTop: 40,
      alignItems: "center",
    },
    emptyText: {
      fontSize: 14,
    },
  });
}
