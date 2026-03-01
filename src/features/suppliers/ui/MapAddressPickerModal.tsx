import { useEffect, useRef, useState } from "react";
import { Card, Divider, Input, Modal, Select, Typography, message } from "antd";
import { SearchOutlined } from "@ant-design/icons";

type Props = {
  open: boolean;
  onCancel: () => void;
  onSelect: (address: string) => void;
};

type RegionKey = "cis" | "kg";

type RegionPreset = {
  label: string;
  center: [number, number];
  zoom: number;
  south: number;
  west: number;
  north: number;
  east: number;
};

type SearchResult = { id: string; label: string; lat: number; lng: number };

type LeafletMap = {
  setView: (center: [number, number], zoom: number, options?: { animate?: boolean }) => void;
  remove: () => void;
  on: (event: "click", handler: (event: { latlng: { lat: number; lng: number } }) => void) => void;
};

type LeafletMarker = {
  setLatLng: (latlng: [number, number]) => void;
  remove: () => void;
};

type LeafletLib = {
  map: (el: HTMLElement, options?: unknown) => LeafletMap;
  tileLayer: (url: string, options?: unknown) => { addTo: (map: LeafletMap) => void };
  marker: (latlng: [number, number]) => { addTo: (map: LeafletMap) => LeafletMarker };
};

declare global {
  interface Window {
    L?: LeafletLib;
  }
}

const { Text } = Typography;

const REGION_PRESETS: Record<RegionKey, RegionPreset> = {
  cis: {
    label: "СНГ",
    center: [51.2, 74.7],
    zoom: 4,
    south: 35.0,
    west: 19.0,
    north: 82.0,
    east: 179.9,
  },
  kg: {
    label: "Кыргызстан",
    center: [41.2, 74.7],
    zoom: 7,
    south: 39.17,
    west: 69.22,
    north: 43.27,
    east: 80.29,
  },
};

const LEAFLET_JS_ID = "leaflet-js";
const LEAFLET_CSS_ID = "leaflet-css";

const loadLeaflet = async (): Promise<LeafletLib> => {
  if (window.L?.map) return window.L;

  if (!document.getElementById(LEAFLET_CSS_ID)) {
    const link = document.createElement("link");
    link.id = LEAFLET_CSS_ID;
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
  }

  await new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(LEAFLET_JS_ID) as HTMLScriptElement | null;
    if (existing && window.L) {
      resolve();
      return;
    }
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Leaflet load error")), {
        once: true,
      });
      return;
    }
    const script = document.createElement("script");
    script.id = LEAFLET_JS_ID;
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Leaflet load error"));
    document.body.appendChild(script);
  });

  if (!window.L) throw new Error("Leaflet not available");
  return window.L;
};

const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=ru`,
  );
  if (!response.ok) throw new Error("Reverse geocode failed");
  const data = await response.json();
  return data?.display_name || `Координаты: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
};

