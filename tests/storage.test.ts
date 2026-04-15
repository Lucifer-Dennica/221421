import { describe, it, expect } from "vitest";
import {
  calcRouteEarnings,
  calcWaybillEarnings,
  calcMonthEarnings,
  type RouteEntry,
  type Cargo,
  type Waybill,
} from "../lib/storage";

const cargos: Cargo[] = [
  { id: "c1", name: "Щепа", unit: "куб", pricePerUnit: 1.66 },
  { id: "c2", name: "Песок", unit: "куб", pricePerUnit: 2.5 },
];

describe("calcRouteEarnings", () => {
  it("returns 0 when route is empty (not loaded)", () => {
    const route: RouteEntry = {
      id: "r1", from: "A", to: "B",
      isLoaded: false, kmLoaded: 10, kmEmpty: 5,
    };
    expect(calcRouteEarnings(route, cargos)).toBe(0);
  });

  it("returns 0 when no cargo selected", () => {
    const route: RouteEntry = {
      id: "r1", from: "A", to: "B",
      isLoaded: true, cargoVolume: 10, kmLoaded: 10, kmEmpty: 0,
    };
    expect(calcRouteEarnings(route, cargos)).toBe(0);
  });

  it("returns 0 when cargoVolume is undefined", () => {
    const route: RouteEntry = {
      id: "r1", from: "A", to: "B",
      isLoaded: true, cargoId: "c1", kmLoaded: 10, kmEmpty: 0,
    };
    expect(calcRouteEarnings(route, cargos)).toBe(0);
  });

  it("calculates щепа earnings correctly", () => {
    const route: RouteEntry = {
      id: "r1", from: "A", to: "B",
      isLoaded: true, cargoId: "c1", cargoVolume: 100,
      kmLoaded: 50, kmEmpty: 0,
    };
    // 1.66 * 100 = 166
    expect(calcRouteEarnings(route, cargos)).toBeCloseTo(166, 2);
  });

  it("calculates песок earnings correctly", () => {
    const route: RouteEntry = {
      id: "r2", from: "C", to: "D",
      isLoaded: true, cargoId: "c2", cargoVolume: 20,
      kmLoaded: 30, kmEmpty: 10,
    };
    // 2.5 * 20 = 50
    expect(calcRouteEarnings(route, cargos)).toBeCloseTo(50, 2);
  });
});

describe("calcWaybillEarnings", () => {
  it("sums earnings across all routes", () => {
    const waybill: Waybill = {
      id: "w1", date: "2026-04-01", number: "001",
      totalEarnings: 0,
      routes: [
        { id: "r1", from: "A", to: "B", isLoaded: true, cargoId: "c1", cargoVolume: 100, kmLoaded: 50, kmEmpty: 0 },
        { id: "r2", from: "C", to: "D", isLoaded: true, cargoId: "c2", cargoVolume: 20, kmLoaded: 30, kmEmpty: 10 },
      ],
    };
    // 166 + 50 = 216
    expect(calcWaybillEarnings(waybill, cargos)).toBeCloseTo(216, 2);
  });
});

describe("calcMonthEarnings", () => {
  const waybills: Waybill[] = [
    { id: "w1", date: "2026-04-01", number: "001", totalEarnings: 100, routes: [] },
    { id: "w2", date: "2026-04-15", number: "002", totalEarnings: 200, routes: [] },
    { id: "w3", date: "2026-03-31", number: "003", totalEarnings: 999, routes: [] },
    { id: "w4", date: "2026-05-01", number: "004", totalEarnings: 50, routes: [] },
  ];

  it("sums only waybills in the given month", () => {
    // April 2026 = month index 3
    expect(calcMonthEarnings(waybills, 2026, 3)).toBe(300);
  });

  it("returns 0 for a month with no waybills", () => {
    expect(calcMonthEarnings(waybills, 2026, 6)).toBe(0);
  });

  it("does not include adjacent months", () => {
    // March 2026 = month index 2, but waybill w3 is 2026-03-31 so index 2
    // w1 (Apr=3) + w2 (Apr=3) are NOT in March; w3 (Mar=2) IS in March
    expect(calcMonthEarnings(waybills, 2026, 2)).toBe(999); // March only
    expect(calcMonthEarnings(waybills, 2026, 4)).toBe(50);  // May only
  });
});
