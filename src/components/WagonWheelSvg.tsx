import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { WAGON_RUN_COLORS, type BallEvent } from '../domain/types';
import { SlcLoader } from './ui/SlcLoader';

interface WagonWheelSvgProps {
  interactive?: boolean;
  selectedX?: number;
  selectedY?: number;
  onSelectPoint?: (x: number, y: number) => void;
  balls?: BallEvent[];
  stance?: 'RHB' | 'LHB';
  onChangeStance?: (stance: 'RHB' | 'LHB') => void;
}

type CameraPreset = 'broadcast' | 'top' | 'low';

const PRESET_POSITIONS: Record<CameraPreset, [number, number, number]> = {
  broadcast: [0, 46, 56],
  top: [0, 82, 0.001],
  low: [0, 20, 70],
};

// Map domain shotX (0..100), shotY (0..80) <-> Three.js circular ground (X, Z) of radius 20
function toWorld(gx: number, gy: number): { x: number; z: number } {
  return {
    x: ((gx - 50) / 45) * 20,
    z: ((gy - 40) / 35) * 20,
  };
}

function toDomain(wx: number, wz: number): { gx: number; gy: number } {
  const gx = Math.round((wx / 20) * 45 + 50);
  const gy = Math.round((wz / 20) * 35 + 40);
  return {
    gx: Math.max(4, Math.min(96, gx)),
    gy: Math.max(4, Math.min(76, gy)),
  };
}

function getZoneLabel(x: number, y: number, isLhb: boolean): string {
  const dx = x - 50;
  const dy = y - 34;
  const effectiveX = isLhb ? -dx : dx;
  const effAngle = (Math.atan2(effectiveX, dy) * 180) / Math.PI;

  if (effAngle >= -22.5 && effAngle < 22.5) return 'Straight / Long';
  if (effAngle >= 22.5 && effAngle < 67.5) return 'Mid-Wicket / Long On';
  if (effAngle >= 67.5 && effAngle < 112.5) return 'Square Leg';
  if (effAngle >= 112.5 && effAngle < 157.5) return 'Fine Leg';
  if (effAngle >= -67.5 && effAngle < -22.5) return 'Long Off / Mid-Off';
  if (effAngle >= -112.5 && effAngle < -67.5) return 'Cover / Extra Cover';
  if (effAngle >= -157.5 && effAngle < -112.5) return 'Point / Gully';
  return 'Third Man / Fine';
}

function createTurfTexture(isLhb: boolean): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const cx = size / 2;
  const cy = size / 2;

  // Base dark green
  ctx.fillStyle = '#155E17';
  ctx.fillRect(0, 0, size, size);

  // Checkerboard subtle mowing stripes
  const step = 48;
  for (let y = 0; y < size; y += step) {
    for (let x = 0; x < size; x += step) {
      if (((x / step) + (y / step)) % 2 === 0) {
        ctx.fillStyle = 'rgba(74, 222, 128, 0.06)';
        ctx.fillRect(x, y, step, step);
      }
    }
  }

  // Concentric mowed turf rings
  const rings = [
    { r: 490, color: 'rgba(34, 197, 94, 0.14)' },
    { r: 410, color: 'rgba(22, 163, 74, 0.18)' },
    { r: 330, color: 'rgba(74, 222, 128, 0.12)' },
    { r: 250, color: 'rgba(22, 163, 74, 0.18)' },
    { r: 170, color: 'rgba(74, 222, 128, 0.12)' },
  ];
  for (const ring of rings) {
    ctx.beginPath();
    ctx.arc(cx, cy, ring.r, 0, Math.PI * 2);
    ctx.fillStyle = ring.color;
    ctx.fill();
  }

  // Radial sector lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * 475, cy + Math.sin(angle) * 475);
    ctx.stroke();
  }

  // 30-yard inner fielding circle (dashed)
  ctx.save();
  ctx.setLineDash([12, 10]);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, 275, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Crisp white boundary rope
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(cx, cy, 475, 0, Math.PI * 2);
  ctx.stroke();

  // OFF-SIDE / LEG-SIDE labels painted on turf
  ctx.font = 'bold 34px Inter, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(isLhb ? 'LEG - SIDE' : 'OFF - SIDE', cx - 230, cy);
  ctx.fillText(isLhb ? 'OFF - SIDE' : 'LEG - SIDE', cx + 230, cy);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

