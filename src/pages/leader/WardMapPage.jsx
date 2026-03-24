import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Layers, ZoomIn, ZoomOut, RotateCcw, Info, Search, X, ChevronRight, AlertTriangle, TrendingDown, TrendingUp, Users, MapPin, BarChart2, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { DELHI_ZONES, HEATMAP_LAYERS, getZoneColor, ZONE_BY_ID } from '../../data/delhiData';

const WARDS_URL    = 'https://cdn.jsdelivr.net/gh/datameet/Municipal_Spatial_Data@master/Delhi/Delhi_Wards.geojson';
const BOUNDARY_URL = 'https://cdn.jsdelivr.net/gh/datameet/Municipal_Spatial_Data@master/Delhi/Delhi_Boundary.geojson';
const BOUNDS = { minLng: 76.838, maxLng: 77.348, minLat: 28.402, maxLat: 28.884 };
const MONTHS = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

const project = (lng, lat, w, h, pad = 24) => {
  const x = pad + ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * (w - pad * 2);
  const latRad = (lat * Math.PI) / 180;
  const minLatRad = (BOUNDS.minLat * Math.PI) / 180;
  const maxLatRad = (BOUNDS.maxLat * Math.PI) / 180;
  const mercY   = Math.log(Math.tan(Math.PI / 4 + latRad    / 2));
  const mercMin = Math.log(Math.tan(Math.PI / 4 + minLatRad / 2));
  const mercMax = Math.log(Math.tan(Math.PI / 4 + maxLatRad / 2));
  const y = pad + ((mercMax - mercY) / (mercMax - mercMin)) * (h - pad * 2);
  return [x, y];
};

