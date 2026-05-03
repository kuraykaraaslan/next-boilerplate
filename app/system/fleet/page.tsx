'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTruck, faLocationDot, faGauge, faBatteryThreeQuarters,
  faSearch, faBell, faUser, faFilter, faMapLocationDot,
  faCircleCheck, faClock, faCircleXmark, faChevronRight,
  faRoute, faGasPump, faThermometerHalf, faArrowTrendUp,
  faSatellite, faWifi, faEllipsisVertical, faRefresh,
} from '@fortawesome/free-solid-svg-icons';

type VehicleStatus = 'active' | 'parked' | 'offline';

interface Vehicle {
  id: string;
  plate: string;
  driver: string;
  model: string;
  status: VehicleStatus;
  speed: number;
  fuel: number;
  location: string;
  lat: number;
  lng: number;
  lastUpdate: string;
  odometer: number;
  engine: number;
  distance: number;
}

const VEHICLES: Vehicle[] = [
  { id: '1', plate: '34 ABC 001', driver: 'Mehmet Yılmaz', model: 'Ford Transit', status: 'active', speed: 72, fuel: 68, location: 'E-5, Bağcılar/İstanbul', lat: 41.04, lng: 28.86, lastUpdate: '1 dk önce', odometer: 124500, engine: 87, distance: 342 },
  { id: '2', plate: '34 DEF 202', driver: 'Ahmet Kaya', model: 'Mercedes Sprinter', status: 'active', speed: 54, fuel: 42, location: 'TEM, Mahmutbey/İstanbul', lat: 41.06, lng: 28.79, lastUpdate: '2 dk önce', odometer: 89200, engine: 91, distance: 210 },
  { id: '3', plate: '06 GHJ 303', driver: 'Fatma Şahin', model: 'Renault Master', status: 'parked', speed: 0, fuel: 85, location: 'Atatürk OSB, Ankara', lat: 39.93, lng: 32.85, lastUpdate: '8 dk önce', odometer: 56800, engine: 72, distance: 0 },
  { id: '4', plate: '35 KLM 404', driver: 'Ali Demir', model: 'Iveco Daily', status: 'parked', speed: 0, fuel: 31, location: 'Alsancak Liman, İzmir', lat: 38.43, lng: 27.14, lastUpdate: '15 dk önce', odometer: 201000, engine: 65, distance: 0 },
  { id: '5', plate: '16 NOP 505', driver: 'Ayşe Çelik', model: 'VW Crafter', status: 'active', speed: 89, fuel: 57, location: 'Yenişehir, Bursa', lat: 40.20, lng: 29.05, lastUpdate: '1 dk önce', odometer: 77300, engine: 84, distance: 453 },
  { id: '6', plate: '01 RST 606', driver: 'Hasan Arslan', model: 'Ford Transit', status: 'offline', speed: 0, fuel: 12, location: 'Son konum: Adana OTG', lat: 37.00, lng: 35.32, lastUpdate: '3 saat önce', odometer: 165400, engine: 0, distance: 0 },
  { id: '7', plate: '42 UVW 707', driver: 'Zeynep Türk', model: 'Peugeot Boxer', status: 'active', speed: 61, fuel: 74, location: 'D-715, Konya', lat: 37.87, lng: 32.49, lastUpdate: '2 dk önce', odometer: 44100, engine: 78, distance: 189 },
  { id: '8', plate: '07 XYZ 808', driver: 'Emre Güneş', model: 'Mercedes Sprinter', status: 'parked', speed: 0, fuel: 95, location: 'OSB 2. Bölge, Antalya', lat: 36.89, lng: 30.70, lastUpdate: '22 dk önce', odometer: 33900, engine: 69, distance: 0 },
];

const STATUS_CONFIG: Record<VehicleStatus, { label: string; color: string; icon: typeof faCircleCheck }> = {
  active:  { label: 'Seyahatte', color: 'text-success', icon: faCircleCheck },
  parked:  { label: 'Park Halinde', color: 'text-warning', icon: faClock },
  offline: { label: 'Çevrimdışı', color: 'text-error', icon: faCircleXmark },
};

