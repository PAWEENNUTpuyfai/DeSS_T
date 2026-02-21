import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { SketchPicker, type ColorResult } from "react-color";
import CustomDropdown from "./CustomDropdown";
import Outputpage from "../pages/Outputpage";
import "../../style/Scenario.css";
import HelpButton from "./HelpButton";
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
import { downloadJson } from "../../utility/helpers";
import {
  createUserScenario,
  uploadScenarioCoverImage,
} from "../../utility/api/scenario";
import { useAuth } from "../contexts/useAuth";
import Nav from "./NavBar";
import ExcelJS from "exceljs";

export default function Scenario({
  configuration,
  configurationName,
  onBack,
  projectName,
  scenario,
  usermode = "guest",
}: {
  configuration: ConfigurationDetail;
  configurationName?: string;
  onBack?: () => void;
  projectName?: string;
  scenario?: ScenarioDetail;
  usermode?: "guest" | "user";
}) {
  const { user } = useAuth();

  useEffect(() => {
    console.log("=== Scenario Component Loaded ===");
    console.log("Configuration:", configuration);
    console.log("Configuration Name:", configurationName);
    console.log("Project Name:", projectName);
    console.log("Network Model:", configuration?.network_model);
    console.log("Alighting Data:", configuration?.alighting_datas);
    console.log("InterArrival Data:", configuration?.interarrival_datas);
    console.log("================================");
  }, [configuration, configurationName, projectName]);

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

  type SimpleRoute = {
    id: string;
    name: string;
    color: string;
    stations: string[];
    segments: RouteSegment[];
    orders: Order[];
    hidden: boolean;
    locked: boolean;
    maxDistance: number;
    speed: number;
    capacity: number;
    maxBuses: number;
    routeTravelingTime: number;
  };

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
  const colorPickerRef = useRef<HTMLDivElement | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const scheduleDataRef = useRef<
    Array<{ route_id: string; schedule_list: string }>
  >([]);
  const [simStartHour, setSimStartHour] = useState<number>(8);
  const [simEndHour, setSimEndHour] = useState<number>(16);
  const [timeSlot, setTimeSlot] = useState<string>("15 Minutes");
  const [simulationResponse, setSimulationResponse] =
    useState<SimulationResponse | null>(null);
  const [busScheduleFile, setBusScheduleFile] = useState<File | null>(null);

  const timeSlotOptions = [
    "5 Minutes",
    "10 Minutes",
    "15 Minutes",
    "20 Minutes",
    "30 Minutes",
  ];

  // Close color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!openColorPickerId) return;
      const target = e.target as Node;
      if (colorPickerRef.current && !colorPickerRef.current.contains(target)) {
        setOpenColorPickerId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openColorPickerId]);

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
    setRoutes((prev) =>
      prev.map((r) => (r.id === routeId ? { ...r, [key]: value } : r)),
    );
  };

  const updateName = (routeId: string, name: string) => {
    setRoutes((prev) =>
      prev.map((r) => (r.id === routeId ? { ...r, name } : r)),
    );
  };

  const handleColorPick = (routeId: string, color: ColorResult) => {
    setRoutes((prev) =>
      prev.map((r) => (r.id === routeId ? { ...r, color: color.hex } : r)),
    );
  };

  const addRoute = () => {
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

      // Debug: Show actual station sequence
      console.log(
        "📍 Station Sequence (route.stations):",
        route.stations.map((sid, idx) => `${idx + 1}. ${getStationName(sid)}`),
      );

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

      // Console log created orders with station names
      console.log("🎯 Created Orders for Route:", route.name);
      console.log("   Route ID:", routeId);
      console.log("   Total Orders:", orders.length);
      console.log(
        "   Order Details:",
        orders.map((o) => ({
          order: o.order,
          order_id: o.order_id,
          station_pair_id: o.station_pair_id,
          from: getStationName(o.station_pair?.FstStation || ""),
          to: getStationName(o.station_pair?.SndStation || ""),
        })),
      );

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
  const getStationName = (stationId: string): string => {
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
  };

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

  const handleSimulation = async () => {
    // Helper: Build GeoJSON LineString from route segments
    const buildGeoJsonLineString = (
      segments: RouteSegment[],
    ): GeoLineString => {
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

    try {
      const currentScenarioId = `scenario-detail-${Date.now()}`;

      // Check if bus schedule file exists
      if (!busScheduleFile) {
        alert("Please upload a bus schedule file before running simulation");
        return;
      }

      const scheduleData: PaserSchedule = await getScheduleData(
        currentScenarioId,
        busScheduleFile,
      );
      console.log("Schedule Data received:", scheduleData);

      const scheduleDatas: ScheduleData[] = scheduleData.ScheduleData.map(
        (sd) => ({
          schedule_data_id: sd.ScheduleDataID,
          schedule_list: sd.ScheduleList,
          route_path_id: sd.RoutePathID,
          bus_scenario_id: "bus-" + currentScenarioId, // to be filled by backend
        }),
      );

      // Store schedule data in ref for playbackSeed
      scheduleDataRef.current = scheduleData.ScheduleData.map((sd) => ({
        route_id:
          routes.find((r) => r.name === sd.RoutePathID)?.id || sd.RoutePathID,
        schedule_list: sd.ScheduleList,
      }));

      const busInformations: BusInformation[] = routes.map((r) => ({
        bus_information_id: `${r.id}-businfo`,
        speed: r.speed,
        max_dis: r.maxDistance,
        max_bus: r.maxBuses,
        capacity: r.capacity,
        avg_travel_time: r.routeTravelingTime || 0,
        bus_scenario_id: "bus-" + currentScenarioId,
        route_path_id: r.name + "-" + currentScenarioId,
      }));

      const busScenario: BusScenario = {
        bus_scenario_id: "bus-" + currentScenarioId,
        schedule_data: scheduleDatas,
        bus_informations: busInformations,
      };

      const routePaths: RoutePath[] = routes.map((r) => ({
        route_path_id: r.name + "-" + currentScenarioId,
        name: r.name,
        color: r.color,
        route_scenario_id: "route-scenario-" + currentScenarioId,
        route: buildGeoJsonLineString(r.segments),
        orders: r.orders,
      }));

      const routeScenario: RouteScenario = {
        route_scenario_id: "route-" + currentScenarioId,
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

      const simulationRequest: ProjectSimulationRequest = {
        configuration: configuration,
        scenario: scenarioDetail,
        time_periods: simStartHour + ":00-" + simEndHour + ":00",
        time_slot: timeSlot.split(" ")[0],
      };

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
    if (!busScheduleFile) {
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

    // Helper: Build GeoJSON LineString from route segments
    const buildGeoJsonLineString = (
      segments: RouteSegment[],
    ): GeoLineString => {
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

    try {
      if (!user) {
        alert("User not authenticated");
        return;
      }

      const scenarioName =
        projectName || `Scenario ${new Date().toLocaleString()}`;
      const currentScenarioId = `scenario-${Date.now()}`;

      // Build BusInformations from routes
      const busInformations: BusInformation[] = routes
        .filter((r) => r.id) // Only include valid routes
        .map((r) => ({
          bus_information_id: `bus-info-${r.id}-${currentScenarioId}`,
          speed: r.speed,
          max_dis: r.maxDistance,
          max_bus: r.maxBuses,
          capacity: r.capacity,
          avg_travel_time: r.routeTravelingTime,
          bus_scenario_id: "bus-scenario-" + currentScenarioId,
          route_path_id: r.name + "-" + currentScenarioId,
        }));

      const scheduleData: PaserSchedule = await getScheduleData(
        currentScenarioId,
        busScheduleFile,
      );

      const scheduleDatas: ScheduleData[] = scheduleData.ScheduleData.map(
        (sd) => ({
          schedule_data_id: sd.ScheduleDataID,
          schedule_list: sd.ScheduleList,
          route_path_id: sd.RoutePathID,
          bus_scenario_id: "bus-" + currentScenarioId, // to be filled by backend
        }),
      );

      const busScenario: BusScenario = {
        bus_scenario_id: "bus-scenario-" + currentScenarioId,
        bus_informations: busInformations,
        schedule_data: scheduleDatas,
      };

      const routePaths: RoutePath[] = routes.map((r) => ({
        route_path_id: r.name + "-" + currentScenarioId,
        name: r.name,
        color: r.color,
        route_scenario_id: "route-scenario-" + currentScenarioId,
        route: buildGeoJsonLineString(r.segments),
        orders: r.orders,
      }));

      const routeScenario: RouteScenario = {
        route_scenario_id: "route-" + currentScenarioId,
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

      // Capture map screenshot and upload as cover image
      let coverImageId = "";
      try {
        const mapFile = await captureMapImage();
        if (mapFile) {
          const response = await uploadScenarioCoverImage(mapFile);
          coverImageId = response.cover_image_id;
          console.log("Cover image uploaded successfully:", coverImageId);
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

      downloadJson(userScenario, `${scenarioName.replace(/\s+/g, "_")}.json`);

      const result = await createUserScenario(currentScenarioId, userScenario);
      console.log("Scenario saved successfully:", result);
      alert("Scenario saved successfully!");
      window.location.href = "/user/workspace?tab=project"; // Redirect to workspace or another appropriate page
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
                    <div className="mt-4 p-4 w-full h-[85vh] flex flex-col">
                      {/* Scrollable Routes List */}
                      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                        {routes.map((r) => {
                          const isLocked = r.locked;
                          const isHidden = r.hidden;
                          const isBeingEdited = selectedRouteId === r.id;
                          const isOtherRouteBeingEdited =
                            selectedRouteId !== null &&
                            selectedRouteId !== r.id;
                          // Remove isHidden from isDisabled so hidden routes can still be deleted
                          const isDisabled =
                            isLocked || isOtherRouteBeingEdited;
                          const bodyStyle = {
                            opacity: isDisabled || isHidden ? 0.5 : 1,
                            pointerEvents: isDisabled ? "none" : "auto",
                          } as const;

                          return (
                            <div
                              key={r.id}
                              className="rounded-xl border border-gray-200"
                              style={{ overflow: "visible" }}
                            >
                              {/* Top row: Lock on left purple bg | Rest on white bg */}
                              <div className="flex">
                                {/* Left: Lock icon with purple background, rounded left corners, shadow */}
                                <div
                                  className="flex items-center justify-center px-3 py-3 rounded-tl-xl rounded-bl-xl shadow-md"
                                  style={{
                                    backgroundColor: r.locked
                                      ? "#9B9B9B"
                                      : "#81069E",
                                  }}
                                >
                                  {!isBeingEdited && (
                                    <span
                                      role="button"
                                      tabIndex={0}
                                      aria-label="Lock or unlock route"
                                      className="hover:opacity-80 cursor-pointer text-white text-lg"
                                      onClick={() => toggleLocked(r.id)}
                                      onKeyDown={(e) =>
                                        e.key === "Enter" && toggleLocked(r.id)
                                      }
                                    >
                                      <div className="w-[25px] flex justify-center">
                                        {r.locked ? (
                                          <svg
                                            width="16"
                                            height="20"
                                            viewBox="0 0 16 20"
                                            fill="none"
                                            xmlns="http://www.w3.org/2000/svg"
                                          >
                                            <path
                                              d="M8 11C7.73478 11 7.48043 11.1054 7.29289 11.2929C7.10536 11.4804 7 11.7348 7 12V15C7 15.2652 7.10536 15.5196 7.29289 15.7071C7.48043 15.8946 7.73478 16 8 16C8.26522 16 8.51957 15.8946 8.70711 15.7071C8.89464 15.5196 9 15.2652 9 15V12C9 11.7348 8.89464 11.4804 8.70711 11.2929C8.51957 11.1054 8.26522 11 8 11ZM13 7V5C13 3.67392 12.4732 2.40215 11.5355 1.46447C10.5979 0.526784 9.32608 0 8 0C6.67392 0 5.40215 0.526784 4.46447 1.46447C3.52678 2.40215 3 3.67392 3 5V7C2.20435 7 1.44129 7.31607 0.87868 7.87868C0.316071 8.44129 0 9.20435 0 10V17C0 17.7956 0.316071 18.5587 0.87868 19.1213C1.44129 19.6839 2.20435 20 3 20H13C13.7956 20 14.5587 19.6839 15.1213 19.1213C15.6839 18.5587 16 17.7956 16 17V10C16 9.20435 15.6839 8.44129 15.1213 7.87868C14.5587 7.31607 13.7956 7 13 7ZM5 5C5 4.20435 5.31607 3.44129 5.87868 2.87868C6.44129 2.31607 7.20435 2 8 2C8.79565 2 9.55871 2.31607 10.1213 2.87868C10.6839 3.44129 11 4.20435 11 5V7H5V5ZM14 17C14 17.2652 13.8946 17.5196 13.7071 17.7071C13.5196 17.8946 13.2652 18 13 18H3C2.73478 18 2.48043 17.8946 2.29289 17.7071C2.10536 17.5196 2 17.2652 2 17V10C2 9.73478 2.10536 9.48043 2.29289 9.29289C2.48043 9.10536 2.73478 9 3 9H13C13.2652 9 13.5196 9.10536 13.7071 9.29289C13.8946 9.48043 14 9.73478 14 10V17Z"
                                              fill="white"
                                            />
                                          </svg>
                                        ) : (
                                          <svg
                                            width="16"
                                            height="20"
                                            viewBox="0 0 16 20"
                                            fill="none"
                                            xmlns="http://www.w3.org/2000/svg"
                                          >
                                            <path
                                              d="M8 10.9995C7.69555 10.996 7.39732 11.0858 7.14544 11.2568C6.89357 11.4279 6.70015 11.672 6.59121 11.9564C6.48228 12.2407 6.46306 12.5516 6.53615 12.8472C6.60923 13.1428 6.77111 13.4089 7 13.6097V14.9997C7 15.265 7.10536 15.5193 7.29289 15.7069C7.48043 15.8944 7.73478 15.9998 8 15.9998C8.26522 15.9998 8.51957 15.8944 8.70711 15.7069C8.89464 15.5193 9 15.265 9 14.9997V13.6097C9.22889 13.4089 9.39077 13.1428 9.46385 12.8472C9.53694 12.5516 9.51772 12.2407 9.40879 11.9564C9.29985 11.672 9.10643 11.4279 8.85456 11.2568C8.60268 11.0858 8.30445 10.996 8 10.9995V10.9995ZM13 6.99931H5V4.99921C4.99854 4.40536 5.17334 3.82445 5.50226 3.33002C5.83118 2.8356 6.29942 2.44992 6.84768 2.22182C7.39594 1.99372 7.99956 1.93347 8.58209 2.0487C9.16462 2.16392 9.69985 2.44944 10.12 2.86909C10.4959 3.25318 10.7649 3.72897 10.9 4.24917C10.9328 4.37656 10.9904 4.49623 11.0695 4.60136C11.1486 4.70649 11.2476 4.79501 11.3609 4.86187C11.4742 4.92873 11.5995 4.97262 11.7298 4.99104C11.86 5.00946 11.9926 5.00204 12.12 4.96921C12.2474 4.93637 12.3671 4.87877 12.4722 4.79969C12.5773 4.72061 12.6658 4.62159 12.7327 4.5083C12.7995 4.39501 12.8434 4.26965 12.8618 4.13939C12.8802 4.00914 12.8728 3.87653 12.84 3.74914C12.6122 2.8839 12.1603 2.09399 11.53 1.45902C10.8302 0.761349 9.93934 0.286695 8.96996 0.0949914C8.00058 -0.0967117 6.99614 0.00313358 6.08346 0.381919C5.17078 0.760705 4.3908 1.40145 3.84201 2.22323C3.29321 3.04502 3.00021 4.011 3 4.99921V6.99931C2.20435 6.99931 1.44129 7.3154 0.87868 7.87804C0.316071 8.44068 0 9.20378 0 9.99947V16.9998C0 17.7955 0.316071 18.5586 0.87868 19.1213C1.44129 19.6839 2.20435 20 3 20H13C13.7956 20 14.5587 19.6839 15.1213 19.1213C15.6839 18.5586 16 17.7955 16 16.9998V9.99947C16 9.20378 15.6839 8.44068 15.1213 7.87804C14.5587 7.3154 13.7956 6.99931 13 6.99931ZM14 16.9998C14 17.2651 13.8946 17.5194 13.7071 17.707C13.5196 17.8945 13.2652 17.9999 13 17.9999H3C2.73478 17.9999 2.48043 17.8945 2.29289 17.707C2.10536 17.5194 2 17.2651 2 16.9998V9.99947C2 9.73424 2.10536 9.47987 2.29289 9.29233C2.48043 9.10478 2.73478 8.99942 3 8.99942H13C13.2652 8.99942 13.5196 9.10478 13.7071 9.29233C13.8946 9.47987 14 9.73424 14 9.99947V16.9998Z"
                                              fill="white"
                                            />
                                          </svg>
                                        )}
                                      </div>
                                    </span>
                                  )}
                                </div>

                                {/* Right: Color, Name, Eye, Edit, Delete on white bg, rounded right top and bottom, shadow */}
                                <div
                                  className="flex-1 flex flex-wrap items-center gap-2 px-4 py-3 bg-white rounded-tr-xl rounded-br-xl shadow-md relative"
                                  style={bodyStyle}
                                >
                                  <span
                                    role="button"
                                    tabIndex={0}
                                    className={`h-7 w-7 border-2 border-[#1b1b1b] rounded  flex-shrink-0 ${
                                      isDisabled
                                        ? "cursor-not-allowed opacity-50"
                                        : "cursor-pointer hover:opacity-80"
                                    }`}
                                    style={{ backgroundColor: r.color }}
                                    onClick={() =>
                                      !isDisabled &&
                                      setOpenColorPickerId((prev) =>
                                        prev === r.id ? null : r.id,
                                      )
                                    }
                                    onKeyDown={(e) =>
                                      e.key === "Enter" &&
                                      !isDisabled &&
                                      setOpenColorPickerId((prev) =>
                                        prev === r.id ? null : r.id,
                                      )
                                    }
                                    aria-label="Change color"
                                    aria-disabled={isDisabled}
                                  />
                                  {openColorPickerId === r.id &&
                                    !isDisabled && (
                                      <div
                                        ref={colorPickerRef}
                                        className="absolute z-50 top-14 left-4 shadow-lg "
                                      >
                                        <SketchPicker
                                          color={r.color}
                                          onChangeComplete={(c) =>
                                            handleColorPick(r.id, c)
                                          }
                                        />
                                      </div>
                                    )}
                                  <input
                                    className="flex-1 border-2 border-[#1b1b1b] rounded-full px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 w-[80px] bg-white text-gray-900"
                                    placeholder="Route name"
                                    value={r.name}
                                    onChange={(e) =>
                                      updateName(r.id, e.target.value)
                                    }
                                    disabled={isDisabled}
                                  />
                                  {selectedRouteId === r.id ? (
                                    <>
                                      {isFetchingSegment ? (
                                        "⏳ Building..."
                                      ) : (
                                        <>
                                          <span
                                            role="button"
                                            onClick={() => confirmEdit(r.id)}
                                          >
                                            <svg
                                              width="24"
                                              height="24"
                                              viewBox="0 0 24 24"
                                              fill="none"
                                              xmlns="http://www.w3.org/2000/svg"
                                            >
                                              <path
                                                d="M18.7099 7.2101C18.617 7.11638 18.5064 7.04198 18.3845 6.99121C18.2627 6.94044 18.132 6.91431 17.9999 6.91431C17.8679 6.91431 17.7372 6.94044 17.6154 6.99121C17.4935 7.04198 17.3829 7.11638 17.29 7.2101L9.83995 14.6701L6.70995 11.5301C6.61343 11.4369 6.49949 11.3636 6.37463 11.3143C6.24978 11.2651 6.11645 11.241 5.98227 11.2433C5.84809 11.2457 5.71568 11.2744 5.5926 11.3279C5.46953 11.3814 5.35819 11.4586 5.26495 11.5551C5.17171 11.6516 5.0984 11.7656 5.04919 11.8904C4.99999 12.0153 4.97586 12.1486 4.97818 12.2828C4.9805 12.417 5.00923 12.5494 5.06272 12.6725C5.11622 12.7955 5.19343 12.9069 5.28995 13.0001L9.12995 16.8401C9.22291 16.9338 9.33351 17.0082 9.45537 17.059C9.57723 17.1098 9.70794 17.1359 9.83995 17.1359C9.97196 17.1359 10.1027 17.1098 10.2245 17.059C10.3464 17.0082 10.457 16.9338 10.55 16.8401L18.7099 8.68011C18.8115 8.58646 18.8925 8.47281 18.9479 8.34631C19.0033 8.21981 19.0319 8.08321 19.0319 7.94511C19.0319 7.807 19.0033 7.6704 18.9479 7.5439C18.8925 7.4174 18.8115 7.30375 18.7099 7.2101Z"
                                                fill="#0F7B1A"
                                              />
                                            </svg>
                                          </span>

                                          <span
                                            role="button"
                                            onClick={() => cancelEdit(r.id)}
                                          >
                                            <svg
                                              width="24"
                                              height="24"
                                              viewBox="0 0 24 24"
                                              fill="none"
                                              xmlns="http://www.w3.org/2000/svg"
                                            >
                                              <path
                                                d="M13.4099 11.9999L17.7099 7.70994C17.8982 7.52164 18.004 7.26624 18.004 6.99994C18.004 6.73364 17.8982 6.47825 17.7099 6.28994C17.5216 6.10164 17.2662 5.99585 16.9999 5.99585C16.7336 5.99585 16.4782 6.10164 16.2899 6.28994L11.9999 10.5899L7.70994 6.28994C7.52164 6.10164 7.26624 5.99585 6.99994 5.99585C6.73364 5.99585 6.47824 6.10164 6.28994 6.28994C6.10164 6.47825 5.99585 6.73364 5.99585 6.99994C5.99585 7.26624 6.10164 7.52164 6.28994 7.70994L10.5899 11.9999L6.28994 16.2899C6.19621 16.3829 6.12182 16.4935 6.07105 16.6154C6.02028 16.7372 5.99414 16.8679 5.99414 16.9999C5.99414 17.132 6.02028 17.2627 6.07105 17.3845C6.12182 17.5064 6.19621 17.617 6.28994 17.7099C6.3829 17.8037 6.4935 17.8781 6.61536 17.9288C6.73722 17.9796 6.86793 18.0057 6.99994 18.0057C7.13195 18.0057 7.26266 17.9796 7.38452 17.9288C7.50638 17.8781 7.61698 17.8037 7.70994 17.7099L11.9999 13.4099L16.2899 17.7099C16.3829 17.8037 16.4935 17.8781 16.6154 17.9288C16.7372 17.9796 16.8679 18.0057 16.9999 18.0057C17.132 18.0057 17.2627 17.9796 17.3845 17.9288C17.5064 17.8781 17.617 17.8037 17.7099 17.7099C17.8037 17.617 17.8781 17.5064 17.9288 17.3845C17.9796 17.2627 18.0057 17.132 18.0057 16.9999C18.0057 16.8679 17.9796 16.7372 17.9288 16.6154C17.8781 16.4935 17.8037 16.3829 17.7099 16.2899L13.4099 11.9999Z"
                                                fill="#9B9B9B"
                                              />
                                            </svg>
                                          </span>
                                        </>
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      <span
                                        role="button"
                                        tabIndex={0}
                                        aria-label="Hide or show route"
                                        className="hover:text-purple-700 cursor-pointer text-gray-600"
                                        onClick={() => toggleHidden(r.id)}
                                        onKeyDown={(e) =>
                                          e.key === "Enter" &&
                                          toggleHidden(r.id)
                                        }
                                      >
                                        {r.hidden ? (
                                          <svg
                                            width="24"
                                            height="24"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            xmlns="http://www.w3.org/2000/svg"
                                          >
                                            <path
                                              d="M10.1416 11.2627C10.051 11.491 10 11.7394 10 12C10 13.1046 10.8954 14 12 14C12.2604 14 12.5082 13.9479 12.7363 13.8574L14.2109 15.332C13.5774 15.7532 12.8178 16 12 16C9.79086 16 8 14.2091 8 12C8 11.1821 8.24569 10.4217 8.66699 9.78809L10.1416 11.2627ZM12 8C14.2091 8 16 9.79086 16 12C16 12.2736 15.9722 12.5407 15.9199 12.7988L11.2002 8.0791C11.4586 8.02668 11.7262 8 12 8Z"
                                              fill="#CBCBCB"
                                            />
                                            <path
                                              d="M7.57422 8.69531C6.29412 9.63256 5.24947 10.7623 4.58398 11.5703C4.48431 11.6913 4.40935 11.7817 4.34766 11.8613C4.29919 11.9239 4.26934 11.9686 4.24902 12C4.26934 12.0314 4.29919 12.0761 4.34766 12.1387C4.40935 12.2183 4.48431 12.3087 4.58398 12.4297C5.26418 13.2555 6.34021 14.4182 7.65918 15.3672C8.98616 16.3219 10.4743 17 12 17C13.0476 17 14.0768 16.6793 15.0488 16.1699L16.5176 17.6387C15.2045 18.4171 13.6698 18.9999 12 19C9.89019 19 7.99421 18.0725 6.49121 16.9912C4.98034 15.9042 3.77991 14.5994 3.04004 13.7012C2.74394 13.3417 2.29068 12.8546 2.23535 12.1445L2.22949 12L2.23535 11.8555C2.29068 11.1454 2.74394 10.6583 3.04004 10.2988C3.72245 9.47032 4.79634 8.29591 6.14453 7.26562L7.57422 8.69531ZM12 5C14.1098 5.00007 16.0058 5.92749 17.5088 7.00879C19.0197 8.09582 20.2201 9.40058 20.96 10.2988C21.2757 10.6822 21.7705 11.2108 21.7705 12C21.7705 12.7892 21.2757 13.3178 20.96 13.7012C20.4733 14.2921 19.7849 15.0563 18.9424 15.8213L17.5264 14.4053C18.3064 13.7056 18.9537 12.991 19.416 12.4297C19.5157 12.3087 19.5907 12.2183 19.6523 12.1387C19.7006 12.0764 19.7297 12.0314 19.75 12C19.7297 11.9686 19.7006 11.9236 19.6523 11.8613C19.5907 11.7817 19.5157 11.6913 19.416 11.5703C18.7359 10.7445 17.6598 9.58182 16.3408 8.63281C15.0139 7.67813 13.5257 7.00007 12 7C11.4492 7 10.9033 7.08922 10.3682 7.24707L8.80664 5.68555C9.79042 5.26876 10.8643 5 12 5Z"
                                              fill="#CBCBCB"
                                            />
                                            <path
                                              d="M5 2L21 18"
                                              stroke="#CBCBCB"
                                              strokeWidth="2"
                                            />
                                          </svg>
                                        ) : (
                                          <svg
                                            width="24"
                                            height="24"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            xmlns="http://www.w3.org/2000/svg"
                                          >
                                            <path
                                              d="M12 8.69238C13.694 8.69238 14.9997 10.003 15 11.5381C15 13.0734 13.6942 14.3848 12 14.3848C10.3058 14.3848 9 13.0734 9 11.5381C9.00026 10.003 10.306 8.69238 12 8.69238Z"
                                              stroke="#1B1B1B"
                                              strokeWidth="2"
                                            />
                                            <path
                                              d="M20.1306 10.4471C20.5451 10.9265 20.7523 11.1662 20.7523 11.5385C20.7523 11.9108 20.5451 12.1506 20.1306 12.63C18.6848 14.3024 15.5875 17.3077 12 17.3077C8.4125 17.3077 5.31525 14.3024 3.86938 12.63C3.45493 12.1506 3.2477 11.9108 3.2477 11.5385C3.2477 11.1662 3.45493 10.9265 3.86938 10.4471C5.31525 8.77461 8.4125 5.76929 12 5.76929C15.5875 5.76929 18.6848 8.77461 20.1306 10.4471Z"
                                              stroke="#1B1B1B"
                                              strokeWidth="2"
                                            />
                                          </svg>
                                        )}
                                      </span>
                                      <span
                                        role="button"
                                        tabIndex={0}
                                        aria-label="Edit route"
                                        className={`text-gray-600 ${
                                          isDisabled
                                            ? "opacity-50 cursor-not-allowed"
                                            : "hover:text-purple-700 cursor-pointer"
                                        }`}
                                        onClick={() =>
                                          !isDisabled && editRoute(r.id)
                                        }
                                        onKeyDown={(e) =>
                                          e.key === "Enter" &&
                                          !isDisabled &&
                                          editRoute(r.id)
                                        }
                                        aria-disabled={isDisabled}
                                      >
                                        <svg
                                          width="20"
                                          height="20"
                                          viewBox="0 0 20 20"
                                          fill="none"
                                          xmlns="http://www.w3.org/2000/svg"
                                        >
                                          <path
                                            d="M17.4998 10C17.2788 10 17.0669 10.0878 16.9106 10.2441C16.7543 10.4004 16.6665 10.6124 16.6665 10.8334V15.8334C16.6665 16.0544 16.5787 16.2663 16.4224 16.4226C16.2661 16.5789 16.0542 16.6667 15.8332 16.6667H4.1665C3.94549 16.6667 3.73353 16.5789 3.57725 16.4226C3.42097 16.2663 3.33317 16.0544 3.33317 15.8334V4.1667C3.33317 3.94568 3.42097 3.73372 3.57725 3.57744C3.73353 3.42116 3.94549 3.33336 4.1665 3.33336H9.1665C9.38752 3.33336 9.59948 3.24557 9.75576 3.08929C9.91204 2.93301 9.99984 2.72104 9.99984 2.50003C9.99984 2.27902 9.91204 2.06706 9.75576 1.91077C9.59948 1.75449 9.38752 1.6667 9.1665 1.6667H4.1665C3.50346 1.6667 2.86758 1.93009 2.39874 2.39893C1.9299 2.86777 1.6665 3.50366 1.6665 4.1667V15.8334C1.6665 16.4964 1.9299 17.1323 2.39874 17.6011C2.86758 18.07 3.50346 18.3334 4.1665 18.3334H15.8332C16.4962 18.3334 17.1321 18.07 17.6009 17.6011C18.0698 17.1323 18.3332 16.4964 18.3332 15.8334V10.8334C18.3332 10.6124 18.2454 10.4004 18.0891 10.2441C17.9328 10.0878 17.7209 10 17.4998 10ZM4.99984 10.6334V14.1667C4.99984 14.3877 5.08764 14.5997 5.24392 14.756C5.4002 14.9122 5.61216 15 5.83317 15H9.3665C9.47618 15.0007 9.58489 14.9796 9.68643 14.9382C9.78796 14.8967 9.8803 14.8356 9.95817 14.7584L15.7248 8.98336L18.0915 6.6667C18.1696 6.58923 18.2316 6.49706 18.2739 6.39551C18.3162 6.29396 18.338 6.18504 18.338 6.07503C18.338 5.96502 18.3162 5.8561 18.2739 5.75455C18.2316 5.653 18.1696 5.56083 18.0915 5.48336L14.5582 1.90836C14.4807 1.83026 14.3885 1.76826 14.287 1.72595C14.1854 1.68365 14.0765 1.66187 13.9665 1.66187C13.8565 1.66187 13.7476 1.68365 13.646 1.72595C13.5445 1.76826 13.4523 1.83026 13.3748 1.90836L11.0248 4.2667L5.2415 10.0417C5.16427 10.1196 5.10317 10.2119 5.06169 10.3134C5.02022 10.415 4.9992 10.5237 4.99984 10.6334ZM13.9665 3.67503L16.3248 6.03336L15.1415 7.2167L12.7832 4.85836L13.9665 3.67503ZM6.6665 10.975L11.6082 6.03336L13.9665 8.3917L9.02484 13.3334H6.6665V10.975Z"
                                            fill="#1B1B1B"
                                          />
                                        </svg>
                                      </span>
                                      <span
                                        role="button"
                                        tabIndex={0}
                                        aria-label="Delete route"
                                        className={`text-gray-600 ${
                                          isDisabled
                                            ? "opacity-50 cursor-not-allowed"
                                            : "hover:text-purple-700 cursor-pointer"
                                        }`}
                                        onClick={() =>
                                          !isDisabled && removeRoute(r.id)
                                        }
                                        onKeyDown={(e) =>
                                          e.key === "Enter" &&
                                          !isDisabled &&
                                          removeRoute(r.id)
                                        }
                                        aria-disabled={isDisabled}
                                      >
                                        <svg
                                          width="18"
                                          height="20"
                                          viewBox="0 0 18 20"
                                          fill="none"
                                          xmlns="http://www.w3.org/2000/svg"
                                        >
                                          <path
                                            d="M10 14.4665V8.67989C10 8.4241 10.1054 8.1788 10.2929 7.99793C10.4804 7.81706 10.7348 7.71545 11 7.71545C11.2652 7.71545 11.5196 7.81706 11.7071 7.99793C11.8946 8.1788 12 8.4241 12 8.67989V14.4665C12 14.7223 11.8946 14.9676 11.7071 15.1484C11.5196 15.3293 11.2652 15.4309 11 15.4309C10.7348 15.4309 10.4804 15.3293 10.2929 15.1484C10.1054 14.9676 10 14.7223 10 14.4665ZM7 15.4309C7.26522 15.4309 7.51957 15.3293 7.70711 15.1484C7.89464 14.9676 8 14.7223 8 14.4665V8.67989C8 8.4241 7.89464 8.1788 7.70711 7.99793C7.51957 7.81706 7.26522 7.71545 7 7.71545C6.73478 7.71545 6.48043 7.81706 6.29289 7.99793C6.10536 8.1788 6 8.4241 6 8.67989V14.4665C6 14.7223 6.10536 14.9676 6.29289 15.1484C6.48043 15.3293 6.73478 15.4309 7 15.4309ZM18 4.82216C18 5.07794 17.8946 5.32325 17.7071 5.50412C17.5196 5.68498 17.2652 5.78659 17 5.78659H16V16.3375C16 17.1048 15.6839 17.8407 15.1213 18.3833C14.5587 18.9259 13.7956 19.2308 13 19.2308H5C4.20435 19.2308 3.44129 18.9259 2.87868 18.3833C2.31607 17.8407 2 17.1048 2 16.3375V5.78659H1C0.734784 5.78659 0.48043 5.68498 0.292893 5.50412C0.105357 5.32325 0 5.07794 0 4.82216C0 4.56638 0.105357 4.32107 0.292893 4.1402C0.48043 3.95934 0.734784 3.85773 1 3.85773H5V2.8933C5 2.12595 5.31607 1.39002 5.87868 0.847427C6.44129 0.304829 7.20435 0 8 0H10C10.7956 0 11.5587 0.304829 12.1213 0.847427C12.6839 1.39002 13 2.12595 13 2.8933V3.85773H17C17.2652 3.85773 17.5196 3.95934 17.7071 4.1402C17.8946 4.32107 18 4.56638 18 4.82216ZM7 3.85773H11V2.8933C11 2.63751 10.8946 2.39221 10.7071 2.21134C10.5196 2.03047 10.2652 1.92886 10 1.92886H8C7.73478 1.92886 7.48043 2.03047 7.29289 2.21134C7.10536 2.39221 7 2.63751 7 2.8933V3.85773ZM14 5.78659H4V16.3375C4 16.5933 4.10536 16.8386 4.29289 17.0194C4.48043 17.2003 4.73478 17.3019 5 17.3019H13C13.2652 17.3019 13.5196 17.2003 13.7071 17.0194C13.8946 16.8386 14 16.5933 14 16.3375V5.78659Z"
                                            fill="#1B1B1B"
                                          />
                                        </svg>
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Bottom row: Station names with light gray background */}
                              <div
                                className="text-sm text-gray-800 flex flex-col items-center gap-0 min-h-[32px] px-4 py-2"
                                style={{
                                  backgroundColor: "#F4F4F4",
                                  ...bodyStyle,
                                }}
                              >
                                {r.stations.length > 0 ? (
                                  <>
                                    {expandedStationRoutes.has(r.id) ? (
                                      <>
                                        <div className="mt-3"></div>
                                        {r.stations.map((s, sIdx) => (
                                          <React.Fragment
                                            key={`${r.id}-st-${sIdx}`}
                                          >
                                            <span className="font-medium text-center">
                                              {getStationName(s)}
                                            </span>
                                            {sIdx < r.stations.length - 1 && (
                                              <svg
                                                width="24"
                                                height="24"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                xmlns="http://www.w3.org/2000/svg"
                                              >
                                                <path
                                                  d="M17.7102 11.29C17.6172 11.1963 17.5066 11.1219 17.3848 11.0711C17.2629 11.0203 17.1322 10.9942 17.0002 10.9942C16.8682 10.9942 16.7375 11.0203 16.6156 11.0711C16.4937 11.1219 16.3831 11.1963 16.2902 11.29L13.0002 14.59V7C13.0002 6.73478 12.8948 6.48043 12.7073 6.29289C12.5198 6.10536 12.2654 6 12.0002 6C11.735 6 11.4806 6.10536 11.2931 6.29289C11.1055 6.48043 11.0002 6.73478 11.0002 7V14.59L7.71019 11.29C7.52188 11.1017 7.26649 10.9959 7.00019 10.9959C6.73388 10.9959 6.47849 11.1017 6.29019 11.29C6.10188 11.4783 5.99609 11.7337 5.99609 12C5.99609 12.2663 6.10188 12.5217 6.29019 12.71L11.2902 17.71C11.3853 17.801 11.4974 17.8724 11.6202 17.92C11.7399 17.9729 11.8693 18.0002 12.0002 18.0002C12.1311 18.0002 12.2605 17.9729 12.3802 17.92C12.5029 17.8724 12.6151 17.801 12.7102 17.71L17.7102 12.71C17.8039 12.617 17.8783 12.5064 17.9291 12.3846C17.9798 12.2627 18.006 12.132 18.006 12C18.006 11.868 17.9798 11.7373 17.9291 11.6154C17.8783 11.4936 17.8039 11.383 17.7102 11.29Z"
                                                  fill="#1B1B1B"
                                                />
                                              </svg>
                                            )}
                                          </React.Fragment>
                                        ))}
                                        <span
                                          role="button"
                                          tabIndex={0}
                                          onClick={() =>
                                            toggleStationExpand(r.id)
                                          }
                                          onKeyDown={(e) =>
                                            e.key === "Enter" &&
                                            toggleStationExpand(r.id)
                                          }
                                          className="text-gray-400 hover:text-gray-600 cursor-pointer font-medium mt-5 mb-1 flex items-center gap-2 group"
                                        >
                                          <svg
                                            width="12"
                                            height="7"
                                            viewBox="0 0 12 7"
                                            fill="none"
                                            xmlns="http://www.w3.org/2000/svg"
                                          >
                                            <path
                                              d="M5.33822 0.292942L0.265572 5.44326C0.181421 5.52785 0.114629 5.6285 0.0690483 5.73938C0.0234675 5.85027 0 5.9692 0 6.08933C0 6.20945 0.0234675 6.32839 0.0690483 6.43927C0.114629 6.55016 0.181421 6.6508 0.265572 6.73539C0.433788 6.90487 0.661341 7 0.898531 7C1.13572 7 1.36327 6.90487 1.53149 6.73539L6.02056 2.23114L10.4647 6.73539C10.633 6.90487 10.8605 7 11.0977 7C11.3349 7 11.5624 6.90487 11.7307 6.73539C11.8155 6.65112 11.883 6.55062 11.9292 6.43972C11.9754 6.32882 11.9995 6.20972 12 6.08933C11.9995 5.96894 11.9754 5.84984 11.9292 5.73894C11.883 5.62804 11.8155 5.52754 11.7307 5.44326L6.65801 0.292942C6.57393  0.200578 6.4719 0.126864 6.35832 0.0764459C6.24475 0.0260279 6.1221 -4.73456e-07 5.99811 -4.74973e-07C5.87412 -4.7649e-07 5.75148 0.0260279 5.63791 0.0764459C5.52433 0.126864 5.42229 0.200578 5.33822 0.292942Z"
                                              className="fill-gray-400 group-hover:fill-gray-600"
                                            />
                                          </svg>
                                          Show less
                                        </span>
                                      </>
                                    ) : (
                                      <span
                                        role="button"
                                        tabIndex={0}
                                        onClick={() =>
                                          toggleStationExpand(r.id)
                                        }
                                        onKeyDown={(e) =>
                                          e.key === "Enter" &&
                                          toggleStationExpand(r.id)
                                        }
                                        className="text-gray-400 hover:text-gray-600 cursor-pointer font-medium flex items-center gap-2 group"
                                      >
                                        <svg
                                          width="12"
                                          height="7"
                                          viewBox="0 0 12 7"
                                          fill="none"
                                          xmlns="http://www.w3.org/2000/svg"
                                        >
                                          <path
                                            d="M6.66178 6.70706L11.7344 1.55674C11.8186 1.47215 11.8854 1.3715 11.931 1.26062C11.9765 1.14973 12 1.0308 12 0.910672C12 0.790548 11.9765 0.671612 11.931 0.560726C11.8854 0.44984 11.8186 0.349199 11.7344 0.264607C11.5662 0.0951276 11.3387 -3.32358e-08 11.1015 -4.51558e-08C10.8643 -5.70758e-08 10.6367 0.0951276 10.4685 0.264607L5.97944 4.76886L1.53526 0.264606C1.36704 0.0951271 1.13949 -5.45797e-07 0.902302 -5.57717e-07C0.665113 -5.69637e-07 0.43756 0.0951271 0.269344 0.264606C0.184511 0.348881 0.117022 0.44938 0.0707874 0.560281C0.0245531 0.671182 0.000492796 0.790278 -3.32647e-07 0.910671C0.000492787 1.03106 0.024553 1.15016 0.0707874 1.26106C0.117022 1.37196 0.184511 1.47246 0.269344 1.55674L5.34199 6.70706C5.42607 6.79942 5.5281 6.87314 5.64168 6.92355C5.75525 6.97397 5.8779 7 6.00189 7C6.12588 7 6.24852 6.97397 6.36209 6.92355C6.47567 6.87314 6.57771 6.79942 6.66178 6.70706Z"
                                            className="fill-gray-400 group-hover:fill-gray-600"
                                          />
                                        </svg>
                                        Show more ({r.stations.length} stations)
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-gray-400 italic w-full text-center">
                                    empty
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* New Route Button */}
                      <div className="flex justify-center mt-4">
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={addRoute}
                          onKeyDown={(e) => e.key === "Enter" && addRoute()}
                          className="inline-block px-4 py-2 bg-[#81069E] text-white rounded-full shadow hover:bg-[#5d0971] cursor-pointer"
                        >
                          New route +
                        </span>
                      </div>
                    </div>
                  )}
                  {transportMode === "Bus" && (
                    <div className="mt-4 p-4 w-full h-[85vh] flex flex-col">
                      {/* File Upload */}
                      <div className="mb-6 pr-2 ">
                        <div className="flex justify-between items-center pr-1  mb-2">
                          <h3 className="content_title">Bus Schedule</h3>{" "}
                          <HelpButton helpType="Schedule" />
                        </div>
                        <input
                          id="bus-schedule-file"
                          type="file"
                          accept=".xlsx"
                          className="hidden"
                          onChange={(e) =>
                            handleFileUpload(e.target.files?.[0] || null)
                          }
                        />
                        <div
                          className={`p-6 border-2 border-dashed rounded-[20px] bg-white cursor-pointer flex flex-col items-center justify-center min-h-[120px] hover:bg-gray-50 ${
                            busScheduleFile
                              ? "border-green-500 bg-green-50"
                              : "border-[#81069e]"
                          }`}
                          onClick={() =>
                            (
                              document.getElementById(
                                "bus-schedule-file",
                              ) as HTMLInputElement | null
                            )?.click()
                          }
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const f = e.dataTransfer?.files?.[0];
                            handleFileUpload(f || null);
                          }}
                        >
                          {busScheduleFile ? (
                            <>
                              <p className="text-green-600 font-semibold mb-2">
                                ✓ File uploaded
                              </p>
                              <p className="text-green-600 text-sm">
                                {busScheduleFile.name}
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-gray-600 mb-2">
                                Drag and drop file here (.xlsx)
                              </p>
                              <p className="text-gray-400 text-sm">
                                or click to select file
                              </p>
                            </>
                          )}
                        </div>
                        <div className="mt-2">
                          <span>
                            <span
                              onClick={handleDownloadTemplate}
                              className="text-[#81069e] underline hover:text-[#323232] cursor-pointer"
                            >
                              Click here
                            </span>
                            <span className="ml-3">
                              to download the .xlsx template
                            </span>
                          </span>
                        </div>
                      </div>

                      {/* Scrollable Routes List */}
                      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                        {routes.map((route) => {
                          const busLocked = route.locked;
                          const busCardStyle = {
                            opacity: busLocked ? 0.5 : 1,
                            pointerEvents: busLocked ? "none" : "auto",
                          } as const;

                          return (
                            <div
                              key={route.id}
                              className="bg-white rounded-xl shadow-md border border-gray-200 p-4 flex-shrink-0"
                              style={busCardStyle}
                            >
                              <div
                                className="text-white rounded-t-lg -mx-4 -mt-4 px-4 py-3 mb-4"
                                style={{ backgroundColor: route.color }}
                              >
                                <h4 className="text-lg">
                                  Bus Information - {route.name}
                                </h4>
                              </div>

                              {/* Parameters */}
                              <div className="space-y-4">
                                {[
                                  {
                                    label: "Max Distance :",
                                    key: "maxDistance" as const,
                                    unit: "km",
                                  },
                                  {
                                    label: "Speed :",
                                    key: "speed" as const,
                                    unit: "km/hr",
                                  },
                                  {
                                    label: "Capacity :",
                                    key: "capacity" as const,
                                    unit: "persons",
                                  },
                                  {
                                    label: "Max Bus :",
                                    key: "maxBuses" as const,
                                    unit: "buses",
                                  },
                                  {
                                    label: "Route Traveling Time :",
                                    key: "routeTravelingTime" as const,
                                    unit: "mins",
                                  },
                                ].map((field) => (
                                  <div
                                    key={field.key}
                                    className="flex items-center gap-3"
                                  >
                                    <span className="text-sm font-medium text-gray-700 min-w-fit">
                                      {field.label}
                                    </span>
                                    <input
                                      type="number"
                                      value={route[field.key] || 0}
                                      onChange={(e) =>
                                        updateBusInfo(
                                          route.id,
                                          field.key,
                                          Number(e.target.value),
                                        )
                                      }
                                      disabled={busLocked}
                                      className="border border-gray-300 rounded px-3 py-1 w-20 text-center focus:outline-none focus:ring-2 focus:ring-purple-300"
                                    />
                                    <span className="text-sm text-gray-600">
                                      {field.unit}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Shared map for both Route and Bus modes */}
                <div className="map-container flex-1 h-[90vh] flex flex-col items-center px-16">
                  <div className="my-4 flex w-full text-header-map justify-start gap-10 items-center">
                    <div className="flex items-center ">
                      <p className="text-[20px] text-[#323232]">
                        Simulation Period :
                      </p>
                      <div className="time-inputs p-2 px-4 text-[#C296CD] ml-3 my-2 h-[60px] flex items-center text-lg">
                        <input
                          type="number"
                          min={0}
                          max={23}
                          value={simStartHour}
                          onChange={(e) =>
                            setSimStartHour(Number(e.target.value))
                          }
                          className="border p-2 rounded w-10 text-lg"
                        />
                        <span className="text-lg">:00</span>
                        <span className="mx-2 text-lg">-</span>
                        <input
                          type="number"
                          min={1}
                          max={24}
                          value={simEndHour}
                          onChange={(e) =>
                            setSimEndHour(Number(e.target.value))
                          }
                          className="border p-2 rounded w-10 text-lg"
                        />
                        <span className="text-lg">:00</span>
                      </div>
                    </div>

                    <div className="flex items-center ">
                      <p className="text-[20px] text-[#323232]">Time Slot : </p>
                      <div className="ml-3 my-2 h-full">
                        <CustomDropdown
                          options={timeSlotOptions}
                          selectedValue={timeSlot}
                          onChange={setTimeSlot}
                          fontSize="text-lg"
                        />
                      </div>
                    </div>
                  </div>
                  <div
                    className="map w-full flex-1 min-h-[400px]"
                    ref={mapContainerRef}
                  >
                    <ScenarioMap
                      stations={nodes}
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
    </>
  );
}
