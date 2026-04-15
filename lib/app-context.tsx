import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  Vehicle,
  Cargo,
  LocationPoint,
  SavedRoute,
  Waybill,
  Allowance,
  getVehicles,
  saveVehicles,
  getCargos,
  saveCargos,
  getLocationPoints,
  saveLocationPoints,
  getSavedRoutes,
  saveSavedRoutes,
  getWaybills,
  saveWaybills,
  upsertWaybill,
  getAllowances,
  setAllowances,
} from "./storage";

interface AppContextValue {
  vehicles: Vehicle[];
  cargos: Cargo[];
  locationPoints: LocationPoint[];
  savedRoutes: SavedRoute[];
  waybills: Waybill[];
  allowances: Allowance[];
  loading: boolean;
  setVehicles: (v: Vehicle[]) => Promise<void>;
  setCargos: (c: Cargo[]) => Promise<void>;
  setLocationPoints: (p: LocationPoint[]) => Promise<void>;
  setSavedRoutes: (r: SavedRoute[]) => Promise<void>;
  setAllowancesState: (a: Allowance[]) => Promise<void>;
  saveWaybill: (w: Waybill) => Promise<void>;
  refresh: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [vehicles, setVehiclesState] = useState<Vehicle[]>([]);
  const [cargos, setCargosState] = useState<Cargo[]>([]);
  const [locationPoints, setLocationPointsState] = useState<LocationPoint[]>([]);
  const [savedRoutes, setSavedRoutesState] = useState<SavedRoute[]>([]);
  const [waybills, setWaybillsState] = useState<Waybill[]>([]);
  const [allowances, setAllowancesStateLocal] = useState<Allowance[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [v, c, l, r, w, a] = await Promise.all([
      getVehicles(),
      getCargos(),
      getLocationPoints(),
      getSavedRoutes(),
      getWaybills(),
      getAllowances(),
    ]);
    setVehiclesState(v);
    setCargosState(c);
    setLocationPointsState(l);
    setSavedRoutesState(r);
    setWaybillsState(w);
    setAllowancesStateLocal(a);
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const setVehicles = useCallback(async (v: Vehicle[]) => {
    await saveVehicles(v);
    setVehiclesState(v);
  }, []);

  const setCargos = useCallback(async (c: Cargo[]) => {
    await saveCargos(c);
    setCargosState(c);
  }, []);

  const setLocationPoints = useCallback(async (p: LocationPoint[]) => {
    await saveLocationPoints(p);
    setLocationPointsState(p);
  }, []);

  const setSavedRoutes = useCallback(async (r: SavedRoute[]) => {
    await saveSavedRoutes(r);
    setSavedRoutesState(r);
  }, []);

  const setAllowancesStateFunc = useCallback(async (a: Allowance[]) => {
    await setAllowances(a);
    setAllowancesStateLocal(a);
  }, []);

  const saveWaybill = useCallback(async (w: Waybill) => {
    await upsertWaybill(w);
    setWaybillsState((prev) => {
      const idx = prev.findIndex((x) => x.date === w.date);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = w;
        return next;
      }
      return [...prev, w];
    });
  }, []);

  return (
    <AppContext.Provider
      value={{
        vehicles,
        cargos,
        locationPoints,
        savedRoutes,
        waybills,
        allowances,
        loading,
        setVehicles,
        setCargos,
        setLocationPoints,
        setSavedRoutes,
        setAllowancesState: setAllowancesStateFunc,
        saveWaybill,
        refresh,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
