"use client";
import { useEffect, useRef, useState } from "react";
import {
  Plus,
  Minus,
  LocateFixed,
  Layers,
  ArrowUpRight,
  Navigation,
} from "lucide-react";
import type * as Leaflet from "leaflet";
import type { Feature, GeoJsonObject } from "geojson";
import { useDemo } from "../domain/store";
import {
  activeMission,
  missionStatus,
  shortId,
  time,
  violations,
} from "../domain/engine";
import type { Location } from "../domain/types";
import { Badge, Panel, Stamp } from "./ui-kit";

// Demo placements are schematic positions on a geographic basemap, never real facilities.
const coordinate = (location: Location): [number, number] => [
  32 - location.y * 0.15,
  66 + location.x * 0.22,
];
const REGIONS: Record<string, Leaflet.LatLngBoundsExpression> = {
  India: [
    [6, 66],
    [36, 99],
  ],
  North: [
    [23, 70],
    [34, 89],
  ],
  South: [
    [7, 72],
    [22, 86],
  ],
};
const CITIES: [string, number, number][] = [
  ["New Delhi", 28.6139, 77.209],
  ["Mumbai", 19.076, 72.8777],
  ["Kolkata", 22.5726, 88.3639],
  ["Chennai", 13.0827, 80.2707],
  ["Bengaluru", 12.9716, 77.5946],
  ["Hyderabad", 17.385, 78.4867],
  ["Ahmedabad", 23.0225, 72.5714],
  ["Jaipur", 26.9124, 75.7873],
  ["Kochi", 9.9312, 76.2673],
  ["Kathmandu", 27.7172, 85.324],
  ["Dhaka", 23.8103, 90.4125],
  ["Colombo", 6.9271, 79.8612],
];
// India's official boundary: all of Jammu & Kashmir and Ladakh, including
// PoK, Gilgit-Baltistan, Aksai Chin and the Shaksgam Valley. Raster tile
// services draw de facto lines, so the basemap is fully bundled.
const BASEMAP_STYLE: Record<string, Leaflet.PathOptions> = {
  country: {
    color: "#a9b6b3",
    weight: 0.7,
    fillColor: "#eceee8",
    fillOpacity: 1,
  },
  state: {
    color: "#9db0ad",
    weight: 0.6,
    fillColor: "#dbe1d7",
    fillOpacity: 1,
  },
  india: { color: "#3f5f5c", weight: 1.6, fill: false },
};
type Controls = {
  zoom: (delta: number) => void;
  fit: (region: string) => void;
  update: () => void;
};
export function MissionMap({
  compact = false,
  onMission,
}: {
  compact?: boolean;
  onMission?: (id: string) => void;
}) {
  const { state: s, isDemo } = useDemo();
  const [selected, setSelected] = useState("RLF-204");
  const [region, setRegion] = useState("India");
  const [layerMenu, setLayerMenu] = useState(false);
  const [layers, setLayers] = useState({
    Missions: true,
    Locations: true,
    Weather: false,
    Airspace: false,
  });
  const [mapStatus, setMapStatus] = useState("Loading map…");
  const [mapError, setMapError] = useState(false);
  const host = useRef<HTMLDivElement>(null),
    api = useRef<Controls | null>(null);
  const latest = useRef({ s, selected, layers });
  useEffect(() => {
    latest.current = { s, selected, layers };
    api.current?.update();
  }, [s, selected, layers]);
  useEffect(() => {
    let stopped = false,
      map: Leaflet.Map | undefined;
    const controller = new AbortController();
    let observer: ResizeObserver | undefined;
    import("leaflet")
      .then((L) => {
        if (stopped || !host.current) return;
        map = L.map(host.current, {
          zoomControl: false,
          scrollWheelZoom: !compact,
          minZoom: 4,
          maxZoom: 9,
          // Extent of the bundled basemap; nothing is drawn beyond it.
          maxBounds: [
            [-20, 20],
            [55, 140],
          ],
          maxBoundsViscosity: 1,
          attributionControl: true,
        });
        const view = map;
        view.attributionControl.setPrefix(false);
        view.createPane("geography").style.zIndex = "100";
        view.createPane("geographicLabels").style.zIndex = "150";
        const land = L.layerGroup().addTo(view);
        view.attributionControl.addAttribution(
          'Boundaries: <a href="https://www.naturalearthdata.com/" target="_blank" rel="noreferrer">Natural Earth</a> (India view)',
        );
        fetch("/maps/india-official.geojson", { signal: controller.signal })
          .then((r) => {
            if (!r.ok) throw Error();
            return r.json();
          })
          .then((data) => {
            if (stopped) return;
            L.geoJSON(data as GeoJsonObject, {
              pane: "geography",
              interactive: false,
              style: (feature?: Feature) =>
                BASEMAP_STYLE[feature?.properties?.kind] ??
                BASEMAP_STYLE.country,
            }).addTo(land);
            for (const [name, lat, lon] of CITIES) {
              const label = document.createElement("span");
              label.textContent = name;
              L.marker([lat, lon], {
                interactive: false,
                keyboard: false,
                pane: "geographicLabels",
                icon: L.divIcon({
                  className: "geo-city",
                  html: label,
                  iconSize: [94, 20],
                  iconAnchor: [0, 10],
                }),
              }).addTo(land);
            }
          })
          .then(() => {
            if (!stopped)
              setMapStatus("Official boundaries of India · bundled basemap");
          })
          .catch(() => {
            if (!stopped)
              setMapStatus(
                "Map background unavailable · check your connection",
              );
          });
        const operations = L.layerGroup().addTo(view);
        const fit = (name: string) =>
          view.fitBounds(REGIONS[name] || REGIONS.India, {
            padding: [18, 18],
            animate: false,
          });
        const update = () => {
          const current = latest.current;
          operations.clearLayers();
          const locations = new Map(current.s.locations.map((l) => [l.id, l]));
          if (current.layers.Weather)
            for (const weather of current.s.weather.filter(
              (w) => w.severity !== "CLEAR",
            )) {
              const at = locations.get(weather.locationId);
              if (!at) continue;
              L.circle(coordinate(at), {
                radius: 95000,
                color: weather.severity === "SEVERE" ? "#bc664d" : "#b89850",
                fillOpacity: 0.14,
                weight: 1,
                dashArray: "6 6",
                interactive: false,
              }).addTo(operations);
            }
          if (current.layers.Airspace)
            for (const r of current.s.restrictions.filter((r) => r.active)) {
              const a = locations.get(r.origin),
                b = locations.get(r.destination);
              if (!a || !b) continue;
              const from = coordinate(a),
                to = coordinate(b);
              const mid: [number, number] = [
                (from[0] + to[0]) / 2,
                (from[1] + to[1]) / 2,
              ];
              const tip = document.createElement("span");
              tip.textContent = `Demo restriction: ${r.name}`;
              L.rectangle(
                [
                  [mid[0] - 0.45, mid[1] - 0.6],
                  [mid[0] + 0.45, mid[1] + 0.6],
                ],
                {
                  color: "#a65d48",
                  fillOpacity: 0.12,
                  weight: 1,
                  dashArray: "5 5",
                },
              )
                .bindTooltip(tip)
                .addTo(operations);
            }
          if (current.layers.Missions)
            for (const m of current.s.missions.filter(activeMission)) {
              const a = locations.get(m.origin),
                b = locations.get(m.destination);
              if (!a || !b) continue;
              const from = coordinate(a),
                to = coordinate(b),
                active = m.id === current.selected;
              const curve: Array<[number, number]> = Array.from(
                { length: 25 },
                (_, i) => {
                  const t = i / 24;
                  return [
                    from[0] +
                      (to[0] - from[0]) * t +
                      Math.sin(t * Math.PI) * 0.35,
                    from[1] + (to[1] - from[1]) * t,
                  ];
                },
              );
              const color = violations(current.s, m).length
                ? "#b95038"
                : active
                  ? "#244f53"
                  : "#708985";
              const tip = document.createElement("span");
              tip.textContent = `${m.id} · ${shortId(m.aircraftId)} · demo route`;
              L.polyline(curve, {
                color,
                weight: active ? 3 : 1.5,
                opacity: active ? 1 : 0.48,
                dashArray: violations(current.s, m).length ? "7 6" : undefined,
              })
                .bindTooltip(tip, { sticky: true })
                .on("click", () => setSelected(m.id))
                .addTo(operations);
            }
          if (current.layers.Locations)
            for (const location of current.s.locations) {
              const point = document.createElement("span");
              point.className = "geo-node-dot";
              const label = document.createElement("div");
              const title = document.createElement("strong");
              title.textContent = location.name;
              const detail = document.createElement("small");
              detail.textContent = "Demo placement · not a real facility";
              label.appendChild(title);
              label.appendChild(detail);
              L.marker(coordinate(location), {
                icon: L.divIcon({
                  className: "geo-node",
                  html: point,
                  iconSize: [18, 18],
                  iconAnchor: [9, 9],
                }),
                title: `Demo location: ${location.name}`,
                keyboard: true,
              })
                .bindTooltip(label, { direction: "top", offset: [0, -8] })
                .on("click", () => {
                  const m = current.s.missions.find(
                    (m) =>
                      activeMission(m) &&
                      (m.origin === location.id ||
                        m.destination === location.id),
                  );
                  if (m) setSelected(m.id);
                })
                .addTo(operations);
            }
        };
        api.current = {
          zoom: (d) => view.setZoom(view.getZoom() + d),
          fit,
          update,
        };
        observer = new ResizeObserver(() => {
          view.invalidateSize({ pan: false });
        });
        observer.observe(host.current);
        fit("India");
        update();
      })
      .catch(() => {
        if (!stopped) {
          setMapError(true);
          setMapStatus("Map could not start. Reload the page to retry.");
        }
      });
    return () => {
      stopped = true;
      controller.abort();
      observer?.disconnect();
      map?.remove();
      api.current = null;
    };
  }, [compact]);
  const missions = s.missions.filter(activeMission),
    mission = missions.find((m) => m.id === selected),
    wx = s.weather.find((w) => w.locationId === mission?.destination);
  return (
    <div className={`geographic-map ${compact ? "compact" : ""}`}>
      <div className="geo-toolbar">
        <div className="geo-region-tabs" aria-label="Map region">
          {Object.keys(REGIONS).map((name) => (
            <button
              key={name}
              aria-pressed={region === name}
              className={region === name ? "active" : ""}
              onClick={() => {
                setRegion(name);
                api.current?.fit(name);
              }}
            >
              {name}
            </button>
          ))}
        </div>
        <div className="geo-toolbar-right">
          {isDemo && (
            <button
              aria-expanded={layerMenu}
              onClick={() => setLayerMenu(!layerMenu)}
            >
              <Layers size={15} /> Layers
            </button>
          )}
        </div>
      </div>
      <div className="geo-map-stage">
        <div
          ref={host}
          className="geo-leaflet"
          aria-label="Interactive geographic map of India. Pan, zoom, or choose a region."
        />
        <div className="geo-context">
          <span className="geo-crosshair">+</span>
          <span>
            INDIA & SURROUNDING REGION
            <small>
              {isDemo
                ? "DEMO OVERLAYS · NOT REAL OPERATIONS"
                : "GEOGRAPHIC REFERENCE"}
            </small>
          </span>
        </div>
        <div className="geo-zoom">
          <button
            aria-label="Zoom in"
            onClick={() => api.current?.zoom(1)}
            disabled={mapError}
          >
            <Plus size={17} />
          </button>
          <button
            aria-label="Zoom out"
            onClick={() => api.current?.zoom(-1)}
            disabled={mapError}
          >
            <Minus size={17} />
          </button>
          <button
            aria-label="Reset map"
            onClick={() => {
              setRegion("India");
              api.current?.fit("India");
            }}
            disabled={mapError}
          >
            <LocateFixed size={17} />
          </button>
        </div>
        {layerMenu && isDemo && (
          <div className="geo-layer-menu">
            {Object.entries(layers).map(([key, value]) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={value}
                  onChange={() => setLayers({ ...layers, [key]: !value })}
                />
                {key}
                <small>DEMO</small>
              </label>
            ))}
          </div>
        )}
        {!isDemo && (
          <div className="geo-empty-note">
            <Navigation size={18} />
            <div>
              <strong>No operational layers loaded</strong>
              <span>No aircraft positions or mission routes loaded.</span>
            </div>
          </div>
        )}
      </div>
      <div className="geo-status">
        <span>
          <i className="dot grey" />
          {mapStatus}
        </span>
        <span>WGS 84 · reference map</span>
      </div>
      {isDemo && (
        <>
          <div className="geo-route-strip">
            <span>DEMO ROUTES</span>
            {missions.map((m) => (
              <button
                key={m.id}
                className={selected === m.id ? "selected" : ""}
                onClick={() => setSelected(m.id)}
              >
                {m.id}
                <i
                  className={`dot ${missionStatus(s, m) === "CONFLICT" ? "red" : "green"}`}
                />
              </button>
            ))}
          </div>
          {mission && (
            <div className="geo-mission-summary">
              <div>
                <span>SELECTED MISSION</span>
                <strong>
                  {mission.id} <small>{mission.name}</small>
                </strong>
              </div>
              <div>
                <span>AIRCRAFT / CREW</span>
                <strong>
                  {shortId(mission.aircraftId)}{" "}
                  <small>{mission.crewId || "Unassigned"}</small>
                </strong>
              </div>
              <div>
                <span>ETA / PAYLOAD</span>
                <strong>
                  {time(mission.start + mission.duration)} IST{" "}
                  <small>{mission.payloadKg / 1000} t</small>
                </strong>
              </div>
              <Badge status={missionStatus(s, mission)} />
              {onMission && (
                <button
                  className="icon-btn"
                  aria-label="Open selected mission schedule"
                  onClick={() => onMission(mission.id)}
                >
                  <ArrowUpRight size={18} />
                </button>
              )}
            </div>
          )}
          {!compact && mission && (
            <div className="map-details">
              <Panel title="Selected route">
                <div className="detail-grid">
                  {[
                    [
                      "Origin",
                      s.locations.find((l) => l.id === mission.origin)?.name,
                    ],
                    [
                      "Destination",
                      s.locations.find((l) => l.id === mission.destination)
                        ?.name,
                    ],
                    ["Priority", `P${mission.priority}`],
                    [
                      "Fuel requirement",
                      `${mission.fuelLitres.toLocaleString()} L`,
                    ],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
                {violations(s, mission).map((v) => (
                  <p className="error-line" key={v}>
                    {v}
                  </p>
                ))}
              </Panel>
              <Panel title="Demo weather & restrictions">
                <p>
                  {wx?.condition || "Weather unavailable"} · Visibility{" "}
                  {wx?.visibilityKm ?? "—"} km · Wind {wx?.windKts ?? "—"} kt
                </p>
                <p className="muted">
                  {s.restrictions
                    .filter(
                      (r) =>
                        r.active &&
                        r.origin === mission.origin &&
                        r.destination === mission.destination,
                    )
                    .map((r) => r.name)
                    .join(", ") || "No simulated restriction on selected route"}
                </p>
                <div className="provenance">
                  <Badge status="SIMULATED" />
                  <span>
                    {wx?.sourceName} · context only
                    <br />
                    Updated <Stamp value={wx?.updatedAt ?? null} />
                  </span>
                </div>
              </Panel>
            </div>
          )}
        </>
      )}
    </div>
  );
}
