'use client';
import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { GeoJSONSource } from 'maplibre-gl';
import type { Point, FeatureCollection } from 'geojson';
import { categories, type Report } from '@/lib/categories';
import { inThailandView, thailandMaxBounds } from '@/lib/thailand-bounds';
import { LocateFixed } from 'lucide-react';
import { toast } from 'sonner';
export function ParanormalMap({
  reports = [],
  onSelect,
  onPick,
  selected,
  heat = false,
  center,
}: {
  reports?: Report[];
  onSelect?: (r: Report) => void;
  onPick?: (lat: number, lng: number) => void;
  selected?: { latitude: number; longitude: number };
  heat?: boolean;
  center?: [number, number];
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const marker = useRef<maplibregl.Marker | null>(null);
  const [ready, setReady] = useState(false);
  const [renderedMarkers, setRenderedMarkers] = useState(0);
  const [error, setError] = useState('');
  const refs = useRef({ reports, onSelect, onPick });
  const focusLongitude = center?.[0];
  const focusLatitude = center?.[1];
  useEffect(() => {
    refs.current = { reports, onSelect, onPick };
  }, [reports, onSelect, onPick]);
  useEffect(() => {
    if (!container.current) return;
    let m: maplibregl.Map;
    try {
      maplibregl.setWorkerUrl('/vendor/maplibre/maplibre-gl-worker.mjs');
      const style =
        process.env.NEXT_PUBLIC_MAP_STYLE_URL ||
        (process.env.NEXT_PUBLIC_MAPTILER_API_KEY
          ? `https://api.maptiler.com/maps/dataviz-v4-dark/style.json?key=${process.env.NEXT_PUBLIC_MAPTILER_API_KEY}`
          : '/map-style.json');
      m = new maplibregl.Map({
        container: container.current,
        style,
        center: center || [100.5, 13.7],
        zoom: center ? 11 : 5.3,
        maxBounds: thailandMaxBounds,
        renderWorldCopies: false,
        attributionControl: { compact: true },
      });
      map.current = m;
      m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
      m.on('error', () =>
        setError('แผนที่พื้นหลังเชื่อมต่อไม่ได้ ลองตรวจอินเทอร์เน็ตหรือผู้ให้บริการแผนที่'),
      );
      m.on('load', async () => {
        setError('');
        for (const [id, , , symbol, color] of categories) {
          const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="60"><path d="M24 56C20 45 5 38 5 24a19 19 0 1 1 38 0c0 14-15 21-19 32" fill="#10131A" stroke="${color}" stroke-width="2"/><text x="24" y="32" font-size="23" text-anchor="middle" fill="${color}">${symbol}</text></svg>`;
          const bitmap = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
          });
          if (map.current !== m) return;
          m.addImage('pin-' + id, bitmap, { pixelRatio: 2 });
        }
        m.addSource('reports', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
          cluster: true,
          clusterRadius: 45,
          clusterMaxZoom: 13,
        });
        m.addSource('density', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
        m.addLayer({
          id: 'heat',
          type: 'heatmap',
          source: 'density',
          paint: {
            'heatmap-weight': 1,
            'heatmap-intensity': 1.7,
            'heatmap-radius': 35,
            'heatmap-opacity': 0.7,
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0,
              'rgba(0,0,0,0)',
              0.2,
              '#9673E6',
              0.55,
              '#9DFFB0',
              1,
              '#D64B65',
            ],
          },
          layout: { visibility: 'none' },
        });
        m.addLayer({
          id: 'clusters',
          type: 'circle',
          source: 'reports',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': '#171B23',
            'circle-stroke-color': '#9DFFB0',
            'circle-stroke-width': 1.5,
            'circle-radius': ['step', ['get', 'point_count'], 20, 20, 25, 100, 31],
          },
        });
        m.addLayer({
          id: 'cluster-label',
          type: 'symbol',
          source: 'reports',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': ['get', 'point_count_abbreviated'],
            'text-size': 13,
            'text-font': ['Noto Sans Regular'],
          },
          paint: { 'text-color': '#9DFFB0' },
        });
        m.addLayer({
          id: 'pins',
          type: 'symbol',
          source: 'reports',
          filter: ['!', ['has', 'point_count']],
          layout: {
            'icon-image': ['concat', 'pin-', ['get', 'category']],
            'icon-allow-overlap': true,
            'icon-anchor': 'bottom',
            'icon-size': 1.2,
          },
        });
        m.on('click', 'clusters', async (e) => {
          const feature = e.features?.[0];
          if (!feature) return;
          const source = m.getSource('reports') as GeoJSONSource;
          const zoom = await source.getClusterExpansionZoom(feature.properties!.cluster_id);
          m.easeTo({ center: (feature.geometry as Point).coordinates as [number, number], zoom });
        });
        m.on('click', 'pins', (e) => {
          const id = e.features?.[0]?.properties?.id;
          const r = refs.current.reports.find((r) => r.id === id);
          if (r) {
            refs.current.onSelect?.(r);
            m.easeTo({ center: [r.longitude, r.latitude], zoom: Math.max(m.getZoom(), 11) });
          }
        });
        const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: true });
        m.on('mouseenter', 'pins', (e) => {
          m.getCanvas().style.cursor = 'pointer';
          const f = e.features?.[0];
          if (!f) return;
          const r = refs.current.reports.find((r) => r.id === f.properties?.id);
          if (!r) return;
          const label = document.createElement('span');
          label.textContent = r.title;
          popup.setLngLat([r.longitude, r.latitude]).setDOMContent(label).addTo(m);
        });
        m.on('mouseleave', 'pins', () => {
          m.getCanvas().style.cursor = '';
          popup.remove();
        });
        m.on('click', (e) => {
          if (!refs.current.onPick) return;
          refs.current.onPick(e.lngLat.lat, e.lngLat.lng);
        });
        m.on('idle', () => {
          if (map.current === m && m.getLayer('pins')) {
            setRenderedMarkers(m.queryRenderedFeatures({ layers: ['pins', 'clusters'] }).length);
          }
        });
        setReady(true);
      });
    } catch {
      queueMicrotask(() =>
        setError('อุปกรณ์นี้เปิด WebGL ไม่ได้ คุณยังอ่านรายการหรือกรอกพิกัดด้วยตัวเลขได้'),
      );
    }
    return () => {
      marker.current?.remove();
      map.current?.remove();
      map.current = null;
    };
    // Map lifetime is tied to its container, data changes are applied below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!ready || !map.current) return;
    const data: FeatureCollection = {
      type: 'FeatureCollection',
      features: reports.map((r) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [r.longitude, r.latitude] },
        properties: { id: r.id, category: r.category, title: r.title },
      })),
    };
    (map.current.getSource('reports') as GeoJSONSource)?.setData(data);
    (map.current.getSource('density') as GeoJSONSource)?.setData(data);
    map.current.setLayoutProperty('heat', 'visibility', heat ? 'visible' : 'none');
  }, [ready, reports, heat]);
  useEffect(() => {
    if (!ready || focusLongitude === undefined || focusLatitude === undefined) return;
    map.current?.easeTo({ center: [focusLongitude, focusLatitude], zoom: 11 });
  }, [ready, focusLongitude, focusLatitude]);
  useEffect(() => {
    if (!ready || !map.current) return;
    if (!selected) {
      marker.current?.remove();
      marker.current = null;
      return;
    }
    if (!marker.current) {
      marker.current = new maplibregl.Marker({ color: '#9DFFB0', draggable: !!onPick })
        .setLngLat([selected.longitude, selected.latitude])
        .addTo(map.current);
      marker.current.on('dragend', () => {
        const p = marker.current!.getLngLat();
        refs.current.onPick?.(p.lat, p.lng);
      });
    }
    marker.current.setLngLat([selected.longitude, selected.latitude]);
    map.current.easeTo({
      center: [selected.longitude, selected.latitude],
      zoom: Math.max(map.current.getZoom(), 10),
    });
  }, [selected, ready, onPick]);
  function locate() {
    if (!navigator.geolocation) {
      toast.error('อุปกรณ์ไม่รองรับ GPS');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        if (!inThailandView(p.coords.latitude, p.coords.longitude)) {
          toast.error('ตอนนี้แผนที่รองรับเฉพาะประเทศไทย');
          return;
        }
        map.current?.easeTo({ center: [p.coords.longitude, p.coords.latitude], zoom: 12 });
        refs.current.onPick?.(p.coords.latitude, p.coords.longitude);
      },
      () => toast.error('ไม่ได้รับสิทธิ์เข้าถึงตำแหน่ง คุณเลือกบนแผนที่ได้'),
    );
  }
  return (
    <div
      className="map-shell"
      data-state={ready ? 'ready' : 'loading'}
      data-rendered-markers={renderedMarkers}
    >
      <span className="sr-only" role="status">
        ในมุมมองนี้มี {renderedMarkers} หมุดหรือกลุ่มเรื่องเล่า
      </span>
      <div
        ref={container}
        className="map-canvas"
        data-testid="paranormal-map"
        aria-label="แผนที่รายงานชุมชน"
      />
      <button type="button" onClick={locate} className="map-locate" aria-label="ใช้ตำแหน่งปัจจุบัน">
        <LocateFixed size={19} />
      </button>
      {error && (
        <p className="map-error" role="status">
          {error}
        </p>
      )}
    </div>
  );
}
