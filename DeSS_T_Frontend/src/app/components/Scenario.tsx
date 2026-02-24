import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ConfigurationDetail } from "../models/Configuration";
import type {
  StationDetail,
  StationPair,
  NetworkModel,
  GeoLineString,
} from "../models/Network";
import type { SimulationResponse } from "../models/SimulationModel";
import ScenarioMap from "./ScenarioMap";
import type { RouteSegment } from "./ScenarioMap";
import { computeRouteSegments } from "../../utility/api/routeBatch";
import type { ColorResult } from "react-color";
import Outputpage from "../pages/Outputpage";
import "../../style/Scenario.css";
import type { ProjectSimulationRequest } from "../models/ProjectModel";
import { runSimulation } from "../../utility/api/simulation";
import type {
  ScenarioDetail,
  BusScenario,
  ScheduleData,
  BusInformation,
  RouteScenario,
  RoutePath,
  Order,
} from "../models/Scenario";
import { getScheduleData } from "../../utility/api/simulation";
import type { PaserSchedule } from "../models/ScheduleModel";
import type { UserScenario } from "../models/User";
import {
  createUserScenario,
  uploadScenarioCoverImage,
} from "../../utility/api/scenario";
import { useAuth } from "../contexts/useAuth";
import Nav from "./NavBar";
import ExcelJS from "exceljs";
import CustomDropdown from "./CustomDropdown";
import ScheduleUploadSection from "./Scenario/ScheduleUploadSection";
import BusInfoPanel from "./Scenario/BusInfoPanel";
import RoutesList from "./Scenario/RoutesList";
import SuccessModal from "./Scenario/SuccessModal";
import type { SimpleRoute } from "./Scenario/RouteCard";
// import { downloadJson } from "../../utility/helpers";

