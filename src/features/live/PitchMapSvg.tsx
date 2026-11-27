import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  LINES,
  PACE_LENGTH_ZONES,
  SPIN_LENGTH_ZONES,
  type BallEvent,
  type PitchLengthZone,
} from '../../domain/types';
import { disposeThreeGroup } from '../../lib/threeUtils';

interface PitchMapSvgProps {
  selectedLine?: string;
  selectedLength?: string;
  stance?: 'RHB' | 'LHB';
  bowlingMode?: 'pace' | 'spin';
  balls?: BallEvent[];
  onSelect: (line: string, length: string) => void;
}

const MAX_METERS = 11.5;
const PITCH_W = 3.45; // Visual pitch width in meters for comfortable tapping
const LINE_HALF_SPAN = 2.35; // Covers Wide outside off -> Wide outside leg
const GROUND_W = 24;
const GROUND_L = 18;

function metersToZ(m: number): number {
  return -MAX_METERS / 2 + Math.max(0, Math.min(MAX_METERS, m));
}

function zToMeters(z: number): number {
  return Math.max(0, Math.min(MAX_METERS, z + MAX_METERS / 2));
}

function deterministicOffset(seed: string, range: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return (((Math.abs(h) % 1000) / 1000) * 2 - 1) * range;
}

function findZoneForLength(lengthLabel: string, zones: readonly PitchLengthZone[]): PitchLengthZone {
  const exact = zones.find((z) => z.label.toLowerCase() === lengthLabel.toLowerCase());
  if (exact) return exact;
  const lower = lengthLabel.toLowerCase();
  if (lower.includes('full')) return zones[1] ?? zones[0];
  if (lower.includes('back')) return zones[3] ?? zones[zones.length - 1];
  if (lower.includes('short')) return zones[zones.length - 1];
  return zones[2] ?? zones[0];
}

const ZONE_PALETTE: Record<string, string> = {
  Yorker: 'rgba(234, 179, 8, 0.34)',
  Fuller: 'rgba(34, 197, 94, 0.30)',
  'Good Length': 'rgba(249, 115, 22, 0.32)',
  'Short of a Length': 'rgba(139, 92, 246, 0.28)',
  Short: 'rgba(100, 116, 139, 0.34)',
  'Short Length': 'rgba(139, 92, 246, 0.30)',
};