const MAP_PINS: Record<VehicleStatus, string> = {
  active:  'bg-success',
  parked:  'bg-warning',
  offline: 'bg-error',
};

export default function FleetPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | 'all'>('all');
  const [selected, setSelected] = useState<Vehicle | null>(VEHICLES[0]);

  const filtered = VEHICLES.filter(v => {
    const matchSearch = v.plate.toLowerCase().includes(search.toLowerCase()) ||
      v.driver.toLowerCase().includes(search.toLowerCase()) ||
      v.model.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || v.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    total: VEHICLES.length,
    active: VEHICLES.filter(v => v.status === 'active').length,
    parked: VEHICLES.filter(v => v.status === 'parked').length,
    offline: VEHICLES.filter(v => v.status === 'offline').length,
  };

  return (
    <div className="flex flex-col h-screen bg-surface-base text-text-primary">

      {/* Topbar */}
      <header className="flex items-center justify-between px-6 py-3 bg-surface-raised border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <FontAwesomeIcon icon={faMapLocationDot} className="text-primary text-xl" />
          <span className="font-semibold text-lg tracking-tight">FleetTrack</span>
          <span className="badge badge-sm bg-primary text-primary-fg border-0 ml-1">CANLI</span>
        </div>
        <div className="flex items-center gap-4 text-text-secondary">
          <div className="flex items-center gap-1.5 text-sm">
            <FontAwesomeIcon icon={faSatellite} className="text-success text-xs" />
            <span>GPS Bağlı</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <FontAwesomeIcon icon={faWifi} className="text-success text-xs" />
            <span>Çevrimiçi</span>
          </div>
          <button className="btn btn-ghost btn-sm btn-circle">
            <FontAwesomeIcon icon={faBell} />
          </button>
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="avatar placeholder">
              <div className="w-8 rounded-full bg-primary text-primary-fg text-xs flex items-center justify-center">
                <FontAwesomeIcon icon={faUser} />
              </div>
            </div>
            <span className="text-sm font-medium hidden lg:block">Admin</span>
          </div>
        </div>
      </header>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-0 border-b border-border shrink-0">
        {[
          { label: 'Toplam Araç', value: counts.total, icon: faTruck, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Seyahatte', value: counts.active, icon: faCircleCheck, color: 'text-success', bg: 'bg-success-subtle' },
          { label: 'Park Halinde', value: counts.parked, icon: faClock, color: 'text-warning', bg: 'bg-warning-subtle' },
          { label: 'Çevrimdışı', value: counts.offline, icon: faCircleXmark, color: 'text-error', bg: 'bg-error-subtle' },
        ].map((stat, i) => (
          <div key={i} className="flex items-center gap-3 px-6 py-3 border-r border-border last:border-r-0 bg-surface-raised">
            <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center shrink-0`}>
              <FontAwesomeIcon icon={stat.icon} className={`${stat.color} text-base`} />
            </div>
            <div>
              <p className="text-2xl font-bold leading-none">{stat.value}</p>
              <p className="text-xs text-text-secondary mt-0.5">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">

        {/* Vehicle List Sidebar */}
        <aside className="w-80 flex flex-col border-r border-border bg-surface-raised shrink-0">
          {/* Search & Filter */}
          <div className="p-3 space-y-2 border-b border-border">
            <div className="relative">
              <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm" />
              <input
                type="text"
                placeholder="Plaka, sürücü veya model ara..."
                className="input input-sm input-bordered w-full pl-8 bg-surface-base border-border text-sm"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-1.5">
              {(['all', 'active', 'parked', 'offline'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`btn btn-xs flex-1 border-0 ${statusFilter === s
                    ? s === 'all' ? 'bg-primary text-primary-fg'
                      : s === 'active' ? 'bg-success text-success-fg'
                        : s === 'parked' ? 'bg-warning text-warning-fg'
                          : 'bg-error text-error-fg'
                    : 'bg-surface-overlay text-text-secondary'}`}
                >
                  {s === 'all' ? 'Tümü' : s === 'active' ? 'Seyahat' : s === 'parked' ? 'Park' : 'Offline'}
                </button>
              ))}
            </div>
          </div>

          {/* Vehicle Items */}
          <div className="flex-1 overflow-y-auto">
            {filtered.map(vehicle => {
              const cfg = STATUS_CONFIG[vehicle.status];
              const isSelected = selected?.id === vehicle.id;
              return (
                <button
                  key={vehicle.id}
                  onClick={() => setSelected(vehicle)}
                  className={`w-full text-left px-4 py-3 border-b border-border transition-colors ${isSelected
                    ? 'bg-primary/10 border-l-2 border-l-primary'
                    : 'hover:bg-surface-overlay border-l-2 border-l-transparent'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono font-semibold text-sm">{vehicle.plate}</span>
                        <span className={`text-xs flex items-center gap-1 ${cfg.color}`}>
                          <FontAwesomeIcon icon={cfg.icon} className="text-xs" />
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-text-secondary truncate">{vehicle.driver} · {vehicle.model}</p>
                      <p className="text-xs text-text-secondary truncate mt-0.5">
                        <FontAwesomeIcon icon={faLocationDot} className="mr-1" />
                        {vehicle.location}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {vehicle.status === 'active' && (
                        <span className="text-xs font-semibold text-success">{vehicle.speed} km/h</span>
                      )}
                      <span className="text-xs text-text-secondary">{vehicle.lastUpdate}</span>
                      <FontAwesomeIcon icon={faChevronRight} className="text-text-secondary text-xs" />
                    </div>
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
                <FontAwesomeIcon icon={faTruck} className="text-3xl mb-3 opacity-30" />
                <p className="text-sm">Araç bulunamadı</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-border text-xs text-text-secondary flex items-center justify-between bg-surface-base">
            <span>{filtered.length} araç gösteriliyor</span>
            <button className="flex items-center gap-1 hover:text-text-primary transition-colors">
              <FontAwesomeIcon icon={faRefresh} className="text-xs" />
              Yenile
            </button>
          </div>
        </aside>

        {/* Map Area */}
        <main className="flex-1 flex flex-col relative overflow-hidden">
          {/* Mock Map */}
          <div className="flex-1 relative bg-slate-100 dark:bg-slate-800 overflow-hidden">
            {/* Grid lines */}
            <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                  <path d="M 60 0 L 0 0 0 60" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-text-secondary" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            {/* Fake roads */}
            <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <path d="M 0 45% Q 30% 40%, 50% 42% T 100% 38%" stroke="#94a3b8" strokeWidth="6" fill="none" strokeLinecap="round" />
              <path d="M 0 45% Q 30% 40%, 50% 42% T 100% 38%" stroke="#e2e8f0" strokeWidth="3" fill="none" strokeLinecap="round" strokeDasharray="8 4" />
              <path d="M 20% 0 Q 22% 30%, 24% 50% T 26% 100%" stroke="#94a3b8" strokeWidth="5" fill="none" strokeLinecap="round" />
              <path d="M 20% 0 Q 22% 30%, 24% 50% T 26% 100%" stroke="#e2e8f0" strokeWidth="2" fill="none" strokeLinecap="round" strokeDasharray="8 4" />
              <path d="M 60% 0 Q 63% 25%, 65% 55% T 68% 100%" stroke="#94a3b8" strokeWidth="4" fill="none" strokeLinecap="round" />
              <path d="M 0 70% Q 40% 68%, 70% 72% T 100% 65%" stroke="#94a3b8" strokeWidth="3" fill="none" strokeLinecap="round" />
              <path d="M 0 20% Q 50% 18%, 80% 25% T 100% 22%" stroke="#b0bec5" strokeWidth="3" fill="none" strokeLinecap="round" />
            </svg>

            {/* Vehicle pins on map */}
            {VEHICLES.map((v, i) => {
              const positions = [
                { top: '42%', left: '24%' }, { top: '38%', left: '45%' },
                { top: '55%', left: '62%' }, { top: '68%', left: '78%' },
                { top: '30%', left: '15%' }, { top: '72%', left: '38%' },
                { top: '25%', left: '70%' }, { top: '60%', left: '52%' },
              ];
              const pos = positions[i] || { top: '50%', left: '50%' };
              const isSelected = selected?.id === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => setSelected(v)}
                  style={{ top: pos.top, left: pos.left }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 group z-10"
                >
                  <div className={`relative flex items-center justify-center w-8 h-8 rounded-full border-2 border-white shadow-lg transition-transform ${isSelected ? 'scale-125' : 'hover:scale-110'} ${MAP_PINS[v.status]}`}>
                    <FontAwesomeIcon icon={faTruck} className="text-white text-xs" />
                    {v.status === 'active' && (
                      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success border border-white animate-ping" />
                    )}
                  </div>
                  <div className={`absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-surface-raised border border-border rounded text-xs font-mono whitespace-nowrap shadow ${isSelected ? 'block' : 'hidden group-hover:block'}`}>
                    {v.plate}
                  </div>
                </button>
              );
            })}

            {/* Map controls */}
            <div className="absolute top-4 right-4 flex flex-col gap-1">
              {['+', '−'].map((c, i) => (
                <button key={i} className="btn btn-sm btn-square bg-surface-raised border-border shadow text-text-primary hover:bg-surface-overlay text-base font-bold">
                  {c}
                </button>
              ))}
            </div>

            {/* Map legend */}
            <div className="absolute bottom-4 left-4 bg-surface-raised border border-border rounded-lg p-3 shadow text-xs space-y-1.5">
              {(['active', 'parked', 'offline'] as VehicleStatus[]).map(s => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${MAP_PINS[s]}`} />
                  <span className="text-text-secondary">{STATUS_CONFIG[s].label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Selected Vehicle Detail Panel */}
          {selected && (
            <div className="shrink-0 border-t border-border bg-surface-raised">
              <div className="flex items-center justify-between px-5 py-2.5 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FontAwesomeIcon icon={faTruck} className="text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold">{selected.plate}</span>
                      <span className={`text-xs flex items-center gap-1 ${STATUS_CONFIG[selected.status].color}`}>
                        <FontAwesomeIcon icon={STATUS_CONFIG[selected.status].icon} className="text-xs" />
                        {STATUS_CONFIG[selected.status].label}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary">{selected.driver} · {selected.model}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="btn btn-xs bg-primary text-primary-fg border-0 hover:bg-primary-hover gap-1.5">
                    <FontAwesomeIcon icon={faRoute} />
                    Rota
                  </button>
                  <button className="btn btn-xs btn-outline border-border text-text-secondary gap-1.5">
                    <FontAwesomeIcon icon={faFilter} />
                    Rapor
                  </button>
                  <button className="btn btn-xs btn-ghost text-text-secondary">
                    <FontAwesomeIcon icon={faEllipsisVertical} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-6 divide-x divide-border px-0">
                {[
                  { icon: faGauge, label: 'Hız', value: `${selected.speed} km/h`, color: selected.speed > 80 ? 'text-warning' : 'text-text-primary' },
                  { icon: faGasPump, label: 'Yakıt', value: `%${selected.fuel}`, color: selected.fuel < 20 ? 'text-error' : 'text-text-primary' },
                  { icon: faThermometerHalf, label: 'Motor', value: `${selected.engine}°C`, color: selected.engine > 95 ? 'text-error' : 'text-text-primary' },
                  { icon: faArrowTrendUp, label: "Günlük KM", value: `${selected.distance} km`, color: 'text-text-primary' },
                  { icon: faRoute, label: 'Kilometre', value: `${selected.odometer.toLocaleString('tr')} km`, color: 'text-text-primary' },
                  { icon: faLocationDot, label: 'Konum', value: selected.location, color: 'text-text-primary' },
                ].map((stat, i) => (
                  <div key={i} className="flex flex-col items-center justify-center py-3 px-2 gap-0.5 text-center min-w-0">
                    <FontAwesomeIcon icon={stat.icon} className="text-text-secondary text-sm mb-0.5" />
                    <span className={`text-sm font-semibold truncate w-full ${stat.color}`}>{stat.value}</span>
                    <span className="text-xs text-text-secondary">{stat.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
