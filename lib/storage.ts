import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Vehicle {
  id: string;
  name: string;
  plate: string;
  weightKg?: number; // вес автомобиля
  fuelConsumptionEmpty?: number; // расход топлива пустым (л/100км)
}

export interface Cargo {
  id: string;
  name: string;
  unit: string; // e.g. "куб", "тонна"
  pricePerUnit: number;
  weightTons?: number; // вес груза в тоннах (ТТН)
}

export interface LocationPoint {
  id: string;
  name: string; // e.g. "Завод", "Склад №3"
}

export interface Allowance {
  id: string;
  name: string; // e.g. "Командировка 1 день", "Командировка более 1 дня"
  price: number; // цена в BYN
}

export interface SavedRoute {
  id: string;
  fromLocationId?: string;
  toLocationId?: string;
  name: string; // e.g. "Завод → Склад №3" (для совместимости)
}

export interface RouteEntry {
  id: string;
  from: string;
  to: string;
  fromLocationId?: string; // ID сохранённой точки отправления
  toLocationId?: string; // ID сохранённой точки прибытия
  savedRouteId?: string;
  isLoaded: boolean;
  cargoId?: string;
  cargoName?: string; // название груза (если вводится вручную)
  cargoVolume?: number;
  odometerStart?: number; // начальный спидометр для этого маршрута
  odometerEnd?: number; // конечный спидометр для этого маршрута
  kmLoaded?: number; // рассчитанный пробег груженым
  kmEmpty?: number; // рассчитанный пробег пустым
  doublePayment?: boolean; // двойная оплата (выходной)
}

export interface Waybill {
  id: string;
  date: string; // YYYY-MM-DD
  number: string;
  vehicleId?: string;
  routes: RouteEntry[];
  isBusinessTrip1Day?: boolean; // командировка 1 день
  isBusinessTripMultiDay?: boolean; // командировка более 1 дня
  totalEarnings: number;
  totalKmLoaded?: number;
  totalKmEmpty?: number;
  totalKm?: number;
  totalFuelUsed?: number;
}

// ─── Storage Keys ─────────────────────────────────────────────────────────────

const KEYS = {
  VEHICLES: "vehicles",
  CARGOS: "cargos",
  LOCATION_POINTS: "location_points",
  SAVED_ROUTES: "saved_routes",
  WAYBILLS: "waybills",
  ALLOWANCES: "allowances",
} as const;

// ─── Generic helpers ──────────────────────────────────────────────────────────

async function getList<T>(key: string): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveList<T>(key: string, list: T[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(list));
}

// ─── Vehicles ─────────────────────────────────────────────────────────────────

export async function getVehicles(): Promise<Vehicle[]> {
  return getList<Vehicle>(KEYS.VEHICLES);
}

export async function saveVehicles(vehicles: Vehicle[]): Promise<void> {
  return saveList(KEYS.VEHICLES, vehicles);
}

// ─── Cargos ───────────────────────────────────────────────────────────────────

export async function getCargos(): Promise<Cargo[]> {
  return getList<Cargo>(KEYS.CARGOS);
}

export async function saveCargos(cargos: Cargo[]): Promise<void> {
  return saveList(KEYS.CARGOS, cargos);
}

// ─── Location Points ─────────────────────────────────────────────────────────

export async function getLocationPoints(): Promise<LocationPoint[]> {
  return getList<LocationPoint>(KEYS.LOCATION_POINTS);
}

export async function saveLocationPoints(points: LocationPoint[]): Promise<void> {
  return saveList(KEYS.LOCATION_POINTS, points);
}

// ─── Saved Routes ─────────────────────────────────────────────────────────────

export async function getSavedRoutes(): Promise<SavedRoute[]> {
  return getList<SavedRoute>(KEYS.SAVED_ROUTES);
}

export async function saveSavedRoutes(routes: SavedRoute[]): Promise<void> {
  return saveList(KEYS.SAVED_ROUTES, routes);
}

// ─── Waybills ─────────────────────────────────────────────────────────────────

export async function getWaybills(): Promise<Waybill[]> {
  return getList<Waybill>(KEYS.WAYBILLS);
}

export async function saveWaybills(waybills: Waybill[]): Promise<void> {
  return saveList(KEYS.WAYBILLS, waybills);
}

export async function getWaybillByDate(date: string): Promise<Waybill | null> {
  const all = await getWaybills();
  return all.find((w) => w.date === date) ?? null;
}

export async function upsertWaybill(waybill: Waybill): Promise<void> {
  const all = await getWaybills();
  const idx = all.findIndex((w) => w.date === waybill.date);
  if (idx >= 0) {
    all[idx] = waybill;
  } else {
    all.push(waybill);
  }
  await saveWaybills(all);
}

// ─── Earnings helpers ─────────────────────────────────────────────────────────

export function calcRouteEarnings(route: RouteEntry, cargos: Cargo[]): number {
  if (!route.isLoaded || !route.cargoId || !route.cargoVolume) return 0;
  const cargo = cargos.find((c) => c.id === route.cargoId);
  if (!cargo) return 0;
  let earnings = cargo.pricePerUnit * route.cargoVolume;
  if (route.doublePayment) {
    earnings *= 2;
  }
  return earnings;
}