function createPitchGroundTexture(
  zones: readonly PitchLengthZone[],
  selectedLength?: string
): THREE.CanvasTexture {
  const w = 1024;
  const h = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const toPxX = (wx: number) => ((wx + GROUND_W / 2) / GROUND_W) * w;
  const toPxY = (wz: number) => ((wz + GROUND_L / 2) / GROUND_L) * h;

  // 1. Rich Stadium Outfield Grass
  ctx.fillStyle = '#1B5E20';
  ctx.fillRect(0, 0, w, h);

  // Subtle alternating mowed turf stripes
  const stripeCount = 14;
  const stripeH = h / stripeCount;
  for (let i = 0; i < stripeCount; i++) {
    if (i % 2 === 0) {
      ctx.fillStyle = 'rgba(74, 222, 128, 0.06)';
      ctx.fillRect(0, i * stripeH, w, stripeH);
    }
  }

  // Subtle turf grain noise
  for (let i = 0; i < 3200; i++) {
    const gx = (i * 73) % w;
    const gy = (i * 137) % h;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.035)';
    ctx.fillRect(gx, gy, 2, 2);
  }

  // 2. Rolled Clay Cricket Pitch Strip
  const pitchLeft = toPxX(-PITCH_W / 2);
  const pitchRight = toPxX(PITCH_W / 2);
  const pitchWidthPx = pitchRight - pitchLeft;
  const pitchTop = toPxY(-MAX_METERS / 2 - 1.4);
  const pitchBottom = toPxY(MAX_METERS / 2 + 0.6);

  const clayGrad = ctx.createLinearGradient(pitchLeft, 0, pitchRight, 0);
  clayGrad.addColorStop(0, '#BEA47E');
  clayGrad.addColorStop(0.5, '#D2BA94');
  clayGrad.addColorStop(1, '#BEA47E');
  ctx.fillStyle = clayGrad;
  ctx.fillRect(pitchLeft, pitchTop, pitchWidthPx, pitchBottom - pitchTop);

  // Subtle pitch wear texture
  ctx.fillStyle = 'rgba(120, 90, 55, 0.08)';
  for (let i = 0; i < 120; i++) {
    const wx = pitchLeft + ((i * 53) % pitchWidthPx);
    const wy = pitchTop + ((i * 89) % (pitchBottom - pitchTop));
    ctx.fillRect(wx, wy, 4, 2);
  }

  // 3. Meter-Based Broadcast Length Zones
  for (const z of zones) {
    const y1 = toPxY(metersToZ(z.minMeters));
    const y2 = toPxY(metersToZ(Math.min(z.maxMeters, MAX_METERS)));
    const isSelected = selectedLength?.toLowerCase() === z.label.toLowerCase();

    ctx.fillStyle = ZONE_PALETTE[z.label] ?? 'rgba(59, 130, 246, 0.25)';
    ctx.fillRect(pitchLeft, y1, pitchWidthPx, y2 - y1);

    // Crisp hairline divider
    ctx.strokeStyle = isSelected ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.28)';
    ctx.lineWidth = isSelected ? 3 : 1.2;
    ctx.beginPath();
    ctx.moveTo(pitchLeft, y2);
    ctx.lineTo(pitchRight, y2);
    ctx.stroke();

    // Clean Broadcast Side Labels on Turf
    const midY = (y1 + y2) / 2;
    ctx.save();
    ctx.font = '700 18px Inter, system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.75)';
    ctx.shadowBlur = 4;

    ctx.fillStyle = isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.94)';
    ctx.textAlign = 'right';
    ctx.fillText(z.label.toUpperCase(), pitchLeft - 12, midY);

    ctx.font = '600 17px Inter, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(226, 232, 240, 0.88)';
    ctx.textAlign = 'left';
    ctx.fillText(z.rangeText, pitchRight + 12, midY);
    ctx.restore();
  }

  // 4. Stump-to-Stump Hawk-Eye Blue Corridor (Centered directly on the 3 stumps at x = 0)
  const corrLeft = toPxX(-0.19);
  const corrRight = toPxX(0.19);
  ctx.fillStyle = 'rgba(37, 99, 235, 0.30)';
  ctx.fillRect(
    corrLeft,
    toPxY(metersToZ(0)),
    corrRight - corrLeft,
    toPxY(metersToZ(MAX_METERS)) - toPxY(metersToZ(0))
  );

  // 5. Crisp White Crease Markings (Bowling, Popping, Return Creases)
  const bowlingY = toPxY(metersToZ(0));
  const poppingY = toPxY(metersToZ(1.22));
  const backY = toPxY(-MAX_METERS / 2 - 1.22);
  const retLeft = toPxX(-1.32);
  const retRight = toPxX(1.32);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.lineWidth = 3;

  // Bowling crease
  ctx.beginPath();
  ctx.moveTo(retLeft, bowlingY);
  ctx.lineTo(retRight, bowlingY);
  ctx.stroke();

  // Popping crease (extends across pitch + slightly onto turf)
  ctx.beginPath();
  ctx.moveTo(toPxX(-1.83), poppingY);
  ctx.lineTo(toPxX(1.83), poppingY);
  ctx.stroke();

  // Return creases
  ctx.beginPath();
  ctx.moveTo(retLeft, backY);
  ctx.lineTo(retLeft, poppingY);
  ctx.moveTo(retRight, backY);
  ctx.lineTo(retRight, poppingY);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