const coordsToPath = (coords, w, h) => {
  const rings = Array.isArray(coords[0][0]) ? coords : [coords];
  return rings.map(ring =>
    ring.map(([lng, lat], i) => {
      const [x, y] = project(lng, lat, w, h);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(' ') + ' Z'
  ).join(' ');
};

const assignZone = (f) => {
  const geom = f.geometry;
  if (!geom) return 'z_central';
  const flat = geom.coordinates.flat(3);
  let sx = 0, sy = 0, cn = 0;
  for (let i = 0; i < flat.length - 1; i += 2) {
    if (typeof flat[i] === 'number') { sx += flat[i]; sy += flat[i + 1]; cn++; }
  }
  const lng = cn > 0 ? sx / cn : 77.1;
  const lat = cn > 0 ? sy / cn : 28.6;
  if (lat > 28.79) return 'z_narela';
  if (lat > 28.72 && lng < 77.09) return 'z_rohini';
  if (lat > 28.72 && lng >= 77.09 && lng < 77.22) return 'z_civil_lines';
  if (lat > 28.72 && lng >= 77.22) return 'z_shahdara_north';
  if (lat > 28.66 && lng < 77.09) return 'z_keshavpuram';
  if (lat > 28.66 && lng >= 77.09 && lng < 77.19) return 'z_city_sp';
  if (lat > 28.66 && lng >= 77.19 && lng < 77.27) return 'z_civil_lines';
  if (lat > 28.66) return 'z_shahdara_south';
  if (lat > 28.60 && lng < 77.09) return 'z_west';
  if (lat > 28.60 && lng >= 77.09 && lng < 77.21) return 'z_central';
  if (lat > 28.60) return 'z_shahdara_south';
  if (lat > 28.54 && lng < 77.06) return 'z_south_west';
  if (lat > 28.54 && lng >= 77.06 && lng < 77.23) return 'z_new_delhi';
  if (lat > 28.54) return 'z_shahdara_south';
  if (lng < 77.06) return 'z_south_west';
  return 'z_south';
};

const wardStats = (num, zid) => {
  const z = ZONE_BY_ID[zid];
  if (!z) return { healthScore: 60, complaints: 50, resolved: 30, pending: 20 };
  const seed = num * 137 + zid.length * 31;
  const v = ((seed % 30) - 15);
  const h = Math.max(15, Math.min(96, z.healthScore + v));
  const c = Math.round((z.totalComplaints / z.totalWards) * (0.65 + (seed % 40) / 100));
  const r = Math.round(c * (h / 100));
  return { healthScore: h, complaints: c, resolved: r, pending: c - r };
};

const sc = s => s >= 75 ? '#2A7A4B' : s >= 55 ? '#2563C4' : s >= 40 ? '#D97706' : '#C0392B';
const sb = s => s >= 75 ? 'var(--green-pale)' : s >= 55 ? 'var(--blue-pale)' : s >= 40 ? 'var(--amber-pale)' : 'var(--red-pale)';
const sl = s => s >= 75 ? 'Healthy' : s >= 55 ? 'Moderate' : s >= 40 ? 'Stressed' : 'Critical';

const ZoneTooltip = ({ zone, x, y, cw, ch }) => {
  if (!zone) return null;
  const W = 280, H = 310;
  let left = x + 18, top = y - 10;
  if (left + W > cw - 10) left = x - W - 18;
  if (top + H > ch - 10) top = ch - H - 10;
  if (top < 10) top = 10;
  const rr = Math.round((zone.resolved / zone.totalComplaints) * 100);
  return (
    <div style={{ position: 'absolute', left, top, width: W, pointerEvents: 'none', zIndex: 900 }}>
      <div style={{ background: 'rgba(8,16,30,0.97)', border: '1px solid rgba(255,255,255,0.13)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.6)', animation: 'tooltipIn 0.15s cubic-bezier(0.34,1.4,0.64,1)' }}>
        <div style={{ height: 3, background: `linear-gradient(90deg, ${sc(zone.healthScore)}, transparent)` }} />
        <div style={{ padding: '14px 16px 12px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'white', fontFamily: 'var(--font-display)', lineHeight: 1.2, marginBottom: 3 }}>{zone.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: sc(zone.healthScore) }} />
              <span style={{ fontSize: 11, color: sc(zone.healthScore), fontWeight: 600 }}>{sl(zone.healthScore)}</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>·</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{zone.totalWards} wards</span>
            </div>
          </div>
          <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '6px 10px', flexShrink: 0 }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: sc(zone.healthScore), fontFamily: 'var(--font-display)', lineHeight: 1 }}>{zone.healthScore}</div>
            <div style={{ fontSize: 8, color: sc(zone.healthScore), fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 1 }}>score</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {[
            { l: 'Resolved', v: `${rr}%`,                     c: rr >= 70 ? '#2A7A4B' : '#D97706' },
            { l: 'Pending',  v: zone.pending.toLocaleString(), c: zone.pending > 600 ? '#C0392B' : '#E8813A' },
            { l: 'Avg Days', v: `${zone.avgResolutionDays}d`,  c: zone.avgResolutionDays > 7 ? '#C0392B' : '#94A3B8' },
          ].map(({ l, v, c }, i) => (
            <div key={l} style={{ padding: '10px 12px', textAlign: 'center', borderRight: i < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: c, fontFamily: 'var(--font-display)' }}>{v}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ padding: '10px 16px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <MapPin size={11} color="rgba(255,255,255,0.4)" />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Top issue:</span>
            <span style={{ fontSize: 11, color: 'white', fontWeight: 600 }}>{zone.topIssue}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <TrendingDown size={11} color="#E8813A" />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>Worst:</span>
              <span style={{ fontSize: 11, color: '#E8813A', fontWeight: 600 }}>{zone.worstDept}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <TrendingUp size={11} color="#2A7A4B" />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>Best:</span>
              <span style={{ fontSize: 11, color: '#2A7A4B', fontWeight: 600 }}>{zone.bestDept}</span>
            </div>
          </div>
        </div>
        <div style={{ padding: '8px 16px', background: 'rgba(37,99,196,0.12)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Click to open zone intelligence</span>
          <ChevronRight size={11} color="rgba(255,255,255,0.3)" />
        </div>
      </div>
    </div>
  );
};

const ZonePanel = ({ zone, wardFeatures, onClose }) => {
  const [tab, setTab] = useState('overview');
  const [selWard, setSelWard] = useState(null);
  const zoneWards = useMemo(() =>
    wardFeatures
      .filter(f => f._zoneId === zone.id)
      .map((f, i) => {
        const num = parseInt(f.properties?.WARD_NO || f.properties?.ward_no || i + 1);
        const s = wardStats(num, zone.id);
        return { ...s, name: f.properties?.WARD_NAME || f.properties?.ward_name || f.properties?.NAME || `Ward ${num}`, num };
      })
      .sort((a, b) => a.healthScore - b.healthScore),
    [wardFeatures, zone.id]
  );
  const trendData = zone.monthlyTrend.map((v, i) => ({ month: MONTHS[i], complaints: v }));
  const resRate = Math.round((zone.resolved / zone.totalComplaints) * 100);
  const TABS = [
    { id: 'overview',    label: 'Overview',    icon: Activity  },
    { id: 'departments', label: 'Departments', icon: BarChart2 },
    { id: 'wards',       label: 'Wards',       icon: MapPin    },
    { id: 'sentiment',   label: 'Sentiment',   icon: Users     },
  ];

  return (
    <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 420, background: 'var(--surface)', borderLeft: '1px solid rgba(13,27,42,0.1)', display: 'flex', flexDirection: 'column', zIndex: 800, boxShadow: '-12px 0 48px rgba(0,0,0,0.18)', animation: 'panelIn 0.22s cubic-bezier(0.34,1.2,0.64,1)' }}>
      <div style={{ background: 'linear-gradient(135deg,#0D1B2A 0%,#1A2F45 100%)', padding: '20px 20px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Zone Intelligence</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'white', lineHeight: 1.15, marginBottom: 3 }}>{zone.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: sc(zone.healthScore) }} />
              <span style={{ fontSize: 12, color: sc(zone.healthScore), fontWeight: 600 }}>{sl(zone.healthScore)}</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>·</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)' }}>{zone.totalWards} wards · {(zone.population / 1000).toFixed(0)}K pop</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 30, fontWeight: 900, color: sc(zone.healthScore), fontFamily: 'var(--font-display)', lineHeight: 1 }}>{zone.healthScore}</div>
              <div style={{ fontSize: 9, color: sc(zone.healthScore), fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>health</div>
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: 6, cursor: 'pointer', color: 'rgba(255,255,255,0.7)', display: 'flex' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            ><X size={15} /></button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 16 }}>
          {[
            { l: 'Total',    v: zone.totalComplaints.toLocaleString(), c: 'white'   },
            { l: 'Resolved', v: `${resRate}%`,                         c: '#2A7A4B' },
            { l: 'Pending',  v: zone.pending.toLocaleString(),         c: zone.pending > 600 ? '#E8813A' : 'white' },
            { l: 'Avg Days', v: `${zone.avgResolutionDays}d`,          c: zone.avgResolutionDays > 7 ? '#C0392B' : '#D97706' },
          ].map(({ l, v, c }) => (
            <div key={l} style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 10, padding: '8px 10px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: c, fontFamily: 'var(--font-display)', lineHeight: 1.1 }}>{v}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => { setTab(id); setSelWard(null); }} style={{ flex: 1, padding: '9px 6px', border: 'none', background: tab === id ? 'rgba(255,255,255,0.12)' : 'transparent', cursor: 'pointer', fontSize: 11, fontWeight: tab === id ? 600 : 400, color: tab === id ? 'white' : 'rgba(255,255,255,0.45)', borderRadius: '8px 8px 0 0', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, borderBottom: tab === id ? '2px solid rgba(255,255,255,0.5)' : '2px solid transparent', transition: '0.15s ease' }}>
              <Icon size={12} />{label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 20, background: 'var(--canvas)' }}>

        {tab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'var(--surface)', borderRadius: 12, padding: '14px 16px', border: 'var(--border)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 12 }}>Complaint Trend — 6 Months</div>
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={trendData} margin={{ top: 4, right: 4, bottom: 0, left: -30 }}>
                  <defs>
                    <linearGradient id="tG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#1A4B8C" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#1A4B8C" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(13,27,42,0.06)" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--ink-light)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--ink-light)' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: 'var(--border)' }} />
                  <Area type="monotone" dataKey="complaints" stroke="#1A4B8C" strokeWidth={2} fill="url(#tG)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ background: 'var(--red-pale)', borderRadius: 12, padding: 14, borderLeft: '3px solid var(--red)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}><TrendingDown size={13} color="var(--red)" /><span style={{ fontSize: 10, color: 'var(--red)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Worst Dept</span></div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{zone.worstDept}</div>
                <div style={{ fontSize: 10, color: 'var(--ink-light)', marginTop: 2 }}>{zone.departments.find(d => d.name === zone.worstDept)?.score || '—'}% score</div>
              </div>
              <div style={{ background: 'var(--green-pale)', borderRadius: 12, padding: 14, borderLeft: '3px solid var(--green)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}><TrendingUp size={13} color="var(--green)" /><span style={{ fontSize: 10, color: 'var(--green)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Best Dept</span></div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{zone.bestDept}</div>
                <div style={{ fontSize: 10, color: 'var(--ink-light)', marginTop: 2 }}>{zone.departments.find(d => d.name === zone.bestDept)?.score || '—'}% score</div>
              </div>
            </div>
            <div style={{ background: 'var(--surface)', borderRadius: 12, padding: '14px 16px', border: 'var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>AI-Detected Clusters</div>
                <span style={{ fontSize: 10, color: 'var(--ink-light)', background: 'var(--canvas-warm)', padding: '1px 8px', borderRadius: 10 }}>auto-grouped</span>
              </div>
              {zone.groupComplaints.map((gc, i) => {
                const c  = gc.status === 'escalated' ? 'var(--red)'      : gc.status === 'progress' ? 'var(--blue)'      : 'var(--amber)';
                const bg = gc.status === 'escalated' ? 'var(--red-pale)' : gc.status === 'progress' ? 'var(--blue-pale)' : 'var(--amber-pale)';
                const label = gc.status === 'escalated' ? 'Escalated' : gc.status === 'progress' ? 'In Progress' : 'Open';
                return (
                  <div key={i} style={{ background: bg, borderRadius: 10, padding: '10px 12px', marginBottom: 8, borderLeft: `3px solid ${c}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--ink)', flex: 1, lineHeight: 1.5 }}>{gc.issue}</span>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: c }}>{gc.count}</div>
                        <div style={{ fontSize: 9, color: c, fontWeight: 600 }}>{label}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'departments' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'var(--surface)', borderRadius: 12, padding: '14px 16px', border: 'var(--border)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12 }}>Complaint Volume by Dept</div>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={zone.departments.map(d => ({ name: d.name.split(' ')[0], assigned: d.complaints, resolved: d.resolved }))} margin={{ top: 4, right: 4, bottom: 0, left: -30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(13,27,42,0.06)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--ink-light)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: 'var(--ink-light)' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: 'var(--border)' }} />
                  <Bar dataKey="assigned" name="Assigned" fill="var(--blue-pale)" radius={[4,4,0,0]} />
                  <Bar dataKey="resolved" name="Resolved" fill="var(--blue)"      radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {[...zone.departments].sort((a, b) => a.score - b.score).map(d => (
              <div key={d.name} style={{ background: 'var(--surface)', borderRadius: 12, padding: '14px 16px', border: 'var(--border)', borderLeft: `3px solid ${sc(d.score)}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{d.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--ink-light)' }}>{d.avgDays}d avg</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: sc(d.score), background: sb(d.score), padding: '2px 8px', borderRadius: 8 }}>{d.score}%</span>
                  </div>
                </div>
                <div style={{ height: 6, background: 'var(--canvas-warm)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
                  <div style={{ height: '100%', width: `${(d.resolved / d.complaints) * 100}%`, background: sc(d.score), borderRadius: 3 }} />
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <span style={{ fontSize: 11, color: 'var(--ink-light)' }}>{d.complaints} assigned</span>
                  <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 500 }}>✓ {d.resolved} resolved</span>
                  <span style={{ fontSize: 11, color: 'var(--red)', fontWeight: 500 }}>✗ {d.complaints - d.resolved} pending</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'wards' && !selWard && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
              {['Critical','Stressed','Moderate','Healthy'].map((lbl, i) => {
                const thresholds = [[0,40],[40,55],[55,75],[75,101]];
                const [lo, hi] = thresholds[i];
                const cnt = zoneWards.filter(w => w.healthScore >= lo && w.healthScore < hi).length;
                const colors = ['var(--red)','var(--saffron)','var(--amber)','var(--green)'];
                const bgs    = ['var(--red-pale)','var(--saffron-pale)','var(--amber-pale)','var(--green-pale)'];
                return (
                  <div key={lbl} style={{ background: bgs[i], borderRadius: 10, padding: '12px 8px', textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontFamily: 'var(--font-display)', color: colors[i], lineHeight: 1 }}>{cnt}</div>
                    <div style={{ fontSize: 9, color: colors[i], fontWeight: 700, marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{lbl}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-light)' }}>{zoneWards.length} wards · sorted worst → best · click for detail</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {zoneWards.slice(0, 40).map(w => (
                <div key={w.num} onClick={() => setSelWard(w)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--surface)', borderRadius: 10, cursor: 'pointer', border: 'var(--border)', transition: 'var(--t-fast)' }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.borderColor = sc(w.healthScore); }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'rgba(13,27,42,0.08)'; }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: sb(w.healthScore), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: sc(w.healthScore) }}>{w.healthScore}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>{w.name}</div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <span style={{ fontSize: 10, color: 'var(--ink-light)' }}>{w.complaints} complaints</span>
                      <span style={{ fontSize: 10, color: 'var(--red)', fontWeight: 500 }}>{w.pending} pending</span>
                    </div>
                  </div>
                  <ChevronRight size={14} color="var(--ink-light)" />
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'wards' && selWard && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <button onClick={() => setSelWard(null)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface)', border: 'var(--border)', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 12, color: 'var(--blue)', fontFamily: 'var(--font-body)', fontWeight: 500, width: 'fit-content' }}>← Back to wards</button>
            <div style={{ background: 'var(--surface)', borderRadius: 14, padding: 20, border: 'var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                <div style={{ width: 56, height: 56, borderRadius: 12, background: sb(selWard.healthScore), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 22, fontWeight: 900, color: sc(selWard.healthScore), fontFamily: 'var(--font-display)' }}>{selWard.healthScore}</span>
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, lineHeight: 1.2, marginBottom: 3 }}>{selWard.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: sc(selWard.healthScore), background: sb(selWard.healthScore), padding: '2px 8px', borderRadius: 8 }}>{sl(selWard.healthScore)}</span>
                    <span style={{ fontSize: 11, color: 'var(--ink-light)' }}>{zone.shortName}</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { l: 'Total Complaints', v: selWard.complaints, c: 'var(--ink)'   },
                  { l: 'Resolved',         v: selWard.resolved,   c: 'var(--green)' },
                  { l: 'Pending',          v: selWard.pending,    c: 'var(--red)'   },
                  { l: 'Top Issue',        v: zone.topIssue,      c: 'var(--blue)'  },
                ].map(({ l, v, c }) => (
                  <div key={l} style={{ background: 'var(--canvas)', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontSize: 10, color: 'var(--ink-light)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>{l}</div>
                    <div style={{ fontSize: 18, fontFamily: 'var(--font-display)', color: c }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'sentiment' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 16, border: 'var(--border)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 14 }}>Citizen Emotion Breakdown</div>
              {[
                { l: 'Angry',      v: zone.sentimentBreakdown.angry,      c: '#C0392B' },
                { l: 'Frustrated', v: zone.sentimentBreakdown.frustrated,  c: '#E8813A' },
                { l: 'Neutral',    v: zone.sentimentBreakdown.neutral,     c: '#94A3B8' },
                { l: 'Satisfied',  v: zone.sentimentBreakdown.satisfied,   c: '#2A7A4B' },
              ].map(s => (
                <div key={s.l} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.c, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{s.l}</span>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: s.c, fontFamily: 'var(--font-display)' }}>{s.v}%</span>
                  </div>
                  <div style={{ height: 8, background: 'var(--canvas-warm)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${s.v}%`, background: s.c, borderRadius: 4, transition: 'width 0.7s cubic-bezier(0.34,1.2,0.64,1)' }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background: 'var(--blue-pale)', borderRadius: 12, padding: '14px 16px', borderLeft: '3px solid var(--blue)' }}>
              <div style={{ fontSize: 10, color: 'var(--blue)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>AI Observation</div>
              <div style={{ fontSize: 12, color: 'var(--ink)', lineHeight: 1.6 }}>
                {zone.sentimentBreakdown.angry > 30
                  ? `Critically high anger in ${zone.shortName} (${zone.sentimentBreakdown.angry}%). The ${zone.worstDept} backlog is the primary driver. Immediate intervention recommended.`
                  : zone.sentimentBreakdown.angry > 15
                    ? `Moderate frustration in ${zone.shortName}. ${zone.topIssue} complaints averaging ${zone.avgResolutionDays} days is the main concern.`
                    : `Citizen sentiment is positive in ${zone.shortName}. ${zone.bestDept} practices are driving satisfaction.`}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function WardMapPage() {
  const [wardsGeo, setWardsGeo]         = useState(null);
  const [boundaryGeo, setBoundaryGeo]   = useState(null);
  const [loading, setLoading]           = useState(true);
  const [loadError, setLoadError]       = useState(false);
  const [hoveredZone, setHoveredZone]   = useState(null);
  const [selectedZone, setSelectedZone] = useState(null);
  const [hoveredWard, setHoveredWard]   = useState(null);
  const [mousePos, setMousePos]         = useState({ x: 0, y: 0 });
  const [activeLayer, setActiveLayer]   = useState('health');
  const [zoom, setZoom]                 = useState(1);
  const [pan, setPan]                   = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging]     = useState(false);
  const [dragStart, setDragStart]       = useState({ x: 0, y: 0 });
  const [layerOpen, setLayerOpen]       = useState(false);
  const [searchQuery, setSearchQuery]   = useState('');
  const [svgSize, setSvgSize]           = useState({ w: 900, h: 560 });
  const mapRef = useRef(null);

  useEffect(() => {
    const m = () => { if (mapRef.current) { const { width, height } = mapRef.current.getBoundingClientRect(); setSvgSize({ w: width || 900, h: height || 560 }); } };
    m(); window.addEventListener('resize', m); return () => window.removeEventListener('resize', m);
  }, []);

  useEffect(() => {
    Promise.all([
      fetch(WARDS_URL).then(r => r.json()),
      fetch(BOUNDARY_URL).then(r => r.json()).catch(() => null),
    ]).then(([wards, boundary]) => {
      const enriched = wards.features.map((f, i) => ({ ...f, _zoneId: assignZone(f), _wardNum: i + 1 }));
      setWardsGeo({ ...wards, features: enriched });
      setBoundaryGeo(boundary);
      setLoading(false);
    }).catch(() => { setLoadError(true); setLoading(false); });
  }, []);

  const { wardPaths, boundaryPath } = useMemo(() => {
    const { w, h } = svgSize;
    if (!wardsGeo) return { wardPaths: [], boundaryPath: '' };
    const wardPaths = wardsGeo.features.map(f => {
      const g = f.geometry; if (!g) return null;
      let d = '';
      if (g.type === 'Polygon')           d = coordsToPath(g.coordinates, w, h);
      else if (g.type === 'MultiPolygon') d = g.coordinates.map(p => coordsToPath(p, w, h)).join(' ');
      const flat = g.coordinates.flat(3);
      let sx = 0, sy = 0, cn = 0;
      for (let i = 0; i < flat.length - 1; i += 2) {
        if (typeof flat[i] === 'number') { const [px, py] = project(flat[i], flat[i+1], w, h); sx += px; sy += py; cn++; }
      }
      return { ...f, _path: d, _cx: cn > 0 ? sx / cn : 0, _cy: cn > 0 ? sy / cn : 0 };
    }).filter(Boolean);
    let bp = '';
    if (boundaryGeo) {
      const bf = boundaryGeo.features?.[0] || boundaryGeo;
      const bg = bf.geometry || boundaryGeo;
      if (bg?.type === 'Polygon')           bp = coordsToPath(bg.coordinates, w, h);
      else if (bg?.type === 'MultiPolygon') bp = bg.coordinates.map(p => coordsToPath(p, w, h)).join(' ');
    }
    return { wardPaths, boundaryPath: bp };
  }, [wardsGeo, svgSize, boundaryGeo]);

  const onMouseMove = useCallback(e => {
    const r = mapRef.current?.getBoundingClientRect();
    if (r) setMousePos({ x: e.clientX - r.left, y: e.clientY - r.top });
    if (isDragging) { setPan(p => ({ x: p.x + (e.clientX - dragStart.x) / zoom, y: p.y + (e.clientY - dragStart.y) / zoom })); setDragStart({ x: e.clientX, y: e.clientY }); }
  }, [isDragging, dragStart, zoom]);

  const onWheel = useCallback(e => { e.preventDefault(); setZoom(z => Math.max(0.7, Math.min(6, z * (e.deltaY < 0 ? 1.12 : 0.90)))); }, []);

  useEffect(() => {
    const el = mapRef.current;
    if (el) el.addEventListener('wheel', onWheel, { passive: false });
    return () => { if (el) el.removeEventListener('wheel', onWheel); };
  }, [onWheel]);

  const hovZone = hoveredWard ? ZONE_BY_ID[hoveredWard._zoneId] : null;

  const zoneCentroids = useMemo(() => {
    const result = {};
    DELHI_ZONES.forEach(zone => {
      const zw = wardPaths.filter(f => f._zoneId === zone.id);
      if (zw.length) result[zone.id] = { cx: zw.reduce((s, f) => s + f._cx, 0) / zw.length, cy: zw.reduce((s, f) => s + f._cy, 0) / zw.length };
    });
    return result;
  }, [wardPaths]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: '100%' }}>
      {/* Critical alert strip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexShrink: 0, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginRight: 4 }}>
          <AlertTriangle size={14} color="var(--saffron)" />
          <span style={{ fontWeight: 600, color: 'var(--ink)' }}>Critical Zones</span>
        </div>
        {DELHI_ZONES.filter(z => z.healthScore < 55).sort((a, b) => a.healthScore - b.healthScore).map(z => (
          <button key={z.id} onClick={() => setSelectedZone(prev => prev?.id === z.id ? null : z)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: selectedZone?.id === z.id ? 'var(--red)' : 'var(--red-pale)', borderRadius: 20, border: '1px solid rgba(192,57,43,0.2)', cursor: 'pointer', transition: 'var(--t-fast)' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: selectedZone?.id === z.id ? 'white' : 'var(--red)', animation: z.healthScore < 45 ? 'critPulse 1.5s infinite' : 'none' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: selectedZone?.id === z.id ? 'white' : 'var(--ink)' }}>{z.shortName}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: selectedZone?.id === z.id ? 'rgba(255,255,255,0.8)' : 'var(--red)' }}>{z.healthScore}</span>
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--ink-light)' }}>{DELHI_ZONES.filter(z => z.healthScore >= 75).length} healthy · </span>
          <span style={{ fontSize: 11, color: 'var(--red)' }}>{DELHI_ZONES.filter(z => z.healthScore < 50).length} critical</span>
          <span style={{ fontSize: 11, color: 'var(--ink-light)' }}> · 272 wards total</span>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', gap: 16, minHeight: 520 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: 220 }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-light)' }} />
              <input value={searchQuery} onChange={e => { setSearchQuery(e.target.value); const m = DELHI_ZONES.find(z => z.name.toLowerCase().includes(e.target.value.toLowerCase()) || z.code.toLowerCase().includes(e.target.value.toLowerCase())); if (m && e.target.value) setSelectedZone(m); }} placeholder="Search zone or ward…"
                style={{ width: '100%', padding: '7px 10px 7px 30px', borderRadius: 'var(--r-full)', border: 'var(--border)', background: 'var(--surface)', fontSize: 12, fontFamily: 'var(--font-body)', color: 'var(--ink)', outline: 'none' }}
                onFocus={e => e.target.style.borderColor = 'var(--blue-light)'}
                onBlur={e  => e.target.style.borderColor = 'rgba(13,27,42,0.08)'} />
            </div>
            <div style={{ position: 'relative' }}>
              <button onClick={() => setLayerOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: layerOpen ? 'var(--ink)' : 'var(--surface)', border: 'var(--border)', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-body)', color: layerOpen ? 'white' : 'var(--ink)', transition: 'var(--t-fast)' }}>
                <Layers size={13} /> {HEATMAP_LAYERS.find(l => l.id === activeLayer)?.label} <span style={{ fontSize: 10 }}>▾</span>
              </button>
              {layerOpen && (
                <div style={{ position: 'absolute', top: '110%', left: 0, background: 'var(--surface)', border: 'var(--border)', borderRadius: 12, padding: 8, minWidth: 220, zIndex: 200, boxShadow: 'var(--shadow-lg)' }}>
                  {HEATMAP_LAYERS.map(layer => (
                    <button key={layer.id} onClick={() => { setActiveLayer(layer.id); setLayerOpen(false); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px', border: 'none', borderRadius: 8, cursor: 'pointer', background: activeLayer === layer.id ? 'var(--blue-pale)' : 'transparent', fontFamily: 'var(--font-body)', transition: 'var(--t-fast)' }}
                      onMouseEnter={e => { if (activeLayer !== layer.id) e.currentTarget.style.background = 'var(--canvas)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = activeLayer === layer.id ? 'var(--blue-pale)' : 'transparent'; }}
                    >
                      <div style={{ fontSize: 12, color: activeLayer === layer.id ? 'var(--blue)' : 'var(--ink)', fontWeight: activeLayer === layer.id ? 600 : 400 }}>{layer.label}</div>
                      <div style={{ fontSize: 10, color: 'var(--ink-light)', marginTop: 1 }}>{layer.description}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 4, background: 'var(--surface)', border: 'var(--border)', borderRadius: 8, padding: 3 }}>
              {[
                { icon: ZoomIn,    fn: () => setZoom(z => Math.min(z * 1.25, 6)) },
                { icon: ZoomOut,   fn: () => setZoom(z => Math.max(z * 0.8, 0.7)) },
                { icon: RotateCcw, fn: () => { setZoom(1); setPan({ x: 0, y: 0 }); } },
              ].map(({ icon: Icon, fn }, i) => (
                <button key={i} onClick={fn} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-light)', transition: 'var(--t-fast)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--canvas)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                ><Icon size={13} /></button>
              ))}
            </div>
            <span style={{ fontSize: 11, color: 'var(--ink-light)', fontFamily: 'var(--font-mono)', padding: '4px 8px', background: 'var(--surface)', border: 'var(--border)', borderRadius: 6 }}>{Math.round(zoom * 100)}%</span>
          </div>

          {/* Map */}
          <div ref={mapRef} style={{ flex: 1, minHeight: 460, background: 'linear-gradient(170deg,#08111f 0%,#0d1e34 50%,#06101c 100%)', borderRadius: 16, overflow: 'hidden', position: 'relative', cursor: isDragging ? 'grabbing' : 'grab', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}
            onMouseMove={onMouseMove}
            onMouseLeave={() => { setHoveredZone(null); setHoveredWard(null); setIsDragging(false); }}
            onMouseDown={e => { setIsDragging(true); setDragStart({ x: e.clientX, y: e.clientY }); }}
            onMouseUp={() => setIsDragging(false)}
          >
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.03, pointerEvents: 'none' }}>
              {Array.from({ length: 20 }).map((_, i) => <line key={`h${i}`} x1="0" y1={i*40} x2="100%" y2={i*40} stroke="white" strokeWidth="0.5" />)}
              {Array.from({ length: 28 }).map((_, i) => <line key={`v${i}`} x1={i*40} y1="0" x2={i*40} y2="100%" stroke="white" strokeWidth="0.5" />)}
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 80, color: 'rgba(255,255,255,0.015)', letterSpacing: '0.25em', userSelect: 'none' }}>DELHI</span>
            </div>

            {loading && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                <div style={{ width: 44, height: 44, border: '3px solid rgba(255,255,255,0.08)', borderTop: '3px solid #E8813A', borderRadius: '50%', animation: 'mapSpin 0.9s linear infinite' }} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Loading Delhi ward boundaries</div>
                  <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>Fetching 272 real GeoJSON ward polygons…</div>
                </div>
              </div>
            )}

            {loadError && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <div style={{ fontSize: 36 }}>⚠️</div>
                <div style={{ color: 'white', fontSize: 14, fontWeight: 600 }}>GeoJSON failed to load</div>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, textAlign: 'center', maxWidth: 260, lineHeight: 1.5 }}>Loads from jsDelivr CDN. Check your internet connection and refresh.</div>
              </div>
            )}

            {!loading && !loadError && (
              <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox={`${-pan.x} ${-pan.y} ${svgSize.w/zoom} ${svgSize.h/zoom}`}>
                <defs>
                  <filter id="wardGlow"><feDropShadow dx="0" dy="0" stdDeviation="5" floodOpacity="0.6" floodColor="#fff" /></filter>
                  <filter id="labelShadow"><feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.8" floodColor="#000" /></filter>
                </defs>
                {boundaryPath && <path d={boundaryPath} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={2} strokeDasharray="6 4" />}
                {wardPaths.map((f, idx) => {
                  const zone = ZONE_BY_ID[f._zoneId]; if (!zone) return null;
                  const isHW = hoveredWard === f, isSZ = selectedZone?.id === f._zoneId, isHZ = hoveredZone?.id === f._zoneId;
                  const alpha = isHW ? 0.97 : isSZ ? 0.90 : isHZ ? 0.88 : 0.76;
                  return (
                    <path key={idx} d={f._path}
                      fill={getZoneColor(zone, activeLayer, alpha)}
                      stroke={isHW ? 'rgba(255,255,255,0.9)' : isSZ ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.14)'}
                      strokeWidth={isHW ? 1.5 : isSZ ? 0.7 : 0.3}
                      filter={isHW ? 'url(#wardGlow)' : undefined}
                      style={{ cursor: 'pointer', transition: 'fill 0.12s ease, stroke 0.12s ease' }}
                      onMouseEnter={() => { if (!isDragging) { setHoveredWard(f); setHoveredZone(zone); } }}
                      onMouseLeave={() => { setHoveredWard(null); setHoveredZone(null); }}
                      onClick={() => { if (!isDragging) { setSelectedZone(prev => prev?.id === f._zoneId ? null : zone); setHoveredZone(null); setHoveredWard(null); } }}
                    />
                  );
                })}
                {DELHI_ZONES.map(zone => {
                  const c = zoneCentroids[zone.id]; if (!c) return null;
                  const isSel = selectedZone?.id === zone.id;
                  return (
                    <g key={zone.id} style={{ pointerEvents: 'none' }}>
                      <rect x={c.cx-18} y={c.cy-14} width={36} height={22} rx={5} fill={isSel ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.35)'} filter="url(#labelShadow)" />
                      <text x={c.cx} y={c.cy-4} textAnchor="middle" style={{ fontSize: `${Math.max(6.5,9/zoom)}px`,  fill: 'rgba(255,255,255,0.75)', fontWeight: 700, fontFamily: 'var(--font-body)'    }}>{zone.code}</text>
                      <text x={c.cx} y={c.cy+7} textAnchor="middle" style={{ fontSize: `${Math.max(8,11/zoom)}px`,   fill: 'white',                 fontWeight: 900, fontFamily: 'var(--font-display)' }}>{zone.healthScore}</text>
                    </g>
                  );
                })}
                {DELHI_ZONES.filter(z => z.escalated > 40).map(zone => {
                  const c = zoneCentroids[zone.id]; if (!c) return null;
                  const cx = c.cx + 20, cy = c.cy - 18;
                  return (
                    <g key={`dot-${zone.id}`} style={{ pointerEvents: 'none' }}>
                      <circle cx={cx} cy={cy} r={11} fill="rgba(192,57,43,0.2)" style={{ animation: 'wardPulse 1.8s ease-in-out infinite' }} />
                      <circle cx={cx} cy={cy} r={6}  fill="#C0392B" />
                      <text x={cx} y={cy+4} textAnchor="middle" style={{ fontSize: '7.5px', fill: 'white', fontWeight: 800, fontFamily: 'var(--font-body)' }}>{zone.escalated}</text>
                    </g>
                  );
                })}
              </svg>
            )}

            <div style={{ position: 'absolute', bottom: 14, left: 14, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(8,16,30,0.75)', backdropFilter: 'blur(8px)', borderRadius: 8, padding: '5px 10px', border: '1px solid rgba(255,255,255,0.07)' }}>
              <Info size={11} color="rgba(255,255,255,0.4)" />
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Hover ward to inspect · Click for zone intel · Scroll to zoom · Drag to pan</span>
            </div>
            <div style={{ position: 'absolute', bottom: 14, right: 14, background: 'rgba(8,16,30,0.85)', backdropFilter: 'blur(8px)', borderRadius: 10, padding: '10px 14px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 }}>{HEATMAP_LAYERS.find(l => l.id === activeLayer)?.label}</div>
              <div style={{ display: 'flex', gap: 10 }}>
                {[['#C0392B','Critical'],['#D97706','Stressed'],['#2563C4','Moderate'],['#2A7A4B','Healthy']].map(([c,l]) => (
                  <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: c, opacity: 0.85 }} />
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)' }}>{l}</span>
                  </div>
                ))}
              </div>
            </div>

            {hoveredWard && !selectedZone && hovZone && (
              <ZoneTooltip zone={hovZone} x={mousePos.x} y={mousePos.y} cw={mapRef.current?.clientWidth || 900} ch={mapRef.current?.clientHeight || 560} />
            )}
            {selectedZone && <ZonePanel zone={selectedZone} wardFeatures={wardPaths} onClose={() => setSelectedZone(null)} />}

            <style>{`
              @keyframes mapSpin    { to { transform: rotate(360deg); } }
              @keyframes wardPulse  { 0%,100%{opacity:0.3;transform:scale(1);}  50%{opacity:0.8;transform:scale(1.18);} }
              @keyframes critPulse  { 0%,100%{opacity:0.4;} 50%{opacity:1;} }
              @keyframes tooltipIn  { from{opacity:0;transform:scale(0.95) translateY(4px);} to{opacity:1;transform:scale(1) translateY(0);} }
              @keyframes panelIn    { from{transform:translateX(20px);opacity:0;} to{transform:translateX(0);opacity:1;} }
            `}</style>
          </div>
        </div>

        {/* Right sidebar: zone cards */}
        {!selectedZone && (
          <div style={{ width: 240, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', flexShrink: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-light)', textTransform: 'uppercase', letterSpacing: '0.07em', paddingBottom: 4 }}>All Zones — {DELHI_ZONES.length} total</div>
            {[...DELHI_ZONES].sort((a, b) => a.healthScore - b.healthScore).map(z => (
              <div key={z.id} onClick={() => setSelectedZone(z)} style={{ background: 'var(--surface)', borderRadius: 12, padding: '12px 14px', border: `1px solid ${sc(z.healthScore)}25`, cursor: 'pointer', transition: 'var(--t-fast)', borderLeft: `3px solid ${sc(z.healthScore)}` }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.transform = 'translateX(2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateX(0)'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 1 }}>{z.shortName}</div>
                    <div style={{ fontSize: 10, color: 'var(--ink-light)' }}>{z.totalWards} wards</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: sc(z.healthScore), fontFamily: 'var(--font-display)', lineHeight: 1 }}>{z.healthScore}</div>
                    <div style={{ fontSize: 9, color: sc(z.healthScore), fontWeight: 600, textTransform: 'uppercase' }}>{sl(z.healthScore)}</div>
                  </div>
                </div>
                <div style={{ height: 5, background: 'var(--canvas-warm)', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
                  <div style={{ height: '100%', borderRadius: 3, width: `${(z.resolved/z.totalComplaints)*100}%`, background: sc(z.healthScore) }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 10, color: 'var(--ink-light)' }}>{z.resolved.toLocaleString()} resolved</span>
                  <span style={{ fontSize: 10, color: 'var(--red)', fontWeight: 500 }}>{z.pending} pending</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}