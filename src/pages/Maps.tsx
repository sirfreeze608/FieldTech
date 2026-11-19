import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, ImageOverlay } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useStore } from '../store/useStore';
import { useTickets } from '../hooks/useTickets';
import { Navigation, MapPin, Search, Layers, Upload, X, Map as MapIcon, Plus, Building2, Thermometer, Droplets, Wind } from 'lucide-react';
import { db, collection, addDoc, Timestamp, query, onSnapshot, orderBy, where, doc, updateDoc } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { useSites, Site } from '../hooks/useSites';
import { useOrgUsers } from '../hooks/useOrgUsers';

// Fix Leaflet marker icons...
// ... (omitting marker fix for brevity in edit_file, but keeping it in the actual file)

function MapViewHandler({ center, bounds }: { center?: [number, number], bounds?: [[number, number], [number, number]] }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (center) {
      map.setView(center, 13);
    }
  }, [center, bounds, map]);
  return null;
}

interface Floorplan {
  id: string;
  siteId: string;
  url: string;
  name: string;
  bounds?: [[number, number], [number, number]];
}

export function Maps() {
  const { user } = useStore();
  const { sites, loading: loadingSites } = useSites(user?.orgCode);
  const { users: orgUsers } = useOrgUsers(user?.orgCode);
  const { tickets } = useTickets(undefined, user?.orgCode);
  const [center, setCenter] = useState<[number, number]>([37.7749, -122.4194]); 
  const [search, setSearch] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isCreatingSite, setIsCreatingSite] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [creatingSite, setCreatingSite] = useState(false);
  const [floorplans, setFloorplans] = useState<Floorplan[]>([]);
  const [selectedFloorplan, setSelectedFloorplan] = useState<Floorplan | null>(null);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [isUpdatingAtmosphere, setIsUpdatingAtmosphere] = useState(false);
  const [atmTemp, setAtmTemp] = useState('');
  const [atmHumidity, setAtmHumidity] = useState('');
  const [atmWind, setAtmWind] = useState('');
  const [floorplanSearch, setFloorplanSearch] = useState('');

  const technicians = orgUsers.filter(u => u.role === 'technician' && u.location);

  // Site Creation States
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteAddress, setNewSiteAddress] = useState('');

  // Floorplan Upload States
  const [planName, setPlanName] = useState('');
  const [planSiteId, setPlanSiteId] = useState('');

  const filteredFloorplans = floorplans.filter(fp => 
    fp.name.toLowerCase().includes(floorplanSearch.toLowerCase())
  );

  useEffect(() => {
    if (user?.orgCode === undefined) return;
    try {
      const q = query(
        collection(db, 'floorplans'), 
        where('orgCode', '==', user.orgCode),
        orderBy('createdAt', 'desc')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setFloorplans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Floorplan)));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'floorplans');
      });
      return () => unsubscribe();
    } catch (err) {
      console.error("Query Error (Floorplans):", err, { orgCode: user?.orgCode });
    }
  }, [user?.orgCode]);

  useEffect(() => {
    if (navigator.geolocation && !selectedFloorplan) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setCenter([pos.coords.latitude, pos.coords.longitude]);
      });
    }
  }, [selectedFloorplan]);

  const handleUpdateAtmosphere = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSite || !user) return;
    try {
      await updateDoc(doc(db, 'sites', selectedSite.id), {
        atmosphericData: {
          temp: Number(atmTemp),
          humidity: Number(atmHumidity),
          wind: atmWind,
          updatedAt: new Date().toISOString(),
          updatedBy: user.uid
        }
      });
      alert('Atmospheric data updated!');
      setIsUpdatingAtmosphere(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `sites/${selectedSite.id}`);
    }
  };

  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSiteName.trim() || !newSiteAddress.trim() || !user) return;
    setCreatingSite(true);
    try {
      await addDoc(collection(db, 'sites'), {
        name: newSiteName,
        address: newSiteAddress,
        orgCode: user.orgCode,
        status: 'active',
        location: { lat: center[0], lng: center[1] },
        createdAt: Timestamp.now(),
      });
      alert('Site created successfully!');
      setIsCreatingSite(false);
      setNewSiteName('');
      setNewSiteAddress('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'sites');
    } finally {
      setCreatingSite(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planSiteId || !planName || !user) {
      alert('Please fill in all fields');
      return;
    }
    setUploading(true);
    try {
      const mockUrl = 'https://images.unsplash.com/photo-1541888941255-081b199620c7?auto=format&fit=crop&q=80&w=800'; 
      await addDoc(collection(db, 'floorplans'), {
        siteId: planSiteId,
        orgCode: user.orgCode,
        name: planName,
        url: mockUrl,
        createdAt: Timestamp.now(),
        bounds: [[center[0] - 0.005, center[1] - 0.005], [center[0] + 0.005, center[1] + 0.005]],
      });
      alert('Floorplan uploaded successfully!');
      setIsUploading(false);
      setPlanName('');
      setPlanSiteId('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'floorplans');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-160px)] flex-col bg-white rounded-3xl shadow-sm border border-neutral-100 overflow-hidden relative">
      <div className="absolute top-4 left-4 right-4 z-[1000] space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search site or asset..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border-none bg-white/90 backdrop-blur-md px-10 py-3 text-sm shadow-xl ring-1 ring-neutral-200 focus:ring-2 focus:ring-neutral-900"
          />
        </div>
        <div className="flex gap-2">
          {user?.role === 'manager' && (
            <>
              <button 
                onClick={() => setIsCreatingSite(true)}
                className="flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2 text-xs font-bold text-white shadow-lg active:scale-95 transition-transform"
              >
                <Plus className="h-3 w-3" />
                Add Site
              </button>
              <button 
                onClick={() => setIsUploading(true)}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-lg active:scale-95 transition-transform"
              >
                <Upload className="h-3 w-3" />
                Upload Plan
              </button>
            </>
          )}
          <div className="relative group">
            <button className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold shadow-lg ring-1 ring-neutral-200 active:scale-95 ${selectedFloorplan ? 'bg-blue-50 text-blue-600 ring-blue-200' : 'bg-white/90 backdrop-blur-md'}`}>
              <Layers className="h-3 w-3" />
              {selectedFloorplan ? selectedFloorplan.name : 'Floor Plans'}
            </button>
            <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-neutral-100 hidden group-hover:block overflow-hidden z-[5000]">
              <div className="p-2 border-b border-neutral-50">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Search plans..."
                    value={floorplanSearch}
                    onChange={(e) => setFloorplanSearch(e.target.value)}
                    className="w-full rounded-lg border-neutral-100 bg-neutral-50 pl-7 pr-2 py-1.5 text-[10px] focus:border-neutral-900 focus:ring-0"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
              <div className="max-h-60 overflow-y-auto">
                <button 
                  onClick={() => {
                    setSelectedFloorplan(null);
                    setFloorplanSearch('');
                  }}
                  className="w-full px-4 py-2 text-left text-xs hover:bg-neutral-50 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 text-neutral-600">
                    <MapIcon className="h-3 w-3" />
                    Global Map
                  </div>
                  {!selectedFloorplan && <div className="h-1.5 w-1.5 rounded-full bg-blue-600" />}
                </button>
                {filteredFloorplans.map(fp => (
                  <button 
                    key={fp.id}
                    onClick={() => setSelectedFloorplan(fp)}
                    className="w-full px-4 py-2 text-left text-xs hover:bg-neutral-50 border-t border-neutral-50 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 text-neutral-600">
                      <MapPin className="h-3 w-3" />
                      {fp.name}
                    </div>
                    {selectedFloorplan?.id === fp.id && <div className="h-1.5 w-1.5 rounded-full bg-blue-600" />}
                  </button>
                ))}
                {filteredFloorplans.length === 0 && floorplanSearch && (
                  <div className="px-4 py-3 text-[10px] text-neutral-400 text-center italic">
                    No matching plans
                  </div>
                )}
              </div>
            </div>
          </div>
          <button 
            onClick={() => {
              setSelectedFloorplan(null);
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition((pos) => {
                  setCenter([pos.coords.latitude, pos.coords.longitude]);
                });
              }
            }}
            className="flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2 text-xs font-bold text-white shadow-lg active:scale-95"
          >
            <Navigation className="h-3 w-3" />
            My Location
          </button>
        </div>
      </div>

      <div className="flex-1">
        <MapContainer center={center} zoom={13} zoomControl={false} className="h-full w-full">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          <MapViewHandler center={center} bounds={selectedFloorplan?.bounds} />
          
          {selectedFloorplan && selectedFloorplan.bounds && (
            <ImageOverlay
              url={selectedFloorplan.url}
              bounds={selectedFloorplan.bounds}
              opacity={0.9}
            />
          )}

          {sites.map(site => (
            <Marker 
              key={site.id} 
              position={[site.location?.lat || center[0], site.location?.lng || center[1]]}
              eventHandlers={{
                click: () => {
                  setSelectedSite(site);
                  setCenter([site.location?.lat || center[0], site.location?.lng || center[1]]);
                  if (site.atmosphericData) {
                    setAtmTemp(String(site.atmosphericData.temp || ''));
                    setAtmHumidity(String(site.atmosphericData.humidity || ''));
                    setAtmWind(site.atmosphericData.wind || '');
                  }
                },
              }}
            >
              <Popup>
                <div className="p-2 min-w-[200px]">
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">Site</p>
                  <h3 className="font-bold text-neutral-900">{site.name}</h3>
                  <p className="text-xs text-neutral-500 mb-2">{site.address}</p>
                  
                  {site.atmosphericData && (
                    <div className="mb-3 p-2 bg-neutral-50 rounded-xl grid grid-cols-3 gap-1">
                      <div className="flex flex-col items-center">
                        <Thermometer className="h-3 w-3 text-orange-500" />
                        <span className="text-[10px] font-bold">{site.atmosphericData.temp}°</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <Droplets className="h-3 w-3 text-blue-500" />
                        <span className="text-[10px] font-bold">{site.atmosphericData.humidity}%</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <Wind className="h-3 w-3 text-neutral-500" />
                        <span className="text-[10px] font-bold truncate w-full px-1">{site.atmosphericData.wind}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-1">
                    <button className="w-full py-1.5 px-3 rounded-lg bg-neutral-100 text-[10px] font-bold text-neutral-600 hover:bg-neutral-200 transition-colors">
                      View Details
                    </button>
                    {(user?.role === 'manager' || user?.role === 'dispatcher') && (
                       <button 
                         onClick={() => setIsUpdatingAtmosphere(true)}
                         className="w-full py-1.5 px-3 rounded-lg bg-orange-50 text-[10px] font-bold text-orange-600 hover:bg-orange-100 transition-colors flex items-center justify-center gap-1"
                       >
                         <Thermometer className="h-3 w-3" />
                         Update Weather
                       </button>
                    )}
                    {user?.role === 'manager' && (
                      <button 
                        onClick={() => {
                          setPlanSiteId(site.id);
                          setIsUploading(true);
                        }}
                        className="w-full py-1.5 px-3 rounded-lg bg-blue-50 text-[10px] font-bold text-blue-600 hover:bg-blue-100 transition-colors"
                      >
                        Add Floorplan
                      </button>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Technician Markers (Only for Dispatcher/Manager) */}
          {(user?.role === 'dispatcher' || user?.role === 'manager') && technicians.map(tech => (
            <Marker 
              key={tech.uid} 
              position={[tech.location.lat, tech.location.lng]}
              icon={L.divIcon({
                className: 'custom-div-icon',
                html: `<div style="background-color: #1a1a1a; padding: 4px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>`,
                iconSize: [28, 28],
                iconAnchor: [14, 14]
              })}
            >
              <Popup>
                <div className="p-2">
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Technician</p>
                  <h3 className="font-bold text-neutral-900">{tech.displayName}</h3>
                  <p className="text-[10px] text-neutral-500 font-mono mt-1">
                    Last active: {new Date(tech.lastActive).toLocaleTimeString()}
                  </p>
                  <button className="mt-2 w-full py-1.5 rounded-lg bg-neutral-900 text-[10px] font-bold text-white">
                    Contact Tech
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <div className="absolute bottom-4 left-4 right-4 z-[1000] pointer-events-none">
        <div className="pointer-events-auto rounded-2xl bg-white/90 backdrop-blur-md p-4 shadow-2xl border border-neutral-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400">
              {selectedFloorplan ? `Exploring ${selectedFloorplan.name}` : 'Nearby Assets'}
            </h3>
            <span className="text-[10px] font-bold text-blue-600">View All</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex-shrink-0 w-32 rounded-xl bg-neutral-50 p-3 border border-neutral-100">
                <MapPin className="h-4 w-4 text-neutral-400 mb-2" />
                <p className="text-[10px] font-bold text-neutral-900">Rack 0{i}-B</p>
                <p className="text-[9px] text-neutral-500">Floor 2, Row A</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isUploading && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Upload Floorplan</h2>
              <button onClick={() => setIsUploading(false)}><X className="h-5 w-5 text-neutral-400" /></button>
            </div>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="rounded-2xl border-2 border-dashed border-neutral-200 p-8 text-center bg-neutral-50">
                <Upload className="mx-auto h-8 w-8 text-neutral-300 mb-2" />
                <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest">Select PDF or SVG</p>
                <p className="text-[10px] text-neutral-300 mt-2">Max size 5MB</p>
              </div>
              
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1 block">Target Site</label>
                <select
                  value={planSiteId}
                  onChange={e => setPlanSiteId(e.target.value)}
                  className="w-full rounded-xl border-neutral-200 bg-neutral-50 px-4 py-3 text-sm"
                  required
                >
                  <option value="">Select a site...</option>
                  {sites.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1 block">Plan Name</label>
                <input
                  type="text"
                  placeholder="e.g. 2nd Floor Server Room"
                  value={planName}
                  onChange={e => setPlanName(e.target.value)}
                  className="w-full rounded-xl border-neutral-200 bg-neutral-50 px-4 py-3 text-sm"
                  required
                />
              </div>
              <button 
                type="submit"
                disabled={uploading}
                className="w-full rounded-2xl bg-neutral-900 py-4 text-sm font-bold text-white shadow-xl active:scale-[0.98] disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Confirm Upload'}
              </button>
            </form>
          </div>
        </div>
      )}

      {isCreatingSite && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Building2 className="h-5 w-5 text-neutral-900" />
                New Site
              </h2>
              <button onClick={() => setIsCreatingSite(false)}><X className="h-5 w-5 text-neutral-400" /></button>
            </div>
            <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest mb-4">
              Note: Site will be placed at your map center.
            </p>
            <form onSubmit={handleCreateSite} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1 block">Site Name</label>
                <input
                  type="text"
                  placeholder="e.g. SF Main Office"
                  value={newSiteName}
                  onChange={e => setNewSiteName(e.target.value)}
                  className="w-full rounded-xl border-neutral-200 bg-neutral-50 px-4 py-3 text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1 block">Address</label>
                <textarea
                  placeholder="123 Tech Lane, San Francisco, CA"
                  value={newSiteAddress}
                  onChange={e => setNewSiteAddress(e.target.value)}
                  className="w-full rounded-xl border-neutral-200 bg-neutral-50 px-4 py-3 text-sm min-h-[80px]"
                  required
                />
              </div>
              <button 
                type="submit"
                disabled={creatingSite}
                className="w-full rounded-2xl bg-blue-600 py-4 text-sm font-bold text-white shadow-xl active:scale-[0.98] disabled:opacity-50"
              >
                {creatingSite ? 'Creating...' : 'Create Site'}
              </button>
            </form>
          </div>
        </div>
      )}

      {isUpdatingAtmosphere && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Thermometer className="h-5 w-5 text-orange-600" />
                Site Weather
              </h2>
              <div className="flex items-center gap-2">
                <button 
                  onClick={async () => {
                    if (!selectedSite?.location) return;
                    try {
                      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${selectedSite.location.lat}&longitude=${selectedSite.location.lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph`);
                      const data = await res.json();
                      setAtmTemp(String(Math.round(data.current.temperature_2m)));
                      setAtmHumidity(String(data.current.relative_humidity_2m));
                      setAtmWind(`${Math.round(data.current.wind_speed_10m)}mph`);
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-orange-100 text-orange-600 text-[10px] font-bold uppercase tracking-widest hover:bg-orange-200 transition-colors"
                >
                  Auto-Detect
                </button>
                <button onClick={() => setIsUpdatingAtmosphere(false)}><X className="h-5 w-5 text-neutral-400" /></button>
              </div>
            </div>
            <form onSubmit={handleUpdateAtmosphere} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1 block">Temp (°F)</label>
                  <input
                    type="number"
                    value={atmTemp}
                    onChange={e => setAtmTemp(e.target.value)}
                    className="w-full rounded-xl border-neutral-200 bg-neutral-50 px-4 py-3 text-sm focus:border-neutral-900 focus:ring-0"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1 block">Humidity (%)</label>
                  <input
                    type="number"
                    value={atmHumidity}
                    onChange={e => setAtmHumidity(e.target.value)}
                    className="w-full rounded-xl border-neutral-200 bg-neutral-50 px-4 py-3 text-sm focus:border-neutral-900 focus:ring-0"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1 block">Wind (e.g. 15mph NW)</label>
                <input
                  type="text"
                  value={atmWind}
                  onChange={e => setAtmWind(e.target.value)}
                  className="w-full rounded-xl border-neutral-200 bg-neutral-50 px-4 py-3 text-sm focus:border-neutral-900 focus:ring-0"
                  required
                />
              </div>
              <button 
                type="submit"
                className="w-full rounded-2xl bg-orange-600 py-4 text-sm font-bold text-white shadow-xl active:scale-[0.98]"
              >
                Broadcast Weather
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