export function calcWaybillEarnings(waybill: Waybill, cargos: Cargo[]): number {
  return waybill.routes.reduce((sum, r) => sum + calcRouteEarnings(r, cargos), 0);
}

export function calcWaybillKilometrage(waybill: Waybill): { loaded: number; empty: number; total: number } {
  let loaded = 0;
  let empty = 0;
  waybill.routes.forEach((r) => {
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
}

export function calcFuelUsed(vehicle: Vehicle | undefined, waybill: Waybill): number {
  if (!vehicle || !vehicle.fuelConsumptionEmpty) return 0;
  const km = calcWaybillKilometrage(waybill);
  return (vehicle.fuelConsumptionEmpty * km.total) / 100;
}

export function calcMonthEarnings(waybills: Waybill[], year: number, month: number): number {
  const mm = String(month + 1).padStart(2, "0");
  const prefix = `${year}-${mm}-`;
  return waybills
    .filter((w) => w.date.startsWith(prefix))
    .reduce((sum, w) => sum + w.totalEarnings, 0);
}

export function calcMonthKilometrage(waybills: Waybill[], year: number, month: number): { loaded: number; empty: number; total: number } {
  const mm = String(month + 1).padStart(2, "0");
  const prefix = `${year}-${mm}-`;
  let loaded = 0;
  let empty = 0;
  waybills
    .filter((w) => w.date.startsWith(prefix))
    .forEach((w) => {
      const km = calcWaybillKilometrage(w);
      loaded += km.loaded;
      empty += km.empty;
    });
  return { loaded, empty, total: loaded + empty };
}

export function calcMonthCargo(waybills: Waybill[], year: number, month: number, cargos: Cargo[]): Record<string, number> {
  const mm = String(month + 1).padStart(2, "0");
  const prefix = `${year}-${mm}-`;
  const result: Record<string, number> = {};
  waybills
    .filter((w) => w.date.startsWith(prefix))
    .forEach((w) => {
      w.routes.forEach((r) => {
        if (r.isLoaded && r.cargoId && r.cargoVolume) {
          result[r.cargoId] = (result[r.cargoId] || 0) + r.cargoVolume;
        }
      });
    });
  return result;
}

export function calcMonthFuel(waybills: Waybill[], year: number, month: number, vehicle: Vehicle | undefined): number {
  if (!vehicle || !vehicle.fuelConsumptionEmpty) return 0;
  const mm = String(month + 1).padStart(2, "0");
  const prefix = `${year}-${mm}-`;
  let total = 0;
  waybills
    .filter((w) => w.date.startsWith(prefix))
    .forEach((w) => {
      total += calcFuelUsed(vehicle, w);
    });
  return total;
}

// ─── Allowances (Командировочные) ─────────────────────────────────────────────

export async function getAllowances(): Promise<Allowance[]> {
  const list = await getList<Allowance>(KEYS.ALLOWANCES);
  // Если пусто, инициализируем с дефолтными значениями
  if (list.length === 0) {
    const defaults: Allowance[] = [
      { id: "1day", name: "Командировка 1 день", price: 12 },
      { id: "multiday", name: "Командировка более 1 дня", price: 45 },
    ];
    await saveList(KEYS.ALLOWANCES, defaults);
    return defaults;
  }
  return list;
}

export async function setAllowances(allowances: Allowance[]): Promise<void> {
  await saveList(KEYS.ALLOWANCES, allowances);
}

export function calcMonthBusinessTrips(waybills: Waybill[], year: number, month: number): { oneDay: number; multiDay: number } {
  const mm = String(month + 1).padStart(2, "0");
  const prefix = `${year}-${mm}-`;
  let oneDay = 0;
  let multiDay = 0;
  waybills
    .filter((w) => w.date.startsWith(prefix))
    .forEach((w) => {
      if (w.isBusinessTrip1Day) oneDay++;
      if (w.isBusinessTripMultiDay) multiDay++;
    });
  return { oneDay, multiDay };
}

export function calcMonthCargoDetailed(waybills: Waybill[], year: number, month: number, cargos: Cargo[]): Record<string, { volume: number; weight: number }> {
  const mm = String(month + 1).padStart(2, "0");
  const prefix = `${year}-${mm}-`;
  const result: Record<string, { volume: number; weight: number }> = {};
  
  waybills
    .filter((w) => w.date.startsWith(prefix))
    .forEach((w) => {
      w.routes.forEach((r) => {
        if (r.isLoaded && r.cargoVolume) {
          const cargoName = r.cargoName || (r.cargoId ? cargos.find((c) => c.id === r.cargoId)?.name : "Неизвестный груз") || "Неизвестный груз";
          if (!result[cargoName]) {
            result[cargoName] = { volume: 0, weight: 0 };
          }
          result[cargoName].volume += r.cargoVolume;
          
          // Добавляем вес, если есть информация о грузе
          if (r.cargoId) {
            const cargo = cargos.find((c) => c.id === r.cargoId);
            if (cargo && cargo.weightTons) {
              result[cargoName].weight += cargo.weightTons * r.cargoVolume;
            }
          }
        }
      });
    });
  return result;
}
