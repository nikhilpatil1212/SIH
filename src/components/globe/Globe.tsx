import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Compass, Crosshair, Minus, Pause, Play, Plus, Sparkles } from "lucide-react";
import type { Iceberg, Route, Vessel } from "../../data/types";
import { RISK_COLORS } from "../ui/primitives";
import { useTheme } from "../../theme";

export const GLOBE_RADIUS = 2;
const EARTH_KM = 6371;

// High-resolution NASA Blue Marble + Topography + Water/Specular maps
const TEX_DAY = "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg";
const TEX_BUMP = "https://unpkg.com/three-globe/example/img/earth-topology.png";
const TEX_SPEC = "https://unpkg.com/three-globe/example/img/earth-water.png";
const TEX_CLOUDS = "https://unpkg.com/three-globe/example/img/earth-clouds.png";

export interface SeaIceRegionShape {
  region: string;
  polygon: { lat: number; lon: number }[];
  concentration: number;
}

export interface PickInfo {
  lat: number;
  lon: number;
  x: number;
  y: number;
  z: number;
}

export interface GlobeProps {
  routes?: Route[];
  selectedRouteId?: string;
  showRoutes?: boolean;
  vessel?: Vessel | null;
  icebergs?: Iceberg[];
  showTrajectories?: boolean;
  seaIce?: SeaIceRegionShape[];
  selectedIcebergId?: string | null;
  onSelectIceberg?: (id: string) => void;
  onPick?: (info: PickInfo) => void;
  autoRotate?: boolean;
  className?: string;
  horizonFraction?: number;
  focusAntarctica?: boolean;
}

