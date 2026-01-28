import type { StationDetail } from "../app/models/Network";

/**
 * Normalize station name to match Excel sheet naming rules
 */
function normalizeStationName(name: string): string {
  return name
    .trim()
    .replace(/[\\/*?:[\]]/g, "") // ลบอักขระต้องห้ามของ Excel
    .slice(0, 31);
}

/**
 * Build map: normalized (unique) station name -> station ID
 * If duplicated, append "-<stationID>"
 */
export function buildStationNameToIdMap(
  stationDetails: StationDetail[]
) {
  const map: Record<string, string> = {};
  const usedNames = new Set<string>();

  stationDetails.forEach((s) => {
    const id = s.StationID || s.station_detail_id;
    if (!id) return;

    [
      s.name,
      s.StationName,
    ].forEach((rawName) => {
      if (!rawName) return;

      const base = normalizeStationName(rawName);
      if (!base) return;

      let safe = base;

      // ถ้าชื่อซ้ำ ให้เติม -<stationID>
      if (usedNames.has(safe)) {
        const suffix = `-${id}`;
        const maxBase = Math.max(0, 31 - suffix.length);
        safe = (base.slice(0, maxBase) + suffix).slice(0, 31);
      }

      usedNames.add(safe);
      map[safe] = String(id);
    });
  });

  return map;
}