export const WagonWheelSvg: React.FC<WagonWheelSvgProps> = ({
  interactive = false,
  selectedX,
  selectedY,
  onSelectPoint,
  balls = [],
  stance: controlledStance,
  onChangeStance,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [internalStance, setInternalStance] = useState<'RHB' | 'LHB'>('RHB');
  const stance = controlledStance ?? internalStance;
  const setStance = (next: 'RHB' | 'LHB') => {
    if (onChangeStance) onChangeStance(next);
    else setInternalStance(next);
  };
  const [preset, setPreset] = useState<CameraPreset>('broadcast');
  const [inspectedBallId, setInspectedBallId] = useState<string | null>(null);
  const [runFilter, setRunFilter] = useState<string>('ALL');
  const [isSceneReady, setIsSceneReady] = useState(false);

  const isLhb = stance === 'LHB';

  const mappedBalls = useMemo(
    () =>
      balls.filter(
        (b) => !b.isUndone && typeof b.shotX === 'number' && typeof b.shotY === 'number'
      ),
    [balls]
  );

  const visibleBalls = useMemo(() => {
    if (runFilter === 'ALL') return mappedBalls;
    return mappedBalls.filter((b) => (b.runs ?? 'Unrecorded') === runFilter);
  }, [mappedBalls, runFilter]);

  const stats = useMemo(() => {
    let offSide = 0;
    let legSide = 0;
    let totalRuns = 0;
    for (const b of mappedBalls) {
      const x = b.shotX ?? 50;
      const onLeft = x < 50;
      if (isLhb ? !onLeft : onLeft) offSide++;
      else legSide++;
      const rNum = Number(b.runs);
      if (!Number.isNaN(rNum)) totalRuns += rNum;
    }
    const total = mappedBalls.length || 1;
    return {
      offPct: Math.round((offSide / total) * 100),
      legPct: Math.round((legSide / total) * 100),
      totalRuns,
    };
  }, [mappedBalls, isLhb]);

  const inspectedBall = useMemo(
    () => mappedBalls.find((b) => b.id === inspectedBallId) ?? null,
    [mappedBalls, inspectedBallId]
  );

  // Refs for latest callbacks/state inside Three.js event handlers
  const interactiveRef = useRef(interactive);
  interactiveRef.current = interactive;
  const onSelectRef = useRef(onSelectPoint);
  onSelectRef.current = onSelectPoint;

  const sceneRefs = useRef<{
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    turfMat: THREE.MeshStandardMaterial;
    shotsGroup: THREE.Group;
    markerGroup: THREE.Group;
    targetCamPos: THREE.Vector3 | null;
  } | null>(null);

  // Initialize Three.js WebGL Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 300;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#071222');

    const camera = new THREE.PerspectiveCamera(30, width / height, 0.5, 250);
    camera.position.set(...PRESET_POSITIONS.broadcast);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2 - 0.06;
    controls.minDistance = 28;
    controls.maxDistance = 110;
    controls.target.set(0, 0, 0);

    // Stadium Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xfff8e7, 1.15);
    dirLight.position.set(18, 38, 22);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.35);
    rimLight.position.set(-20, 15, -25);
    scene.add(rimLight);

    // Outer Stadium Skirt (True 1:1 circular stadium)
    const skirtGeo = new THREE.CylinderGeometry(21.4, 22.0, 0.7, 72);
    const skirtMat = new THREE.MeshStandardMaterial({ color: '#0B2E13', roughness: 0.9 });
    const skirtMesh = new THREE.Mesh(skirtGeo, skirtMat);
    skirtMesh.position.y = -0.36;
    scene.add(skirtMesh);

    // Main Circular Turf Ground (True 1:1 aspect, undistorted in Top View)
    const turfGeo = new THREE.CylinderGeometry(20.6, 20.6, 0.16, 72);
    const turfTex = createTurfTexture(false);
    const turfMat = new THREE.MeshStandardMaterial({
      map: turfTex,
      roughness: 0.82,
      metalness: 0.05,
    });
    const turfMesh = new THREE.Mesh(turfGeo, turfMat);
    turfMesh.position.y = -0.08;
    turfMesh.rotation.y = Math.PI / 2;
    turfMesh.receiveShadow = true;
    scene.add(turfMesh);

    // 3D Cricket Pitch Strip
    const pitchGeo = new THREE.BoxGeometry(2.8, 0.05, 11);
    const pitchMat = new THREE.MeshStandardMaterial({ color: '#E3C38D', roughness: 0.9 });
    const pitchMesh = new THREE.Mesh(pitchGeo, pitchMat);
    pitchMesh.position.y = 0.025;
    pitchMesh.receiveShadow = true;
    scene.add(pitchMesh);

    // Crease lines
    const creaseMat = new THREE.MeshBasicMaterial({ color: '#FFFFFF' });
    [-3.8, 3.8].forEach((zPos) => {
      const cGeo = new THREE.PlaneGeometry(3.6, 0.08);
      const cMesh = new THREE.Mesh(cGeo, creaseMat);
      cMesh.rotation.x = -Math.PI / 2;
      cMesh.position.set(0, 0.055, zPos);
      scene.add(cMesh);
    });

    // 3D Stumps at both ends
    const stumpMat = new THREE.MeshStandardMaterial({ color: '#FDE047', roughness: 0.4 });
    [-4.7, 4.7].forEach((zPos) => {
      [-0.22, 0, 0.22].forEach((xOff) => {
        const sGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.72, 8);
        const sMesh = new THREE.Mesh(sGeo, stumpMat);
        sMesh.position.set(xOff, 0.36, zPos);
        sMesh.castShadow = true;
        scene.add(sMesh);
      });
    });

    // Batter Origin Ring
    const originPos = toWorld(50, 34);
    const originGeo = new THREE.RingGeometry(0.25, 0.48, 24);
    const originMat = new THREE.MeshBasicMaterial({
      color: '#FACC15',
      side: THREE.DoubleSide,
    });
    const originMesh = new THREE.Mesh(originGeo, originMat);
    originMesh.rotation.x = -Math.PI / 2;
    originMesh.position.set(originPos.x, 0.06, originPos.z);
    scene.add(originMesh);

    const shotsGroup = new THREE.Group();
    scene.add(shotsGroup);

    const markerGroup = new THREE.Group();
    scene.add(markerGroup);

    sceneRefs.current = {
      camera,
      controls,
      turfMat,
      shotsGroup,
      markerGroup,
      targetCamPos: null,
    };

    // Raycaster for exact tap-to-place & ball inspection
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downX = 0;
    let downY = 0;

    const onPointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
      if (sceneRefs.current) sceneRefs.current.targetCamPos = null;
    };

    const onPointerUp = (e: PointerEvent) => {
      const dist = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (dist > 6) return; // Was a camera drag, not a tap

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      if (interactiveRef.current && onSelectRef.current) {
        const hits = raycaster.intersectObject(turfMesh);
        if (hits.length > 0) {
          const pt = hits[0].point;
          const { gx, gy } = toDomain(pt.x, pt.z);
          onSelectRef.current(gx, gy);
        }
      } else if (!interactiveRef.current) {
        const hits = raycaster.intersectObjects(shotsGroup.children, true);
        if (hits.length > 0) {
          const hitObj = hits[0].object;
          const ballId = hitObj.userData?.ballId as string | undefined;
          if (ballId) {
            setInspectedBallId((prev) => (prev === ballId ? null : ballId));
          }
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    // ResizeObserver for responsive container
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

    // Animation Loop
    let animId = 0;
    let firstFrame = true;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (sceneRefs.current?.targetCamPos) {
        camera.position.lerp(sceneRefs.current.targetCamPos, 0.12);
        if (camera.position.distanceTo(sceneRefs.current.targetCamPos) < 0.15) {
          camera.position.copy(sceneRefs.current.targetCamPos);
          sceneRefs.current.targetCamPos = null;
        }
      }
      controls.update();
      renderer.render(scene, camera);
      if (firstFrame) {
        firstFrame = false;
        setIsSceneReady(true);
      }
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      controls.dispose();
      turfTex.dispose();
      turfMat.dispose();
      turfGeo.dispose();
      skirtGeo.dispose();
      skirtMat.dispose();
      pitchGeo.dispose();
      pitchMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      sceneRefs.current = null;
    };
  }, []);

  // Update Turf Texture when RHB/LHB changes
  useEffect(() => {
    const refs = sceneRefs.current;
    if (!refs) return;
    const oldTex = refs.turfMat.map;
    refs.turfMat.map = createTurfTexture(isLhb);
    refs.turfMat.needsUpdate = true;
    oldTex?.dispose();
  }, [isLhb]);

  // Smooth Camera Preset Transition
  const applyPreset = (nextPreset: CameraPreset) => {
    setPreset(nextPreset);
    const refs = sceneRefs.current;
    if (!refs) return;
    refs.controls.target.set(0, 0, 0);
    refs.targetCamPos = new THREE.Vector3(...PRESET_POSITIONS[nextPreset]);
  };

  // Render 3D Shot Trajectories
  useEffect(() => {
    const refs = sceneRefs.current;
    if (!refs) return;
    const { shotsGroup } = refs;

    // Clear previous meshes
    while (shotsGroup.children.length > 0) {
      const child = shotsGroup.children[0] as THREE.Mesh;
      shotsGroup.remove(child);
      child.geometry?.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => m.dispose());
      } else {
        child.material?.dispose();
      }
    }

    const start = toWorld(50, 34);

    for (const b of visibleBalls) {
      const end = toWorld(b.shotX ?? 50, b.shotY ?? 40);
      const hex = WAGON_RUN_COLORS[b.runs ?? 'Unrecorded'] ?? WAGON_RUN_COLORS.Unrecorded;
      const isSelected = inspectedBallId === b.id;
      const isSix = b.runs === '6';
      const isFour = b.runs === '4';
      const isBoundaryCurve = isSix || isFour;

      let pathCurve: THREE.Curve<THREE.Vector3>;
      if (isBoundaryCurve) {
        const midX = (start.x + end.x) / 2;
        const midZ = (start.z + end.z) / 2;
        const dist = Math.hypot(end.x - start.x, end.z - start.z);
        const arcPeak = isSix ? Math.max(12, dist * 0.72) : Math.max(6.5, dist * 0.38);

        // Ground shadow line so the 3D lift/curve is immediately visible for 4s and 6s
        const shadowGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(start.x, 0.08, start.z),
          new THREE.Vector3(end.x, 0.08, end.z),
        ]);
        const shadowMat = new THREE.LineBasicMaterial({
          color: '#000000',
          transparent: true,
          opacity: 0.28,
        });
        shotsGroup.add(new THREE.Line(shadowGeo, shadowMat));

        pathCurve = new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(start.x, 0.3, start.z),
          new THREE.Vector3(midX, arcPeak, midZ),
          new THREE.Vector3(end.x, 0.2, end.z)
        );
      } else {
        // Straight ground line for Dot, 1, 2, 3, and unrecorded runs
        pathCurve = new THREE.LineCurve3(
          new THREE.Vector3(start.x, 0.14, start.z),
          new THREE.Vector3(end.x, 0.14, end.z)
        );
      }

      const radius = isSelected ? 0.18 : isBoundaryCurve ? 0.13 : 0.09;
      const tubeGeo = new THREE.TubeGeometry(pathCurve, isBoundaryCurve ? 24 : 4, radius, 8, false);
      const tubeMat = new THREE.MeshStandardMaterial({
        color: hex,
        emissive: hex,
        emissiveIntensity: isSelected ? 0.55 : 0.2,
        roughness: 0.35,
      });
      const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
      tubeMesh.userData = { ballId: b.id };
      tubeMesh.castShadow = isSix;
      shotsGroup.add(tubeMesh);

      // Landing Marker Sphere
      const sphereGeo = new THREE.SphereGeometry(isSelected ? 0.45 : 0.32, 14, 14);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: hex,
        emissive: hex,
        emissiveIntensity: 0.35,
      });
      const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
      sphereMesh.position.set(end.x, 0.2, end.z);
      sphereMesh.userData = { ballId: b.id };
      shotsGroup.add(sphereMesh);
    }
  }, [visibleBalls, inspectedBallId]);

  // Render Interactive Target Marker
  useEffect(() => {
    const refs = sceneRefs.current;
    if (!refs) return;
    const { markerGroup } = refs;

    while (markerGroup.children.length > 0) {
      const child = markerGroup.children[0] as THREE.Mesh;
      markerGroup.remove(child);
      child.geometry?.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => m.dispose());
      } else {
        child.material?.dispose();
      }
    }

    if (!interactive || typeof selectedX !== 'number' || typeof selectedY !== 'number') return;

    const start = toWorld(50, 34);
    const end = toWorld(selectedX, selectedY);

    // Curved Trajectory Preview + ground shadow
    const shadowGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(start.x, 0.08, start.z),
      new THREE.Vector3(end.x, 0.08, end.z),
    ]);
    const shadowMat = new THREE.LineBasicMaterial({
      color: '#000000',
      transparent: true,
      opacity: 0.3,
    });
    markerGroup.add(new THREE.Line(shadowGeo, shadowMat));

    const midX = (start.x + end.x) / 2;
    const midZ = (start.z + end.z) / 2;
    const dist = Math.hypot(end.x - start.x, end.z - start.z);
    const previewCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(start.x, 0.3, start.z),
      new THREE.Vector3(midX, Math.max(4.5, dist * 0.35), midZ),
      new THREE.Vector3(end.x, 0.2, end.z)
    );
    const tubeGeo = new THREE.TubeGeometry(previewCurve, 24, 0.11, 8, false);
    const tubeMat = new THREE.MeshStandardMaterial({
      color: '#FACC15',
      emissive: '#FACC15',
      emissiveIntensity: 0.35,
    });
    markerGroup.add(new THREE.Mesh(tubeGeo, tubeMat));

    // Glowing ring
    const ringGeo = new THREE.RingGeometry(0.55, 0.9, 28);
    const ringMat = new THREE.MeshBasicMaterial({
      color: '#10B981',
      side: THREE.DoubleSide,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.set(end.x, 0.12, end.z);
    markerGroup.add(ringMesh);

    // Center Pin Sphere
    const pinGeo = new THREE.SphereGeometry(0.4, 16, 16);
    const pinMat = new THREE.MeshStandardMaterial({
      color: '#10B981',
      emissive: '#10B981',
      emissiveIntensity: 0.45,
    });
    const pinMesh = new THREE.Mesh(pinGeo, pinMat);
    pinMesh.position.set(end.x, 0.4, end.z);
    markerGroup.add(pinMesh);
  }, [interactive, selectedX, selectedY]);

  return (
    <div className="space-y-2.5">
      {/* Top Bar: View Presets + Stance Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="inline-flex rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-0.5 text-[11px] font-bold">
            {(['RHB', 'LHB'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStance(s)}
                className={`rounded-md px-2 py-1 transition-colors ${
                  stance === s
                    ? 'bg-[var(--accent-primary)] text-white'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="inline-flex rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-0.5 text-[11px] font-semibold">
            {(
              [
                { id: 'broadcast', label: 'Broadcast 3D' },
                { id: 'top', label: 'Top View' },
                { id: 'low', label: 'Low Angle' },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.id)}
                className={`rounded-md px-2 py-1 transition-colors ${
                  preset === p.id
                    ? 'bg-[var(--bg-header)] text-white'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {interactive && typeof selectedX === 'number' && typeof selectedY === 'number' ? (
          <span className="rounded-md bg-[var(--accent-primary)]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[var(--accent-primary)]">
            {getZoneLabel(selectedX, selectedY, isLhb)}
          </span>
        ) : !interactive && mappedBalls.length > 0 ? (
          <div className="flex items-center gap-1.5 text-[11px] font-semibold tabular-nums">
            <span className="rounded bg-sky-500/15 px-2 py-0.5 text-sky-600 dark:text-sky-400">
              Off {stats.offPct}%
            </span>
            <span className="rounded bg-amber-500/15 px-2 py-0.5 text-amber-600 dark:text-amber-400">
              Leg {stats.legPct}%
            </span>
            <span className="rounded bg-[var(--accent-primary)]/15 px-2 py-0.5 text-[var(--accent-primary)]">
              Total {stats.totalRuns}
            </span>
          </div>
        ) : null}
      </div>

      {/* Three.js WebGL 3D Cricket Stadium Canvas */}
      <div className="relative overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[#071222]">
        {!isSceneReady && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#071222]">
            <SlcLoader label="Loading 3D Ground..." />
          </div>
        )}
        <div
          ref={mountRef}
          className={`h-[270px] w-full sm:h-[310px] ${
            interactive ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'
          }`}
        />
        <span className="pointer-events-none absolute right-2.5 bottom-2 rounded bg-black/50 px-2 py-0.5 text-[10px] font-medium text-slate-300">
          Drag to orbit/tilt · Scroll to zoom{interactive ? ' · Tap ground to mark' : ''}
        </span>
      </div>

      {/* Inspected Ball Detail */}
      {!interactive && inspectedBall && (
        <div className="ui-card-elevated flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-[var(--text-primary)]">
              Ball #{inspectedBall.ballNumber}
            </span>
            <span className="rounded bg-[var(--accent-primary)]/15 px-2 py-0.5 font-semibold text-[var(--accent-primary)]">
              {inspectedBall.contactOutcome}
            </span>
            {inspectedBall.runs && (
              <span className="font-bold text-[var(--text-primary)]">
                {inspectedBall.runs === 'Dot' ? '0 runs' : `${inspectedBall.runs} runs`}
              </span>
            )}
            {inspectedBall.shotType && (
              <span className="text-[var(--text-secondary)]">· {inspectedBall.shotType}</span>
            )}
          </div>
          <button type="button" onClick={() => setInspectedBallId(null)} className="ui-link">
            Clear
          </button>
        </div>
      )}

      {/* Interactive Run Legend Filter (View Mode) */}
      {!interactive && (
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setRunFilter('ALL')}
            className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              runFilter === 'ALL'
                ? 'bg-[var(--text-primary)] text-[var(--bg-surface)]'
                : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            All ({mappedBalls.length})
          </button>
          {Object.entries(WAGON_RUN_COLORS).map(([label, color]) => {
            const count = mappedBalls.filter((b) => (b.runs ?? 'Unrecorded') === label).length;
            if (count === 0 && label === 'Unrecorded') return null;
            const active = runFilter === label;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setRunFilter(active ? 'ALL' : label)}
                className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                  active
                    ? 'border-[var(--text-primary)] bg-[var(--bg-surface)] text-[var(--text-primary)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                }`}
              >
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                {label}
                {count > 0 && <span className="tabular-nums opacity-75">({count})</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