// lat/lon (degrees) -> position on a sphere aligned with equirectangular textures.
export function latLonToVector3(lat: number, lon: number, radius = GLOBE_RADIUS): THREE.Vector3 {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function vector3ToLatLon(p: THREE.Vector3): { lat: number; lon: number } {
  const r = p.length();
  const lat = 90 - (Math.acos(p.y / r) * 180) / Math.PI;
  let lon = (Math.atan2(p.z, -p.x) * 180) / Math.PI - 180;
  if (lon < -180) lon += 360;
  if (lon > 180) lon -= 360;
  return { lat, lon };
}

function seaIceColor(c: number): number {
  if (c < 20) return 0xbfeef7;
  if (c < 40) return 0x8cd8eb;
  if (c < 60) return 0x50b8db;
  if (c < 80) return 0x248eb3;
  return 0x166282;
}

// Great-circle arc sampling
function arcPoints(a: THREE.Vector3, b: THREE.Vector3, radius: number, steps = 28): THREE.Vector3[] {
  const ua = a.clone().normalize();
  const ub = b.clone().normalize();
  const out: THREE.Vector3[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    out.push(ua.clone().lerp(ub, t).normalize().multiplyScalar(radius));
  }
  return out;
}

function createProceduralEarthTexture(isDark: boolean): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    // Ocean gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, isDark ? "#0d324d" : "#6bb4d6");
    grad.addColorStop(0.5, isDark ? "#0a263d" : "#4a9ec4");
    grad.addColorStop(1, isDark ? "#081d2e" : "#3283a8");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 512);

    // Antarctica ice sheet at the bottom (lat -60 to -90 -> y ~ 420 to 512)
    ctx.fillStyle = isDark ? "#eaf6f8" : "#ffffff";
    ctx.beginPath();
    ctx.moveTo(0, 512);
    ctx.lineTo(0, 420);
    for (let x = 0; x <= 1024; x += 32) {
      const y = 425 + Math.sin(x * 0.02) * 18 + Math.cos(x * 0.05) * 12;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(1024, 512);
    ctx.closePath();
    ctx.fill();

    // Weddell Sea bay indent
    ctx.fillStyle = isDark ? "#0a263d" : "#4a9ec4";
    ctx.beginPath();
    ctx.ellipse(450, 455, 65, 35, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Ross Sea bay indent
    ctx.beginPath();
    ctx.ellipse(820, 465, 60, 30, -0.1, 0, Math.PI * 2);
    ctx.fill();

    // Rough stylized global landmasses
    ctx.fillStyle = isDark ? "#1b4332" : "#95d5b2";
    // South America
    ctx.beginPath();
    ctx.moveTo(380, 260);
    ctx.lineTo(440, 270);
    ctx.lineTo(430, 360);
    ctx.lineTo(390, 390);
    ctx.lineTo(365, 320);
    ctx.closePath();
    ctx.fill();

    // Africa
    ctx.beginPath();
    ctx.moveTo(520, 220);
    ctx.lineTo(590, 250);
    ctx.lineTo(570, 350);
    ctx.lineTo(540, 360);
    ctx.lineTo(500, 280);
    ctx.closePath();
    ctx.fill();

    // Australia
    ctx.beginPath();
    ctx.ellipse(830, 330, 55, 35, 0, 0, Math.PI * 2);
    ctx.fill();

    // Graticule grid
    ctx.strokeStyle = isDark ? "rgba(85, 214, 232, 0.15)" : "rgba(15, 118, 142, 0.2)";
    ctx.lineWidth = 1;
    for (let y = 64; y < 512; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1024, y);
      ctx.stroke();
    }
    for (let x = 64; x < 1024; x += 128) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function Globe(props: GlobeProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const overlayGroupRef = useRef<THREE.Group | null>(null);
  const cloudsRef = useRef<THREE.Mesh | null>(null);
  const pinRef = useRef<THREE.Mesh | null>(null);
  const icebergMeshesRef = useRef<{ mesh: THREE.Object3D; id: string }[]>([]);

  const [pick, setPick] = useState<PickInfo | null>(null);
  const [scale, setScale] = useState<{ label: string; px: number }>({ label: "", px: 80 });
  const [rotating, setRotating] = useState(props.autoRotate ?? true);
  const [loaded, setLoaded] = useState(true);

  const propsRef = useRef(props);
  propsRef.current = props;

  // Background color depending on theme
  const bgColor = isDark ? 0x050d17 : 0xede6da;

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.background = new THREE.Color(bgColor);
    }
  }, [bgColor]);

  // ---- One-time scene setup ----
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(bgColor);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 1000);
    // Position camera looking directly towards Antarctica and the Weddell Sea sector
    camera.position.copy(latLonToVector3(-60, -35, GLOBE_RADIUS * 2.9));
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting: Sun & natural ambient light for realistic ocean & ice reflection
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    const sun = new THREE.DirectionalLight(0xfff8ee, 1.4);
    sun.position.set(-4, 3, 3.5);
    scene.add(sun);

    const fillLight = new THREE.DirectionalLight(0x88ccee, 0.45);
    fillLight.position.set(3, -2, -2);
    scene.add(fillLight);

    const hemiLight = new THREE.HemisphereLight(0x88ccff, 0x081e32, 0.4);
    scene.add(hemiLight);

    // Starfield particles in cosmic space
    const starGeo = new THREE.BufferGeometry();
    const starCount = 1200;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(50 + Math.random() * 90);
      starPos.set([v.x, v.y, v.z], i * 3);
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: isDark ? 0x9bc7dc : 0x738d9c,
      size: 0.35,
      sizeAttenuation: true,
      transparent: true,
      opacity: isDark ? 0.8 : 0.25,
    });
    scene.add(new THREE.Points(starGeo, starMat));

    // Base Realistic Ocean Globe with instant procedural fallback
    const initialProceduralTex = createProceduralEarthTexture(isDark);
    const globeMat = new THREE.MeshPhongMaterial({
      map: initialProceduralTex,
      color: 0xffffff,
      emissive: 0x081826,
      specular: new THREE.Color(0x326e95),
      shininess: 25,
      bumpScale: 0.05,
    });

    const globeGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 128, 128);
    const globe = new THREE.Mesh(globeGeo, globeMat);
    globe.name = "globe";
    scene.add(globe);

    // Asynchronously load NASA High-Resolution Textures
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");

    loader.load(
      TEX_DAY,
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = renderer.capabilities.getMaxAnisotropy();
        globeMat.map = t;
        globeMat.needsUpdate = true;
        setLoaded(true);
      },
      undefined,
      () => {
        setLoaded(true);
      },
    );

    loader.load(TEX_BUMP, (t) => {
      globeMat.bumpMap = t;
      globeMat.bumpScale = 0.035;
      globeMat.needsUpdate = true;
    });

    loader.load(TEX_SPEC, (t) => {
      globeMat.specularMap = t;
      globeMat.specular = new THREE.Color(0x3a6a8c);
      globeMat.needsUpdate = true;
    });

    // Cloud layer with realistic atmospheric opacity
    const cloudMat = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    });
    const cloudMesh = new THREE.Mesh(new THREE.SphereGeometry(GLOBE_RADIUS * 1.008, 64, 64), cloudMat);
    scene.add(cloudMesh);
    cloudsRef.current = cloudMesh;

    loader.load(TEX_CLOUDS, (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      cloudMat.map = t;
      cloudMat.opacity = 0.32;
      cloudMat.needsUpdate = true;
    });

    // Multi-layered Atmospheric Glow (Rayleigh scattering inspired)
    const atmGlowMat = new THREE.MeshBasicMaterial({
      color: 0x48bfe3,
      transparent: true,
      opacity: 0.16,
      side: THREE.BackSide,
    });
    const atmMesh = new THREE.Mesh(new THREE.SphereGeometry(GLOBE_RADIUS * 1.055, 64, 64), atmGlowMat);
    scene.add(atmMesh);

    const outerAtmGlowMat = new THREE.MeshBasicMaterial({
      color: 0x5390d9,
      transparent: true,
      opacity: 0.08,
      side: THREE.BackSide,
    });
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(GLOBE_RADIUS * 1.09, 48, 48), outerAtmGlowMat));

    // Data Overlays Group
    const overlay = new THREE.Group();
    scene.add(overlay);
    overlayGroupRef.current = overlay;

    // Pick marker pin
    const pin = new THREE.Mesh(
      new THREE.SphereGeometry(0.022, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x55d6e8 }),
    );
    pin.visible = false;
    scene.add(pin);
    pinRef.current = pin;

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.rotateSpeed = 0.55;
    controls.minDistance = GLOBE_RADIUS * 1.14;
    controls.maxDistance = GLOBE_RADIUS * 7.5;
    controls.autoRotate = propsRef.current.autoRotate ?? true;
    controls.autoRotateSpeed = 0.35;
    controlsRef.current = controls;

    // Scale calculation
    const updateScale = () => {
      const dist = camera.position.length();
      const h = mount.clientHeight || 1;
      const worldPerPx = (2 * dist * Math.tan((camera.fov * Math.PI) / 360)) / h;
      const kmPerPx = worldPerPx * (EARTH_KM / GLOBE_RADIUS);
      const target = kmPerPx * 90;
      const pow = Math.pow(10, Math.floor(Math.log10(target)));
      const nice = [1, 2, 5, 10].map((m) => m * pow).reduce((a, b) => (Math.abs(b - target) < Math.abs(a - target) ? b : a));
      const px = nice / kmPerPx;
      const label = nice >= 1000 ? `${(nice / 1000).toFixed(nice % 1000 === 0 ? 0 : 1)},000 km` : `${nice} km`;
      setScale({ label: nice >= 1000 ? `${nice.toLocaleString()} km` : label, px });
    };
    controls.addEventListener("change", updateScale);
    updateScale();

    // Resize Observer
    const resize = () => {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      updateScale();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    // Pointer Picking for Icebergs & Coordinates
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let down = { x: 0, y: 0, t: 0 };

    const onDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY, t: Date.now() };
    };

    const onUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6 || Date.now() - down.t > 500) return;
      const rect = renderer.domElement.getBoundingClientRect();
      ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);

      // Check icebergs first with recursive hit test
      const bergMeshes = icebergMeshesRef.current.map((m) => m.mesh);
      const bergHits = raycaster.intersectObjects(bergMeshes, true);
      if (bergHits.length) {
        let rootObj: THREE.Object3D | null = bergHits[0].object;
        while (rootObj && !icebergMeshesRef.current.find((m) => m.mesh === rootObj)) {
          rootObj = rootObj.parent;
        }
        const hit = icebergMeshesRef.current.find((m) => m.mesh === rootObj);
        if (hit) {
          propsRef.current.onSelectIceberg?.(hit.id);
          return;
        }
      }

      // Check globe surface pick
      const hits = raycaster.intersectObject(globe, false);
      if (hits.length) {
        const p = hits[0].point;
        const { lat, lon } = vector3ToLatLon(p);
        const info: PickInfo = { lat, lon, x: +p.x.toFixed(3), y: +p.y.toFixed(3), z: +p.z.toFixed(3) };
        setPick(info);
        propsRef.current.onPick?.(info);
        if (pinRef.current) {
          pinRef.current.position.copy(latLonToVector3(lat, lon, GLOBE_RADIUS * 1.015));
          pinRef.current.visible = true;
        }
      }
    };

    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointerup", onUp);

    // Animation Loop
    let raf = 0;
    const clock = new THREE.Clock();
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      if (cloudMesh) {
        cloudMesh.rotation.y += delta * 0.012;
      }
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      controls.removeEventListener("change", updateScale);
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointerup", onUp);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Rebuild Data Overlays ----
  useEffect(() => {
    const overlay = overlayGroupRef.current;
    if (!overlay) return;

    // Dispose old children
    while (overlay.children.length) {
      const c = overlay.children.pop()!;
      (c as THREE.Mesh).geometry?.dispose?.();
      const m = (c as THREE.Mesh).material;
      if (Array.isArray(m)) m.forEach((x) => x.dispose());
      else m?.dispose?.();
    }
    icebergMeshesRef.current = [];

    const { routes, selectedRouteId, showRoutes, vessel, icebergs, showTrajectories, seaIce, selectedIcebergId, horizonFraction = 1 } = props;

    // Sea-Ice Polygons with crystal shimmer
    if (seaIce) {
      for (const region of seaIce) {
        const pts = region.polygon.map((p) => latLonToVector3(p.lat, p.lon, GLOBE_RADIUS * 1.004));
        const centroidLat = region.polygon.reduce((a, p) => a + p.lat, 0) / region.polygon.length;
        const centroidLon = region.polygon.reduce((a, p) => a + p.lon, 0) / region.polygon.length;
        const centroid = latLonToVector3(centroidLat, centroidLon, GLOBE_RADIUS * 1.004);
        const verts: number[] = [];
        for (let i = 0; i < pts.length; i++) {
          const a = pts[i];
          const b = pts[(i + 1) % pts.length];
          verts.push(centroid.x, centroid.y, centroid.z, a.x, a.y, a.z, b.x, b.y, b.z);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(verts), 3));
        geo.computeVertexNormals();

        const fill = new THREE.Mesh(
          geo,
          new THREE.MeshBasicMaterial({
            color: seaIceColor(region.concentration),
            transparent: true,
            opacity: 0.3 + (region.concentration / 100) * 0.45,
            side: THREE.DoubleSide,
            depthWrite: false,
          }),
        );
        overlay.add(fill);

        const ring = new THREE.LineLoop(
          new THREE.BufferGeometry().setFromPoints(pts),
          new THREE.LineBasicMaterial({
            color: seaIceColor(region.concentration),
            transparent: true,
            opacity: 0.85,
          }),
        );
        overlay.add(ring);
      }
    }

    // Routes
    if (routes && showRoutes) {
      for (const r of routes) {
        const pts: THREE.Vector3[] = [];
        for (let i = 0; i < r.coordinates.length - 1; i++) {
          const a = latLonToVector3(r.coordinates[i].lat, r.coordinates[i].lon, GLOBE_RADIUS * 1.007);
          const b = latLonToVector3(r.coordinates[i + 1].lat, r.coordinates[i + 1].lon, GLOBE_RADIUS * 1.007);
          pts.push(...arcPoints(a, b, GLOBE_RADIUS * 1.007, 24));
        }
        const selected = r.id === selectedRouteId;
        const line = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(pts),
          new THREE.LineBasicMaterial({
            color: new THREE.Color(r.color),
            transparent: true,
            opacity: selected ? 1 : 0.45,
            linewidth: selected ? 2.5 : 1.2,
          }),
        );
        overlay.add(line);

        // Waypoints
        for (const c of r.coordinates) {
          const dot = new THREE.Mesh(
            new THREE.SphereGeometry(selected ? 0.018 : 0.012, 14, 14),
            new THREE.MeshBasicMaterial({ color: new THREE.Color(r.color) }),
          );
          dot.position.copy(latLonToVector3(c.lat, c.lon, GLOBE_RADIUS * 1.009));
          overlay.add(dot);
        }
      }
    }

    // Iceberg Trajectories & Uncertainty Cones
    if (icebergs && showTrajectories) {
      for (const ib of icebergs) {
        const count = Math.max(2, Math.round(ib.predictedPath.length * horizonFraction));
        const activePath = ib.predictedPath.slice(0, count);
        if (activePath.length >= 2) {
          const pts = activePath.map((p) => latLonToVector3(p.lat, p.lon, GLOBE_RADIUS * 1.008));
          const line = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(pts),
            new THREE.LineDashedMaterial({
              color: new THREE.Color(RISK_COLORS[ib.riskLevel]),
              dashSize: 0.035,
              gapSize: 0.02,
              transparent: true,
              opacity: 0.85,
            }),
          );
          line.computeLineDistances();
          overlay.add(line);

          // Predicted endpoint marker
          const endpoint = pts[pts.length - 1];
          const endMesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.012, 10, 10),
            new THREE.MeshBasicMaterial({
              color: new THREE.Color(RISK_COLORS[ib.riskLevel]),
              transparent: true,
              opacity: 0.7,
            }),
          );
          endMesh.position.copy(endpoint);
          overlay.add(endMesh);
        }
      }
    }

    // Iceberg Markers: Distinct Radar Diamond Beacons with Pulse Rings & Heading Vectors
    if (icebergs) {
      for (const ib of icebergs) {
        const color = new THREE.Color(RISK_COLORS[ib.riskLevel]);
        const isSelected = ib.id === selectedIcebergId;
        const pos = latLonToVector3(ib.position.lat, ib.position.lon, GLOBE_RADIUS * 1.02);

        const group = new THREE.Group();
        group.position.copy(pos);

        // Octahedron/Diamond geometric core
        const coreGeo = new THREE.OctahedronGeometry(isSelected ? 0.045 : 0.032, 0);
        const coreMat = new THREE.MeshBasicMaterial({ color });
        const coreMesh = new THREE.Mesh(coreGeo, coreMat);
        group.add(coreMesh);

        // Standoff baseline stem connecting to surface
        const stemGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.04, 8);
        const stemMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7 });
        const stemMesh = new THREE.Mesh(stemGeo, stemMat);
        stemMesh.position.y = -0.02;
        group.add(stemMesh);

        // Predictive radar pulse ring
        const ringGeo = new THREE.RingGeometry(isSelected ? 0.055 : 0.038, isSelected ? 0.075 : 0.05, 24);
        const ringMat = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: isSelected ? 0.8 : 0.4,
          side: THREE.DoubleSide,
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.lookAt(pos);
        group.add(ringMesh);

        // Active selection halo
        if (isSelected) {
          const outerRingGeo = new THREE.RingGeometry(0.085, 0.098, 28);
          const outerRingMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide,
          });
          const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
          outerRing.lookAt(pos);
          group.add(outerRing);
        }

        overlay.add(group);
        icebergMeshesRef.current.push({ mesh: group, id: ib.id });
      }
    }

    // Vessel Marker: Tactical Cyan Ship Cone
    if (vessel) {
      const grp = new THREE.Group();
      const pos = latLonToVector3(vessel.position.lat, vessel.position.lon, GLOBE_RADIUS * 1.026);
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.028, 0.085, 16),
        new THREE.MeshBasicMaterial({ color: 0x55d6e8 }),
      );
      cone.position.copy(pos);
      cone.lookAt(0, 0, 0);
      cone.rotateX(Math.PI / 2);
      grp.add(cone);

      const halo = new THREE.Mesh(
        new THREE.RingGeometry(0.05, 0.075, 24),
        new THREE.MeshBasicMaterial({ color: 0x55d6e8, transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
      );
      halo.position.copy(pos);
      halo.lookAt(0, 0, 0);
      grp.add(halo);

      overlay.add(grp);
    }
  }, [props]);

  // Auto-rotate toggle
  useEffect(() => {
    if (controlsRef.current) controlsRef.current.autoRotate = rotating;
  }, [rotating]);

  const zoom = (factor: number) => {
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;
    if (!cam || !ctrl) return;
    const dir = cam.position.clone().sub(ctrl.target);
    const len = THREE.MathUtils.clamp(dir.length() * factor, ctrl.minDistance, ctrl.maxDistance);
    cam.position.copy(ctrl.target).add(dir.setLength(len));
    ctrl.update();
  };

  const focusAntarctica = () => {
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;
    if (!cam || !ctrl) return;
    cam.position.copy(latLonToVector3(-65, -30, GLOBE_RADIUS * 2.8));
    ctrl.target.set(0, 0, 0);
    ctrl.update();
  };

  return (
    <div
      className={`relative h-full w-full overflow-hidden transition-colors duration-300 ${
        isDark ? "bg-[#050d17]" : "bg-[#ede6da]"
      } ${props.className ?? ""}`}
    >
      <div ref={mountRef} className="h-full w-full" />

      {!loaded && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#55d6e8] border-t-transparent" />
          <span className={`font-mono text-[11px] uppercase tracking-widest ${isDark ? "text-[#8ccfe0]" : "text-[#2b7c92]"}`}>
            Rendering high-resolution Earth…
          </span>
        </div>
      )}

      {/* Floating HUD Controls */}
      <div className="absolute left-3 top-3 z-10 flex flex-col gap-1.5">
        <button
          onClick={() => zoom(0.8)}
          className={`flex h-8 w-8 items-center justify-center rounded-md border backdrop-blur transition-colors ${
            isDark
              ? "border-[#1d445c]/80 bg-[#071521]/90 text-[#8ccfe0] hover:bg-[#132f40] hover:text-[#55d6e8]"
              : "border-[#d8d0c2] bg-[#f8f5ee]/90 text-[#3a5563] hover:bg-[#eae3d5] hover:text-[#0d2433]"
          }`}
          aria-label="Zoom in"
          title="Zoom in"
        >
          <Plus size={15} />
        </button>
        <button
          onClick={() => zoom(1.25)}
          className={`flex h-8 w-8 items-center justify-center rounded-md border backdrop-blur transition-colors ${
            isDark
              ? "border-[#1d445c]/80 bg-[#071521]/90 text-[#8ccfe0] hover:bg-[#132f40] hover:text-[#55d6e8]"
              : "border-[#d8d0c2] bg-[#f8f5ee]/90 text-[#3a5563] hover:bg-[#eae3d5] hover:text-[#0d2433]"
          }`}
          aria-label="Zoom out"
          title="Zoom out"
        >
          <Minus size={15} />
        </button>
        <button
          onClick={() => setRotating((r) => !r)}
          className={`flex h-8 w-8 items-center justify-center rounded-md border backdrop-blur transition-colors ${
            isDark
              ? "border-[#1d445c]/80 bg-[#071521]/90 text-[#8ccfe0] hover:bg-[#132f40] hover:text-[#55d6e8]"
              : "border-[#d8d0c2] bg-[#f8f5ee]/90 text-[#3a5563] hover:bg-[#eae3d5] hover:text-[#0d2433]"
          }`}
          aria-label="Toggle rotation"
          title="Toggle rotation"
        >
          {rotating ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <button
          onClick={focusAntarctica}
          className={`flex h-8 w-8 items-center justify-center rounded-md border backdrop-blur transition-colors ${
            isDark
              ? "border-[#1d445c]/80 bg-[#071521]/90 text-[#8ccfe0] hover:bg-[#132f40] hover:text-[#55d6e8]"
              : "border-[#d8d0c2] bg-[#f8f5ee]/90 text-[#3a5563] hover:bg-[#eae3d5] hover:text-[#0d2433]"
          }`}
          aria-label="Focus Antarctica"
          title="Focus Antarctica"
        >
          <Sparkles size={14} />
        </button>
      </div>

      {/* Coordinate Pick HUD */}
      <div
        className={`absolute right-3 top-3 z-10 w-[200px] rounded-md border p-2.5 backdrop-blur transition-colors ${
          isDark
            ? "border-[#1d445c]/80 bg-[#071521]/90 text-[#eaf6f8]"
            : "border-[#d8d0c2] bg-[#fdfbf7]/90 text-[#0d2433] shadow-md"
        }`}
      >
        <div className={`mb-1.5 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] ${
          isDark ? "text-[#91aeb9]" : "text-[#4a6878]"
        }`}>
          <Crosshair size={11} className={isDark ? "text-[#55d6e8]" : "text-[#0f768e]"} /> Selected Position
        </div>
        {pick ? (
          <div className="space-y-1 font-mono text-[11px]">
            <div className="flex justify-between">
              <span className={isDark ? "text-[#91aeb9]" : "text-[#627d8e]"}>Lat</span>
              <span className="font-semibold">{Math.abs(pick.lat).toFixed(3)}°{pick.lat < 0 ? "S" : "N"}</span>
            </div>
            <div className="flex justify-between">
              <span className={isDark ? "text-[#91aeb9]" : "text-[#627d8e]"}>Lon</span>
              <span className="font-semibold">{Math.abs(pick.lon).toFixed(3)}°{pick.lon < 0 ? "W" : "E"}</span>
            </div>
            <div className={`mt-1 border-t pt-1 text-[10px] ${
              isDark ? "border-[#1d445c]/60 text-[#8ccfe0]" : "border-[#e2d9cb] text-[#0f768e]"
            }`}>
              <div className="flex justify-between"><span>X</span><span>{pick.x}</span></div>
              <div className="flex justify-between"><span>Y</span><span>{pick.y}</span></div>
              <div className="flex justify-between"><span>Z</span><span>{pick.z}</span></div>
            </div>
          </div>
        ) : (
          <p className={`text-[10px] leading-snug ${isDark ? "text-[#5f7d89]" : "text-[#7a93a1]"}`}>
            Tap any iceberg or ocean coordinate to read live geospatial coordinates.
          </p>
        )}
      </div>

      {/* Scale bar */}
      <div
        className={`absolute bottom-3 left-3 z-10 flex items-center gap-2 rounded-md border px-2.5 py-1.5 backdrop-blur transition-colors ${
          isDark
            ? "border-[#1d445c]/80 bg-[#071521]/90 text-[#c8dde3]"
            : "border-[#d8d0c2] bg-[#fdfbf7]/90 text-[#3a5563] shadow-sm"
        }`}
      >
        <Compass size={12} className={isDark ? "text-[#8ccfe0]" : "text-[#0f768e]"} />
        <div className="flex flex-col items-start gap-1">
          <span className="font-mono text-[10px] font-medium">{scale.label}</span>
          <div
            className={`h-[3px] rounded-full ${isDark ? "bg-[#55d6e8]" : "bg-[#0f768e]"}`}
            style={{ width: Math.max(24, Math.min(160, scale.px)) }}
          />
        </div>
      </div>

      {/* Attribution */}
      <div
        className={`pointer-events-none absolute bottom-2 right-3 z-10 font-mono text-[8px] uppercase tracking-wider ${
          isDark ? "text-[#4a6b7a]" : "text-[#879ea9]"
        }`}
      >
        ध्रुव सारथी · High-Fidelity 3D Earth · Antarctic Polar Projection
      </div>
    </div>
  );
}

export default Globe;