export default function Scenario({
  configuration,
  configurationName,
  onBack,
  projectName,
  scenario,
  usermode = "guest",
  idforUpdate,
}: {
  configuration: ConfigurationDetail;
  configurationName?: string;
  onBack?: () => void;
  projectName?: string;
  scenario?: ScenarioDetail;
  usermode?: "guest" | "user";
  idforUpdate?: string;
}) {
  const { user } = useAuth();

  const nodes: StationDetail[] = useMemo(() => {
    const networkModel = configuration?.network_model as
      | (NetworkModel & {
          Station_detail?: unknown[];
          station_details?: unknown[];
        })
      | undefined;
    if (!networkModel) return [];

    const toNum = (v: unknown): number | undefined => {
      if (typeof v === "number" && Number.isFinite(v)) return v;
      if (typeof v === "string") {
        const n = parseFloat(v);
        if (Number.isFinite(n)) return n;
      }
      return undefined;
    };

    const normalizeStation = (
      raw: unknown,
      idx: number,
    ): StationDetail | null => {
      if (!raw || typeof raw !== "object") return null;
      const rec = raw as Record<string, unknown>;

      const locationLower = rec.location as unknown;
      const locationUpper = rec.Location as unknown;
      const coords = ((locationLower as Record<string, unknown> | undefined)
        ?.coordinates ||
        (locationUpper as Record<string, unknown> | undefined)
          ?.coordinates) as unknown;

      const latFromCoords = Array.isArray(coords)
        ? toNum(coords[1])
        : undefined;
      const lonFromCoords = Array.isArray(coords)
        ? toNum(coords[0])
        : undefined;

      const lat = toNum(rec.lat) ?? toNum(rec.latitude) ?? latFromCoords;
      const lon = toNum(rec.lon) ?? toNum(rec.longitude) ?? lonFromCoords;

      if (lat === undefined || lon === undefined) return null;

      const rawStationId =
        (rec.station_detail_id as string | undefined) ||
        (rec.StationID as string | undefined) ||
        (rec.station_id_osm as string | undefined);

      const stationId =
        rawStationId ||
        `${lat.toFixed(6)},${lon.toFixed(6)}` ||
        `station-${idx}`;

      const name =
        (rec.name as string | undefined) ||
        (rec.StationName as string | undefined) ||
        (rec.station_name as string | undefined) ||
        (rec.name_th as string | undefined) ||
        rawStationId ||
        `Station ${idx + 1}`;

      const normalized = {
        ...rec,
        station_detail_id: stationId,
        station_id_osm: (rec.station_id_osm as string | undefined) || stationId,
        name,
        lat,
        lon,
        location: {
          type: "Point",
          coordinates: [lon, lat],
        },
      } as unknown as StationDetail;

      return normalized;
    };

    const nm = networkModel as {
      Station_detail?: unknown[];
      station_details?: unknown[];
      StationPair?: StationPair[];
      station_pairs?: StationPair[];
    };

    // Extract stations directly from Station_detail or station_details arrays
    // (most reliable source - direct from backend response)
    const directStations = nm.Station_detail || nm.station_details || [];
    if (!Array.isArray(directStations) || directStations.length === 0) {
      // Fallback: if no direct stations, try to extract from StationPair
      const stationPairs = nm.StationPair || [];
      const fromPairs =
        stationPairs?.flatMap((pair: StationPair) => {
          if (!pair) return [];
          const result = [];
          if (pair.FstStation) result.push(pair.FstStation);
          if (pair.SndStation) result.push(pair.SndStation);
          return result;
        }) ?? [];

      const normalized = fromPairs
        .map((raw: unknown, idx: number) => normalizeStation(raw, idx))
        .filter((s): s is StationDetail => !!s);

      const unique = normalized.filter(
        (station: StationDetail, index: number, self: StationDetail[]) =>
          index ===
          self.findIndex(
            (s: StationDetail) =>
              s.station_detail_id === station.station_detail_id,
          ),
      );

      return unique;
    }

    // Use direct stations (primary path)
    const normalized = (directStations as unknown[])
      .map((raw: unknown, idx: number) => normalizeStation(raw, idx))
      .filter((s): s is StationDetail => !!s);

    // Deduplicate by station_detail_id
    const unique = normalized.filter(
      (station: StationDetail, index: number, self: StationDetail[]) =>
        index ===
        self.findIndex(
          (s: StationDetail) =>
            s.station_detail_id === station.station_detail_id,
        ),
    );

    return unique;
  }, [configuration?.network_model]);
  const [transportMode, setTransportMode] = useState<"Route" | "Bus">("Route");
  const colorOptions = useMemo(
    () => [
      "#76218a",
      "#3a8345",
      "#49fd36",
      "#f80512",
      "#f7bc16",
      "#fc2898",
      "#0e16b2",
      "#83c8f9",
      "#7a644e",
    ],
    [],
  );

  const createRoute = (idx: number): SimpleRoute => ({
    id: `${Date.now()}-${idx}`,
    name: `Route ${idx + 1}`,
    color: colorOptions[idx % colorOptions.length],
    stations: [], // stations will be selected from map later
    segments: [],
    orders: [], // Orders will be created when route is confirmed
    hidden: false,
    locked: false,
    maxDistance: 70,
    speed: 60,
    capacity: 16,
    maxBuses: 4,
    routeTravelingTime: 0,
  });

  const [routes, setRoutes] = useState<SimpleRoute[]>([createRoute(0)]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [isFetchingSegment, setIsFetchingSegment] = useState(false);
  const [originalStations, setOriginalStations] = useState<
    Record<string, string[]>
  >({});
  const [originalSegments, setOriginalSegments] = useState<
    Record<string, RouteSegment[]>
  >({});
  const [originalOrders, setOriginalOrders] = useState<Record<string, Order[]>>(
    {},
  );
  const [openColorPickerId, setOpenColorPickerId] = useState<string | null>(
    null,
  );
  const [expandedStationRoutes, setExpandedStationRoutes] = useState<
    Set<string>
  >(new Set());
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const scheduleDataRef = useRef<
    Array<{ route_id: string; schedule_list: string }>
  >([]);
  
  // 🔹 Track if user has made any changes (for warning before simulation)
  const hasDataChangedRef = useRef<boolean>(false);
  const markAsChanged = () => {
    if (usermode === "user") {
      hasDataChangedRef.current = true;
    }
  };

  // 🔹 Unsaved changes modal state
  const [showUnsavedModal, setShowUnsavedModal] = useState<boolean>(false);
  
  const [simStartHour, setSimStartHour] = useState<number>(8);
  const [simEndHour, setSimEndHour] = useState<number>(16);
  const [timeSlot, setTimeSlot] = useState<string>("15 Minutes");
  
  // Station filter state
  const [stationFilter, setStationFilter] = useState<"all" | "with-data" | "no-data">("with-data");
  const [simulationResponse, setSimulationResponse] =
    useState<SimulationResponse | null>(null);
  const [busScheduleFile, setBusScheduleFile] = useState<File | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [successRedirectId, setSuccessRedirectId] = useState<string | null>(
    null,
  );
  const hasExistingSchedule =
    (scenario?.bus_scenario?.schedule_data?.length ?? 0) > 0;

  // Identify stations with data (alighting or interarrival)
  const stationsWithDataIds = useMemo(() => {
    const ids = new Set<string>();
    configuration?.alighting_datas?.forEach((d) => {
      if (d.station_id) ids.add(d.station_id);
      if (d.station_detail?.station_detail_id) ids.add(d.station_detail.station_detail_id);
    });
    configuration?.interarrival_datas?.forEach((d) => {
      if (d.station_id) ids.add(d.station_id);
      if (d.station_detail?.station_detail_id) ids.add(d.station_detail.station_detail_id);
    });
    return ids;
  }, [configuration?.alighting_datas, configuration?.interarrival_datas]);

  const buildStationsFromOrders = (orders?: Order[]): string[] => {
    if (!orders || orders.length === 0) return [];
    const sorted = [...orders].sort((a, b) => a.order - b.order);
    const stations: string[] = [];

    sorted.forEach((order, idx) => {
      const pair = order.station_pair;
      if (!pair) return;
      if (idx === 0 && pair.FstStation) {
        stations.push(pair.FstStation);
      }
      if (pair.SndStation) {
        stations.push(pair.SndStation);
      }
    });

    return stations;
  };

  const buildSegmentsFromLine = (route?: GeoLineString): RouteSegment[] => {
    if (!route || !Array.isArray(route.coordinates)) return [];
    if (route.coordinates.length < 2) return [];
    return [
      {
        from: "",
        to: "",
        coords: route.coordinates,
      },
    ];
  };

  const isEditingScenario = !!scenario?.scenario_detail_id;
  const buildRoutePathId = (route: SimpleRoute, scenarioId: string) =>
    isEditingScenario ? route.id : `${route.name}-${scenarioId}`;

  useEffect(() => {
    if (!scenario?.route_scenario?.route_paths?.length) return;

    const busInfoByRoute = new Map(
      scenario.bus_scenario?.bus_informations?.map((info) => [
        info.route_path_id,
        info,
      ]) ?? [],
    );

    const derivedRoutes = scenario.route_scenario.route_paths.map(
      (path, idx) => {
        const info = busInfoByRoute.get(path.route_path_id);
        const orders = path.orders ?? [];

        return {
          id: path.route_path_id || `${Date.now()}-${idx}`,
          name: path.name || `Route ${idx + 1}`,
          color: path.color || colorOptions[idx % colorOptions.length],
          stations: buildStationsFromOrders(orders),
          segments: buildSegmentsFromLine(path.route),
          orders,
          hidden: false,
          locked: false,
          maxDistance: info?.max_dis ?? 70,
          speed: info?.speed ?? 60,
          capacity: info?.capacity ?? 16,
          maxBuses: info?.max_bus ?? 4,
          routeTravelingTime: info?.avg_travel_time ?? 0,
        };
      },
    );

    if (derivedRoutes.length > 0) {
      setRoutes(derivedRoutes);
    }

    const scheduleData = scenario.bus_scenario?.schedule_data ?? [];
    if (scheduleData.length > 0) {
      scheduleDataRef.current = scheduleData.map((sd) => ({
        route_id: sd.route_path_id,
        schedule_list: sd.schedule_list,
      }));
    }
  }, [scenario, colorOptions]);

  const updateBusInfo = (
    routeId: string,
    key:
      | "maxDistance"
      | "speed"
      | "capacity"
      | "maxBuses"
      | "routeTravelingTime",
    value: number,
  ) => {
    markAsChanged(); // 🔹 Mark as changed when bus info updated
    setRoutes((prev) =>
      prev.map((r) => (r.id === routeId ? { ...r, [key]: value } : r)),
    );
  };

  const updateName = (routeId: string, name: string) => {
    markAsChanged(); // 🔹 Mark as changed when route name updated
    setRoutes((prev) =>
      prev.map((r) => (r.id === routeId ? { ...r, name } : r)),
    );
  };

  const handleColorPick = (routeId: string, color: ColorResult) => {
    markAsChanged(); // 🔹 Mark as changed when route color updated
    setRoutes((prev) =>
      prev.map((r) => (r.id === routeId ? { ...r, color: color.hex } : r)),
    );
  };

  const addRoute = () => {
    markAsChanged(); // 🔹 Mark as changed when route added
    setRoutes((prev) => [...prev, createRoute(prev.length)]);
  };

  const toggleHidden = (routeId: string) => {
    setRoutes((prev) =>
      prev.map((r) =>
        r.id === routeId
          ? {
              ...r,
              hidden: !r.hidden,
            }
          : r,
      ),
    );
  };

  const toggleLocked = (routeId: string) => {
    setRoutes((prev) =>
      prev.map((r) =>
        r.id === routeId
          ? {
              ...r,
              locked: !r.locked,
            }
          : r,
      ),
    );
  };

  const removeRoute = (routeId: string) => {
    markAsChanged(); // 🔹 Mark as changed when route removed
    setRoutes((prev) => prev.filter((r) => r.id !== routeId));
  };

  const editRoute = (routeId: string) => {
    const route = routes.find((r) => r.id === routeId);
    if (route) {
      // Check if route is hidden - must unhide first
      if (route.hidden) {
        alert("Please unhide the route before editing (click the eye icon)");
        return;
      }
      // Save original stations, segments, and orders before editing
      setOriginalStations((prev) => ({
        ...prev,
        [routeId]: [...route.stations],
      }));
      setOriginalSegments((prev) => ({
        ...prev,
        [routeId]: [...route.segments],
      }));
      setOriginalOrders((prev) => ({
        ...prev,
        [routeId]: [...route.orders],
      }));
      // Clear stations, segments, and orders to start from scratch
      setRoutes((prev) =>
        prev.map((r) =>
          r.id === routeId
            ? { ...r, stations: [], segments: [], orders: [] }
            : r,
        ),
      );
      setSelectedRouteId(routeId);
      // Expand the station list to show details
      setExpandedStationRoutes((prev) => new Set(prev).add(routeId));
    }
  };

  const confirmEdit = async (routeId: string) => {
    // Fetch route geometry for all consecutive station pairs
    const route = routes.find((r) => r.id === routeId);
    if (!route || route.stations.length < 2) {
      // No stations to build route, just exit editing
      setSelectedRouteId(null);
      setOriginalStations((prev) => {
        const newState = { ...prev };
        delete newState[routeId];
        return newState;
      });
      return;
    }

    setIsFetchingSegment(true);
    try {
      // Build input points for backend: [lon,lat]
      const pickCoord = (st: StationDetail): [number, number] | null => {
        const toNumLocal = (v: unknown): number | undefined => {
          if (typeof v === "number" && Number.isFinite(v)) return v;
          if (typeof v === "string") {
            const n = parseFloat(v);
            if (Number.isFinite(n)) return n;
          }
          return undefined;
        };

        const lon = toNumLocal(st.lon);
        const lat = toNumLocal(st.lat);
        if (lon !== undefined && lat !== undefined) {
          return [lon, lat]; // [lon, lat] for backend
        }
        return null;
      };

      const points = route.stations
        .map((id) => {
          const st = nodes.find((n) => n.station_detail_id === id);
          const coord = st ? pickCoord(st) : null;
          return coord ? { id, coord } : null;
        })
        .filter((p): p is { id: string; coord: [number, number] } => !!p);

      if (points.length < 2) {
        throw new Error("Not enough stations with coordinates to build route");
      }

      const apiSegments = await computeRouteSegments(points);
      const newSegments: RouteSegment[] = apiSegments.map((s) => ({
        from: s.from,
        to: s.to,
        coords: s.coords,
      }));

      // Create Orders from consecutive StationPairs
      const networkModel = configuration?.network_model as
        | NetworkModel
        | undefined;
      const stationPairs =
        (networkModel as NetworkModel & { StationPair?: StationPair[] })
          ?.StationPair || [];
      const orders: Order[] = [];

      for (let i = 0; i < route.stations.length - 1; i++) {
        const currentStationId = route.stations[i];
        const nextStationId = route.stations[i + 1];

        // Find matching StationPair
        const matchingPair = stationPairs.find(
          (pair: StationPair) =>
            pair.FstStation === currentStationId &&
            pair.SndStation === nextStationId,
        );

        if (matchingPair) {
          // Ensure from = currentStation, to = nextStation (correct direction)
          const fromStation =
            matchingPair.FstStation === currentStationId
              ? matchingPair.FstStation
              : matchingPair.SndStation;
          const toStation =
            matchingPair.FstStation === currentStationId
              ? matchingPair.SndStation
              : matchingPair.FstStation;

          const order: Order = {
            order_id: `${routeId}-order-${i + 1}`,
            order: i + 1,
            station_pair_id: matchingPair.StationPairID,
            route_path_id: routeId,
            station_pair: {
              ...matchingPair,
              FstStation: fromStation,
              SndStation: toStation,
            },
          };
          orders.push(order);
        }
      }

      // Update route with segments and orders
      setRoutes((prev) =>
        prev.map((r) =>
          r.id === routeId
            ? { ...r, segments: newSegments, orders: orders }
            : r,
        ),
      );

      // Clear editing state
      setSelectedRouteId(null);
      setOriginalStations((prev) => {
        const newState = { ...prev };
        delete newState[routeId];
        return newState;
      });
    } catch (err) {
      console.error("Failed to build route geometry", err);
    } finally {
      setIsFetchingSegment(false);
    }
  };

  const cancelEdit = (routeId: string) => {
    // Restore original stations, segments, and orders
    const original = originalStations[routeId];
    const originalSegs = originalSegments[routeId];
    const originalOrd = originalOrders[routeId];

    if (original) {
      setRoutes((prev) =>
        prev.map((r) =>
          r.id === routeId
            ? {
                ...r,
                stations: original,
                segments: originalSegs || [],
                orders: originalOrd || [],
              }
            : r,
        ),
      );
    }
    setSelectedRouteId(null);
    setOriginalStations((prev) => {
      const newState = { ...prev };
      delete newState[routeId];
      return newState;
    });
    setOriginalSegments((prev) => {
      const newState = { ...prev };
      delete newState[routeId];
      return newState;
    });
    setOriginalOrders((prev) => {
      const newState = { ...prev };
      delete newState[routeId];
      return newState;
    });
  };

  const resetRoutePath = (routeId: string) => {
    setRoutes((prev) =>
      prev.map((r) =>
        r.id === routeId ? { ...r, stations: [], segments: [], orders: [] } : r,
      ),
    );
  };

  // Helper: Get station name from ID
  const getStationName = useCallback((stationId: string): string => {
    const station = nodes.find((n) => n.station_detail_id === stationId);
    if (!station) return "Unnamed station";

    const rec = station as unknown as Record<string, unknown>;
    return (
      (rec.name as string | undefined) ||
      (rec.station_name as string | undefined) ||
      (rec.StationName as string | undefined) ||
      (rec.name_th as string | undefined) ||
      (rec.StationID as string | undefined) ||
      (rec.station_id_osm as string | undefined) ||
      "Unnamed station"
    );
  }, [nodes]);

  // Helper: Get pre-computed route geometry from network model if available
  // Note: route geometry is now computed on demand via API, not from model

  const handleSelectStationOnMap = (stationId: string) => {
    if (!selectedRouteId) return;
    const route = routes.find((r) => r.id === selectedRouteId);
    if (!route || route.locked) return;

    // Prevent consecutive duplicate stations (same station back-to-back)
    const lastStation = route.stations[route.stations.length - 1];
    if (lastStation === stationId) {
      alert("Cannot add the same station consecutively");
      return;
    }

    // Just add the station without fetching geometry yet
    // Geometry will be fetched when confirm is clicked
    markAsChanged(); // 🔹 Mark as changed when station added to route
    setRoutes((prev) =>
      prev.map((r) =>
        r.id === route.id ? { ...r, stations: [...r.stations, stationId] } : r,
      ),
    );
  };

  const handleSelectStationDisabled = () => {
    // Do nothing - other routes disabled during edit mode
    return;
  };

  const toggleStationExpand = (routeId: string) => {
    setExpandedStationRoutes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(routeId)) {
        newSet.delete(routeId);
      } else {
        newSet.add(routeId);
      }
      return newSet;
    });
  };

  // Helper: Build GeoJSON LineString from route segments
  const buildGeoJsonLineString = (segments: RouteSegment[]): GeoLineString => {
    if (segments.length === 0) {
      return {
        type: "LineString",
        coordinates: [],
      };
    }

    const coordinates: [number, number][] = [];

    // Collect all coordinates from segments
    segments.forEach((segment) => {
      coordinates.push(...segment.coords);
    });

    // Remove consecutive duplicate points
    const uniqueCoords: [number, number][] = [];
    for (const coord of coordinates) {
      if (
        uniqueCoords.length === 0 ||
        uniqueCoords[uniqueCoords.length - 1][0] !== coord[0] ||
        uniqueCoords[uniqueCoords.length - 1][1] !== coord[1]
      ) {
        uniqueCoords.push(coord);
      }
    }

    return {
      type: "LineString",
      coordinates: uniqueCoords,
    };
  };

  // Helper: Build Scenario Detail from routes and configuration
  const buildScenarioDetail = (
    currentScenarioId: string,
    busScenarioId: string,
    routeScenarioId: string,
    scheduleDatas: ScheduleData[],
  ): ScenarioDetail => {
    const busInfoByRoute = new Map(
      scenario?.bus_scenario?.bus_informations?.map((info) => [
        info.route_path_id,
        info,
      ]) ?? [],
    );

    const busInformations: BusInformation[] = routes.map((r) => {
      const info = busInfoByRoute.get(r.id);
      // ✅ ใช้ค่าที่ user กำหนดไว้ (routeTravelingTime) ถ้าไม่มีถึงคำนวณจาก speed/distance
      const avgTravelTime = r.routeTravelingTime !== undefined && r.routeTravelingTime !== null
        ? r.routeTravelingTime  // ใช้ค่าที่ user แก้ไว้
        : (r.speed > 0 ? (r.maxDistance / r.speed) * 60 : 0);  // คำนวณถ้าไม่มีค่า
      return {
        bus_information_id: info?.bus_information_id || `${r.id}-businfo`,
        speed: r.speed,
        max_dis: r.maxDistance,
        max_bus: r.maxBuses,
        capacity: r.capacity,
        avg_travel_time: avgTravelTime,
        bus_scenario_id: busScenarioId,
        route_path_id: buildRoutePathId(r, currentScenarioId),
      };
    });

    const busScenario: BusScenario = {
      bus_scenario_id: busScenarioId,
      schedule_data: scheduleDatas,
      bus_informations: busInformations,
    };

    const routePaths: RoutePath[] = routes.map((r) => ({
      route_path_id: buildRoutePathId(r, currentScenarioId),
      name: r.name,
      color: r.color,
      route_scenario_id: isEditingScenario
        ? routeScenarioId
        : "route-scenario-" + currentScenarioId,
      route: buildGeoJsonLineString(r.segments),
      orders: r.orders,
    }));

    const routeScenario: RouteScenario = {
      route_scenario_id: routeScenarioId,
      route_paths: routePaths,
    };

    const scenarioDetail: ScenarioDetail = {
      scenario_detail_id: currentScenarioId,
      bus_scenario_id: busScenario.bus_scenario_id,
      route_scenario_id: routeScenario.route_scenario_id,
      bus_scenario: busScenario,
      route_scenario: routeScenario,
      configuration_detail_id: configuration.configuration_detail_id,
    };

    return scenarioDetail;
  };

  const handleSimulation = async () => {
    // 🔹 Check if user has unsaved changes (user mode only)
    if (usermode === "user" && hasDataChangedRef.current) {
      setShowUnsavedModal(true);
      return;
    }
    await executeSimulation();
  };

  const executeSimulation = async () => {
    try {
      const currentScenarioId =
        scenario?.scenario_detail_id || `scenario-detail-${Date.now()}`;

      const busScenarioId =
        scenario?.bus_scenario_id || `bus-${currentScenarioId}`;
      const routeScenarioId =
        scenario?.route_scenario_id || `route-${currentScenarioId}`;

      const existingScheduleData = scenario?.bus_scenario?.schedule_data ?? [];

      if (!busScheduleFile && existingScheduleData.length === 0) {
        alert("Please upload a bus schedule file before running simulation");
        return;
      }

      let scheduleDatas: ScheduleData[] = [];

      if (busScheduleFile) {
        const scheduleData: PaserSchedule = await getScheduleData(
          currentScenarioId,
          busScheduleFile,
        );

        scheduleDatas = scheduleData.ScheduleData.map((sd) => {
          const matchingRoute = routes.find((r) => r.name === sd.RoutePathID);
          return {
            schedule_data_id: sd.ScheduleDataID,
            schedule_list: sd.ScheduleList,
            route_path_id: matchingRoute 
              ? buildRoutePathId(matchingRoute, currentScenarioId) 
              : sd.RoutePathID,
            bus_scenario_id: busScenarioId,
          };
        });

        // Store schedule data in ref for playbackSeed
        scheduleDataRef.current = scheduleData.ScheduleData.map((sd) => ({
          route_id:
            routes.find((r) => r.name === sd.RoutePathID)?.id || sd.RoutePathID,
          schedule_list: sd.ScheduleList,
        }));
      } else {
        scheduleDatas = existingScheduleData.map((sd) => ({
          ...sd,
          bus_scenario_id: sd.bus_scenario_id || busScenarioId,
        }));

        scheduleDataRef.current = scheduleDatas.map((sd) => ({
          route_id: sd.route_path_id,
          schedule_list: sd.schedule_list,
        }));
      }
      
      const scenarioDetail = buildScenarioDetail(
        currentScenarioId,
        busScenarioId,
        routeScenarioId,
        scheduleDatas,
      );

      const simulationRequest: ProjectSimulationRequest = {
        configuration: configuration,
        scenario: scenarioDetail,
        time_periods: simStartHour + ":00-" + simEndHour + ":00",
        time_slot: timeSlot.split(" ")[0],
      };

      // downloadJson(simulationRequest, `simulationRequest.json`);

      const response = await runSimulation(simulationRequest);
      setSimulationResponse(response);
    } catch (error) {
      console.error("Simulation failed:", error);
      alert(
        "Simulation failed: " +
          (error instanceof Error ? error.message : "Unknown error"),
      );
    }
  };

  const handleFileUpload = (file: File | null) => {
    if (!file) {
      setBusScheduleFile(null);
      return;
    }

    // Validate file type
    if (!file.name.endsWith(".xlsx")) {
      alert("Please upload a .xlsx file");
      return;
    }

    // Validate file size (e.g., max 10MB)
    const maxSizeInBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      alert("File size exceeds 10MB limit");
      return;
    }

    markAsChanged(); // 🔹 Mark as changed when new file uploaded
    setBusScheduleFile(file);
  };

  const handleDownloadTemplate = async () => {
    try {
      // สร้าง workbook ใหม่
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Bus Schedule");

      // สร้าง header row โดยใช้ชื่อ route แต่ละตัว
      const headerRow = routes.map((route) => route.name);
      worksheet.addRow(headerRow);

      // จัด style ให้ header
      worksheet.getRow(1).font = { bold: true, size: 12 };
      worksheet.getRow(1).alignment = {
        vertical: "middle",
        horizontal: "center",
      };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };

      // ตั้งความกว้างของ column
      routes.forEach((_, index) => {
        worksheet.getColumn(index + 1).width = 20;
      });

      // Export เป็นไฟล์ .xlsx
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `bus-schedule-template-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating template:", error);
      alert("Failed to generate template");
    }
  };

  // Filter stations based on filter criteria
  const filteredNodes = useMemo(() => {
    return nodes.filter((st) => {
      const id = st.station_detail_id || "";
      const hasData = stationsWithDataIds.has(id);
      
      return (
        stationFilter === "all" ||
        (stationFilter === "with-data" && hasData) ||
        (stationFilter === "no-data" && !hasData)
      );
    });
  }, [nodes, stationFilter, stationsWithDataIds]);

  const validStations = useMemo(
    () =>
      nodes
        .filter(
          (st) =>
            !!st.station_detail_id &&
            !!st.name &&
            st.lat !== undefined &&
            st.lon !== undefined,
        )
        .map((st) => ({
          id: st.station_detail_id as string,
          name: st.name as string,
          lat: st.lat as number,
          lon: st.lon as number,
        })),
    [nodes],
  );

  // Generate playbackSeed for Interactive Map
  const playbackSeed = {
    stations: validStations,
    routes: routes.map((r) => ({
      id: r.id,
      name: r.name,
      color: r.color,
      segments: r.segments,
    })),
    routeStations: routes.map((r) => ({
      route_id: r.id,
      station_ids: r.stations,
    })),
    routeStationDetails: routes.map((r) => ({
      route_id: r.id,
      route_name: r.name,
      stations: r.stations.map((stationId, idx) => {
        const station = validStations.find((st) => st.id === stationId);
        const totalStations = r.stations.length;
        const positionProgress =
          totalStations > 1 ? idx / (totalStations - 1) : 0;
        return {
          station_id: stationId,
          station_name: station?.name || "Unknown",
          position: positionProgress,
          coordinates: [station?.lat ?? 0, station?.lon ?? 0] as [
            number,
            number,
          ],
        };
      }),
    })),
    simWindow: `${simStartHour.toString().padStart(2, "0")}:00-${simEndHour.toString().padStart(2, "0")}:00`,
    timeSlotMinutes: parseInt(timeSlot.split(" ")[0]),
    simulationResponse: simulationResponse,
    busInfo: routes.map((r) => ({
      route_id: r.id,
      max_bus: r.maxBuses,
      speed: r.speed,
      capacity: r.capacity,
    })),
    routeDetails: routes.map((r) => ({
      route_id: r.id,
      max_dis: r.maxDistance,
    })),
    routeOrders: routes.map((r) => ({
      route_id: r.id,
      orders: r.orders,
      totalTravelTimeSeconds: r.orders.reduce((sum, order) => {
        const travelTime = order.station_pair?.RouteBetween?.TravelTime ?? 0;
        return sum + travelTime;
      }, 0),
    })),
    routeResults:
      simulationResponse?.simulation_result?.slot_results?.[0]?.result_route ||
      [],
    scheduleData: (() => {
      // Use scheduleData from file upload (simulationResponse doesn't contain scenario data)
      return scheduleDataRef.current;
    })(),
  };

  const onBackClickInOutputPage = () => {
    setSimulationResponse(null);
  };

  const captureMapImage = async (): Promise<File | null> => {
    if (!mapContainerRef.current) return null;

    try {
      // Dynamically import html2canvas
      const html2canvas = (await import("html2canvas")).default;

      const canvas = await html2canvas(mapContainerRef.current, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
      });

      // Convert canvas to blob
      return new Promise<File | null>((resolve) => {
        canvas.toBlob((blob: Blob | null) => {
          if (blob) {
            const file = new File([blob], `scenario-cover-${Date.now()}.png`, {
              type: "image/png",
            });
            resolve(file);
          } else {
            resolve(null);
          }
        }, "image/png");
      });
    } catch (err) {
      console.error("Failed to capture map image:", err);
      return null;
    }
  };

  const handleSave = async () => {
    // Validation: Check if file is attached
    const existingScheduleData = scenario?.bus_scenario?.schedule_data ?? [];
    if (!busScheduleFile && existingScheduleData.length === 0) {
      alert("Please attach a bus schedule file before saving");
      return;
    }

    // Validation: Check if all non-hidden routes are not empty
    const activeRoutes = routes.filter((r) => !r.hidden);
    const emptyRoutes = activeRoutes.filter(
      (route) =>
        (!route.stations || route.stations.length === 0) &&
        (!route.orders || route.orders.length === 0),
    );

    if (emptyRoutes.length > 0) {
      alert(
        `Please fill in all routes. Empty routes: ${emptyRoutes.map((r) => r.name).join(", ")}`,
      );
      return;
    }

    // Validation: Check if at least one route has station sequence
    const hasRouteWithSequence = routes.some(
      (route) => route.orders && route.orders.length > 0,
    );

    if (!hasRouteWithSequence) {
      alert(
        "Please create at least 1 route with station sequence before saving",
      );
      return;
    }

    try {
      if (!user) {
        alert("User not authenticated");
        return;
      }

      const scenarioName =
        projectName || `Scenario ${new Date().toLocaleString()}`;
      const currentScenarioId =
        scenario?.scenario_detail_id || `scenario-${Date.now()}`;
      const busScenarioId =
        scenario?.bus_scenario_id || `bus-scenario-${currentScenarioId}`;
      const routeScenarioId =
        scenario?.route_scenario_id || `route-${currentScenarioId}`;

      let scheduleDatas: ScheduleData[] = [];

      if (busScheduleFile) {
        const scheduleData: PaserSchedule = await getScheduleData(
          currentScenarioId,
          busScheduleFile,
        );

        scheduleDatas = scheduleData.ScheduleData.map((sd) => ({
          schedule_data_id: sd.ScheduleDataID,
          schedule_list: sd.ScheduleList,
          route_path_id: sd.RoutePathID,
          bus_scenario_id: busScenarioId,
        }));
      } else {
        scheduleDatas = existingScheduleData.map((sd) => ({
          ...sd,
          bus_scenario_id: sd.bus_scenario_id || busScenarioId,
        }));
      }

      const scenarioDetail = buildScenarioDetail(
        currentScenarioId,
        busScenarioId,
        routeScenarioId,
        scheduleDatas,
      );

      // Capture map screenshot and upload as cover image
      let coverImageId = "";
      try {
        const mapFile = await captureMapImage();
        if (mapFile) {
          const response = await uploadScenarioCoverImage(mapFile);
          coverImageId = response.cover_image_id;
        }
      } catch (uploadError) {
        console.error("Failed to upload cover image:", uploadError);
      }

      if (!coverImageId) {
        alert("Failed to upload cover image. Please try again.");
        return;
      }

      const userScenario: UserScenario = {
        user_scenario_id: `user-scenario-${currentScenarioId}`,
        name: scenarioName,
        modify_date: new Date().toISOString(),
        create_by: user.google_id,
        cover_img_id: coverImageId,
        scenario_detail_id: currentScenarioId,
        scenario_detail: scenarioDetail,
      };

      // downloadJson(userScenario, `${scenarioName.replace(/\s+/g, "_")}.json`);

      const result = await createUserScenario(
        idforUpdate || currentScenarioId,
        userScenario,
      );
      
      // 🔹 Reset change flag after successful save
      hasDataChangedRef.current = false;
      
      setSuccessRedirectId(result.scenario_detail_id);
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Failed to save scenario:", error);
      alert(
        "Failed to save scenario: " +
          (error instanceof Error ? error.message : "Unknown error"),
      );
    }
  };

  return (
    <>
      <Nav
        usermode={usermode}
        inpage="Project"
        onBackClick={onBack}
        projectName={projectName}
        hasProjectChanged={hasDataChangedRef.current}
      />
      <main className="">
        <div className="h-[85px]"></div>
        {simulationResponse ? (
          <Outputpage
            simulationResponse={simulationResponse}
            playbackSeed={playbackSeed}
            onBackClick={onBackClickInOutputPage}
            usermode={usermode}
          />
        ) : (
          <main className="">
            <div className="flex flex-col">
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  <span
                    role="button"
                    tabIndex={0}
                    className={`flex items-center gap-2 pl-4 pr-7 py-2 ${
                      transportMode === "Route"
                        ? "mode-selected"
                        : "mode-unselected"
                    }`}
                    onClick={() => setTransportMode("Route")}
                    onKeyDown={(e) =>
                      e.key === "Enter" && setTransportMode("Route")
                    }
                  >
                    <svg
                      width="5"
                      height="25"
                      viewBox="0 0 5 41"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <rect width="5" height="40.3292" fill="#81069E" />
                    </svg>
                    Route
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    className={`flex items-center gap-2 pl-5 pr-8 py-2 ${
                      transportMode === "Bus"
                        ? "mode-selected"
                        : "mode-unselected"
                    }`}
                    onClick={() => setTransportMode("Bus")}
                    onKeyDown={(e) =>
                      e.key === "Enter" && setTransportMode("Bus")
                    }
                  >
                    <svg
                      width="5"
                      height="25"
                      viewBox="0 0 5 41"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <rect width="5" height="40.3292" fill="#81069E" />
                    </svg>
                    Bus
                  </span>
                </div>
                <div className="config-name mr-10 flex gap-2 items-center">
                  <p className="text-[#323232]">Configuration Data : </p>
                  <p className="text-[#81069e]">
                    {configurationName || "Guest Setup"}
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="side-bar h-[90vb] w-[25%]">
                  {transportMode === "Route" && (
                    <RoutesList
                      routes={routes}
                      selectedRouteId={selectedRouteId}
                      isFetchingSegment={isFetchingSegment}
                      openColorPickerId={openColorPickerId}
                      expandedStationRoutes={expandedStationRoutes}
                      onAddRoute={addRoute}
                      onToggleLock={toggleLocked}
                      onToggleHide={toggleHidden}
                      onEdit={editRoute}
                      onConfirmEdit={confirmEdit}
                      onCancelEdit={cancelEdit}
                      onRemove={removeRoute}
                      onUpdateColor={handleColorPick}
                      onUpdateName={updateName}
                      onToggleColorPicker={setOpenColorPickerId}
                      onToggleExpand={toggleStationExpand}
                      getStationName={getStationName}
                    />
                  )}

                  {transportMode === "Bus" && (
                    <div className="mt-4 p-4 w-full h-[85vh] flex flex-col">
                      <ScheduleUploadSection
                        busScheduleFile={busScheduleFile}
                        hasExistingSchedule={hasExistingSchedule}
                        onFileUpload={handleFileUpload}
                        onDownloadTemplate={handleDownloadTemplate}
                      />

                      {/* Scrollable Routes List */}
                      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                        {routes.map((route) => (
                          <BusInfoPanel
                            key={route.id}
                            route={route}
                            isLocked={route.locked}
                            onUpdateBusInfo={updateBusInfo}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Shared map for both Route and Bus modes */}
                <div className="map-container flex-1 h-[90vh] flex flex-col items-center px-16">
                  <div className="my-4 flex w-full justify-between items-center">
                    <div className="flex gap-10 items-center">
                      <div className="flex items-center">
                        <p className="text-[20px] text-[#323232]">Simulation Period :</p>
                        <div className="time-inputs p-2 px-4 text-[#C296CD] ml-3 my-2 h-[60px] flex items-center text-lg">
                          <input
                            type="number"
                            min={0}
                            max={23}
                            value={simStartHour}
                            onChange={(e) => setSimStartHour(Number(e.target.value))}
                            className="border p-2 rounded w-10 text-lg"
                          />
                          <span className="text-lg">:00</span>
                          <span className="mx-2 text-lg">-</span>
                          <input
                            type="number"
                            min={1}
                            max={24}
                            value={simEndHour}
                            onChange={(e) => setSimEndHour(Number(e.target.value))}
                            className="border p-2 rounded w-10 text-lg"
                          />
                          <span className="text-lg">:00</span>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <p className="text-[20px] text-[#323232]">Time Slot : </p>
                        <div className="ml-3 my-2 h-full">
                          <CustomDropdown
                            options={["5 Minutes", "10 Minutes", "15 Minutes", "20 Minutes", "30 Minutes"]}
                            selectedValue={timeSlot}
                            onChange={setTimeSlot}
                            fontSize="20px"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    className="map w-full flex-1 min-h-[400px] relative"
                    ref={mapContainerRef}
                  >
                    {/* Station Filter Controls - Overlay on Map */}
                    <div className="absolute left-3 bottom-3 z-[1000] flex gap-2">
                      <button
                        className={`px-4 py-1.5 rounded-full text-sm transition-colors border-0 outline-none focus:outline-none focus:ring-0 whitespace-nowrap shadow-md ${
                          stationFilter === "all"
                            ? "bg-[#81069e] text-white"
                            : "bg-white text-gray-700 hover:bg-gray-100"
                        }`}
                        onClick={() => setStationFilter("all")}
                      >
                        All Stations
                      </button>
                      <button
                        className={`px-4 py-1.5 rounded-full text-sm transition-colors border-0 outline-none focus:outline-none focus:ring-0 whitespace-nowrap shadow-md ${
                          stationFilter === "with-data"
                            ? "bg-[#81069e] text-white"
                            : "bg-white text-gray-700 hover:bg-gray-100"
                        }`}
                        onClick={() => setStationFilter("with-data")}
                      >
                        Has Data
                      </button>
                      <button
                        className={`px-4 py-1.5 rounded-full text-sm transition-colors border-0 outline-none focus:outline-none focus:ring-0 whitespace-nowrap shadow-md ${
                          stationFilter === "no-data"
                            ? "bg-[#81069e] text-white"
                            : "bg-white text-gray-700 hover:bg-gray-100"
                        }`}
                        onClick={() => setStationFilter("no-data")}
                      >
                        No Data
                      </button>
                    </div>
                    <ScenarioMap
                      stations={filteredNodes}
                      allStations={nodes}
                      route={
                        transportMode === "Route"
                          ? routes.find((r) => r.id === selectedRouteId) ||
                            (routes.length ? routes[0] : null)
                          : null
                      }
                      allRoutes={
                        transportMode === "Route"
                          ? routes.filter(
                              (r) => !r.hidden && r.id !== selectedRouteId,
                            )
                          : routes.filter((r) => !r.hidden)
                      }
                      onSelectStation={
                        transportMode === "Route" && selectedRouteId
                          ? handleSelectStationOnMap
                          : handleSelectStationDisabled
                      }
                      onResetRoute={() =>
                        selectedRouteId && resetRoutePath(selectedRouteId)
                      }
                      isEditingMode={
                        transportMode === "Route" && !!selectedRouteId
                      }
                    />
                    {isFetchingSegment && transportMode === "Route" && (
                      <div className="text-sm text-gray-600 mt-2">
                        Building route...
                      </div>
                    )}
                  </div>
                  <div className="mb-4 mt-6 flex justify-end w-full gap-3">
                    {usermode === "user" && (
                      <button
                        className="btn_secondary px-8"
                        onClick={handleSave}
                      >
                        Save
                      </button>
                    )}
                    <button
                      className="btn_primary px-8"
                      onClick={handleSimulation}
                    >
                      Simulation
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </main>
        )}
      </main>

      <SuccessModal
        isOpen={showSuccessModal}
        redirectId={successRedirectId}
        onClose={() => setShowSuccessModal(false)}
        onViewScenario={() => {
          setShowSuccessModal(false);
          if (successRedirectId) {
            window.location.href = `/scenario/${successRedirectId}`;
          }
        }}
      />

      {/* Unsaved Changes Modal */}
      {showUnsavedModal && (
        <div className="confirm-modal-overlay">
          <div className="confirm-modal">
            <h2 className="confirm-modal-title flex items-center justify-center">
              Unsaved Changes
            </h2>
            <p className="confirm-modal-subtitle">
              You have unsaved changes. Running the simulation without saving
              will not persist these changes.
            </p>
            <div className="confirm-modal-actions">
              <button
                className="modal-btn modal-btn-secondary"
                onClick={() => setShowUnsavedModal(false)}
              >
                Cancel
              </button>
              <button
                className="modal-btn modal-btn-primary"
                onClick={() => {
                  setShowUnsavedModal(false);
                  executeSimulation();
                }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