const searchAddress = async (query: string, region: RegionPreset): Promise<SearchResult[]> => {
  const viewbox = `${region.west},${region.north},${region.east},${region.south}`;
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&limit=8&accept-language=ru&bounded=1&viewbox=${encodeURIComponent(viewbox)}`,
  );
  if (!response.ok) throw new Error("Search failed");
  const data = (await response.json()) as Array<{
    place_id: number;
    display_name: string;
    lat: string;
    lon: string;
  }>;
  return data.map((item) => ({
    id: String(item.place_id),
    label: item.display_name,
    lat: Number(item.lat),
    lng: Number(item.lon),
  }));
};

export const MapAddressPickerModal = ({ open, onCancel, onSelect }: Props) => {
  const [region, setRegion] = useState<RegionKey>("cis");
  const currentRegion = REGION_PRESETS[region];
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const [pickedAddress, setPickedAddress] = useState("");
  const [pickedPoint, setPickedPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  const isInsideRegion = (lat: number, lng: number) =>
    lat >= currentRegion.south &&
    lat <= currentRegion.north &&
    lng >= currentRegion.west &&
    lng <= currentRegion.east;

  const setMarker = async (lat: number, lng: number, explicitAddress?: string) => {
    if (!isInsideRegion(lat, lng)) {
      message.warning(`Можно выбрать адрес только внутри региона: ${currentRegion.label}`);
      return;
    }
    setPickedPoint({ lat, lng });

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else if (window.L && mapRef.current) {
      markerRef.current = window.L.marker([lat, lng]).addTo(mapRef.current);
    }

    if (mapRef.current) {
      mapRef.current.setView([lat, lng], 16, { animate: true });
    }

    if (explicitAddress) {
      setPickedAddress(explicitAddress);
      onSelect(explicitAddress);
      return;
    }

    setLoadingAddress(true);
    try {
      const address = await reverseGeocode(lat, lng);
      setPickedAddress(address);
      onSelect(address);
    } catch {
      const fallback = `Координаты: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      setPickedAddress(fallback);
      onSelect(fallback);
      message.warning("Не удалось получить адрес, сохранены координаты");
    } finally {
      setLoadingAddress(false);
    }
  };

  useEffect(() => {
    if (!open || !mapContainerRef.current) return;
    let active = true;

    const init = async () => {
      try {
        const L = await loadLeaflet();
        if (!active || !mapContainerRef.current || mapRef.current) return;

        const map = L.map(mapContainerRef.current, {
          zoomControl: true,
        });
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: "&copy; OpenStreetMap contributors",
        }).addTo(map);
        map.setView(currentRegion.center, currentRegion.zoom);

        map.on("click", (e) => {
          void setMarker(e.latlng.lat, e.latlng.lng);
        });
        mapRef.current = map;
      } catch {
        message.error("Не удалось загрузить карту");
      }
    };

    void init();

    return () => {
      active = false;
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      setPickedAddress("");
      setPickedPoint(null);
      setSearchQuery("");
      setSearchResults([]);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !mapRef.current) return;
    mapRef.current.setView(currentRegion.center, currentRegion.zoom, { animate: true });
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
    setPickedAddress("");
    setPickedPoint(null);
    setSearchResults([]);
  }, [open, currentRegion.center, currentRegion.zoom]);

  useEffect(() => {
    if (!open) return;
    const query = searchQuery.trim();
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      setSearchLoading(true);
      try {
        const results = await searchAddress(query, currentRegion);
        const filtered = results.filter((item) => isInsideRegion(item.lat, item.lng));
        setSearchResults(filtered);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [
    searchQuery,
    open,
    currentRegion.label,
    currentRegion.south,
    currentRegion.west,
    currentRegion.north,
    currentRegion.east,
  ]);

  return (
    <Modal
      open={open}
      title="Выбор адреса на карте"
      onCancel={onCancel}
      onOk={() => {
        if (!pickedAddress) {
          message.warning("Сначала кликните по карте");
        }
      }}
      okText="Готово"
      cancelText="Отмена"
      width={860}
    >
      <div className="space-y-3">
        <Text type="secondary">Кликните по карте, адрес подставится автоматически.</Text>
        <Select
          value={region}
          onChange={(value: RegionKey) => setRegion(value)}
          options={Object.entries(REGION_PRESETS).map(([key, value]) => ({
            value: key,
            label: `Регион карты: ${value.label}`,
          }))}
        />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Поиск адреса по региону ${currentRegion.label} (мин. 3 символа)`}
          prefix={<SearchOutlined />}
          allowClear
        />
        {searchLoading ? (
          <div className="text-xs text-gray-500">Поиск...</div>
        ) : searchResults.length > 0 ? (
          <div className="max-h-44 overflow-y-auto rounded border border-gray-200">
            {searchResults.map((item) => (
              <button
                key={item.id}
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0"
                onClick={() => {
                  void setMarker(item.lat, item.lng, item.label);
                  setSearchQuery(item.label);
                  setSearchResults([]);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        ) : null}
        <div ref={mapContainerRef} style={{ width: "100%", height: 420, borderRadius: 12 }} />
        <Card size="small">
          <div className="text-xs text-gray-500 mb-1">Выбранная точка</div>
          <div className="font-semibold">
            {pickedPoint
              ? `${pickedPoint.lat.toFixed(6)}, ${pickedPoint.lng.toFixed(6)}`
              : "Точка не выбрана"}
          </div>
          <Divider style={{ margin: "8px 0" }} />
          <div className="text-xs text-gray-500 mb-1">Адрес</div>
          <div>{loadingAddress ? "Поиск адреса..." : pickedAddress || "Пока пусто"}</div>
        </Card>
      </div>
    </Modal>
  );
};
