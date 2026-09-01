// Reliable Base Map Providers & Polar Geographic Metadata for Dhruv Sarthi

export type MapTileProviderId = "esri-satellite";

export interface MapTileProvider {
  id: MapTileProviderId;
  name: string;
  shortName: string;
  tileUrl: string;
  tileSize: number;
  maxZoom: number;
  attribution: string;
}

export const MAP_PROVIDERS: MapTileProvider[] = [
  {
    id: "esri-satellite",
    name: "ESRI Satellite",
    shortName: "ESRI Satellite",
    tileUrl: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    tileSize: 256,
    maxZoom: 19,
    attribution: "© ESRI, Maxar, Earthstar Geographics",
  },
];

export function getSectorName(lat: number, lon: number): string {
  if (lat > -40) return "Sub-Tropical Maritime Gateway Zone";
  if (lat > -50) return "Roaring Forties · Southern Ocean";
  if (lat > -60) return "Furious Fifties · Antarctic Circumpolar Current";
  if (lon >= -75 && lon <= -20) return "Weddell Sea Sector · Antarctic Peninsula";
  if (lon >= -150 && lon < -75) return "Bellingshausen & Amundsen Sea Sector";
  if (lon >= 150 || lon < -150) return "Ross Sea & Victoria Land Sector";
  if (lon >= 60 && lon < 150) return "East Antarctica · Wilkes & Prydz Bay";
  return "Queen Maud Land · Polar Continental Sector";
}

export interface ResearchStation {
  id: string;
  name: string;
  country: string;
  flag: string;
  lat: number;
  lon: number;
  type: "Permanent" | "Summer" | "Historic";
  desc: string;
  isPrimary?: boolean;
}

export const RESEARCH_STATIONS: ResearchStation[] = [
  {
    id: "maitri",
    name: "Maitri Station",
    country: "India",
    flag: "🇮🇳",
    lat: -70.77,
    lon: 11.73,
    type: "Permanent",
    desc: "India's permanent polar base in the ice-free Schirmacher Oasis. Year-round glaciology, biology & atmospheric physics.",
    isPrimary: true,
  },
  {
    id: "bharati",
    name: "Bharati Station",
    country: "India",
    flag: "🇮🇳",
    lat: -69.41,
    lon: 76.19,
    type: "Permanent",
    desc: "India's state-of-the-art Antarctic research base in the Larsemann Hills, East Antarctica with high-gain satellite ground terminal.",
    isPrimary: true,
  },
  {
    id: "dakshin",
    name: "Dakshin Gangotri",
    country: "India",
    flag: "🇮🇳",
    lat: -70.08,
    lon: 12.0,
    type: "Historic",
    desc: "India's first Antarctic research base (1983). Now serves as a key historical supply depot and transit site.",
    isPrimary: true,
  },
  {
    id: "mcmurdo",
    name: "McMurdo Station",
    country: "USA",
    flag: "🇺🇸",
    lat: -77.85,
    lon: 166.67,
    type: "Permanent",
    desc: "Largest Antarctic science community on Ross Island, equipped with deep-water harbor and ice runways.",
  },
  {
    id: "halley",
    name: "Halley VI",
    country: "UK",
    flag: "🇬🇧",
    lat: -75.58,
    lon: -25.5,
    type: "Permanent",
    desc: "Hydraulically elevated, ski-mounted modular research station on the floating Brunt Ice Shelf, Weddell Sea.",
  },
  {
    id: "concordia",
    name: "Concordia Base",
    country: "France / Italy",
    flag: "🇪🇺",
    lat: -75.1,
    lon: 123.33,
    type: "Permanent",
    desc: "High-altitude French-Italian research station at Dome C (3,233m) studying astronomy, glaciology & climate history.",
  },
  {
    id: "neumaver",
    name: "Neumayer III",
    country: "Germany",
    flag: "🇩🇪",
    lat: -70.67,
    lon: -8.27,
    type: "Permanent",
    desc: "Ekström Ice Shelf research platform in Atka Bay; continuous meteorological, geophysical & air chemistry observatory.",
  },
  {
    id: "troll",
    name: "Troll Station",
    country: "Norway",
    flag: "🇳🇴",
    lat: -72.01,
    lon: 2.53,
    type: "Permanent",
    desc: "Norwegian research station in Jutulsessen, Queen Maud Land, operating on solid rock ground with year-round satellite uplink.",
  },
  {
    id: "palmer",
    name: "Palmer Station",
    country: "USA",
    flag: "🇺🇸",
    lat: -64.77,
    lon: -64.05,
    type: "Permanent",
    desc: "Only US Antarctic base north of Antarctic Circle on Anvers Island; marine biology and ocean ecosystem research.",
  },
  {
    id: "esperanza",
    name: "Esperanza Base",
    country: "Argentina",
    flag: "🇦🇷",
    lat: -63.4,
    lon: -56.99,
    type: "Permanent",
    desc: "Year-round Argentine settlement in Hope Bay, Trinity Peninsula; meteorological, seismological & oceanographic hub.",
  },
];

export interface GatewayPort {
  id: string;
  name: string;
  country: string;
  flag: string;
  lat: number;
  lon: number;
  desc: string;
}

export const GATEWAY_PORTS: GatewayPort[] = [
  {
    id: "capetown",
    name: "Port of Cape Town",
    country: "South Africa",
    flag: "🇿🇦",
    lat: -33.92,
    lon: 18.42,
    desc: "Primary departure gateway for Indian Antarctic expeditions heading to Maitri and Bharati bases in East Antarctica.",
  },
  {
    id: "ushuaia",
    name: "Port of Ushuaia",
    country: "Argentina",
    flag: "🇦🇷",
    lat: -54.8,
    lon: -68.3,
    desc: "Southernmost deep-water commercial maritime port; principal staging hub for Antarctic Peninsula & Weddell Sea voyages.",
  },
  {
    id: "puntaarenas",
    name: "Punta Arenas",
    country: "Chile",
    flag: "🇨🇱",
    lat: -53.16,
    lon: -70.91,
    desc: "Strait of Magellan logistics & air-transport hub serving Chilean, European and international polar scientific operations.",
  },
  {
    id: "hobart",
    name: "Port of Hobart",
    country: "Australia",
    flag: "🇦🇺",
    lat: -42.88,
    lon: 147.33,
    desc: "Southern Ocean gateway supporting Australian, French and East Antarctic science voyages and RSV Nuyina operations.",
  },
  {
    id: "christchurch",
    name: "Lyttelton / Christchurch",
    country: "New Zealand",
    flag: "🇳🇿",
    lat: -43.6,
    lon: 172.72,
    desc: "Key logistics gateway for McMurdo Station, Scott Base and deep Ross Sea / Victoria Land polar exploration.",
  },
];
