import { useMemo, useRef, useState, type ChangeEvent, type MouseEvent, type WheelEvent } from "react";
import {
  Anchor,
  Compass,
  Crosshair,
  Globe,
  Layers,
  MapPin,
  Maximize2,
  Minimize2,
  Minus,
  Navigation,
  Plus,
  RotateCcw,
  Search,
  Ship,
  Snowflake,
  Triangle,
  Waves,
  Wind,
  X,
} from "lucide-react";
import type { Iceberg, Route } from "../../data/types";
import { RISK_COLORS, cx } from "../ui/primitives";
import { smoothPath, corridorPath, slicePath, seaIceColor } from "./geo";
import { useTheme } from "../../theme";
import antarcticSatelliteImg from "../../assets/antarctic_satellite_polar.jpg";

export type SatelliteProviderId = "nasa-gibs" | "esri-polar" | "nasa-bluemarble";

export const SATELLITE_PROVIDERS = [
  {
    id: "nasa-gibs" as const,
    name: "NASA GIBS Live MODIS",
    tag: "NASA EARTHDATA LIVE EPSG:3031 API",
    url: "https://gibs.earthdata.nasa.gov/wms/epsg3031/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&LAYERS=MODIS_Terra_CorrectedReflectance_TrueColor&FORMAT=image/jpeg&HEIGHT=1024&WIDTH=1024&CRS=EPSG:3031&BBOX=-4194304,-4194304,4194304,4194304&TIME=2024-01-15",
  },
  {
    id: "esri-polar" as const,
    name: "ESRI Antarctic High-Res",
    tag: "ESRI ARCGIS POLAR API",
    url: "https://services.arcgisonline.com/arcgis/rest/services/Polar/Antarctic_Imagery/MapServer/export?bbox=-4194304,-4194304,4194304,4194304&bboxSR=3031&imageSR=3031&size=1024,1024&format=jpg&f=image",
  },
  {
    id: "nasa-bluemarble" as const,
    name: "NASA Blue Marble Polar",
    tag: "NASA GSFC BLUE MARBLE",
    url: "https://gibs.earthdata.nasa.gov/wms/epsg3031/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&LAYERS=BlueMarble_NextGeneration&FORMAT=image/jpeg&HEIGHT=1024&WIDTH=1024&CRS=EPSG:3031&BBOX=-4194304,-4194304,4194304,4194304",
  },
];

// Polar Projection Constants (Hemispheric Polar Stereographic)
// Radius spans from 90°S at center (r=0) to 25°S on the perimeter (r=475px)
const MAP_CX = 500;
const MAP_CY = 500;
const MAX_RADIUS = 475; // 25°S latitude perimeter

/** Convert Geographic Lat/Lon to Polar Stereographic Screen Coordinates */
export function polarToXY(lat: number, lon: number): { x: number; y: number } {
  const absLat = Math.min(90, Math.max(20, Math.abs(lat)));
  const rFrac = (90 - absLat) / 65; // 90°S -> 0, 25°S -> 1.0
  const r = rFrac * MAX_RADIUS;
  const rad = ((lon - 90) * Math.PI) / 180;
  return {
    x: +(MAP_CX + r * Math.cos(rad)).toFixed(2),
    y: +(MAP_CY + r * Math.sin(rad)).toFixed(2),
  };
}

/** Convert Screen Coordinates back to Geographic Lat/Lon */
export function xyToPolar(x: number, y: number): { lat: number; lon: number } {
  const dx = x - MAP_CX;
  const dy = y - MAP_CY;
  const r = Math.hypot(dx, dy);
  const rFrac = Math.min(1.05, r / MAX_RADIUS);
  const lat = -(90 - rFrac * 65);
  let rad = Math.atan2(dy, dx);
  let lon = (rad * 180) / Math.PI + 90;
  while (lon > 180) lon -= 360;
  while (lon < -180) lon += 360;
  return { lat: +lat.toFixed(2), lon: +lon.toFixed(2) };
}

