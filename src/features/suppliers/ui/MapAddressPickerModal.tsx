import { useEffect, useRef, useState } from "react";
import { Card, Divider, Input, Modal, Typography, message } from "antd";
import { SearchOutlined } from "@ant-design/icons";

declare global {
  interface Window {
    ymaps?: any;
  }
}

type Props = {
  open: boolean;
  onCancel: () => void;
  onSelect: (address: string) => void;
};

const { Text } = Typography;

export const MapAddressPickerModal = ({ open, onCancel, onSelect }: Props) => {
  const yandexApiKey = import.meta.env.VITE_YANDEX_MAPS_API_KEY || "";
  const KG_BOUNDS = {
    south: 39.17,
    west: 69.22,
    north: 43.27,
    east: 80.29,
  };
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const [pickedAddress, setPickedAddress] = useState("");
  const [pickedPoint, setPickedPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<
    { id: string; label: string; lat: number; lng: number }[]
  >([]);

  const loadYandexMaps = async () => {
    if (window.ymaps?.Map) return window.ymaps;

    await new Promise<void>((resolve, reject) => {
      const existing = document.getElementById("yandex-maps-js") as HTMLScriptElement | null;
      if (existing && window.ymaps) {
        resolve();
        return;
      }
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("Yandex Maps load error")), {
          once: true,
        });
        return;
      }
      const script = document.createElement("script");
      script.id = "yandex-maps-js";
      script.src = `https://api-maps.yandex.ru/2.1/?lang=ru_RU${yandexApiKey ? `&apikey=${yandexApiKey}` : ""}`;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Yandex Maps load error"));
      document.body.appendChild(script);
    });

    await new Promise<void>((resolve) => {
      window.ymaps.ready(() => resolve());
    });

    return window.ymaps;
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    setLoadingAddress(true);
    try {
      const ymaps = await loadYandexMaps();
      const result = await ymaps.geocode([lat, lng], { results: 1 });
      const firstGeoObject = result.geoObjects.get(0);
      const address =
        firstGeoObject?.getAddressLine?.() ||
        firstGeoObject?.properties?.get("text") ||
        `Координаты: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      setPickedAddress(address);
    } catch {
      setPickedAddress(`Координаты: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      message.warning("Не удалось получить адрес, сохранены координаты");
    } finally {
      setLoadingAddress(false);
    }
  };

  const isInsideKyrgyzstan = (lat: number, lng: number) =>
    lat >= KG_BOUNDS.south &&
    lat <= KG_BOUNDS.north &&
    lng >= KG_BOUNDS.west &&
    lng <= KG_BOUNDS.east;

  const applyPoint = (lat: number, lng: number, label?: string) => {
    if (!isInsideKyrgyzstan(lat, lng)) {
      message.warning("Можно выбрать адрес только внутри Кыргызстана");
      return;
    }
    setPickedPoint({ lat, lng });
    if (mapRef.current) {
      const ymaps = window.ymaps;
      if (!markerRef.current && ymaps) {
        markerRef.current = new ymaps.Placemark([lat, lng], {}, { preset: "islands#redDotIcon" });
        mapRef.current.geoObjects.add(markerRef.current);
      } else if (markerRef.current) {
        markerRef.current.geometry.setCoordinates([lat, lng]);
      }
      mapRef.current.setCenter([lat, lng], 16, { checkZoomRange: true, duration: 200 });
    }
    if (label) setPickedAddress(label);
  };

  useEffect(() => {
    if (!open) return;
    const query = searchQuery.trim();
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    const controller = new AbortController();
    const t = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const ymaps = await loadYandexMaps();
        if (controller.signal.aborted) return;
        const result = await ymaps.geocode(query, {
          boundedBy: [
            [KG_BOUNDS.south, KG_BOUNDS.west],
            [KG_BOUNDS.north, KG_BOUNDS.east],
          ],
          strictBounds: true,
          results: 8,
        });
        const mapped: { id: string; label: string; lat: number; lng: number }[] = [];
        result.geoObjects.each((geoObj: any, idx: number) => {
          const coords = geoObj.geometry?.getCoordinates?.();
          if (!coords || coords.length < 2) return;
          const lat = Number(coords[0]);
          const lng = Number(coords[1]);
          if (!isInsideKyrgyzstan(lat, lng)) return;
          mapped.push({
            id: `${geoObj.properties?.get?.("id") || idx}`,
            label: geoObj.getAddressLine?.() || geoObj.properties?.get?.("text") || "Адрес",
            lat,
            lng,
          });
        });
        setSearchResults(mapped);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 350);

    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [searchQuery, open]);

  useEffect(() => {
    if (!open || !mapContainerRef.current) return;
    let active = true;

    const init = async () => {
      try {
        const ymaps = await loadYandexMaps();
        if (!active || !mapContainerRef.current || mapRef.current) return;

        const map = new ymaps.Map(
          mapContainerRef.current,
          {
            center: [41.2, 74.7],
            zoom: 7,
            controls: ["zoomControl", "searchControl", "geolocationControl"],
          },
          {
            restrictMapArea: [
              [KG_BOUNDS.south, KG_BOUNDS.west],
              [KG_BOUNDS.north, KG_BOUNDS.east],
            ],
            suppressMapOpenBlock: true,
          },
        );

        const searchControl = map.controls.get("searchControl");
        if (searchControl) {
          searchControl.options.set({
            noPlacemark: true,
            strictBounds: true,
            boundedBy: [
              [KG_BOUNDS.south, KG_BOUNDS.west],
              [KG_BOUNDS.north, KG_BOUNDS.east],
            ],
          });
        }

        map.events.add("click", (e: any) => {
          const coords = e.get("coords") as [number, number];
          const lat = Number(coords[0]);
          const lng = Number(coords[1]);
          applyPoint(lat, lng);
          void reverseGeocode(lat, lng);
        });

        mapRef.current = map;
      } catch {
        message.error("Не удалось загрузить Яндекс.Карту");
      }
    };

    void init();

    return () => {
      active = false;
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
        markerRef.current = null;
      }
      setPickedAddress("");
      setPickedPoint(null);
      setSearchQuery("");
      setSearchResults([]);
    };
  }, [open]);

  return (
    <Modal
      open={open}
      title="Выбор адреса на карте"
      onCancel={onCancel}
      onOk={() => {
        if (!pickedAddress) {
          message.warning("Сначала кликните по карте");
          return;
        }
        onSelect(pickedAddress);
      }}
      okText="Выбрать адрес"
      cancelText="Отмена"
      width={860}
    >
      <div className="space-y-3">
        <Text type="secondary">Кликните по карте, адрес подставится автоматически.</Text>
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Поиск адреса (мин. 3 символа)"
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
                  applyPoint(item.lat, item.lng, item.label);
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
