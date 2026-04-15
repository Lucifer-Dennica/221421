import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { useApp } from "@/lib/app-context";
import {
  Waybill,
  RouteEntry,
  Cargo,
  Vehicle,
  LocationPoint,
  calcRouteEarnings,
} from "@/lib/storage";
import { useColors } from "@/hooks/use-colors";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function formatDateRu(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  const months = [
    "января", "февраля", "марта", "апреля", "мая", "июня",
    "июля", "августа", "сентября", "октября", "ноября", "декабря",
  ];
  return `${parseInt(day)} ${months[parseInt(month) - 1]} ${year}`;
}

function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  return day === 0 || day === 6;
}

function emptyRoute(): RouteEntry {
  return {
    id: uid(),
    from: "",
    to: "",
    isLoaded: true,
    cargoId: undefined,
    cargoVolume: undefined,
    odometerStart: undefined,
    odometerEnd: undefined,
    doublePayment: false,
  };
}

// ─── Dropdown Component ───────────────────────────────────────────────────────

interface DropdownItem {
  id: string;
  label: string;
}

function Dropdown({
  label,
  value,
  items,
  onSelect,
  placeholder,
  colors,
}: {
  label: string;
  value?: string;
  items: DropdownItem[];
  onSelect: (id: string | undefined) => void;
  placeholder: string;
  colors: ReturnType<typeof useColors>;
}) {
  const [open, setOpen] = useState(false);
  const selected = items.find((i) => i.id === value);

  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={[ws.fieldLabel, { color: colors.muted }]}>{label}</Text>
      <TouchableOpacity
        style={[ws.dropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
      >
        <Text style={{ color: selected ? colors.foreground : colors.muted, fontSize: 15 }}>
          {selected ? selected.label : placeholder}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 16 }}>▾</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade">
        <TouchableOpacity
          style={ws.modalOverlay}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        />
        <View style={[ws.dropdownMenu, { backgroundColor: colors.surface }]}>
          <FlatList
            data={items}
            keyExtractor={(i) => i.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={ws.dropdownItem}
                onPress={() => {
                  onSelect(item.id);
                  setOpen(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={{ color: colors.foreground, fontSize: 15 }}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function WaybillScreen() {
  const colors = useColors();
  const router = useRouter();
  const { date } = useLocalSearchParams<{ date: string }>();
  const { waybills, saveWaybill, vehicles, cargos, locationPoints } = useApp();

  const [number, setNumber] = useState("");
  const [vehicleId, setVehicleId] = useState<string | undefined>();
  const [routes, setRoutes] = useState<RouteEntry[]>([]);
  const [doublePaymentDay, setDoublePaymentDay] = useState(false);
  const [isBusinessTrip1Day, setIsBusinessTrip1Day] = useState(false);
  const [isBusinessTripMultiDay, setIsBusinessTripMultiDay] = useState(false);

  const waybill = useMemo(
    () => waybills.find((w) => w.date === date),
    [waybills, date]
  );

  const vehicle = useMemo(
    () => vehicles.find((v) => v.id === vehicleId),
    [vehicles, vehicleId]
  );

  useEffect(() => {
    if (waybill) {
      setNumber(waybill.number);
      setVehicleId(waybill.vehicleId);
      setRoutes(waybill.routes);
      setDoublePaymentDay(waybill.routes.some((r) => r.doublePayment) ?? false);
      setIsBusinessTrip1Day(waybill.isBusinessTrip1Day ?? false);
      setIsBusinessTripMultiDay(waybill.isBusinessTripMultiDay ?? false);
    }
  }, [waybill]);

  const isWeekendDay = useMemo(() => isWeekend(date || ""), [date]);

  const totalEarnings = useMemo(
    () => routes.reduce((sum, r) => sum + calcRouteEarnings(r, cargos), 0),
    [routes, cargos]
  );

  const kilometrage = useMemo(
    () => {
      let loaded = 0;
      let empty = 0;
      routes.forEach((r) => {
        if (r.odometerStart && r.odometerEnd) {
          const dist = r.odometerEnd - r.odometerStart;
          if (r.isLoaded) {
            loaded += dist;
          } else {
            empty += dist;
          }
        }
      });
      return { loaded, empty, total: loaded + empty };
    },
    [routes]
  );

  const fuelUsed = useMemo(
    () => {
      if (!vehicle || !vehicle.fuelConsumptionEmpty) return 0;
      return (vehicle.fuelConsumptionEmpty * kilometrage.total) / 100;
    },
    [vehicle, kilometrage]
  );

  async function handleSave() {
    if (!date) {
      Alert.alert("Ошибка", "Дата не определена");
      return;
    }
    if (!number.trim()) {
      Alert.alert("Ошибка", "Введите номер путевого листа");
      return;
    }
    if (routes.length === 0) {
      Alert.alert("Ошибка", "Добавьте хотя бы один маршрут");
      return;
    }

    const updatedRoutes = routes.map((r) => ({
      ...r,
      doublePayment: doublePaymentDay ? true : r.doublePayment,
    }));

    const wb: Waybill = {
      id: waybill?.id ?? uid(),
      date,
      number: number.trim(),
      vehicleId,
      routes: updatedRoutes,
      isBusinessTrip1Day,
      isBusinessTripMultiDay,
      totalEarnings,
      totalKmLoaded: kilometrage.loaded,
      totalKmEmpty: kilometrage.empty,
      totalKm: kilometrage.total,
      totalFuelUsed: fuelUsed,
    };

    await saveWaybill(wb);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }

  function addRoute() {
    setRoutes([...routes, emptyRoute()]);
  }

  function removeRoute(id: string) {
    setRoutes(routes.filter((r) => r.id !== id));
  }

  function updateRoute(id: string, updates: Partial<RouteEntry>) {
    setRoutes(
      routes.map((r) => {
        if (r.id === id) {
          const updated = { ...r, ...updates };
          // Автоматический расчёт пробега
          if (updated.odometerStart && updated.odometerEnd) {
            const dist = updated.odometerEnd - updated.odometerStart;
            if (updated.isLoaded) {
              updated.kmLoaded = dist;
              updated.kmEmpty = 0;
            } else {
              updated.kmEmpty = dist;
              updated.kmLoaded = 0;
            }
          }
          return updated;
        }
        return r;
      })
    );
  }

  const vehicleItems: DropdownItem[] = vehicles.map((v) => ({
    id: v.id,
    label: `${v.name} ${v.plate ? `(${v.plate})` : ""}`,
  }));

  const cargoItems: DropdownItem[] = cargos.map((c) => ({
    id: c.id,
    label: `${c.name} (${c.pricePerUnit.toFixed(2)} ₽/${c.unit})`,
  }));

  const locationItems: DropdownItem[] = locationPoints.map((l) => ({
    id: l.id,
    label: l.name,
  }));

  return (
    <ScreenContainer containerClassName="bg-background">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={[ws.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
              <Text style={{ color: colors.primary, fontSize: 16 }}>← Назад</Text>
            </TouchableOpacity>
            <Text style={[ws.headerTitle, { color: colors.foreground }]}>
              {formatDateRu(date || "")}
            </Text>
            <View style={{ width: 60 }} />
          </View>

          <View style={ws.content}>
            {/* Number Field */}
            <View style={ws.section}>
              <Text style={[ws.fieldLabel, { color: colors.muted }]}>Номер путевого листа</Text>
              <TextInput
                style={[ws.input, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]}
                value={number}
                onChangeText={setNumber}
                placeholder="001"
                placeholderTextColor={colors.muted}
              />
            </View>

            {/* Vehicle Selection */}
            <View style={ws.section}>
              <Dropdown
                label="Автомобиль"
                value={vehicleId}
                items={vehicleItems}
                onSelect={setVehicleId}
                placeholder="Выберите автомобиль"
                colors={colors}
              />
            </View>

            {/* Double Payment Toggle (if weekend) */}
            {isWeekendDay && (
              <View style={[ws.section, ws.doublePaymentRow]}>
                <View>
                  <Text style={[ws.fieldLabel, { color: colors.muted }]}>Двойная оплата</Text>
                  <Text style={[ws.fieldHint, { color: colors.muted }]}>Выходной день</Text>
                </View>
                <Switch
                  value={doublePaymentDay}
                  onValueChange={setDoublePaymentDay}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={doublePaymentDay ? colors.primary : colors.muted}
                />
              </View>
            )}

            {/* Routes */}
            <View style={ws.section}>
              <View style={ws.sectionHeader}>
                <Text style={[ws.sectionTitle, { color: colors.foreground }]}>Маршруты</Text>
                <TouchableOpacity
                  onPress={addRoute}
                  style={[ws.addBtn, { backgroundColor: colors.primary }]}
                  activeOpacity={0.8}
                >
                  <Text style={ws.addBtnText}>+ Добавить</Text>
                </TouchableOpacity>
              </View>

              {routes.map((route, idx) => (
                <View
                  key={route.id}
                  style={[ws.routeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <View style={ws.routeHeader}>
                    <Text style={[ws.routeNumber, { color: colors.muted }]}>Маршрут {idx + 1}</Text>
                    <TouchableOpacity
                      onPress={() => removeRoute(route.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={{ color: colors.error, fontSize: 18 }}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  {/* From/To with location selection */}
                  <View style={ws.row}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={[ws.fieldLabel, { color: colors.muted }]}>От</Text>
                      <TextInput
                        style={[ws.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
                        value={route.from}
                        onChangeText={(val) => updateRoute(route.id, { from: val })}
                        placeholder="Завод"
                        placeholderTextColor={colors.muted}
                      />
                      {locationItems.length > 0 && (
                        <Text style={[ws.fieldHint, { color: colors.muted }]}>
                          Или выберите ниже
                        </Text>
                      )}
                    </View>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={[ws.fieldLabel, { color: colors.muted }]}>Куда</Text>
                      <TextInput
                        style={[ws.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
                        value={route.to}
                        onChangeText={(val) => updateRoute(route.id, { to: val })}
                        placeholder="Склад"
                        placeholderTextColor={colors.muted}
                      />
                    </View>
                  </View>

                  {/* Location Selection */}
                  {locationItems.length > 0 && (
                    <View style={ws.row}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Dropdown
                          label="Выбрать точку отправления"
                          value={route.fromLocationId}
                          items={locationItems}
                          onSelect={(id) => {
                            const loc = locationPoints.find((l) => l.id === id);
                            if (loc) {
                              updateRoute(route.id, {
                                fromLocationId: id,
                                from: loc.name,
                              });
                            }
                          }}
                          placeholder="Нет"
                          colors={colors}
                        />
                      </View>
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Dropdown
                          label="Выбрать точку прибытия"
                          value={route.toLocationId}
                          items={locationItems}
                          onSelect={(id) => {
                            const loc = locationPoints.find((l) => l.id === id);
                            if (loc) {
                              updateRoute(route.id, {
                                toLocationId: id,
                                to: loc.name,
                              });
                            }
                          }}
                          placeholder="Нет"
                          colors={colors}
                        />
                      </View>
                    </View>
                  )}

                  {/* Odometer for this route */}
                  <View style={ws.row}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={[ws.fieldLabel, { color: colors.muted }]}>Начало (км)</Text>
                      <TextInput
                        style={[ws.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
                        value={route.odometerStart ? String(route.odometerStart) : ""}
                        onChangeText={(val) => {
                          const num = parseInt(val) || undefined;
                          updateRoute(route.id, { odometerStart: num });
                        }}
                        placeholder="385066"
                        placeholderTextColor={colors.muted}
                        keyboardType="number-pad"
                      />
                    </View>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={[ws.fieldLabel, { color: colors.muted }]}>Конец (км)</Text>
                      <TextInput
                        style={[ws.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
                        value={route.odometerEnd ? String(route.odometerEnd) : ""}
                        onChangeText={(val) => {
                          const num = parseInt(val) || undefined;
                          updateRoute(route.id, { odometerEnd: num });
                        }}
                        placeholder="385189"
                        placeholderTextColor={colors.muted}
                        keyboardType="number-pad"
                      />
                    </View>
                  </View>

                  {/* Loaded/Empty Toggle */}
                  <View style={ws.row}>
                    <Text style={[ws.fieldLabel, { color: colors.muted, flex: 1 }]}>
                      {route.isLoaded ? "Груженый" : "Пустой"}
                    </Text>
                    <Switch
                      value={route.isLoaded}
                      onValueChange={(val) => updateRoute(route.id, { isLoaded: val })}
                      trackColor={{ false: colors.border, true: colors.primary }}
                      thumbColor={route.isLoaded ? colors.primary : colors.muted}
                    />
                  </View>

                  {/* Cargo Selection (if loaded) */}
                  {route.isLoaded && (
                    <>
                      {/* Cargo Name - Manual or Select */}
                      <View style={ws.row}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={[ws.fieldLabel, { color: colors.muted }]}>Груз (название)</Text>
                          <TextInput
                            style={[ws.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
                            value={route.cargoName || ""}
                            onChangeText={(val) => updateRoute(route.id, { cargoName: val })}
                            placeholder="Щепа"
                            placeholderTextColor={colors.muted}
                          />
                        </View>
                        {cargoItems.length > 0 && (
                          <View style={{ flex: 1, marginLeft: 8 }}>
                            <Dropdown
                              label="Или выбрать"
                              value={route.cargoId}
                              items={cargoItems}
                              onSelect={(id) => {
                                const cargo = cargos.find((c) => c.id === id);
                                if (cargo) {
                                  updateRoute(route.id, { cargoId: id, cargoName: cargo.name });
                                }
                              }}
                              placeholder="Выбрать"
                              colors={colors}
                            />
                          </View>
                        )}
                      </View>

                      {/* Volume */}
                      <Text style={[ws.fieldLabel, { color: colors.muted }]}>Объём</Text>
                      <TextInput
                        style={[ws.input, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]}
                        value={route.cargoVolume ? String(route.cargoVolume) : ""}
                        onChangeText={(val) => {
                          const num = parseFloat(val) || undefined;
                          updateRoute(route.id, { cargoVolume: num });
                        }}
                        placeholder="100"
                        placeholderTextColor={colors.muted}
                        keyboardType="decimal-pad"
                      />
                    </>
                  )}

                  {/* Pробег и Earnings for this route */}
                  <View style={[ws.routeStats, { backgroundColor: colors.background }]}>
                    <View style={ws.statRow}>
                      <Text style={[ws.statLabel, { color: colors.muted }]}>Пробег</Text>
                      <Text style={[ws.statValue, { color: colors.foreground }]}>
                        {(route.kmLoaded || 0) + (route.kmEmpty || 0)} км
                      </Text>
                    </View>
                    <View style={ws.statRow}>
                      <Text style={[ws.statLabel, { color: colors.muted }]}>Заработок</Text>
                      <Text style={[ws.statValue, { color: colors.primary }]}>
                        {calcRouteEarnings(route, cargos).toFixed(2)} ₽
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            {/* Summary */}
            <View style={[ws.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[ws.summaryTitle, { color: colors.foreground }]}>Итоги дня</Text>
              <View style={ws.summaryRow}>
                <Text style={[ws.summaryLabel, { color: colors.muted }]}>Общий пробег:</Text>
                <Text style={[ws.summaryValue, { color: colors.foreground }]}>
                  {kilometrage.total} км
                </Text>
              </View>
              <View style={ws.summaryRow}>
                <Text style={[ws.summaryLabel, { color: colors.muted }]}>Груженый:</Text>
                <Text style={[ws.summaryValue, { color: colors.foreground }]}>
                  {kilometrage.loaded} км
                </Text>
              </View>
              <View style={ws.summaryRow}>
                <Text style={[ws.summaryLabel, { color: colors.muted }]}>Пустой:</Text>
                <Text style={[ws.summaryValue, { color: colors.foreground }]}>
                  {kilometrage.empty} км
                </Text>
              </View>
              {vehicle?.fuelConsumptionEmpty && (
                <View style={ws.summaryRow}>
                  <Text style={[ws.summaryLabel, { color: colors.muted }]}>Топливо:</Text>
                  <Text style={[ws.summaryValue, { color: colors.foreground }]}>
                    {fuelUsed.toFixed(1)} л
                  </Text>
                </View>
              )}
              <View style={[ws.summaryRow, ws.summaryRowTotal]}>
                <Text style={[ws.summaryLabel, { color: colors.foreground, fontWeight: "700" }]}>
                  Заработок:
                </Text>
                <Text style={[ws.summaryValue, { color: colors.primary, fontWeight: "700", fontSize: 18 }]}>
                  {totalEarnings.toFixed(2)} ₽
                </Text>
              </View>
            </View>

            {/* Business Trip Checkboxes */}
            <View style={[ws.section, { backgroundColor: colors.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border }]}>
              <Text style={[ws.sectionTitle, { color: colors.foreground, marginBottom: 12 }]}>Командировочные</Text>
              <View style={[ws.row, { alignItems: "center", marginBottom: 12 }]}>
                <Text style={[{ color: colors.foreground, flex: 1 }]}>Командировка 1 день (12 BYN)</Text>
                <Switch
                  value={isBusinessTrip1Day}
                  onValueChange={setIsBusinessTrip1Day}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={isBusinessTrip1Day ? colors.primary : colors.muted}
                />
              </View>
              <View style={[ws.row, { alignItems: "center" }]}>
                <Text style={[{ color: colors.foreground, flex: 1 }]}>Командировка более 1 дня (45 BYN)</Text>
                <Switch
                  value={isBusinessTripMultiDay}
                  onValueChange={setIsBusinessTripMultiDay}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={isBusinessTripMultiDay ? colors.primary : colors.muted}
                />
              </View>
            </View>

            {/* Buttons */}
            <View style={ws.buttonRow}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={[ws.button, { backgroundColor: colors.border }]}
                activeOpacity={0.8}
              >
                <Text style={{ color: colors.foreground, fontWeight: "600" }}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                style={[ws.button, { backgroundColor: colors.primary }]}
                activeOpacity={0.8}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>Сохранить</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const ws = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  fieldHint: {
    fontSize: 11,
    marginTop: 2,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  dropdown: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownMenu: {
    position: "absolute",
    top: "50%",
    left: 16,
    right: 16,
    maxHeight: 200,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  row: {
    flexDirection: "row",
    marginBottom: 8,
  },
  doublePaymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  routeCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  routeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  routeNumber: {
    fontSize: 13,
    fontWeight: "600",
  },
  routeStats: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 8,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  statValue: {
    fontSize: 13,
    fontWeight: "600",
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  summaryRowTotal: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ccc",
    marginTop: 8,
    paddingTop: 10,
  },
  summaryLabel: {
    fontSize: 13,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: "600",
  },
  addBtn: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  addBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
});