/** Calculate Great Circle Distance in Nautical Miles */
export function geoDistanceNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065; // Nautical miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/** Calculate Initial Bearing in Degrees */
export function geoBearingDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const y = Math.sin(((lon2 - lon1) * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(((lon2 - lon1) * Math.PI) / 180);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return Math.round((brng + 360) % 360);
}

/** Get Descriptive Sector Name for Antarctic Geolocation */
export function getSectorName(lat: number, lon: number): string {
  if (lat > -40) return "Sub-Tropical Maritime Gateway Zone";
  if (lat > -50) return "Roaring Forties · Southern Ocean";
  if (lat > -60) return "Furious Fifties · Antarctic Circumpolar Current";
  // Lat <= -60 (Antarctic Treaty Zone)
  if (lon >= -75 && lon <= -20) return "Weddell Sea Sector · Antarctic Peninsula";
  if (lon >= -150 && lon < -75) return "Bellingshausen & Amundsen Sea Sector";
  if (lon >= 150 || lon < -150) return "Ross Sea & Victoria Land Sector";
  if (lon >= 60 && lon < 150) return "East Antarctica · Wilkes & Prydz Bay";
  return "Queen Maud Land · Polar Continental Sector";
}

// Research Stations
export interface ResearchStation {
  id: string;
  name: string;
  country: string;
  flag: string;
  lat: number;
  lon: number;
  type: "Permanent" | "Summer" | "Historic";
  desc: string;
  category?: "station" | "gateway";
  elevation?: string;
  established?: number;
}

export const RESEARCH_STATIONS: ResearchStation[] = [
  // --- Indian Polar Research Bases ---
  {
    id: "maitri",
    name: "Maitri Station",
    country: "India",
    flag: "🇮🇳",
    lat: -70.77,
    lon: 11.73,
    type: "Permanent",
    desc: "India's second permanent polar station, situated in the ice-free Schirmacher Oasis. Operational year-round for glaciology, biology & atmospheric physics.",
    elevation: "117 m",
    established: 1989,
  },
  {
    id: "bharati",
    name: "Bharati Station",
    country: "India",
    flag: "🇮🇳",
    lat: -69.41,
    lon: 76.19,
    type: "Permanent",
    desc: "India's high-tech, energy-efficient Antarctic research base in the Larsemann Hills, East Antarctica. Features advanced satellite ground telemetry receivers.",
    elevation: "35 m",
    established: 2012,
  },
  {
    id: "dakshin",
    name: "Dakshin Gangotri",
    country: "India",
    flag: "🇮🇳",
    lat: -70.08,
    lon: 12.0,
    type: "Historic",
    desc: "India's historic first Antarctic research base (established 1983), now preserved as a designated Antarctic historic heritage site and supply depot.",
    elevation: "20 m",
    established: 1983,
  },

  // --- International Polar Stations ---
  {
    id: "mcmurdo",
    name: "McMurdo Station",
    country: "USA",
    flag: "🇺🇸",
    lat: -77.85,
    lon: 166.67,
    type: "Permanent",
    desc: "The largest Antarctic science base, situated on volcanic rock on the southern tip of Ross Island. Serves as logistics hub for the Amundsen-Scott South Pole Station.",
    elevation: "24 m",
    established: 1956,
  },
  {
    id: "southpole",
    name: "Amundsen-Scott South Pole",
    country: "USA",
    flag: "🇺🇸",
    lat: -90.0,
    lon: 0.0,
    type: "Permanent",
    desc: "Geographic South Pole scientific station situated atop the Antarctic ice sheet. Premier facility for sub-millimeter astrophysics and clean-air monitoring.",
    elevation: "2,835 m",
    established: 1956,
  },
  {
    id: "halley",
    name: "Halley VI Station",
    country: "UK",
    flag: "🇬🇧",
    lat: -75.58,
    lon: -26.54,
    type: "Permanent",
    desc: "British Antarctic Survey world-famous ski-mounted relocatable modular base on the Brunt Ice Shelf, dedicated to ozone hole and space weather research.",
    elevation: "30 m",
    established: 2012,
  },
  {
    id: "rothera",
    name: "Rothera Research Station",
    country: "UK",
    flag: "🇬🇧",
    lat: -67.57,
    lon: -68.13,
    type: "Permanent",
    desc: "British Antarctic Survey principal logistics hub with airstrip on Adelaide Island, West Antarctic Peninsula.",
    elevation: "16 m",
    established: 1975,
  },
  {
    id: "vostok",
    name: "Vostok Station",
    country: "Russia",
    flag: "🇷🇺",
    lat: -78.46,
    lon: 106.87,
    type: "Permanent",
    desc: "Pole of Cold inland ice plateau station over subglacial Lake Vostok. Lowest recorded natural ground temperature on Earth (-89.2°C).",
    elevation: "3,488 m",
    established: 1957,
  },
  {
    id: "concordia",
    name: "Concordia Station",
    country: "France / Italy",
    flag: "🇪🇺",
    lat: -75.1,
    lon: 123.33,
    type: "Permanent",
    desc: "Joint French-Italian high-plateau research base at Dome C. Key international facility for deep ice-core drilling and astronomy.",
    elevation: "3,233 m",
    established: 2005,
  },
  {
    id: "neumayer",
    name: "Neumayer Station III",
    country: "Germany",
    flag: "🇩🇪",
    lat: -70.67,
    lon: -8.27,
    type: "Permanent",
    desc: "Alfred Wegener Institute state-of-the-art hydraulic platform station on the Ekström Ice Shelf in Atka Bay.",
    elevation: "40 m",
    established: 2009,
  },
  {
    id: "esperanza",
    name: "Esperanza Base",
    country: "Argentina",
    flag: "🇦🇷",
    lat: -63.4,
    lon: -56.99,
    type: "Permanent",
    desc: "Year-round Argentine settlement base located in Hope Bay at the northern tip of the Trinity / Antarctic Peninsula.",
    elevation: "8 m",
    established: 1952,
  },
  {
    id: "davis",
    name: "Davis Station",
    country: "Australia",
    flag: "🇦🇺",
    lat: -68.58,
    lon: 77.97,
    type: "Permanent",
    desc: "Australian Antarctic Division year-round scientific base in the ice-free Vestfold Hills, Princess Elizabeth Land.",
    elevation: "12 m",
    established: 1957,
  },
  {
    id: "casey",
    name: "Casey Station",
    country: "Australia",
    flag: "🇦🇺",
    lat: -66.28,
    lon: 110.53,
    type: "Permanent",
    desc: "Australian research station in Wilkes Land with the Wilkins Aerodrome intercontinental skiway.",
    elevation: "30 m",
    established: 1969,
  },
  {
    id: "showa",
    name: "Showa Station (Syowa)",
    country: "Japan",
    flag: "🇯🇵",
    lat: -69.0,
    lon: 39.58,
    type: "Permanent",
    desc: "Japanese National Institute of Polar Research base on East Ongul Island, Queen Maud Land.",
    elevation: "29 m",
    established: 1957,
  },
  {
    id: "troll",
    name: "Troll Station",
    country: "Norway",
    flag: "🇳🇴",
    lat: -72.01,
    lon: 2.53,
    type: "Permanent",
    desc: "Norwegian Polar Institute year-round station on the nunatak of Jutulsessen in Queen Maud Land.",
    elevation: "1,275 m",
    established: 1990,
  },

  // --- Southern Hemisphere Antarctic Gateway Ports ---
  {
    id: "capetown",
    name: "Cape Town Gateway Port",
    country: "South Africa",
    flag: "🇿🇦",
    lat: -33.92,
    lon: 18.42,
    type: "Permanent",
    category: "gateway",
    desc: "Primary maritime and air departure port for Indian, South African, German, and Russian Antarctic expeditions to Queen Maud Land & Larsemann Hills.",
    elevation: "5 m",
    established: 1652,
  },
  {
    id: "ushuaia",
    name: "Ushuaia Port (Tierra del Fuego)",
    country: "Argentina",
    flag: "🇦🇷",
    lat: -54.8,
    lon: -68.3,
    type: "Permanent",
    category: "gateway",
    desc: "Southernmost city on Earth on the Beagle Channel. Principal gateway for icebreakers crossing the Drake Passage to the Antarctic Peninsula.",
    elevation: "6 m",
    established: 1884,
  },
  {
    id: "puntaarenas",
    name: "Punta Arenas (Strait of Magellan)",
    country: "Chile",
    flag: "🇨🇱",
    lat: -53.16,
    lon: -70.91,
    type: "Permanent",
    category: "gateway",
    desc: "Chilean polar logistics hub and Antarctic air bridge hub connecting Patagonia to King George Island and Union Glacier.",
    elevation: "10 m",
    established: 1848,
  },
  {
    id: "hobart",
    name: "Hobart Polar Port (Tasmania)",
    country: "Australia",
    flag: "🇦🇺",
    lat: -42.88,
    lon: 147.32,
    type: "Permanent",
    category: "gateway",
    desc: "Headquarters of the Australian Antarctic Division (AAD) and French polar logistics. Principal deepwater port serving East Antarctica, Casey & Davis.",
    elevation: "15 m",
    established: 1804,
  },
  {
    id: "christchurch",
    name: "Christchurch / Lyttelton Port",
    country: "New Zealand",
    flag: "🇳🇿",
    lat: -43.53,
    lon: 172.63,
    type: "Permanent",
    category: "gateway",
    desc: "Historic gateway for Amundsen and Scott. Home to Antarctica New Zealand and the US Antarctic Program (Operation Deep Freeze) air hub.",
    elevation: "8 m",
    established: 1850,
  },
];

// --- High-Fidelity Continental Geometries (Lat / Lon) ---

// 1. ANTARCTICA CONTINENT
const ANTARCTICA_MAINLAND: [number, number][] = [
  [-69.5, 0.0],
  [-69.8, 10.0],
  [-68.5, 20.0],
  [-67.8, 30.0],
  [-67.2, 40.0],
  [-66.8, 50.0], // Enderby Land
  [-66.2, 55.0],
  [-67.0, 65.0],
  [-68.5, 75.0], // Prydz Bay / Larsemann Hills (Bharati)
  [-66.4, 85.0],
  [-65.8, 95.0], // Queen Mary Land
  [-66.0, 105.0], // Wilkes Land (Casey)
  [-65.5, 115.0],
  [-66.2, 125.0],
  [-66.0, 135.0],
  [-66.8, 142.0], // Adelie Land
  [-68.2, 150.0],
  [-70.5, 160.0], // Victoria Land / Cape Adare
  [-72.0, 170.0],
  [-74.5, 172.0],
  [-77.8, 165.0], // McMurdo Sound / Ross Ice Shelf Edge
  [-84.0, 175.0], // Transantarctic Mountains
  [-85.0, -170.0],
  [-83.0, -150.0],
  [-79.0, -160.0], // Marie Byrd Land Ross Margin
  [-75.5, -150.0],
  [-74.0, -135.0], // Marie Byrd Land Coast (Amundsen Sea)
  [-73.0, -120.0],
  [-72.5, -105.0], // Walgreen Coast
  [-73.2, -90.0], // Ellsworth Land (Bellingshausen Sea)
  [-72.0, -80.0],
  [-71.5, -74.0], // Base of Antarctic Peninsula
  [-70.0, -68.0], // Alexander Island
  [-68.0, -67.0], // Graham Land West (Rothera)
  [-64.8, -63.5], // Palmer Land
  [-63.3, -57.5], // Trinity Peninsula / Cape Dubouzet (Tip)
  [-64.2, -56.5], // James Ross Island area (Esperanza)
  [-65.5, -61.0], // Larsen Coast
  [-71.0, -61.0], // Ronne Ice Shelf West boundary
  [-75.5, -60.0], // Ronne-Filchner Bay
  [-78.0, -45.0], // Filchner Shelf coast
  [-77.0, -35.0], // Coats Land
  [-75.0, -25.0], // Caird Coast (Halley VI)
  [-73.0, -15.0], // Princess Martha Coast
  [-71.0, -5.0],
];

// Ice Shelves (Floating glacial extensions)
const ROSS_ICE_SHELF: [number, number][] = [
  [-77.8, 165.0],
  [-78.5, 180.0],
  [-78.2, -165.0],
  [-79.0, -160.0],
  [-83.0, -150.0],
  [-85.0, -170.0],
  [-84.0, 175.0],
];

const RONNE_FILCHNER_ICE_SHELF: [number, number][] = [
  [-71.0, -61.0],
  [-74.5, -55.0],
  [-77.0, -35.0],
  [-78.0, -45.0],
  [-75.5, -60.0],
];

const LARSEN_C_ICE_SHELF: [number, number][] = [
  [-66.0, -61.5],
  [-66.2, -59.5],
  [-69.0, -61.0],
  [-69.5, -63.5],
];

const AMERY_ICE_SHELF: [number, number][] = [
  [-68.5, 70.0],
  [-68.0, 75.0],
  [-73.0, 72.0],
  [-71.5, 68.0],
];

// 2. SOUTH AMERICA (Southern Cone: Chile & Argentina, Patagonia, Tierra del Fuego)
const SOUTH_AMERICA: [number, number][] = [
  [-55.98, -67.27], // Cape Horn
  [-55.0, -66.5], // Staten Island
  [-54.8, -68.3], // Beagle Channel / Ushuaia
  [-52.5, -68.5], // Cape Virgenes / Strait of Magellan Atlantic
  [-51.6, -69.2], // Rio Gallegos
  [-47.0, -66.0], // Gulf of San Jorge
  [-43.0, -64.5], // Valdes Peninsula
  [-39.0, -62.0], // Bahia Blanca
  [-35.5, -57.0], // Rio de la Plata (Buenos Aires)
  [-30.0, -58.0], // North Argentina boundary
  [-28.0, -65.0], // Central interior
  [-28.0, -71.0], // North Chile coast
  [-33.0, -71.6], // Valparaiso / Santiago
  [-40.0, -73.8], // Valdivia / Puerto Montt
  [-43.5, -74.5], // Chonos Archipelago
  [-47.5, -75.0], // Gulf of Penas
  [-51.0, -75.5], // Chilean Fjords / Strait of Magellan Pacific
  [-54.0, -73.0], // Desolacion Island
  [-55.5, -69.5], // Hoste Island
];

// Falkland Islands (Islas Malvinas)
const FALKLAND_ISLANDS: [number, number][] = [
  [-51.3, -60.8],
  [-51.2, -59.0],
  [-52.3, -58.8],
  [-52.4, -60.5],
];

// South Georgia Island
const SOUTH_GEORGIA: [number, number][] = [
  [-54.1, -37.8],
  [-54.0, -36.0],
  [-54.8, -36.2],
  [-54.9, -38.0],
];

// 3. SOUTHERN AFRICA (South Africa, Namibia, Southern Mozambique)
const SOUTHERN_AFRICA: [number, number][] = [
  [-34.83, 20.0], // Cape Agulhas (Southernmost point of Africa)
  [-34.35, 18.47], // Cape of Good Hope / Cape Town
  [-33.0, 17.8], // Saldanha Bay
  [-28.6, 16.5], // Orange River Mouth / Alexander Bay
  [-26.0, 15.0], // Namibia (Lüderitz)
  [-26.0, 32.8], // Mozambique / Maputo
  [-29.8, 31.0], // Durban
  [-33.0, 27.9], // East London
  [-34.0, 25.6], // Port Elizabeth / Algoa Bay
  [-34.2, 22.1], // Mossel Bay
];

// 4. AUSTRALIA & TASMANIA
const AUSTRALIA_MAINLAND: [number, number][] = [
  [-39.1, 146.4], // Wilson's Promontory (Southernmost point)
  [-38.3, 144.9], // Port Phillip / Melbourne
  [-37.5, 149.9], // Cape Howe
  [-34.0, 151.2], // Sydney
  [-28.0, 153.5], // Gold Coast / Brisbane
  [-28.0, 114.5], // Geraldton (Western Australia)
  [-32.0, 115.8], // Perth / Fremantle
  [-34.4, 115.1], // Cape Leeuwin
  [-35.0, 118.0], // Albany
  [-33.8, 122.0], // Esperance
  [-31.8, 128.5], // Great Australian Bight (Eucla)
  [-32.5, 133.5], // Ceduna
  [-34.7, 135.8], // Port Lincoln / Eyre Peninsula
  [-35.5, 138.5], // Adelaide / Gulf St Vincent
];

const TASMANIA: [number, number][] = [
  [-43.6, 146.8], // South East Cape
  [-43.1, 147.9], // Tasman Peninsula
  [-42.0, 148.3], // Freycinet Peninsula
  [-40.8, 148.0], // Cape Portland (Bass Strait)
  [-40.7, 145.0], // Cape Grim (North-West)
  [-42.2, 145.2], // Macquarie Harbour
  [-43.5, 146.1], // South West Cape
];

// 5. NEW ZEALAND (South Island & North Island)
const NZ_SOUTH_ISLAND: [number, number][] = [
  [-47.0, 167.8], // Stewart Island / South Cape
  [-46.6, 168.3], // Bluff / Foveaux Strait
  [-45.9, 170.6], // Otago Peninsula (Dunedin)
  [-43.5, 173.0], // Pegasus Bay (Christchurch)
  [-41.8, 174.2], // Marlborough Sounds / Cook Strait
  [-40.5, 172.7], // Cape Farewell (Golden Bay)
  [-42.0, 171.3], // West Coast (Greymouth)
  [-44.0, 168.5], // Westland / Franz Josef
  [-46.0, 166.6], // Fiordland (Dusky Sound / Puysegur Point)
];

const NZ_NORTH_ISLAND: [number, number][] = [
  [-41.3, 174.8], // Wellington (Cook Strait)
  [-41.6, 175.3], // Cape Palliser
  [-39.5, 177.0], // Hawke's Bay (Napier)
  [-37.7, 178.5], // East Cape
  [-37.7, 176.2], // Bay of Plenty (Tauranga)
  [-36.8, 174.8], // Auckland / Hauraki Gulf
  [-34.4, 173.0], // North Cape / Cape Reinga
  [-38.0, 174.8], // Waikato / Raglan
  [-39.3, 173.8], // Taranaki / Cape Egmont
];

// Sub-Antarctic Island Chains
const SUB_ANTARCTIC_ISLANDS: { name: string; lat: number; lon: number; desc: string }[] = [
  { name: "Bouvet Island (Norway)", lat: -54.42, lon: 3.35, desc: "Most isolated uninhabited volcanic island in the world." },
  { name: "Prince Edward & Marion Is. (SA)", lat: -46.9, lon: 37.8, desc: "Sub-Antarctic biological meteorological sanctuary." },
  { name: "Crozet Islands (France)", lat: -46.4, lon: 51.8, desc: "French Southern and Antarctic Lands volcanic archipelago." },
  { name: "Kerguelen Islands (France)", lat: -49.35, lon: 69.35, desc: "Desolation Islands; major French research base at Port-aux-Français." },
  { name: "Heard Island (Australia)", lat: -53.1, lon: 73.5, desc: "Active volcanic island with Big Ben peak (Mawson Peak)." },
  { name: "Macquarie Island (Australia)", lat: -54.5, lon: 158.95, desc: "UNESCO World Heritage tectonic and royal penguin habitat." },
  { name: "Campbell & Auckland Is. (NZ)", lat: -52.55, lon: 169.15, desc: "New Zealand sub-Antarctic nature reserve." },
  { name: "South Orkney Islands", lat: -60.6, lon: -45.5, desc: "Signy & Orcadas permanent meteorological bases." },
  { name: "South Shetland Islands", lat: -62.0, lon: -58.0, desc: "King George Island with 10+ multinational polar bases." },
];

// Cartographic Labels & Geographic Annotations
interface GeoLabel {
  text: string;
  lat: number;
  lon: number;
  type: "continent" | "sector" | "sea" | "iceshelf" | "ocean" | "neighbor";
  sub?: string;
  angle?: number;
}

const CARTOGRAPHIC_LABELS: GeoLabel[] = [
  // Center Ice Continent
  { text: "ANTARCTICA", lat: -83.5, lon: 45.0, type: "continent", angle: -45 },
  { text: "EAST ANTARCTICA", lat: -77.0, lon: 75.0, type: "sector", angle: 30 },
  { text: "WEST ANTARCTICA", lat: -78.0, lon: -110.0, type: "sector", angle: -30 },
  { text: "ANTARCTIC PENINSULA", lat: -66.5, lon: -64.0, type: "sector", angle: -65 },
  { text: "Queen Maud Land", lat: -73.0, lon: 15.0, type: "sector", angle: 10 },
  { text: "Wilkes Land", lat: -70.0, lon: 120.0, type: "sector", angle: 60 },
  { text: "Marie Byrd Land", lat: -77.0, lon: -130.0, type: "sector", angle: -50 },
  { text: "Victoria Land", lat: -73.5, lon: 160.0, type: "sector", angle: 80 },
  { text: "Enderby Land", lat: -68.5, lon: 52.0, type: "sector", angle: 45 },
  { text: "Ellsworth Land", lat: -74.5, lon: -85.0, type: "sector", angle: -75 },
  { text: "Transantarctic Mountains", lat: -85.0, lon: 150.0, type: "sector", angle: 65 },

  // Ice Shelves
  { text: "Ross Ice Shelf", lat: -81.5, lon: -175.0, type: "iceshelf" },
  { text: "Ronne-Filchner Ice Shelf", lat: -76.0, lon: -50.0, type: "iceshelf" },
  { text: "Larsen C Ice Shelf", lat: -67.5, lon: -62.0, type: "iceshelf" },
  { text: "Amery Ice Shelf", lat: -70.0, lon: 72.0, type: "iceshelf" },

  // Surrounding Continents (Realistic Labels)
  { text: "SOUTH AMERICA", lat: -38.0, lon: -65.0, type: "neighbor" },
  { text: "Patagonia", lat: -48.0, lon: -70.0, type: "neighbor" },
  { text: "Tierra del Fuego", lat: -54.0, lon: -68.5, type: "neighbor" },
  { text: "AFRICA", lat: -28.0, lon: 24.0, type: "neighbor" },
  { text: "South Africa", lat: -31.5, lon: 23.0, type: "neighbor" },
  { text: "AUSTRALIA", lat: -31.0, lon: 135.0, type: "neighbor" },
  { text: "Tasmania", lat: -42.0, lon: 147.0, type: "neighbor" },
  { text: "NEW ZEALAND", lat: -42.5, lon: 172.0, type: "neighbor" },

  // Oceans & Marginal Polar Seas
  { text: "SOUTHERN OCEAN", lat: -58.5, lon: 0.0, type: "ocean" },
  { text: "SOUTH ATLANTIC OCEAN", lat: -38.0, lon: -20.0, type: "ocean" },
  { text: "SOUTH INDIAN OCEAN", lat: -38.0, lon: 80.0, type: "ocean" },
  { text: "SOUTH PACIFIC OCEAN", lat: -40.0, lon: -130.0, type: "ocean" },
  { text: "Weddell Sea", lat: -71.5, lon: -40.0, type: "sea" },
  { text: "Ross Sea", lat: -73.0, lon: 178.0, type: "sea" },
  { text: "Amundsen Sea", lat: -70.5, lon: -115.0, type: "sea" },
  { text: "Bellingshausen Sea", lat: -68.5, lon: -85.0, type: "sea" },
  { text: "Davis Sea", lat: -65.0, lon: 90.0, type: "sea" },
  { text: "Prydz Bay", lat: -68.0, lon: 77.0, type: "sea" },
  { text: "Drake Passage", lat: -59.0, lon: -62.0, type: "sea" },
  { text: "Scotia Sea", lat: -57.5, lon: -40.0, type: "sea" },
  { text: "Tasman Sea", lat: -43.0, lon: 160.0, type: "sea" },
];

// Major Antarctic Maritime Expedition Corridors (from Gateways to Stations)
const EXPEDITION_CORRIDORS: { id: string; name: string; color: string; coords: [number, number][] }[] = [
  {
    id: "india-capetown-maitri",
    name: "Indian Expedition: Cape Town 🇿🇦 ➔ Maitri 🇮🇳",
    color: "#55d6e8",
    coords: [
      [-33.92, 18.42], // Cape Town
      [-50.0, 15.0],
      [-62.0, 13.0],
      [-70.77, 11.73], // Maitri
    ],
  },
  {
    id: "india-capetown-bharati",
    name: "Indian Expedition: Cape Town 🇿🇦 ➔ Larsemann Hills / Bharati 🇮🇳",
    color: "#10b981",
    coords: [
      [-33.92, 18.42], // Cape Town
      [-48.0, 42.0],
      [-58.0, 60.0],
      [-69.41, 76.19], // Bharati
    ],
  },
  {
    id: "ushuaia-peninsula",
    name: "Drake Passage Bridge: Ushuaia 🇦🇷 ➔ Antarctic Peninsula",
    color: "#f59e0b",
    coords: [
      [-54.8, -68.3], // Ushuaia
      [-58.5, -64.0], // Drake Passage
      [-62.2, -58.9], // King George Island
      [-64.8, -63.5], // Palmer Land
    ],
  },
  {
    id: "hobart-casey-davis",
    name: "Australian East Corridor: Hobart 🇦🇺 ➔ Casey / Davis 🇦🇺",
    color: "#3b82f6",
    coords: [
      [-42.88, 147.32], // Hobart
      [-54.0, 135.0],
      [-62.0, 120.0],
      [-66.28, 110.53], // Casey
    ],
  },
  {
    id: "christchurch-mcmurdo",
    name: "Ross Sea Air/Sea Bridge: Christchurch 🇳🇿 ➔ McMurdo 🇺🇸",
    color: "#a855f7",
    coords: [
      [-43.53, 172.63], // Christchurch
      [-53.0, 174.0],
      [-64.0, 176.0],
      [-72.0, 175.0],
      [-77.85, 166.67], // McMurdo
    ],
  },
];

export interface AntarcticPolarMapProps {
  routes?: Route[];
  icebergs?: Iceberg[];
  selectedRouteId?: string;
  onSelectRoute?: (id: string) => void;
  selectedIcebergId?: string | null;
  onSelectIceberg?: (id: string) => void;
  horizonFraction?: number; // 0..1 (for 0h..72h trajectory progression)
  seaIceHeat?: { region: string; polygon: { lat: number; lon: number }[]; concentration: number }[];
  selectedRegion?: string | null;
  onSelectRegion?: (region: string) => void;
  vessel?: {
    name: string;
    position: { lat: number; lon: number };
    headingDeg: number;
    speedKn: number;
    status: string;
  };
  onNavigateToRoute?: (routeId: string) => void;
  className?: string;
  compact?: boolean;
}

export function AntarcticPolarMap({
  routes = [],
  icebergs = [],
  selectedRouteId,
  onSelectRoute,
  selectedIcebergId,
  onSelectIceberg,
  horizonFraction = 0,
  seaIceHeat,
  selectedRegion,
  onSelectRegion,
  vessel,
  className = "",
  compact = false,
}: AntarcticPolarMapProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Map viewport state: zoom & pan
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ clientX: 0, clientY: 0, initPanX: 0, initPanY: 0, hasMoved: false });
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [clickedPin, setClickedPin] = useState<{ lat: number; lon: number; mapX: number; mapY: number } | null>(null);
  const [copied, setCopied] = useState(false);

  // Map View Presets
  const [viewPreset, setViewPreset] = useState<"global" | "polar" | "india">("global");

  // Layer visibility toggles
  const [satelliteSource, setSatelliteSource] = useState<SatelliteProviderId>("nasa-gibs");
  const [layers, setLayers] = useState({
    satellite: false, // Default to ultra-sharp HD Nautical Vector Cartography (100% crisp)
    continents: true,
    graticule: true,
    labels: true,
    stations: true,
    gateways: true,
    corridors: true,
    routes: true,
    icebergs: true,
    seaIce: true,
    currents: true,
    vessel: true,
  });

  const toggleLayer = (key: keyof typeof layers) => {
    setLayers((prev: typeof layers) => ({ ...prev, [key]: !prev[key] }));
  };

  // Hovered item inspection state
  const [hoverCoord, setHoverCoord] = useState<{ lat: number; lon: number; sx: number; sy: number } | null>(null);
  const [selectedStation, setSelectedStation] = useState<ResearchStation | null>(null);
  const [stationQuery, setStationQuery] = useState("");

  // Preset Switcher
  const applyViewPreset = (preset: "global" | "polar" | "india") => {
    setViewPreset(preset);
    if (preset === "global") {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    } else if (preset === "polar") {
      setZoom(1.85);
      setPan({ x: 0, y: 0 });
    } else if (preset === "india") {
      setZoom(2.8);
      // Center in between Maitri (11°E, -70°S) and Bharati (76°E, -69°S)
      setPan({ x: -120, y: 80 });
    }
  };

  // Precomputed SVG Landmass Paths
  const mainlandPath = useMemo(() => {
    const pts = ANTARCTICA_MAINLAND.map(([lat, lon]) => polarToXY(lat, lon));
    return smoothPath(pts) + " Z";
  }, []);

  const rossShelfPath = useMemo(() => {
    const pts = ROSS_ICE_SHELF.map(([lat, lon]) => polarToXY(lat, lon));
    return smoothPath(pts) + " Z";
  }, []);

  const ronneShelfPath = useMemo(() => {
    const pts = RONNE_FILCHNER_ICE_SHELF.map(([lat, lon]) => polarToXY(lat, lon));
    return smoothPath(pts) + " Z";
  }, []);

  const larsenShelfPath = useMemo(() => {
    const pts = LARSEN_C_ICE_SHELF.map(([lat, lon]) => polarToXY(lat, lon));
    return smoothPath(pts) + " Z";
  }, []);

  const ameryShelfPath = useMemo(() => {
    const pts = AMERY_ICE_SHELF.map(([lat, lon]) => polarToXY(lat, lon));
    return smoothPath(pts) + " Z";
  }, []);

  const southAmericaPath = useMemo(() => {
    const pts = SOUTH_AMERICA.map(([lat, lon]) => polarToXY(lat, lon));
    return smoothPath(pts) + " Z";
  }, []);

  const falklandsPath = useMemo(() => {
    const pts = FALKLAND_ISLANDS.map(([lat, lon]) => polarToXY(lat, lon));
    return smoothPath(pts) + " Z";
  }, []);

  const southGeorgiaPath = useMemo(() => {
    const pts = SOUTH_GEORGIA.map(([lat, lon]) => polarToXY(lat, lon));
    return smoothPath(pts) + " Z";
  }, []);

  const southernAfricaPath = useMemo(() => {
    const pts = SOUTHERN_AFRICA.map(([lat, lon]) => polarToXY(lat, lon));
    return smoothPath(pts) + " Z";
  }, []);

  const australiaPath = useMemo(() => {
    const pts = AUSTRALIA_MAINLAND.map(([lat, lon]) => polarToXY(lat, lon));
    return smoothPath(pts) + " Z";
  }, []);

  const tasmaniaPath = useMemo(() => {
    const pts = TASMANIA.map(([lat, lon]) => polarToXY(lat, lon));
    return smoothPath(pts) + " Z";
  }, []);

  const nzSouthPath = useMemo(() => {
    const pts = NZ_SOUTH_ISLAND.map(([lat, lon]) => polarToXY(lat, lon));
    return smoothPath(pts) + " Z";
  }, []);

  const nzNorthPath = useMemo(() => {
    const pts = NZ_NORTH_ISLAND.map(([lat, lon]) => polarToXY(lat, lon));
    return smoothPath(pts) + " Z";
  }, []);

  // Filtered stations for search
  const filteredStations = useMemo(() => {
    if (!stationQuery.trim()) return RESEARCH_STATIONS;
    const q = stationQuery.toLowerCase();
    return RESEARCH_STATIONS.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.country.toLowerCase().includes(q) ||
        s.desc.toLowerCase().includes(q) ||
        (s.category && s.category.includes(q)),
    );
  }, [stationQuery]);

  // Mouse pan & click handlers
  const handleMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    panStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      initPanX: pan.x,
      initPanY: pan.y,
      hasMoved: false,
    };
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    // Convert screen coordinates to SVG viewBox space (0..1000, 0..1000)
    const svgX = (clientX / rect.width) * 1000;
    const svgY = (clientY / rect.height) * 1000;

    // Invert pan & zoom transformation around center (500, 500)
    const mapX = 500 + (svgX - 500 - pan.x) / zoom;
    const mapY = 500 + (svgY - 500 - pan.y) / zoom;

    const polar = xyToPolar(mapX, mapY);
    setHoverCoord({ lat: polar.lat, lon: polar.lon, sx: clientX, sy: clientY });

    if (isPanning) {
      const dx = ((e.clientX - panStartRef.current.clientX) / rect.width) * 1000;
      const dy = ((e.clientY - panStartRef.current.clientY) / rect.height) * 1000;
      if (Math.hypot(e.clientX - panStartRef.current.clientX, e.clientY - panStartRef.current.clientY) > 4) {
        panStartRef.current.hasMoved = true;
      }
      setPan({ x: panStartRef.current.initPanX + dx, y: panStartRef.current.initPanY + dy });
    }
  };

  const handleMouseUp = (e: MouseEvent) => {
    if (isPanning && !panStartRef.current.hasMoved && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;
      const svgX = (clientX / rect.width) * 1000;
      const svgY = (clientY / rect.height) * 1000;
      const mapX = 500 + (svgX - 500 - pan.x) / zoom;
      const mapY = 500 + (svgY - 500 - pan.y) / zoom;
      const polar = xyToPolar(mapX, mapY);
      setClickedPin({ lat: polar.lat, lon: polar.lon, mapX, mapY });
      setCopied(false);
    }
    setIsPanning(false);
  };

  // Wheel zoom handler with smooth cursor anchor
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    const svgX = (clientX / rect.width) * 1000;
    const svgY = (clientY / rect.height) * 1000;

    const factor = e.deltaY < 0 ? 1.16 : 0.86;
    const newZoom = Math.min(6.0, Math.max(0.7, +(zoom * factor).toFixed(2)));
    const scaleChange = newZoom / zoom;
    // Anchor zoom to cursor:
    const newPanX = svgX - 500 - (svgX - 500 - pan.x) * scaleChange;
    const newPanY = svgY - 500 - (svgY - 500 - pan.y) * scaleChange;

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  // Parallels of latitude to draw: 80°S, 70°S, 60°S (Treaty limit), 50°S, 40°S, 30°S
  const LAT_CIRCLES = [
    { lat: -80, label: "80°S (Polar Plateau)" },
    { lat: -70, label: "70°S (Coastal Bases / Ice Shelves)" },
    { lat: -60, label: "60°S (Antarctic Treaty Limit & Polar Front)" },
    { lat: -50, label: "50°S (Furious Fifties / ACC)" },
    { lat: -40, label: "40°S (Roaring Forties / Southern Ports)" },
    { lat: -30, label: "30°S (Sub-Tropical Boundary)" },
  ];

  // Meridians of longitude (radial lines every 30 degrees)
  const LON_RADIALS = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

  return (
    <div
      className={cx(
        "relative flex flex-col overflow-hidden rounded-xl border select-none transition-colors duration-300",
        isDark
          ? "border-[#1d445c] bg-[#071624] text-[#eaf6f8]"
          : "border-[#dfd8cc] bg-[#f8f5ee] text-[#0d2433]",
        fullscreen ? "fixed inset-0 z-50 rounded-none" : "h-full min-h-[500px] w-full",
        className,
      )}
    >
      {/* Top Polar Toolbar */}
      <div
        className={cx(
          "flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2 backdrop-blur-md transition-colors",
          isDark
            ? "border-[#1d445c]/70 bg-[#071927]/90"
            : "border-[#e2d8c7] bg-[#fdfbf7]/90",
        )}
      >
        {/* Left: Map Title & Status */}
        {!compact ? (
          <div className="flex items-center gap-2">
            <div className="flex h-6.5 w-6.5 items-center justify-center rounded-md border border-[#55d6e8]/40 bg-[#55d6e8]/10 text-[#55d6e8]">
              <Compass size={15} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] font-bold tracking-tight">
                  {viewPreset === "global"
                    ? "Southern Hemisphere Polar Projection"
                    : viewPreset === "india"
                    ? "Indian Antarctic Mission Sector (Maitri & Bharati)"
                    : "Pan-Antarctic Polar Chart"}
                </span>
                <span className="rounded bg-[#55d6e8]/15 px-1 py-0.2 font-mono text-[8.5px] font-bold uppercase text-[#55d6e8]">
                  EPSG:3031
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#8ccfe0] light:text-[#0f768e]">
            <Compass size={14} />
            <span className="font-bold">2D Polar Projection</span>
            <span className="text-[#5f7d89]">·</span>
            <span className="text-[10px] text-[#91aeb9] light:text-[#5a7686]">Click map for coordinates</span>
          </div>
        )}

        {/* Center: Search for Stations / Ports / Features */}
        {!compact && (
          <div className="hidden lg:flex items-center gap-1.5 rounded-md border border-[#1d445c]/60 bg-[#0d2433]/80 light:border-[#d8d0c2] light:bg-[#eee8dc] px-2 py-1 text-[11px] focus-within:border-[#55d6e8]/70">
            <Search size={12} className="text-[#91aeb9] light:text-[#5a7686]" />
            <input
              value={stationQuery}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setStationQuery(e.target.value)}
              placeholder="Search station, port (e.g. Maitri, Cape Town)..."
              className="w-48 bg-transparent font-sans text-[11px] outline-none text-[#eaf6f8] light:text-[#0d2433] placeholder:text-[#5f7d89] light:placeholder:text-[#8ea5b3]"
            />
            {stationQuery && (
              <button onClick={() => setStationQuery("")} className="text-[#91aeb9] hover:text-[#eaf6f8]" aria-label="Clear search">
                <X size={11} />
              </button>
            )}
          </div>
        )}

        {/* View Presets, Zoom Controls, Layers & Fullscreen */}
        <div className="flex items-center gap-1.5">
          {/* View Preset Buttons */}
          <div className="hidden sm:flex items-center rounded-lg border border-[#1d445c]/60 bg-[#0d2433]/60 light:border-[#d8d0c2] light:bg-[#eee8dc] p-0.5">
            <button
              onClick={() => applyViewPreset("global")}
              className={cx(
                "rounded px-2 py-0.5 text-[10px] font-bold transition-all",
                viewPreset === "global"
                  ? "bg-[#55d6e8] text-[#071521] shadow-sm"
                  : "text-[#91aeb9] hover:text-[#eaf6f8] light:text-[#5a7686]",
              )}
              title="Full Southern Hemisphere with South America, Africa, Australia, New Zealand"
            >
              <Globe size={11} className="inline mr-1 -mt-0.5" /> All
            </button>
            <button
              onClick={() => applyViewPreset("polar")}
              className={cx(
                "rounded px-2 py-0.5 text-[10px] font-bold transition-all",
                viewPreset === "polar"
                  ? "bg-[#55d6e8] text-[#071521] shadow-sm"
                  : "text-[#91aeb9] hover:text-[#eaf6f8] light:text-[#5a7686]",
              )}
              title="Zoom to Antarctic Polar Circle (60°S - 90°S)"
            >
              <Snowflake size={11} className="inline mr-1 -mt-0.5" /> Polar Sheet
            </button>
            <button
              onClick={() => applyViewPreset("india")}
              className={cx(
                "rounded px-2 py-0.5 text-[10px] font-bold transition-all",
                viewPreset === "india"
                  ? "bg-[#55d6e8] text-[#071521] shadow-sm"
                  : "text-[#91aeb9] hover:text-[#eaf6f8] light:text-[#5a7686]",
              )}
              title="Zoom to Indian Stations (Maitri & Bharati)"
            >
              🇮🇳 Maitri & Bharati
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center rounded-lg border border-[#1d445c]/60 bg-[#0d2433]/60 light:border-[#d8d0c2] light:bg-[#eee8dc] p-0.5">
            <button
              onClick={() => setZoom((z) => Math.min(6.0, +(z + 0.25).toFixed(2)))}
              className="rounded p-1 text-[#91aeb9] hover:bg-[#132f40] hover:text-[#eaf6f8] light:text-[#5a7686]"
              title="Zoom in"
              aria-label="Zoom in"
            >
              <Plus size={12} />
            </button>
            <span className="px-1 font-mono text-[10px] font-bold text-[#8ccfe0] light:text-[#0f768e]">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom((z) => Math.max(0.7, +(z - 0.25).toFixed(2)))}
              className="rounded p-1 text-[#91aeb9] hover:bg-[#132f40] hover:text-[#eaf6f8] light:text-[#5a7686]"
              title="Zoom out"
              aria-label="Zoom out"
            >
              <Minus size={12} />
            </button>
            <button
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
                setViewPreset("global");
              }}
              className="rounded p-1 text-[#91aeb9] hover:bg-[#132f40] hover:text-[#eaf6f8] light:text-[#5a7686]"
              title="Reset view"
              aria-label="Reset view"
            >
              <RotateCcw size={11} />
            </button>
          </div>

          {/* Layers Toggle Button */}
          <button
            onClick={() => setLayersOpen((o) => !o)}
            className={cx(
              "flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-bold transition-all",
              layersOpen
                ? "border-[#55d6e8] bg-[#55d6e8]/20 text-[#55d6e8] light:border-[#0f768e] light:bg-[#0f768e]/15 light:text-[#0f768e]"
                : "border-[#1d445c]/60 bg-[#0d2433]/60 text-[#91aeb9] hover:text-[#eaf6f8] light:border-[#d8d0c2] light:bg-[#eee8dc] light:text-[#5a7686]",
            )}
            title="Toggle Top Map Layers Ribbon"
          >
            <Layers size={12} />
            <span>Layers</span>
            <span className="rounded bg-[#55d6e8]/20 light:bg-[#0f768e]/20 px-1 font-mono text-[9px]">
              {Object.values(layers).filter(Boolean).length}
            </span>
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={() => setFullscreen((f) => !f)}
            className="flex h-6.5 w-6.5 items-center justify-center rounded-md border border-[#1d445c]/60 bg-[#0d2433]/60 light:border-[#d8d0c2] light:bg-[#eee8dc] text-[#91aeb9] hover:text-[#eaf6f8] light:text-[#5a7686]"
            title={fullscreen ? "Exit Fullscreen" : "Fullscreen Map"}
            aria-label={fullscreen ? "Exit Fullscreen" : "Fullscreen Map"}
          >
            {fullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
        </div>
      </div>

      {/* Top Horizontal Layer Ribbon (Positioned cleanly on TOP of map, not beside it!) */}
      {layersOpen && (
        <div
          className={cx(
            "flex flex-wrap items-center gap-1.5 border-b px-3 py-1.5 backdrop-blur-md transition-all animate-in slide-in-from-top-1 z-30",
            isDark
              ? "border-[#1d445c]/70 bg-[#071927]/98 text-[#c8dde3]"
              : "border-[#dfd8cc] bg-[#faf8f5]/98 text-[#3a5563]",
          )}
        >
          <div className="flex items-center gap-1 font-mono text-[9px] font-bold uppercase text-[#55d6e8] light:text-[#0f768e] mr-1">
            <Layers size={11} />
            <span>MAP LAYERS:</span>
          </div>

          {/* Real Satellite API Source Selector */}
          <div className="flex items-center gap-1 border-r border-[#1d445c]/50 light:border-[#d8d0c2] pr-2 mr-1">
            <span className="font-mono text-[9px] font-bold uppercase text-[#55d6e8] light:text-[#0f768e]">
              🛰️ SAT API:
            </span>
            {SATELLITE_PROVIDERS.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setSatelliteSource(p.id);
                  if (!layers.satellite) toggleLayer("satellite");
                }}
                className={cx(
                  "rounded px-2 py-0.5 font-mono text-[9.5px] font-semibold transition-all",
                  satelliteSource === p.id && layers.satellite
                    ? "bg-[#55d6e8] text-[#071521] shadow-[0_0_8px_#55d6e8]/40 light:bg-[#0f768e] light:text-white"
                    : "text-[#91aeb9] hover:bg-[#132f40] hover:text-[#eaf6f8] light:text-[#5a7686]",
                )}
                title={`Live Satellite Stream from ${p.tag}`}
              >
                {p.name}
              </button>
            ))}
          </div>

          <LayerChip label="🛰️ Real Satellite Basemap" active={layers.satellite} onClick={() => toggleLayer("satellite")} />
          <LayerChip label="🌍 Continents & Borders" active={layers.continents} onClick={() => toggleLayer("continents")} />
          <LayerChip label="🏢 Research Stations" active={layers.stations} onClick={() => toggleLayer("stations")} />
          <LayerChip label="⚓ Gateway Ports" active={layers.gateways} onClick={() => toggleLayer("gateways")} />
          <LayerChip label="🚢 Corridors & Routes" active={layers.corridors} onClick={() => toggleLayer("corridors")} />
          <LayerChip label="🌐 Polar Graticule" active={layers.graticule} onClick={() => toggleLayer("graticule")} />
          <LayerChip label="🌊 ACC Current" active={layers.currents} onClick={() => toggleLayer("currents")} />
          <LayerChip label="❄️ Sea-Ice Concentration" active={layers.seaIce} onClick={() => toggleLayer("seaIce")} />
          <LayerChip label="🧊 Iceberg Drift" active={layers.icebergs} onClick={() => toggleLayer("icebergs")} />
          <LayerChip label="📡 Live AIS Vessel" active={layers.vessel} onClick={() => toggleLayer("vessel")} />

          <button
            onClick={() => setLayersOpen(false)}
            className="ml-auto flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-[#91aeb9] hover:text-[#eaf6f8] light:text-[#5a7686] light:hover:text-[#0d2433]"
            title="Close Layer Ribbon"
          >
            <X size={11} /> Close
          </button>
        </div>
      )}

      {/* Main SVG Vector Canvas */}
      <div
        className="relative flex-1 cursor-crosshair overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => setIsPanning(false)}
        onWheel={handleWheel}
      >
        <svg
          ref={svgRef}
          viewBox="0 0 1000 1000"
          className="h-full w-full select-none"
        >
          <defs>
            {/* Polar Circle Clip Path */}
            <clipPath id="polarCircleClip">
              <circle cx="500" cy="500" r="485" />
            </clipPath>

            {/* Realistic Southern Ocean Deep Gradient */}
            <radialGradient id="oceanGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={isDark ? "#041421" : "#cbe5ee"} />
              <stop offset="50%" stopColor={isDark ? "#061b2b" : "#b8d9e6"} />
              <stop offset="80%" stopColor={isDark ? "#09253a" : "#a6ccdb"} />
              <stop offset="100%" stopColor={isDark ? "#0d2e47" : "#95bed0"} />
            </radialGradient>

            {/* Antarctic Ice Sheet Glacial Gradient (Crisp, High-Contrast) */}
            <radialGradient id="antarcticIceGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={isDark ? "#ffffff" : "#ffffff"} />
              <stop offset="40%" stopColor={isDark ? "#f0f8fd" : "#f5fbfe"} />
              <stop offset="80%" stopColor={isDark ? "#d9f0fa" : "#e6f4fa"} />
              <stop offset="100%" stopColor={isDark ? "#bfe3f5" : "#d0ebf7"} />
            </radialGradient>

            {/* Ice Shelf Pattern */}
            <linearGradient id="iceShelfGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.3" />
            </linearGradient>

            {/* Distinct Crisp Terrain Gradients for Each Continent */}
            <linearGradient id="patagoniaTerrainGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={isDark ? "#284d35" : "#6b9360"} />
              <stop offset="100%" stopColor={isDark ? "#1d3d29" : "#577d4c"} />
            </linearGradient>

            <linearGradient id="africaTerrainGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={isDark ? "#3f4d2c" : "#7e9652"} />
              <stop offset="100%" stopColor={isDark ? "#2d381e" : "#688040"} />
            </linearGradient>

            <linearGradient id="australiaTerrainGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={isDark ? "#4d422a" : "#9c8b5e"} />
              <stop offset="100%" stopColor={isDark ? "#382f1b" : "#85754b"} />
            </linearGradient>

            <linearGradient id="nzTerrainGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={isDark ? "#264a33" : "#628d57"} />
              <stop offset="100%" stopColor={isDark ? "#1c3826" : "#4e7544"} />
            </linearGradient>

            {/* Radar Sweep Effect */}
            <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#55d6e8" stopOpacity="0.3" />
              <stop offset="70%" stopColor="#55d6e8" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#55d6e8" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Interactive Zoomable Map Canvas Group */}
          <g transform={`translate(500, 500) translate(${pan.x}, ${pan.y}) scale(${zoom}) translate(-500, -500)`}>
            {/* Background Ocean Disk */}
            <circle cx="500" cy="500" r="485" fill="url(#oceanGradient)" stroke={isDark ? "#1d445c" : "#b0d2de"} strokeWidth="2" />

            {/* Crisp Bathymetric Ocean Depth Contour Rings */}
            <g id="bathymetry-depth-rings" opacity={isDark ? "0.4" : "0.5"}>
              <circle cx="500" cy="500" r="455" fill="none" stroke={isDark ? "#10324c" : "#89b1c4"} strokeWidth="1" />
              <circle cx="500" cy="500" r="375" fill="none" stroke={isDark ? "#164466" : "#76a2b7"} strokeWidth="1" strokeDasharray="5 4" />
              <circle cx="500" cy="500" r="295" fill="none" stroke={isDark ? "#1c5680" : "#6392a9"} strokeWidth="1.2" strokeDasharray="4 3" />
            </g>

            {/* Real NASA / ESRI Satellite Polar Imagery API Basemap Layer */}
            {layers.satellite && (
              <g clipPath="url(#polarCircleClip)">
                <image
                  href={
                    satelliteSource === "nasa-gibs"
                      ? SATELLITE_PROVIDERS[0].url
                      : satelliteSource === "esri-polar"
                      ? SATELLITE_PROVIDERS[1].url
                      : SATELLITE_PROVIDERS[2].url
                  }
                  x="15"
                  y="15"
                  width="970"
                  height="970"
                  preserveAspectRatio="xMidYMid slice"
                  opacity="0.96"
                  onError={(e: any) => {
                    // Fallback to local asset if external network rate-limited or offline
                    (e.target as SVGImageElement).setAttribute("href", antarcticSatelliteImg);
                  }}
                />
              </g>
            )}

          {/* Graticule Latitude Parallels */}
          {layers.graticule && (
            <g className="opacity-70">
              {LAT_CIRCLES.map((c) => {
                const r = ((90 - Math.abs(c.lat)) / 65) * MAX_RADIUS;
                const isTreatyLimit = c.lat === -60;
                return (
                  <g key={c.lat}>
                    <circle
                      cx="500"
                      cy="500"
                      r={r}
                      fill="none"
                      stroke={isTreatyLimit ? "#55d6e8" : isDark ? "#1d445c" : "#91b6c7"}
                      strokeWidth={isTreatyLimit ? "1.8" : "0.8"}
                      strokeDasharray={isTreatyLimit ? "6 3" : "3 3"}
                    />
                    <text
                      x="505"
                      y={500 - r + (c.lat === -80 ? 12 : -4)}
                      fontSize="9"
                      fontWeight="bold"
                      fill={isTreatyLimit ? "#55d6e8" : isDark ? "#8ccfe0" : "#2b6b80"}
                      fontFamily="monospace"
                      letterSpacing="0.05em"
                    >
                      {c.lat}°S {isTreatyLimit && "· ANTARCTIC TREATY & POLAR FRONT"}
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* Graticule Longitude Meridians */}
          {layers.graticule && (
            <g className="opacity-60">
              {LON_RADIALS.map((lon) => {
                const rad = ((lon - 90) * Math.PI) / 180;
                const x2 = 500 + MAX_RADIUS * Math.cos(rad);
                const y2 = 500 + MAX_RADIUS * Math.sin(rad);
                const labelX = 500 + (MAX_RADIUS + 12) * Math.cos(rad);
                const labelY = 500 + (MAX_RADIUS + 12) * Math.sin(rad);

                let textLabel = `${lon}°`;
                if (lon === 0) textLabel = "0° (Prime Meridian)";
                else if (lon === 180) textLabel = "180° (Antimeridian)";
                else if (lon < 180) textLabel = `${lon}°E`;
                else textLabel = `${360 - lon}°W`;

                return (
                  <g key={lon}>
                    <line x1="500" y1="500" x2={x2} y2={y2} stroke={isDark ? "#1d445c" : "#91b6c7"} strokeWidth="0.8" strokeDasharray="2 4" />
                    <text
                      x={labelX}
                      y={labelY}
                      fontSize="8"
                      fontWeight="bold"
                      fill={isDark ? "#7ba5b5" : "#4a6878"}
                      fontFamily="monospace"
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      {textLabel}
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* Antarctic Circumpolar Current (ACC) Flow Vector Rings */}
          {layers.currents && (
            <g opacity="0.6">
              <circle cx="500" cy="500" r="310" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="14 10" className="animate-pulse" />
              <circle cx="500" cy="500" r="335" fill="none" stroke="#55d6e8" strokeWidth="1.2" strokeDasharray="20 14" />
              {/* Flow direction markers */}
              {[30, 90, 150, 210, 270, 330].map((deg) => {
                const rad = ((deg - 90) * Math.PI) / 180;
                const x = 500 + 322 * Math.cos(rad);
                const y = 500 + 322 * Math.sin(rad);
                return (
                  <text
                    key={deg}
                    x={x}
                    y={y}
                    fontSize="10"
                    fill="#38bdf8"
                    fontWeight="bold"
                    transform={`rotate(${deg + 90}, ${x}, ${y})`}
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    ▶
                  </text>
                );
              })}
            </g>
          )}

          {/* 1. Surrounding Continents Layer (Ultra-Crisp Vector Cartography) */}
          {layers.continents && (
            <g id="surrounding-continents">
              {/* South America (Patagonia & Tierra del Fuego) */}
              <g id="south-america">
                <path
                  d={southAmericaPath}
                  fill={layers.satellite ? "rgba(85,214,232,0.04)" : "url(#patagoniaTerrainGrad)"}
                  stroke={layers.satellite ? (isDark ? "#55d6e8" : "#0f768e") : (isDark ? "#4ade80" : "#3b8256")}
                  strokeWidth={layers.satellite ? "1.2" : "1.6"}
                />
                <path
                  d={falklandsPath}
                  fill={layers.satellite ? "rgba(85,214,232,0.08)" : "url(#patagoniaTerrainGrad)"}
                  stroke={layers.satellite ? (isDark ? "#55d6e8" : "#0f768e") : (isDark ? "#4ade80" : "#3b8256")}
                  strokeWidth="1.2"
                />
                <path
                  d={southGeorgiaPath}
                  fill={layers.satellite ? "rgba(85,214,232,0.08)" : "url(#patagoniaTerrainGrad)"}
                  stroke={layers.satellite ? (isDark ? "#55d6e8" : "#0f768e") : (isDark ? "#4ade80" : "#3b8256")}
                  strokeWidth="1.2"
                />
              </g>

              {/* Southern Africa */}
              <g id="southern-africa">
                <path
                  d={southernAfricaPath}
                  fill={layers.satellite ? "rgba(85,214,232,0.04)" : "url(#africaTerrainGrad)"}
                  stroke={layers.satellite ? (isDark ? "#55d6e8" : "#0f768e") : (isDark ? "#a3e635" : "#658c38")}
                  strokeWidth={layers.satellite ? "1.2" : "1.6"}
                />
              </g>

              {/* Australia & Tasmania */}
              <g id="australia-tasmania">
                <path
                  d={australiaPath}
                  fill={layers.satellite ? "rgba(85,214,232,0.04)" : "url(#australiaTerrainGrad)"}
                  stroke={layers.satellite ? (isDark ? "#55d6e8" : "#0f768e") : (isDark ? "#facc15" : "#997f33")}
                  strokeWidth={layers.satellite ? "1.2" : "1.6"}
                />
                <path
                  d={tasmaniaPath}
                  fill={layers.satellite ? "rgba(85,214,232,0.08)" : "url(#australiaTerrainGrad)"}
                  stroke={layers.satellite ? (isDark ? "#55d6e8" : "#0f768e") : (isDark ? "#facc15" : "#997f33")}
                  strokeWidth="1.2"
                />
              </g>

              {/* New Zealand */}
              <g id="new-zealand">
                <path
                  d={nzSouthPath}
                  fill={layers.satellite ? "rgba(85,214,232,0.08)" : "url(#nzTerrainGrad)"}
                  stroke={layers.satellite ? (isDark ? "#55d6e8" : "#0f768e") : (isDark ? "#4ade80" : "#3b8256")}
                  strokeWidth="1.4"
                />
                <path
                  d={nzNorthPath}
                  fill={layers.satellite ? "rgba(85,214,232,0.08)" : "url(#nzTerrainGrad)"}
                  stroke={layers.satellite ? (isDark ? "#55d6e8" : "#0f768e") : (isDark ? "#4ade80" : "#3b8256")}
                  strokeWidth="1.4"
                />
              </g>

              {/* Sub-Antarctic Islands */}
              {SUB_ANTARCTIC_ISLANDS.map((isl) => {
                const pt = polarToXY(isl.lat, isl.lon);
                return (
                  <g key={isl.name} className="group">
                    <circle cx={pt.x} cy={pt.y} r="3.2" fill="#55d6e8" stroke="#071624" strokeWidth="1" />
                    <text x={pt.x + 5} y={pt.y - 4} fontSize="7" fontWeight="bold" fill={isDark ? "#9cdbf0" : "#214e5f"} fontFamily="sans-serif">
                      {isl.name}
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* 2. Sea Ice Heatmap Layer */}
          {layers.seaIce && seaIceHeat && (
            <g id="sea-ice-layer" opacity="0.65">
              {seaIceHeat.map((s, i) => {
                const pts = s.polygon.map((p) => polarToXY(p.lat, p.lon));
                const d = smoothPath(pts) + " Z";
                const isSel = selectedRegion === s.region;
                return (
                  <path
                    key={s.region || i}
                    d={d}
                    fill={seaIceColor(s.concentration)}
                    stroke={isSel ? "#ffffff" : seaIceColor(s.concentration)}
                    strokeWidth={isSel ? "2.5" : "1"}
                    className="cursor-pointer transition-all hover:opacity-90"
                    onClick={() => onSelectRegion?.(s.region)}
                  >
                    <title>{`${s.region}: ${s.concentration}% Pack-Ice Concentration`}</title>
                  </path>
                );
              })}
            </g>
          )}

          {/* 3. Ice Shelves Layer */}
          <g id="ice-shelves" opacity={layers.satellite ? 0.45 : 0.95}>
            <path d={rossShelfPath} fill={layers.satellite ? "rgba(85,214,232,0.15)" : "url(#iceShelfGrad)"} stroke="#38bdf8" strokeWidth="1.4" strokeDasharray="4 2" />
            <path d={ronneShelfPath} fill={layers.satellite ? "rgba(85,214,232,0.15)" : "url(#iceShelfGrad)"} stroke="#38bdf8" strokeWidth="1.4" strokeDasharray="4 2" />
            <path d={larsenShelfPath} fill={layers.satellite ? "rgba(85,214,232,0.15)" : "url(#iceShelfGrad)"} stroke="#38bdf8" strokeWidth="1.4" strokeDasharray="4 2" />
            <path d={ameryShelfPath} fill={layers.satellite ? "rgba(85,214,232,0.15)" : "url(#iceShelfGrad)"} stroke="#38bdf8" strokeWidth="1.4" strokeDasharray="4 2" />
          </g>

          {/* 4. Antarctica Mainland Ice Sheet (Razor Sharp Vector Cartography) */}
          <g id="antarctica-mainland">
            <path
              d={mainlandPath}
              fill={layers.satellite ? "transparent" : "url(#antarcticIceGradient)"}
              stroke={layers.satellite ? "rgba(255, 255, 255, 0.7)" : (isDark ? "#ffffff" : "#2e7b9e")}
              strokeWidth={layers.satellite ? "1.4" : "2.2"}
              className="transition-all duration-300"
            />

            {/* Elevation / Transantarctic Mountain Ridge Shading */}
            {!layers.satellite && (
              <>
                <path
                  d="M 500 500 Q 560 520 620 480 T 680 430 Q 720 380 750 340"
                  fill="none"
                  stroke={isDark ? "#64748b" : "#475569"}
                  strokeWidth="2.5"
                  strokeDasharray="5 3"
                  opacity="0.85"
                />
                <path
                  d="M 500 500 Q 420 540 370 590 T 310 650"
                  fill="none"
                  stroke={isDark ? "#64748b" : "#475569"}
                  strokeWidth="2.2"
                  strokeDasharray="5 3"
                  opacity="0.85"
                />
              </>
            )}
          </g>

          {/* 5. Expedition Transit Corridors Layer */}
          {layers.corridors && (
            <g id="expedition-corridors">
              {EXPEDITION_CORRIDORS.map((cor) => {
                const pts = cor.coords.map(([lat, lon]) => polarToXY(lat, lon));
                const d = smoothPath(pts);
                return (
                  <g key={cor.id}>
                    <path d={d} fill="none" stroke={cor.color} strokeWidth="1.8" strokeDasharray="5 4" opacity="0.8" />
                  </g>
                );
              })}
            </g>
          )}

          {/* 6. Active Voyage Routes Layer */}
          {layers.routes && (
            <g id="routes-layer">
              {routes.map((r) => {
                const pts = r.coordinates.map((c) => polarToXY(c.lat, c.lon));
                const d = smoothPath(pts);
                const isSel = r.id === selectedRouteId;
                return (
                  <g key={r.id} onClick={() => onSelectRoute?.(r.id)} className="cursor-pointer">
                    <path
                      d={d}
                      fill="none"
                      stroke={r.color}
                      strokeWidth={isSel ? "4.5" : "2.5"}
                      strokeLinecap="round"
                      opacity={isSel ? "1.0" : "0.55"}
                    />
                    {isSel && (
                      <path
                        d={d}
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                        strokeDasharray="6 4"
                        className="animate-pulse"
                      />
                    )}
                    {/* Waypoints */}
                    {r.waypoints.map((w, idx) => {
                      const wpt = polarToXY(w.lat, w.lon);
                      return (
                        <circle
                          key={idx}
                          cx={wpt.x}
                          cy={wpt.y}
                          r={isSel ? "4" : "2.5"}
                          fill={r.color}
                          stroke="#ffffff"
                          strokeWidth="1.2"
                        />
                      );
                    })}
                  </g>
                );
              })}
            </g>
          )}

          {/* 7. Iceberg Trajectories & Uncertainty Ribbons */}
          {layers.icebergs && (
            <g id="icebergs-layer">
              {icebergs.map((ib) => {
                const pts = ib.predictedPath.map((p) => polarToXY(p.lat, p.lon));
                const sliced = slicePath(pts, Math.max(0.05, horizonFraction));
                const color = RISK_COLORS[ib.riskLevel];
                const isSel = selectedIcebergId === ib.id;
                const endPt = sliced[sliced.length - 1] ?? pts[0];

                // Uncertainty corridor ribbon
                const widths = ib.uncertainty.slice(0, sliced.length).map((u) => u * 0.9);
                const corridorD = corridorPath(sliced, widths);

                return (
                  <g key={ib.id} onClick={() => onSelectIceberg?.(ib.id)} className="cursor-pointer">
                    {/* 95% spatial dispersion ribbon */}
                    {corridorD && (
                      <path
                        d={corridorD}
                        fill={color}
                        fillOpacity={isSel ? "0.35" : "0.18"}
                        stroke={color}
                        strokeWidth="0.75"
                        strokeDasharray="3 3"
                      />
                    )}
                    {/* Trajectory centerline */}
                    <path
                      d={smoothPath(sliced)}
                      fill="none"
                      stroke={color}
                      strokeWidth={isSel ? "3" : "1.8"}
                      strokeLinecap="round"
                    />
                    {/* Iceberg Marker Diamond */}
                    <g transform={`translate(${endPt.x}, ${endPt.y})`}>
                      <polygon
                        points="0,-6 6,0 0,6 -6,0"
                        fill={color}
                        stroke="#ffffff"
                        strokeWidth="1.5"
                        className={isSel ? "animate-bounce" : ""}
                      />
                      <text
                        x="9"
                        y="3"
                        fontSize="9"
                        fontWeight="bold"
                        fill={isDark ? "#ffffff" : "#0d2433"}
                        fontFamily="monospace"
                      >
                        {ib.id}
                      </text>
                    </g>
                  </g>
                );
              })}
            </g>
          )}

          {/* 8. Live Research Vessel (AIS Telemetry) */}
          {layers.vessel && vessel && (
            <g id="vessel-layer">
              {(() => {
                const vPos = polarToXY(vessel.position.lat, vessel.position.lon);
                return (
                  <g transform={`translate(${vPos.x}, ${vPos.y})`} className="cursor-pointer">
                    {/* Vessel radar ping glow */}
                    <circle cx="0" cy="0" r="18" fill="url(#radarGlow)" className="animate-ping" opacity="0.75" />
                    <circle cx="0" cy="0" r="8" fill="#55d6e8" stroke="#ffffff" strokeWidth="2" />
                    {/* Heading indicator vector */}
                    <line
                      x1="0"
                      y1="0"
                      x2={16 * Math.sin((vessel.headingDeg * Math.PI) / 180)}
                      y2={-16 * Math.cos((vessel.headingDeg * Math.PI) / 180)}
                      stroke="#55d6e8"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    {/* Vessel Name Badge */}
                    <g transform="translate(12, -10)">
                      <rect x="-2" y="-9" width="130" height="18" rx="4" fill="#0d2433" stroke="#55d6e8" strokeWidth="1" />
                      <text x="4" y="3" fontSize="9" fontWeight="bold" fill="#55d6e8" fontFamily="monospace">
                        🚢 {vessel.name} ({vessel.speedKn} kn)
                      </text>
                    </g>
                  </g>
                );
              })()}
            </g>
          )}

          {/* 9. Geographic & Regional Sector Labels */}
          {layers.labels && (
            <g id="cartographic-labels" className="pointer-events-none select-none">
              {CARTOGRAPHIC_LABELS.map((lbl, idx) => {
                const pt = polarToXY(lbl.lat, lbl.lon);
                let fontSize = 10;
                let fontWeight = "normal";
                let fill = isDark ? "#a2c7d4" : "#325363";
                let letterSpacing = "0.08em";

                if (lbl.type === "continent") {
                  fontSize = 18;
                  fontWeight = "900";
                  fill = isDark ? "#ffffff" : "#0d2433";
                  letterSpacing = "0.22em";
                } else if (lbl.type === "neighbor") {
                  fontSize = 12;
                  fontWeight = "bold";
                  fill = isDark ? "#86efac" : "#166534";
                  letterSpacing = "0.15em";
                } else if (lbl.type === "sector") {
                  fontSize = 11;
                  fontWeight = "bold";
                  fill = isDark ? "#c2e7f2" : "#173b4d";
                } else if (lbl.type === "ocean") {
                  fontSize = 11;
                  fontWeight = "bold";
                  fill = isDark ? "#5faec4" : "#27687f";
                  letterSpacing = "0.18em";
                } else if (lbl.type === "iceshelf") {
                  fontSize = 9;
                  fontWeight = "bold";
                  fill = isDark ? "#38bdf8" : "#0284c7";
                }

                return (
                  <text
                    key={idx}
                    x={pt.x}
                    y={pt.y}
                    fontSize={fontSize}
                    fontWeight={fontWeight}
                    letterSpacing={letterSpacing}
                    fill={fill}
                    transform={lbl.angle ? `rotate(${lbl.angle}, ${pt.x}, ${pt.y})` : undefined}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="font-sans drop-shadow-sm"
                  >
                    {lbl.text}
                  </text>
                );
              })}
            </g>
          )}

          {/* 10. Research Stations & Gateway Ports Layer */}
          {layers.stations && (
            <g id="research-stations-layer">
              {filteredStations.map((st) => {
                const pt = polarToXY(st.lat, st.lon);
                const isIndia = st.country === "India";
                const isGateway = st.category === "gateway";
                const isSel = selectedStation?.id === st.id;

                let markerColor = "#55d6e8";
                if (isIndia) markerColor = "#f59e0b"; // Golden saffron for Indian stations
                if (isGateway) markerColor = "#10b981"; // Emerald green for gateway ports

                return (
                  <g
                    key={st.id}
                    transform={`translate(${pt.x}, ${pt.y})`}
                    onClick={() => setSelectedStation(st)}
                    className="cursor-pointer group"
                  >
                    {/* Pulse aura for Indian stations or selected item */}
                    {(isIndia || isSel) && (
                      <circle cx="0" cy="0" r="10" fill={markerColor} opacity="0.3" className="animate-ping" />
                    )}
                    {/* Marker glyph */}
                    <circle
                      cx="0"
                      cy="0"
                      r={isIndia ? "5.5" : isGateway ? "5" : "4"}
                      fill={markerColor}
                      stroke="#ffffff"
                      strokeWidth={isIndia || isSel ? "2" : "1.2"}
                    />
                    {/* Station Name Label */}
                    <text
                      x="7"
                      y="3.5"
                      fontSize={isIndia ? "10" : "8.5"}
                      fontWeight={isIndia ? "bold" : "600"}
                      fill={isIndia ? "#f59e0b" : isGateway ? "#10b981" : isDark ? "#eaf6f8" : "#0d2433"}
                      fontFamily="sans-serif"
                      className="drop-shadow transition-all group-hover:scale-110"
                    >
                      {st.flag} {st.name}
                    </text>
                  </g>
                );
              })}
            </g>
          )}
          {/* 11. Clicked Point Coordinate Marker */}
          {clickedPin && (
            <g transform={`translate(${clickedPin.mapX}, ${clickedPin.mapY})`} className="pointer-events-none">
              <circle cx="0" cy="0" r="16" fill="#55d6e8" opacity="0.35" className="animate-ping" />
              <circle cx="0" cy="0" r="6" fill="#55d6e8" stroke="#ffffff" strokeWidth="2" />
              <path d="M 0 0 L -5 -14 A 6 6 0 1 1 5 -14 Z" fill="#55d6e8" stroke="#071521" strokeWidth="1.2" transform="translate(0, -2)" />
              <circle cx="0" cy="-16" r="2.5" fill="#ffffff" />
            </g>
          )}
        </g>
      </svg>

      {/* Floating Hover Coordinate Indicator (Subtle pill) */}
      {hoverCoord && !clickedPin && (
        <div
          className={cx(
            "pointer-events-none absolute bottom-3 left-3 flex items-center gap-2.5 rounded-lg border px-2.5 py-1 font-mono text-[10px] shadow-md backdrop-blur-md transition-colors",
            isDark
              ? "border-[#1d445c] bg-[#071624]/90 text-[#8ccfe0]"
              : "border-[#dfd8cc] bg-[#f8f5ee]/95 text-[#0f768e]",
          )}
        >
          <div className="flex items-center gap-1.5 font-bold text-[#eaf6f8] light:text-[#0d2433]">
            <Crosshair size={12} className="text-[#55d6e8] light:text-[#0f768e]" />
            <span>
              {Math.abs(hoverCoord.lat).toFixed(2)}°S, {hoverCoord.lon >= 0 ? `${hoverCoord.lon.toFixed(2)}°E` : `${Math.abs(hoverCoord.lon).toFixed(2)}°W`}
            </span>
          </div>
          <span className="text-[#5f7d89]">·</span>
          <span className="text-[#91aeb9] light:text-[#5a7686]">
            {getSectorName(hoverCoord.lat, hoverCoord.lon)}
          </span>
        </div>
      )}

      {/* Interactive Clicked Point Coordinate Inspector Card */}
      {clickedPin && (
        <div
          className={cx(
            "absolute bottom-3 left-3 z-30 flex flex-col gap-2 rounded-xl border p-3 shadow-2xl backdrop-blur-md max-w-xs transition-all animate-in fade-in slide-in-from-bottom-2",
            isDark
              ? "border-[#55d6e8]/40 bg-[#071927]/95 text-[#eaf6f8]"
              : "border-[#0f768e]/40 bg-[#fdfbf7]/98 text-[#0d2433]",
          )}
        >
          <div className="flex items-center justify-between gap-3 border-b border-[#1d445c]/40 light:border-[#e2d8c7] pb-1.5">
            <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-[#55d6e8] light:text-[#0f768e]">
              <Crosshair size={13} />
              <span>POINT INSPECTOR</span>
            </div>
            <button
              onClick={() => setClickedPin(null)}
              className="text-[#91aeb9] hover:text-[#eaf6f8] light:text-[#7a94a2] light:hover:text-[#0d2433]"
              title="Close Inspector"
            >
              <X size={13} />
            </button>
          </div>

          <div>
            <div className="font-mono text-[14px] font-bold tracking-tight text-[#55d6e8] light:text-[#0f768e]">
              {Math.abs(clickedPin.lat).toFixed(3)}°S, {clickedPin.lon >= 0 ? `${clickedPin.lon.toFixed(3)}°E` : `${Math.abs(clickedPin.lon).toFixed(3)}°W`}
            </div>
            <div className="text-[10.5px] text-[#91aeb9] light:text-[#5a7686] leading-snug">
              {getSectorName(clickedPin.lat, clickedPin.lon)}
            </div>
          </div>

          {vessel && (
            <div className="rounded-md border border-[#1d445c]/40 light:border-[#e2d8c7] bg-[#0d2433]/60 light:bg-[#f4eee3] p-1.5 text-[10px] font-mono">
              <div className="text-[#91aeb9] light:text-[#6b8594]">From {vessel.name}:</div>
              <div className="font-bold text-[#eaf6f8] light:text-[#0d2433]">
                {geoDistanceNm(vessel.position.lat, vessel.position.lon, clickedPin.lat, clickedPin.lon)} nm · Bearing {geoBearingDeg(vessel.position.lat, vessel.position.lon, clickedPin.lat, clickedPin.lon)}°
              </div>
            </div>
          )}

          <button
            onClick={() => {
              const text = `${Math.abs(clickedPin.lat).toFixed(3)}°S, ${clickedPin.lon >= 0 ? `${clickedPin.lon.toFixed(3)}°E` : `${Math.abs(clickedPin.lon).toFixed(3)}°W`}`;
              navigator.clipboard.writeText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className={cx(
              "flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-[10.5px] font-bold transition-all",
              copied
                ? "bg-[#10b981] text-white shadow-sm"
                : "bg-[#55d6e8] text-[#071521] hover:bg-[#7be3f2] light:bg-[#0f768e] light:text-white",
            )}
          >
            {copied ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
            <span>{copied ? "Copied Coordinates!" : "Copy Coordinates"}</span>
          </button>
        </div>
      )}
    </div>

      {/* Interactive Station / Gateway Detail Modal */}
      {selectedStation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#04101a]/80 backdrop-blur-sm p-4" onClick={() => setSelectedStation(null)}>
          <div
            className={cx(
              "w-full max-w-md overflow-hidden rounded-xl border p-5 shadow-2xl transition-all",
              isDark ? "border-[#55d6e8]/40 bg-[#0d2433] text-[#eaf6f8]" : "border-[#0f768e]/40 bg-white text-[#0d2433]",
            )}
            onClick={(e: MouseEvent) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{selectedStation.flag}</span>
                <div>
                  <h3 className="text-[16px] font-bold">{selectedStation.name}</h3>
                  <div className="text-[11px] font-semibold text-[#55d6e8] light:text-[#0f768e]">
                    {selectedStation.country} · {selectedStation.category === "gateway" ? "Expedition Departure Gateway" : `${selectedStation.type} Polar Base`}
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedStation(null)} className="text-[#91aeb9] hover:text-[#eaf6f8]">
                <X size={18} />
              </button>
            </div>

            <p className="mt-3.5 text-[12px] leading-relaxed text-[#91aeb9] light:text-[#4a6878]">
              {selectedStation.desc}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg border border-[#1d445c]/50 light:border-[#e2d8c7] bg-[#132f40]/50 light:bg-[#f8f5ee] p-3 text-[11px]">
              <div>
                <span className="text-[10px] uppercase text-[#91aeb9] light:text-[#7a94a2]">Coordinates</span>
                <div className="font-mono font-bold text-[#8ccfe0] light:text-[#0f768e]">
                  {Math.abs(selectedStation.lat).toFixed(2)}°S, {selectedStation.lon >= 0 ? `${selectedStation.lon.toFixed(2)}°E` : `${Math.abs(selectedStation.lon).toFixed(2)}°W`}
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase text-[#91aeb9] light:text-[#7a94a2]">Elevation</span>
                <div className="font-mono font-bold text-[#8ccfe0] light:text-[#0f768e]">{selectedStation.elevation ?? "Sea Level"}</div>
              </div>
              <div>
                <span className="text-[10px] uppercase text-[#91aeb9] light:text-[#7a94a2]">Established</span>
                <div className="font-mono font-bold text-[#8ccfe0] light:text-[#0f768e]">{selectedStation.established ?? "1980s"}</div>
              </div>
              <div>
                <span className="text-[10px] uppercase text-[#91aeb9] light:text-[#7a94a2]">Status</span>
                <div className="font-mono font-bold text-[#10b981]">Active Year-Round</div>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setSelectedStation(null)}
                className="rounded-lg bg-[#55d6e8] px-4 py-2 text-[12px] font-bold text-[#071521] hover:bg-[#7be3f2]"
              >
                Close Station Info
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LayerChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[10px] font-semibold transition-all shadow-sm",
        active
          ? "border-[#55d6e8] bg-[#55d6e8]/20 text-[#55d6e8] light:border-[#0f768e] light:bg-[#0f768e]/15 light:text-[#0f768e]"
          : "border-[#1d445c]/50 bg-[#0d2433]/50 text-[#91aeb9] hover:border-[#55d6e8]/40 hover:text-[#eaf6f8] light:border-[#d8d0c2] light:bg-[#eee8dc]/70 light:text-[#5a7686]",
      )}
    >
      <span className={cx("h-1.5 w-1.5 rounded-full transition-colors", active ? "bg-[#55d6e8] light:bg-[#0f768e] shadow-[0_0_6px_#55d6e8]" : "bg-[#5f7d89]")} />
      <span>{label}</span>
    </button>
  );
}

function CrosshairIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#55d6e8" strokeWidth="1.8">
      <circle cx="8" cy="8" r="5" />
      <line x1="8" y1="1" x2="8" y2="4" />
      <line x1="8" y1="12" x2="8" y2="15" />
      <line x1="1" y1="8" x2="4" y2="8" />
      <line x1="12" y1="8" x2="15" y2="8" />
    </svg>
  );
}

function CopyIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function CheckIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default AntarcticPolarMap;