export const PitchMapSvg: React.FC<PitchMapSvgProps> = ({
  selectedLine,
  selectedLength,
  stance = 'RHB',
  bowlingMode: propBowlingMode,
  balls = [],
  onSelect,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [manualMode, setManualMode] = useState<'pace' | 'spin' | null>(null);
  const [lastTapWorld, setLastTapWorld] = useState<{ x: number; z: number } | null>(null);

  const activeMode = manualMode ?? propBowlingMode ?? 'pace';
  const zones = activeMode === 'spin' ? SPIN_LENGTH_ZONES : PACE_LENGTH_ZONES;
  const isLhb = stance === 'LHB';
  const orderedLines = useMemo(() => (isLhb ? [...LINES].reverse() : [...LINES]), [isLhb]);

  const sideLabels = isLhb
    ? ['Wide Leg', 'Leg', 'Middle', 'Off', 'Wide Off']
    : ['Wide Off', 'Off', 'Middle', 'Leg', 'Wide Leg'];

  const latestRef = useRef({ zones, orderedLines, onSelect });
  latestRef.current = { zones, orderedLines, onSelect };

  const sceneRefs = useRef<{
    groundMat: THREE.MeshStandardMaterial;
    ballsGroup: THREE.Group;
    markerGroup: THREE.Group;
  } | null>(null);

  // Initialize Three.js Broadcast Pitch Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 360;
    const height = container.clientHeight || 270;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0B1F13');

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.5, 80);
    camera.position.set(0, 10.6, 9.8);
    camera.lookAt(0, 0, -0.3);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Stadium Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.85));

    const sun = new THREE.DirectionalLight(0xfffbeb, 1.15);
    sun.position.set(6, 14, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    scene.add(sun);

    // Ground + Pitch Plane
    const groundGeo = new THREE.PlaneGeometry(GROUND_W, GROUND_L);
    const groundTex = createPitchGroundTexture(PACE_LENGTH_ZONES);
    const groundMat = new THREE.MeshStandardMaterial({
      map: groundTex,
      roughness: 0.86,
      metalness: 0.04,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // 3D Wooden Stumps & Bails at Batter's End (z = -MAX_METERS / 2)
    const stumpZ = metersToZ(0);
    const stumpMat = new THREE.MeshStandardMaterial({ color: '#FDE047', roughness: 0.35 });
    const bailMat = new THREE.MeshStandardMaterial({ color: '#FACC15', roughness: 0.3 });
    [-0.114, 0, 0.114].forEach((sx) => {
      const sGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.71, 10);
      const sMesh = new THREE.Mesh(sGeo, stumpMat);
      sMesh.position.set(sx, 0.355, stumpZ);
      sMesh.castShadow = true;
      scene.add(sMesh);
    });
    const bailGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.24, 8);
    const bailMesh = new THREE.Mesh(bailGeo, bailMat);
    bailMesh.rotation.z = Math.PI / 2;
    bailMesh.position.set(0, 0.72, stumpZ);
    scene.add(bailMesh);

    const ballsGroup = new THREE.Group();
    scene.add(ballsGroup);

    const markerGroup = new THREE.Group();
    scene.add(markerGroup);

    sceneRefs.current = { groundMat, ballsGroup, markerGroup };

    // Raycast tap-to-pitch
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const onPointerUp = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      const hits = raycaster.intersectObject(groundMesh);
      if (hits.length === 0) return;

      const pt = hits[0].point;
      const clampedX = Math.max(-LINE_HALF_SPAN, Math.min(LINE_HALF_SPAN, pt.x));
      const clampedZ = Math.max(metersToZ(0.1), Math.min(metersToZ(MAX_METERS - 0.1), pt.z));

      const m = zToMeters(clampedZ);
      const { zones: curZones, orderedLines: curLines, onSelect: curSelect } = latestRef.current;
      const zone = curZones.find((z) => m >= z.minMeters && m < z.maxMeters) ?? curZones[curZones.length - 1];

      const ratio = (clampedX + LINE_HALF_SPAN) / (LINE_HALF_SPAN * 2);
      const lineIdx = Math.min(curLines.length - 1, Math.max(0, Math.floor(ratio * curLines.length)));
      const pickedLine = curLines[lineIdx];

      setLastTapWorld({ x: clampedX, z: clampedZ });
      curSelect(pickedLine, zone.label);
    };

    renderer.domElement.addEventListener('pointerup', onPointerUp);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      groundTex.dispose();
      groundMat.dispose();
      groundGeo.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      sceneRefs.current = null;
    };
  }, []);

  // Update Pitch Texture when Pace/Spin or selectedLength changes
  useEffect(() => {
    const refs = sceneRefs.current;
    if (!refs) return;
    const oldTex = refs.groundMat.map;
    refs.groundMat.map = createPitchGroundTexture(zones, selectedLength);
    refs.groundMat.needsUpdate = true;
    oldTex?.dispose();
  }, [zones, selectedLength]);

  // Render Plotted 3D Cricket Balls for Historical Deliveries
  useEffect(() => {
    const refs = sceneRefs.current;
    if (!refs) return;
    const { ballsGroup } = refs;

    disposeThreeGroup(ballsGroup);

    const laneW = (LINE_HALF_SPAN * 2) / orderedLines.length;

    for (const b of balls) {
      if (b.isUndone || !b.line || !b.length) continue;

      const zone = findZoneForLength(b.length, zones);
      const midM = (zone.minMeters + Math.min(zone.maxMeters, MAX_METERS)) / 2;
      const spanM = Math.min(zone.maxMeters, MAX_METERS) - zone.minMeters;
      const z = metersToZ(midM + deterministicOffset(`${b.id}-z`, spanM * 0.28));

      const idx = orderedLines.indexOf(b.line as (typeof LINES)[number]);
      const safeIdx = idx >= 0 ? idx : 2;
      const x =
        -LINE_HALF_SPAN +
        (safeIdx + 0.5) * laneW +
        deterministicOffset(`${b.id}-x`, laneW * 0.25);

      const isBoundary = b.runs === '4' || b.runs === '6';
      const isRun = b.runs === '1' || b.runs === '2' || b.runs === '3';
      const color = b.isWicket
        ? '#FFFFFF'
        : isBoundary
          ? '#FACC15'
          : isRun
            ? '#38BDF8'
            : '#DC2626';

      const ballGeo = new THREE.SphereGeometry(0.11, 14, 14);
      const ballMat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.25,
        metalness: 0.15,
      });
      const ballMesh = new THREE.Mesh(ballGeo, ballMat);
      ballMesh.position.set(x, 0.11, z);
      ballMesh.castShadow = true;
      ballsGroup.add(ballMesh);
    }
  }, [balls, zones, orderedLines]);

  // Render Selected Target Marker
  useEffect(() => {
    const refs = sceneRefs.current;
    if (!refs) return;
    const { markerGroup } = refs;

    disposeThreeGroup(markerGroup);

    if (!selectedLine || !selectedLength) return;

    let x = lastTapWorld?.x ?? 0;
    let z = lastTapWorld?.z ?? 0;
    if (!lastTapWorld) {
      const zone = findZoneForLength(selectedLength, zones);
      z = metersToZ((zone.minMeters + Math.min(zone.maxMeters, MAX_METERS)) / 2);
      const idx = orderedLines.indexOf(selectedLine as (typeof LINES)[number]);
      const laneW = (LINE_HALF_SPAN * 2) / orderedLines.length;
      x = -LINE_HALF_SPAN + ((idx >= 0 ? idx : 3) + 0.5) * laneW;
    }

    const ringGeo = new THREE.RingGeometry(0.22, 0.34, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: '#FFFFFF', side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, 0.02, z);
    markerGroup.add(ring);

    const pinGeo = new THREE.SphereGeometry(0.13, 14, 14);
    const pinMat = new THREE.MeshStandardMaterial({
      color: '#2563EB',
      emissive: '#2563EB',
      emissiveIntensity: 0.45,
      roughness: 0.2,
    });
    const pin = new THREE.Mesh(pinGeo, pinMat);
    pin.position.set(x, 0.13, z);
    markerGroup.add(pin);
  }, [selectedLine, selectedLength, lastTapWorld, zones, orderedLines]);

  return (
    <div className="ui-card-elevated p-3">
      {/* Header */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="ui-label mb-0">Pitch Map ({stance})</span>
          <div className="inline-flex rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-0.5 text-[10px] font-bold">
            {(['pace', 'spin'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setManualMode(m)}
                className={`rounded px-1.5 py-0.5 uppercase transition-colors ${
                  activeMode === m
                    ? 'bg-[var(--accent-primary)] text-white'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <span className="rounded-md bg-[var(--bg-surface)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--accent-primary)] ring-1 ring-[var(--border-subtle)]">
          {selectedLength && selectedLine ? `${selectedLength} · ${selectedLine}` : 'Tap pitch'}
        </span>
      </div>

      {/* 3D Broadcast WebGL Pitch */}
      <div className="overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[#0B1F13]">
        <div ref={mountRef} className="h-[260px] w-full cursor-crosshair sm:h-[290px]" />

        {/* Broadcast Legend Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0B1F4D] px-3 py-1.5 text-[10px] font-semibold text-white">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-[#DC2626] ring-1 ring-white/40" />
              Dots
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-[#38BDF8] ring-1 ring-white/40" />
              Runs
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-[#FACC15] ring-1 ring-white/40" />
              Boundaries
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-[#FFFFFF] ring-1 ring-white/60" />
              Wickets
            </span>
          </div>
          <span className="text-[9px] uppercase tracking-wider text-slate-300">
            {activeMode === 'pace' ? 'Pace (0–8.6m+)' : 'Spin (0–4.1m+)'}
          </span>
        </div>
      </div>

      {/* Off / Middle / Leg Axis Labels */}
      <div className="mt-2 flex justify-between px-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--text-muted)] sm:text-[10px]">
        {sideLabels.map((lbl) => (
          <span key={lbl}>{lbl}</span>
        ))}
      </div>
    </div>
  );
};
