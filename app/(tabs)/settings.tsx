import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  StyleSheet,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { useApp } from "@/lib/app-context";
import { Vehicle, Cargo, SavedRoute, LocationPoint, Allowance } from "@/lib/storage";
import { useColors } from "@/hooks/use-colors";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({
  title,
  onAdd,
  colors,
}: {
  title: string;
  onAdd: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[sh.sectionHeader, { borderBottomColor: colors.border }]}>
      <Text style={[sh.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      <TouchableOpacity
        onPress={onAdd}
        style={[sh.addBtn, { backgroundColor: colors.primary }]}
        activeOpacity={0.8}
      >
        <Text style={sh.addBtnText}>+ Добавить</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Vehicles Section ─────────────────────────────────────────────────────────

function VehiclesSection({ colors }: { colors: ReturnType<typeof useColors> }) {
  const { vehicles, setVehicles } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Vehicle | null>(null);
  const [name, setName] = useState("");
  const [plate, setPlate] = useState("");
  const [weight, setWeight] = useState("");
  const [fuelConsumption, setFuelConsumption] = useState("");

  function openAdd() {
    setEditItem(null);
    setName("");
    setPlate("");
    setWeight("");
    setFuelConsumption("");
    setModalOpen(true);
  }

  function openEdit(v: Vehicle) {
    setEditItem(v);
    setName(v.name);
    setPlate(v.plate);
    setWeight(v.weightKg ? String(v.weightKg) : "");
    setFuelConsumption(v.fuelConsumptionEmpty ? String(v.fuelConsumptionEmpty) : "");
    setModalOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert("Ошибка", "Введите название автомобиля");
      return;
    }
    const weightNum = weight ? parseFloat(weight.replace(",", ".")) : undefined;
    const fuelNum = fuelConsumption ? parseFloat(fuelConsumption.replace(",", ".")) : undefined;
    if (editItem) {
      await setVehicles(vehicles.map((v) => (v.id === editItem.id ? { ...v, name: name.trim(), plate: plate.trim(), weightKg: weightNum, fuelConsumptionEmpty: fuelNum } : v)));
    } else {
      await setVehicles([...vehicles, { id: uid(), name: name.trim(), plate: plate.trim(), weightKg: weightNum, fuelConsumptionEmpty: fuelNum }]);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setModalOpen(false);
  }

  async function handleDelete(id: string) {
    Alert.alert("Удалить автомобиль?", "Это действие нельзя отменить.", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: async () => {
          await setVehicles(vehicles.filter((v) => v.id !== id));
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        },
      },
    ]);
  }

  return (
    <View style={sh.section}>
      <SectionHeader title="Автомобили" onAdd={openAdd} colors={colors} />
      {vehicles.length === 0 && (
        <Text style={[sh.emptyText, { color: colors.muted }]}>Нет автомобилей</Text>
      )}
      {vehicles.map((v) => (
        <View key={v.id} style={[sh.listItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[sh.itemTitle, { color: colors.foreground }]}>{v.name}</Text>
            <Text style={[sh.itemSub, { color: colors.muted }]}>
              {v.plate}{v.weightKg ? ` • ${v.weightKg} кг` : ""}{v.fuelConsumptionEmpty ? ` • ${v.fuelConsumptionEmpty} л/100км` : ""}
            </Text>
          </View>
          <TouchableOpacity onPress={() => openEdit(v)} style={sh.iconBtn} activeOpacity={0.7}>
            <Text style={{ color: colors.primary, fontSize: 16 }}>✎</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(v.id)} style={sh.iconBtn} activeOpacity={0.7}>
            <Text style={{ color: colors.error, fontSize: 16 }}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}

      <Modal visible={modalOpen} transparent animationType="slide">
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <TouchableOpacity style={sh.modalOverlay} activeOpacity={1} onPress={() => setModalOpen(false)} />
          <View style={[sh.modalSheet, { backgroundColor: colors.surface }]}>
            <Text style={[sh.modalTitle, { color: colors.foreground }]}>
              {editItem ? "Редактировать авто" : "Добавить автомобиль"}
            </Text>
            <Text style={[sh.fieldLabel, { color: colors.muted }]}>Название</Text>
            <TextInput
              style={[sh.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
              value={name}
              onChangeText={setName}
              placeholder="Например: КАМАЗ 65115"
              placeholderTextColor={colors.muted}
              autoFocus
            />
            <Text style={[sh.fieldLabel, { color: colors.muted }]}>Гос. номер</Text>
            <TextInput
              style={[sh.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
              value={plate}
              onChangeText={setPlate}
              placeholder="А123БВ 77"
              placeholderTextColor={colors.muted}
              autoCapitalize="characters"
            />
            <Text style={[sh.fieldLabel, { color: colors.muted }]}>Вес автомобиля (кг)</Text>
            <TextInput
              style={[sh.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
              value={weight}
              onChangeText={setWeight}
              placeholder="5000"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
            />
            <Text style={[sh.fieldLabel, { color: colors.muted }]}>Расход топлива пустым (л/100км)</Text>
            <TextInput
              style={[sh.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
              value={fuelConsumption}
              onChangeText={setFuelConsumption}
              placeholder="25"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
            />
            <View style={sh.modalBtns}>
              <TouchableOpacity onPress={() => setModalOpen(false)} style={[sh.modalBtn, { backgroundColor: colors.border }]} activeOpacity={0.8}>
                <Text style={{ color: colors.foreground, fontWeight: "600" }}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={[sh.modalBtn, { backgroundColor: colors.primary }]} activeOpacity={0.8}>
                <Text style={{ color: "#fff", fontWeight: "700" }}>Сохранить</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Location Points Section ─────────────────────────────────────────────────────────────

function LocationPointsSection({ colors }: { colors: ReturnType<typeof useColors> }) {
  const { locationPoints, setLocationPoints } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<LocationPoint | null>(null);
  const [name, setName] = useState("");

  function openAdd() {
    setEditItem(null);
    setName("");
    setModalOpen(true);
  }

  function openEdit(p: LocationPoint) {
    setEditItem(p);
    setName(p.name);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert("Ошибка", "Введите название точки");
      return;
    }
    const item: LocationPoint = {
      id: editItem?.id ?? uid(),
      name: name.trim(),
    };
    if (editItem) {
      await setLocationPoints(locationPoints.map((p) => (p.id === editItem.id ? item : p)));
    } else {
      await setLocationPoints([...locationPoints, item]);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setModalOpen(false);
  }

  async function handleDelete(id: string) {
    Alert.alert("Удалить точку?", "Это действие нельзя отменить.", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: async () => {
          await setLocationPoints(locationPoints.filter((p) => p.id !== id));
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        },
      },
    ]);
  }

  return (
    <View style={sh.section}>
      <SectionHeader title="Точки маршрутов" onAdd={openAdd} colors={colors} />
      {locationPoints.length === 0 && (
        <Text style={[sh.emptyText, { color: colors.muted }]}>Нет точек</Text>
      )}
      {locationPoints.map((p) => (
        <View key={p.id} style={[sh.listItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[sh.itemTitle, { color: colors.foreground, flex: 1 }]}>{p.name}</Text>
          <TouchableOpacity onPress={() => openEdit(p)} style={sh.iconBtn} activeOpacity={0.7}>
            <Text style={{ color: colors.primary, fontSize: 16 }}>✎</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(p.id)} style={sh.iconBtn} activeOpacity={0.7}>
            <Text style={{ color: colors.error, fontSize: 16 }}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}

      <Modal visible={modalOpen} transparent animationType="slide">
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <TouchableOpacity style={sh.modalOverlay} activeOpacity={1} onPress={() => setModalOpen(false)} />
          <View style={[sh.modalSheet, { backgroundColor: colors.surface }]}>
            <Text style={[sh.modalTitle, { color: colors.foreground }]}>
              {editItem ? "Редактировать точку" : "Добавить точку"}
            </Text>
            <Text style={[sh.fieldLabel, { color: colors.muted }]}>Название точки</Text>
            <TextInput
              style={[sh.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
              value={name}
              onChangeText={setName}
              placeholder="Завод"
              placeholderTextColor={colors.muted}
              autoFocus
            />
            <Text style={[sh.hintText, { color: colors.muted }]}>
              Например: "Завод НО 1", "Склад НО 3"
            </Text>
            <View style={sh.modalBtns}>
              <TouchableOpacity onPress={() => setModalOpen(false)} style={[sh.modalBtn, { backgroundColor: colors.border }]} activeOpacity={0.8}>
                <Text style={{ color: colors.foreground, fontWeight: "600" }}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={[sh.modalBtn, { backgroundColor: colors.primary }]} activeOpacity={0.8}>
                <Text style={{ color: "#fff", fontWeight: "700" }}>Сохранить</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Cargos Section ───────────────────────────────────────────────────────────

function CargosSection({ colors }: { colors: ReturnType<typeof useColors> }) {
  const { cargos, setCargos } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Cargo | null>(null);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("куб");
  const [price, setPrice] = useState("");
  const [weightTons, setWeightTons] = useState("");

  function openAdd() {
    setEditItem(null);
    setName("");
    setUnit("куб");
    setPrice("");
    setWeightTons("");
    setModalOpen(true);
  }

  function openEdit(c: Cargo) {
    setEditItem(c);
    setName(c.name);
    setUnit(c.unit);
    setPrice(String(c.pricePerUnit));
    setWeightTons(c.weightTons ? String(c.weightTons) : "");
    setModalOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert("Ошибка", "Введите название груза");
      return;
    }
    const priceNum = parseFloat(price.replace(",", "."));
    if (isNaN(priceNum) || priceNum < 0) {
      Alert.alert("Ошибка", "Введите корректную расценку");
      return;
    }
    const weightTonsNum = weightTons ? parseFloat(weightTons.replace(",", ".")) : undefined;
    const item: Cargo = {
      id: editItem?.id ?? uid(),
      name: name.trim(),
      unit: unit.trim() || "ед.",
      pricePerUnit: priceNum,
      weightTons: weightTonsNum,
    };
    if (editItem) {
      await setCargos(cargos.map((c) => (c.id === editItem.id ? item : c)));
    } else {
      await setCargos([...cargos, item]);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setModalOpen(false);
  }

  async function handleDelete(id: string) {
    Alert.alert("Удалить груз?", "Это действие нельзя отменить.", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: async () => {
          await setCargos(cargos.filter((c) => c.id !== id));
        },
      },
    ]);
  }

  return (
    <View style={sh.section}>
      <SectionHeader title="Грузы и расценки" onAdd={openAdd} colors={colors} />
      {cargos.length === 0 && (
        <Text style={[sh.emptyText, { color: colors.muted }]}>Нет грузов</Text>
      )}
      {cargos.map((c) => (
        <View key={c.id} style={[sh.listItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[sh.itemTitle, { color: colors.foreground }]}>{c.name}</Text>
            <Text style={[sh.itemSub, { color: colors.muted }]}>
              {c.pricePerUnit.toFixed(2)} ₽ / {c.unit}{c.weightTons ? ` (${c.weightTons} т)` : ""}
            </Text>
          </View>
          <TouchableOpacity onPress={() => openEdit(c)} style={sh.iconBtn} activeOpacity={0.7}>
            <Text style={{ color: colors.primary, fontSize: 16 }}>✎</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(c.id)} style={sh.iconBtn} activeOpacity={0.7}>
            <Text style={{ color: colors.error, fontSize: 16 }}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}

      <Modal visible={modalOpen} transparent animationType="slide">
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <TouchableOpacity style={sh.modalOverlay} activeOpacity={1} onPress={() => setModalOpen(false)} />
          <View style={[sh.modalSheet, { backgroundColor: colors.surface }]}>
            <Text style={[sh.modalTitle, { color: colors.foreground }]}>
              {editItem ? "Редактировать груз" : "Добавить груз"}
            </Text>
            <Text style={[sh.fieldLabel, { color: colors.muted }]}>Название груза</Text>
            <TextInput
              style={[sh.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
              value={name}
              onChangeText={setName}
              placeholder="Щепа, Песок, Гравий..."
              placeholderTextColor={colors.muted}
              autoFocus
            />
            <Text style={[sh.fieldLabel, { color: colors.muted }]}>Единица измерения</Text>
            <TextInput
              style={[sh.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
              value={unit}
              onChangeText={setUnit}
              placeholder="куб, тонна, шт..."
              placeholderTextColor={colors.muted}
            />
            <Text style={[sh.fieldLabel, { color: colors.muted }]}>Расценка (₽ за единицу)</Text>
            <TextInput
              style={[sh.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
              value={price}
              onChangeText={setPrice}
              placeholder="1.66"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
            />
            <Text style={[sh.fieldLabel, { color: colors.muted }]}>Вес груза (тонны)</Text>
            <TextInput
              style={[sh.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
              value={weightTons}
              onChangeText={setWeightTons}
              placeholder="0.5"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
            />
            <Text style={[sh.hintText, { color: colors.muted }]}>
              Вес груза в тоннах (ТТН)
            </Text>
            <View style={sh.modalBtns}>
              <TouchableOpacity onPress={() => setModalOpen(false)} style={[sh.modalBtn, { backgroundColor: colors.border }]} activeOpacity={0.8}>
                <Text style={{ color: colors.foreground, fontWeight: "600" }}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={[sh.modalBtn, { backgroundColor: colors.primary }]} activeOpacity={0.8}>
                <Text style={{ color: "#fff", fontWeight: "700" }}>Сохранить</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Allowances Section (placeholder) ─────────────────────────────────────────

function AllowancesSection({ colors }: { colors: ReturnType<typeof useColors> }) {
  // Здесь может быть реализация надбавок, оставляем заглушку или уже существующий код.
  return (
    <View style={sh.section}>
      <SectionHeader title="Надбавки" onAdd={() => {}} colors={colors} />
      <Text style={[sh.emptyText, { color: colors.muted }]}>Раздел в разработке</Text>
    </View>
  );
}

// ─── Main Settings Screen ─────────────────────────────────────────────────────

export default function SettingsScreen() {
  const colors = useColors();

  return (
    <ScreenContainer containerClassName="bg-background">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[sh.pageHeader, { borderBottomColor: colors.border }]}>
          <Text style={[sh.pageTitle, { color: colors.foreground }]}>Настройки</Text>
        </View>
        <VehiclesSection colors={colors} />
        <LocationPointsSection colors={colors} />
        {/* Секция "Сохранённые маршруты" удалена */}
        <CargosSection colors={colors} />
        <AllowancesSection colors={colors} />
      </ScrollView>
    </ScreenContainer>
  );
}

// ─── Shared Styles ────────────────────────────────────────────────────────────

const sh = StyleSheet.create({
  pageHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  addBtn: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  itemSub: {
    fontSize: 12,
    marginTop: 2,
  },
  iconBtn: {
    padding: 6,
    marginLeft: 4,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 4,
  },
  hintText: {
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  modalBtns: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  modalBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
});