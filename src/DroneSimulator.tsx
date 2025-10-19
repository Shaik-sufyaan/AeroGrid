import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const DroneSimulator = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [speed, setSpeed] = useState(0);
  const [altitude, setAltitude] = useState(10);
  const [rotation, setRotation] = useState(0);
  const [coords, setCoords] = useState({ x: 0, z: 0 });
  const [collisionWarning, setCollisionWarning] = useState(false);
  const [landablePads, setLandablePads] = useState<Array<{ x: number; z: number }>>([]);
  const [preparing, setPreparing] = useState(true);
  const [showForceField, setShowForceField] = useState(true);
  const [showVolumeFog, setShowVolumeFog] = useState(true);

  const forceFieldPointsRef = useRef<THREE.Points | null>(null);
  const trajectoryLineRef = useRef<THREE.Line | null>(null);
  const volumeMeshRef = useRef<THREE.Mesh | null>(null);
  const sdfReadyRef = useRef(false);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    scene.fog = new THREE.Fog(0x1a1a2e, 0, 500);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    // Prefer WebGL2 for 3D textures; gracefully fall back to WebGL1
    const canvas = document.createElement('canvas');
    const gl2 = canvas.getContext('webgl2') as WebGL2RenderingContext | null;
    const renderer = new THREE.WebGLRenderer({ antialias: true, canvas, context: gl2 ?? undefined });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Debug WebGL2 support
    console.log('WebGL2 supported?', renderer.capabilities.isWebGL2);
    if (!renderer.capabilities.isWebGL2) {
      console.warn('WebGL2 not supported—volume fog will not work. Fog points will still work.');
    }

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404060, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(100, 150, 100);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -200;
    directionalLight.shadow.camera.right = 200;
    directionalLight.shadow.camera.top = 200;
    directionalLight.shadow.camera.bottom = -200;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Ground
    const groundGeometry = new THREE.PlaneGeometry(400, 400);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x2a2a3e,
      roughness: 0.9
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Roads
    const roadMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x1a1a1a,
      roughness: 0.8
    });
    
    for (let i = -180; i <= 180; i += 60) {
      const roadH = new THREE.Mesh(
        new THREE.PlaneGeometry(400, 8),
        roadMaterial
      );
      roadH.rotation.x = -Math.PI / 2;
      roadH.position.set(0, 0.01, i);
      roadH.receiveShadow = true;
      scene.add(roadH);

      const roadV = new THREE.Mesh(
        new THREE.PlaneGeometry(8, 400),
        roadMaterial
      );
      roadV.rotation.x = -Math.PI / 2;
      roadV.position.set(i, 0.01, 0);
      roadV.receiveShadow = true;
      scene.add(roadV);

      for (let j = -180; j <= 180; j += 12) {
        const marking = new THREE.Mesh(
          new THREE.PlaneGeometry(0.3, 4),
          new THREE.MeshBasicMaterial({ color: 0xffff00 })
        );
        marking.rotation.x = -Math.PI / 2;
        marking.position.set(i, 0.02, j);
        scene.add(marking);
      }
    }

    // City mesh registry for geofence generation and APF
    const cityMeshes: THREE.Mesh[] = [];
    const buildingsMeta: Array<{
      center: THREE.Vector3;
      halfSize: THREE.Vector3;
      roofY: number;
      landable: boolean;
    }> = [];

    // Procedural geofence data
    type GeofenceData = {
      heightMap: number[][];
      dilated: boolean[][];
      originX: number;
      originZ: number;
      cellSize: number;
      nx: number;
      nz: number;
      buffer: number;
      verticalClearance: number;
    };
    let geofence: GeofenceData | null = null;

    // City buildings
    const buildingTypes = [
      { w: 15, d: 15, colors: [0x2c3e50, 0x34495e, 0x1abc9c, 0x16a085, 0x2980b9] },
      { w: 20, d: 20, colors: [0x8e44ad, 0x9b59b6, 0xe74c3c, 0xc0392b, 0xd35400] },
      { w: 12, d: 25, colors: [0x27ae60, 0x2ecc71, 0xf39c12, 0xe67e22, 0x95a5a6] }
    ];

    // Generate city blocks
    for (let bx = -3; bx <= 3; bx++) {
      for (let bz = -3; bz <= 3; bz++) {
        if (Math.abs(bx) <= 1 && Math.abs(bz) <= 1) continue;

        const blockX = bx * 60;
        const blockZ = bz * 60;

        const numBuildings = Math.floor(Math.random() * 3) + 2;
        
        for (let i = 0; i < numBuildings; i++) {
          const type = buildingTypes[Math.floor(Math.random() * buildingTypes.length)];
          const height = Math.random() * 50 + 15;
          const offsetX = (Math.random() - 0.5) * 30;
          const offsetZ = (Math.random() - 0.5) * 30;
          
          const buildingGeometry = new THREE.BoxGeometry(type.w, height, type.d);
          const buildingMaterial = new THREE.MeshStandardMaterial({ 
            color: type.colors[Math.floor(Math.random() * type.colors.length)],
            roughness: 0.7,
            metalness: 0.4
          });
          const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
          building.position.set(blockX + offsetX, height / 2, blockZ + offsetZ);
          building.castShadow = true;
          building.receiveShadow = true;
          scene.add(building);
          cityMeshes.push(building);

          // Randomly assign roof landability
          // Seeded landability for determinism per session
          const seed = ((bx+10)*73856093) ^ ((bz+10)*19349663) ^ (i*83492791);
          const landable = (seed % 100) < 50;
          buildingsMeta.push({
            center: building.position.clone(),
            halfSize: new THREE.Vector3(type.w / 2, height / 2, type.d / 2),
            roofY: height,
            landable
          });

          // Legacy per-building geogrid removed: geofence will be generated globally from meshes

          // Windows
          const windowGeometry = new THREE.PlaneGeometry(1.5, 2);
          const windowMaterial = new THREE.MeshStandardMaterial({ 
            color: Math.random() > 0.3 ? 0xffdd88 : 0x333366,
            emissive: Math.random() > 0.3 ? 0xffaa44 : 0x000000,
            emissiveIntensity: 0.5
          });
          windowMaterial.polygonOffset = true;
          windowMaterial.polygonOffsetFactor = -1;
          windowMaterial.polygonOffsetUnits = -1;
          
          const floors = Math.floor(height / 4);
          const windowsPerFloor = Math.floor(type.w / 3);
          
          for (let floor = 0; floor < floors; floor++) {
            for (let side = 0; side < 4; side++) {
              for (let w = 0; w < windowsPerFloor; w++) {
                const window1 = new THREE.Mesh(windowGeometry, windowMaterial.clone());
                const angle = (Math.PI / 2) * side;
                const dist = side % 2 === 0 ? type.d / 2 + 0.01 : type.w / 2 + 0.01;
                const offset = (w - windowsPerFloor / 2) * 3;
                
                if (side % 2 === 0) {
                  window1.position.set(
                    blockX + offsetX + offset,
                    floor * 4 + 3,
                    blockZ + offsetZ + (side === 0 ? dist : -dist)
                  );
                } else {
                  window1.position.set(
                    blockX + offsetX + (side === 1 ? dist : -dist),
                    floor * 4 + 3,
                    blockZ + offsetZ + offset
                  );
                }
                window1.rotation.y = angle;
                window1.renderOrder = 2;
                scene.add(window1);
              }
            }
          }

          // Visual pad marker for landable roofs
          if (landable) {
            const padGeom = new THREE.RingGeometry(Math.min(type.w, type.d)*0.3, Math.min(type.w, type.d)*0.35, 32);
            const padMat = new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
            const pad = new THREE.Mesh(padGeom, padMat);
            pad.rotation.x = -Math.PI/2;
            pad.position.set(blockX + offsetX, height + 0.02, blockZ + offsetZ);
            scene.add(pad);
            // record for radar
            setLandablePads(prev => [...prev, { x: blockX + offsetX, z: blockZ + offsetZ }]);
          } else {
            const roofDetail = new THREE.Mesh(
              new THREE.BoxGeometry(type.w * 0.3, 3, type.d * 0.3),
              new THREE.MeshStandardMaterial({ color: 0x444444 })
            );
            roofDetail.position.set(blockX + offsetX, height + 1.5, blockZ + offsetZ);
            scene.add(roofDetail);
          }
        }
      }
    }

    // Trees
    const treeGeometry = new THREE.CylinderGeometry(0.3, 0.5, 4);
    const treeMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3520 });
    const foliageGeometry = new THREE.SphereGeometry(2.5, 8, 8);
    const foliageMaterial = new THREE.MeshStandardMaterial({ color: 0x2d5016 });

    for (let i = 0; i < 80; i++) {
      const treeX = (Math.random() - 0.5) * 360;
      const treeZ = (Math.random() - 0.5) * 360;
      
      if (Math.abs(treeX % 60) < 10 || Math.abs(treeZ % 60) < 10) continue;
      
      const trunk = new THREE.Mesh(treeGeometry, treeMaterial);
      trunk.position.set(treeX, 2, treeZ);
      trunk.castShadow = true;
      scene.add(trunk);

      const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
      foliage.position.set(treeX, 5, treeZ);
      foliage.castShadow = true;
      scene.add(foliage);
    }

    // Build geofence from generated city meshes
    geofence = generateGeofence(cityMeshes, {
      minX: -200,
      minZ: -200,
      maxX: 200,
      maxZ: 200,
      cellSize: 4,            // sampling resolution
      buffer: 6,              // horizontal buffer in world units
      verticalClearance: 3    // meters above surface considered colliding
    });
    renderGeofenceBoundaries(geofence);

    // Defer SDF build and fog generation to avoid blocking first paint
    setTimeout(() => {
      try {
        buildSDFVolume();
        buildForceFieldFog();
        if (renderer.capabilities.isWebGL2) {
          buildVolumetricFog();
        } else {
          console.warn('Skipping volume fog—WebGL2 not supported.');
        }
        sdfReadyRef.current = true;
      } catch (e) {
        console.error('SDF build error', e);
      } finally {
        setPreparing(false);
      }
    }, 0);

    // ---------------- SDF CONFIG AND STORAGE ----------------
    type SDFConfig = {
      minX: number; minY: number; minZ: number;
      maxX: number; maxY: number; maxZ: number;
      cell: number; r0: number;
    };
    const sdfCfg: SDFConfig = {
      minX: -200, minY: 0,  minZ: -200,
      maxX:  200, maxY: 100, maxZ:  200,
      cell: 2,  // higher resolution for stronger gradients
      r0: 25,   // larger influence radius
    };
    // Add an invisible geofence wall plane to demonstrate field (x = 120.. world edge)
    const demoWall = {
      center: new THREE.Vector3(120, (sdfCfg.maxY + sdfCfg.minY) / 2, 0),
      halfSize: new THREE.Vector3(1, (sdfCfg.maxY - sdfCfg.minY) / 2, 120)
    };
    buildingsMeta.push({ center: demoWall.center, halfSize: demoWall.halfSize, roofY: demoWall.center.y + demoWall.halfSize.y, landable: false });
    const nxSDF = Math.ceil((sdfCfg.maxX - sdfCfg.minX) / sdfCfg.cell);
    const nySDF = Math.ceil((sdfCfg.maxY - sdfCfg.minY) / sdfCfg.cell);
    const nzSDF = Math.ceil((sdfCfg.maxZ - sdfCfg.minZ) / sdfCfg.cell);
    const sdf = new Float32Array(nxSDF * nySDF * nzSDF);
    sdf.fill(sdfCfg.r0);
    const sdfIdx = (ix: number, iy: number, iz: number) => ((iy * nzSDF + iz) * nxSDF + ix);

    function nearestPointOnAABBScalar(px: number, py: number, pz: number, cx: number, cy: number, cz: number, hx: number, hy: number, hz: number) {
      const minx = cx - hx, miny = cy - hy, minz = cz - hz;
      const maxx = cx + hx, maxy = cy + hy, maxz = cz + hz;
      const qx = clamp(px, minx, maxx);
      const qy = clamp(py, miny, maxy);
      const qz = clamp(pz, minz, maxz);
      const dx = px - qx, dy = py - qy, dz = pz - qz;
      const d = Math.sqrt(dx*dx + dy*dy + dz*dz);
      return d;
    }

    function buildSDFVolume() {
      // Include buildings
      for (const b of buildingsMeta) {
        const minx = b.center.x - b.halfSize.x - sdfCfg.r0;
        const maxx = b.center.x + b.halfSize.x + sdfCfg.r0;
        const miny = b.center.y - b.halfSize.y - sdfCfg.r0;
        const maxy = b.center.y + b.halfSize.y + sdfCfg.r0;
        const minz = b.center.z - b.halfSize.z - sdfCfg.r0;
        const maxz = b.center.z + b.halfSize.z + sdfCfg.r0;

        const ix0 = clamp(Math.floor((minx - sdfCfg.minX) / sdfCfg.cell), 0, nxSDF - 1);
        const ix1 = clamp(Math.ceil ((maxx - sdfCfg.minX) / sdfCfg.cell), 0, nxSDF - 1);
        const iy0 = clamp(Math.floor((miny - sdfCfg.minY) / sdfCfg.cell), 0, nySDF - 1);
        const iy1 = clamp(Math.ceil ((maxy - sdfCfg.minY) / sdfCfg.cell), 0, nySDF - 1);
        const iz0 = clamp(Math.floor((minz - sdfCfg.minZ) / sdfCfg.cell), 0, nzSDF - 1);
        const iz1 = clamp(Math.ceil ((maxz - sdfCfg.minZ) / sdfCfg.cell), 0, nzSDF - 1);

        for (let iy = iy0; iy <= iy1; iy++) {
          const py = sdfCfg.minY + (iy + 0.5) * sdfCfg.cell;
          for (let iz = iz0; iz <= iz1; iz++) {
            const pz = sdfCfg.minZ + (iz + 0.5) * sdfCfg.cell;
            for (let ix = ix0; ix <= ix1; ix++) {
              const px = sdfCfg.minX + (ix + 0.5) * sdfCfg.cell;
              const d = nearestPointOnAABBScalar(px, py, pz, b.center.x, b.center.y, b.center.z, b.halfSize.x, b.halfSize.y, b.halfSize.z);
              const k = sdfIdx(ix, iy, iz);
              if (d < sdf[k]) sdf[k] = d;
            }
          }
        }
      }

      // Include world top ceiling as a repulsive plane (y = sdfCfg.maxY)
      {
        const miny = sdfCfg.maxY - sdfCfg.r0;
        const iy0 = clamp(Math.floor((miny - sdfCfg.minY) / sdfCfg.cell), 0, nySDF - 1);
        const iy1 = nySDF - 1;
        for (let iy = iy0; iy <= iy1; iy++) {
          const py = sdfCfg.minY + (iy + 0.5) * sdfCfg.cell;
          const dy = Math.max(0, sdfCfg.maxY - py);
          for (let iz = 0; iz < nzSDF; iz++) {
            for (let ix = 0; ix < nxSDF; ix++) {
              const k = sdfIdx(ix, iy, iz);
              if (dy < sdf[k]) sdf[k] = dy;
            }
          }
        }
      }
    }

    function sampleSDF(p: THREE.Vector3) {
      const fx = (p.x - sdfCfg.minX) / sdfCfg.cell - 0.5;
      const fy = (p.y - sdfCfg.minY) / sdfCfg.cell - 0.5;
      const fz = (p.z - sdfCfg.minZ) / sdfCfg.cell - 0.5;
      const ix = Math.floor(fx), iy = Math.floor(fy), iz = Math.floor(fz);
      const tx = fx - ix, ty = fy - iy, tz = fz - iz;
      if (ix < 0 || ix+1 >= nxSDF || iy < 0 || iy+1 >= nySDF || iz < 0 || iz+1 >= nzSDF) return sdfCfg.r0;
      const c000 = sdf[sdfIdx(ix,   iy,   iz  )], c100 = sdf[sdfIdx(ix+1, iy,   iz  )];
      const c010 = sdf[sdfIdx(ix,   iy+1, iz  )], c110 = sdf[sdfIdx(ix+1, iy+1, iz  )];
      const c001 = sdf[sdfIdx(ix,   iy,   iz+1)], c101 = sdf[sdfIdx(ix+1, iy,   iz+1)];
      const c011 = sdf[sdfIdx(ix,   iy+1, iz+1)], c111 = sdf[sdfIdx(ix+1, iy+1, iz+1)];
      const c00 = c000*(1-tx)+c100*tx, c10 = c010*(1-tx)+c110*tx;
      const c01 = c001*(1-tx)+c101*tx, c11 = c011*(1-tx)+c111*tx;
      const c0 = c00*(1-ty)+c10*ty,    c1 = c01*(1-ty)+c11*ty;
      return clamp(c0*(1-tz)+c1*tz, 0, sdfCfg.r0);
    }

    function sampleSDFGrad(p: THREE.Vector3, out: THREE.Vector3) {
      const h = sdfCfg.cell;
      const ex = new THREE.Vector3(h,0,0), ey = new THREE.Vector3(0,h,0), ez = new THREE.Vector3(0,0,h);
      const dx = (sampleSDF(new THREE.Vector3().copy(p).add(ex)) - sampleSDF(new THREE.Vector3().copy(p).sub(ex))) / (2*h);
      const dy = (sampleSDF(new THREE.Vector3().copy(p).add(ey)) - sampleSDF(new THREE.Vector3().copy(p).sub(ey))) / (2*h);
      const dz = (sampleSDF(new THREE.Vector3().copy(p).add(ez)) - sampleSDF(new THREE.Vector3().copy(p).sub(ez))) / (2*h);
      return out.set(dx, dy, dz);
    }

    // --- Force Field Visualization (red fog) ---
    const fieldParams = {
      r0: sdfCfg.r0,
      eta: 2.5,        // stronger gain
      Fmax: 6.0,       // higher clamp to counter higher maxSpeed
      hgate: 8,        // slightly taller landing funnel
    };

    const sampleHeights = [4, 10, 20, 35, 50];
    const sampleStep = 16;
    const sMin = 0.02; // cutoff lower
    const sMax = 2.0;  // saturate higher to show brighter

    // SDF-based force magnitude for visualization (shared by point fog and volume fog)
    function evalForceMagnitude(p: THREE.Vector3): number {
      // Hard zero-repulsion visualization above landable roofs
      for (const b of buildingsMeta) {
        if (!b.landable) continue;
        const inFootprint = (p.x >= b.center.x - b.halfSize.x && p.x <= b.center.x + b.halfSize.x &&
                             p.z >= b.center.z - b.halfSize.z && p.z <= b.center.z + b.halfSize.z);
        if (inFootprint) {
          const dy = p.y - b.roofY;
          if (dy >= -0.5 && dy <= fieldParams.hgate) return 0;
        }
      }
      const D = sampleSDF(p);
      if (D >= sdfCfg.r0) return 0;
      const eps = 1e-3;
      const s = 1/(D+eps) - 1/sdfCfg.r0;
      let mag = fieldParams.eta * s / ((D+eps)*(D+eps));
      // Roof gating: fade within funnels of landable roofs
      let gate = 1;
      for (const b of buildingsMeta) {
        if (!b.landable) continue;
        const inFootprint = (p.x >= b.center.x - b.halfSize.x && p.x <= b.center.x + b.halfSize.x &&
                             p.z >= b.center.z - b.halfSize.z && p.z <= b.center.z + b.halfSize.z);
        if (!inFootprint) continue;
        const dy = p.y - b.roofY;
        const r = Math.hypot(p.x - b.center.x, p.z - b.center.z);
        const rp = Math.min(b.halfSize.x, b.halfSize.z) * 0.6;
        const g = 1 - smoothstep(0, fieldParams.hgate, dy) * smoothstep(0, rp, rp - r);
        gate = Math.min(gate, g);
      }
      return Math.min(mag, fieldParams.Fmax) * gate;
    }
    function makeSoftCircleTexture(size = 128) {
      const c = document.createElement('canvas'); c.width = c.height = size;
      const g = c.getContext('2d')!;
      const r = size/2; const grd = g.createRadialGradient(r,r,0, r,r,r);
      grd.addColorStop(0,'rgba(255,80,80,1)');
      grd.addColorStop(0.4,'rgba(255,80,80,0.6)');
      grd.addColorStop(1,'rgba(255,80,80,0)');
      g.fillStyle = grd; g.fillRect(0,0,size,size);
      const tex = new THREE.CanvasTexture(c); tex.anisotropy = 4; return tex;
    }

    function buildForceFieldFog() {
      const fogPositions: number[] = [];
      const fogColors: number[] = [];

      for (let x = -180; x <= 180; x += sampleStep) {
        for (let z = -180; z <= 180; z += sampleStep) {
          for (const y of sampleHeights) {
            const j = sampleStep * 0.6;
            const px = x + (Math.random()-0.5)*j;
            const py = y + (Math.random()-0.5)*j*0.5;
            const pz = z + (Math.random()-0.5)*j;
            const p = new THREE.Vector3(px, py, pz);
            const sJitter = 0.7 + 0.3*Math.random();
            const s = evalForceMagnitude(p) * sJitter;
            const t = Math.max(0, Math.min(1, (s - sMin) / (sMax - sMin)));
            if (t <= 0) continue; // cutoff below threshold
            fogPositions.push(px, py, pz);
            // map t to red intensity
            fogColors.push(0.6 + 0.4 * t, 0.1 * (1 - t), 0.1 * (1 - t));
          }
        }
      }

      if (fogPositions.length > 0) {
        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(fogPositions), 3));
        geom.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(fogColors), 3));
        const tex = makeSoftCircleTexture(128);
        const mat = new THREE.PointsMaterial({ size: 12, map: tex, alphaMap: tex, transparent: true, opacity: 0.7, vertexColors: true, depthWrite: false, sizeAttenuation: true, blending: THREE.AdditiveBlending });
        const points = new THREE.Points(geom, mat);
        points.visible = false; // default hidden; toggled via UI
        scene.add(points);
        forceFieldPointsRef.current = points;
      }
    }

    // Volumetric fog using 3D density texture + raymarch box
    function buildVolumetricFog() {
      const volCell = 4; // coarser than SDF for perf
      const fx = Math.ceil((sdfCfg.maxX - sdfCfg.minX) / volCell);
      const fy = Math.ceil((sdfCfg.maxY - sdfCfg.minY) / volCell);
      const fz = Math.ceil((sdfCfg.maxZ - sdfCfg.minZ) / volCell);
      const data = new Uint8Array(fx * fy * fz);
      // write in x-fastest, then y, then z order expected by WebGL
      // Helper to accumulate multi-source density (superposition)
      const invR0 = 1.0 / sdfCfg.r0;
      function densityAtPoint(p: THREE.Vector3): number {
        let sum = 0;
        for (const b of buildingsMeta) {
          // nearest distance to this building's AABB
          const d = nearestPointOnAABBScalar(p.x, p.y, p.z, b.center.x, b.center.y, b.center.z, b.halfSize.x, b.halfSize.y, b.halfSize.z);
          if (d >= sdfCfg.r0) continue;
          const s = 1.0 / (d + 1e-3) - invR0; // influence
          let mag = fieldParams.eta * s / ((d + 1e-3) * (d + 1e-3));
          // landable roof gating
          if (b.landable) {
            const inFootprint = (p.x >= b.center.x - b.halfSize.x && p.x <= b.center.x + b.halfSize.x &&
                                 p.z >= b.center.z - b.halfSize.z && p.z <= b.center.z + b.halfSize.z);
            if (inFootprint) {
              const dyAbove = Math.max(0, p.y - b.roofY);
              const r = Math.hypot(p.x - b.center.x, p.z - b.center.z);
              const rp = Math.min(b.halfSize.x, b.halfSize.z) * 0.6;
              const sHeight = 1 - smoothstep(0, fieldParams.hgate, dyAbove);
              const sRadial = 1 - smoothstep(0, rp, r);
              const g = 1 - (sHeight * sRadial);
              mag *= g;
            }
          }
          sum += Math.min(mag, fieldParams.Fmax);
        }
        return sum;
      }

      for (let iz = 0; iz < fz; iz++) {
        const z = sdfCfg.minZ + (iz + 0.5) * volCell;
        for (let iy = 0; iy < fy; iy++) {
          const y = sdfCfg.minY + (iy + 0.5) * volCell;
          for (let ix = 0; ix < fx; ix++) {
            const x = sdfCfg.minX + (ix + 0.5) * volCell;
            const p = new THREE.Vector3(x, y, z);
            const s = densityAtPoint(p);
            const t = Math.max(0, Math.min(1, (s - sMin) / (sMax - sMin)));
            const index = ix + fx * (iy + fy * iz);
            data[index] = Math.floor(t * 255);
          }
        }
      }

      const tex3d = new THREE.Data3DTexture(data, fx, fy, fz);
      tex3d.format = THREE.RedFormat;
      tex3d.type = THREE.UnsignedByteType;
      tex3d.minFilter = THREE.LinearFilter;
      tex3d.magFilter = THREE.LinearFilter;
      tex3d.wrapS = THREE.ClampToEdgeWrapping;
      tex3d.wrapT = THREE.ClampToEdgeWrapping;
      tex3d.wrapR = THREE.ClampToEdgeWrapping;
      tex3d.unpackAlignment = 1;
      tex3d.needsUpdate = true;

      const boxW = sdfCfg.maxX - sdfCfg.minX;
      const boxH = sdfCfg.maxY - sdfCfg.minY;
      const boxD = sdfCfg.maxZ - sdfCfg.minZ;
      const geom = new THREE.BoxGeometry(boxW, boxH, boxD);
      const mat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        depthTest: false, // draw over opaque geometry
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        uniforms: {
          fogTex: { value: tex3d },
          minBound: { value: new THREE.Vector3(sdfCfg.minX, sdfCfg.minY, sdfCfg.minZ) },
          maxBound: { value: new THREE.Vector3(sdfCfg.maxX, sdfCfg.maxY, sdfCfg.maxZ) },
          fogColor: { value: new THREE.Color(1.0, 0.6, 0.4) },
          densityScale: { value: 3.0 },  // stronger fog
          steps: { value: 32 }  // smoother marching
        },
        vertexShader: `
          varying vec3 vWorldPos;
          void main(){
            vec4 wp = modelMatrix * vec4(position,1.0);
            vWorldPos = wp.xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
          }
        `,
        fragmentShader: `
          precision highp float;
          uniform sampler3D fogTex;
          uniform vec3 minBound; uniform vec3 maxBound;
          uniform vec3 fogColor; uniform float densityScale; uniform int steps;
          varying vec3 vWorldPos;

          // Ray-box intersection
          bool intersectAABB(vec3 ro, vec3 rd, out float t0, out float t1){
            vec3 inv = 1.0 / rd;
            vec3 tmin = (minBound - ro) * inv;
            vec3 tmax = (maxBound - ro) * inv;
            vec3 tsmaller = min(tmin, tmax);
            vec3 tbigger  = max(tmin, tmax);
            t0 = max(max(tsmaller.x, tsmaller.y), tsmaller.z);
            t1 = min(min(tbigger.x, tbigger.y), tbigger.z);
            return t1 > max(t0, 0.0);
          }

          float rand(vec2 co){
            return fract(sin(dot(co, vec2(12.9898,78.233))) * 43758.5453);
          }

          void main(){
            vec3 ro = cameraPosition;
            vec3 rd = normalize(vWorldPos - ro);
            float t0, t1; if(!intersectAABB(ro, rd, t0, t1)){ discard; }
            t0 = max(t0, 0.0);
            vec3 boxSize = maxBound - minBound;

            // Start at entry point; temporal-ish jitter for banding reduction
            vec3 pos = ro + rd * t0;
            float j = rand(gl_FragCoord.xy + vec2(t0,t1)) * (t1 - t0) / float(steps);
            pos += rd * j;

            vec4 acc = vec4(0.0);
            float dt = (t1 - t0) / float(steps);
            for(int i=0;i<512;i++){
              if(i>=steps) break;
              vec3 uvw = (pos - minBound) / boxSize;
              // ensure samples stay inside the box
              if(any(lessThan(uvw, vec3(0.0))) || any(greaterThan(uvw, vec3(1.0)))){
                pos += rd * dt; continue;
              }

              float d = texture(fogTex, uvw).r; // 0..1
              // Smooth remap to reduce blockiness
              float a = pow(d, 1.2) * densityScale;
              vec3 col = fogColor * pow(d, 1.0);
              acc.rgb += (1.0 - acc.a) * col * a;
              acc.a   += (1.0 - acc.a) * a;
              if(acc.a > 0.98) break;
              pos += rd * dt;
            }
            if(acc.a <= 0.001) discard;
            gl_FragColor = acc;
          }
        `
      });

      // Log shader compilation errors (basic check)
      console.log('Volume fog shader material created - check for runtime errors in console');

      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(
        (sdfCfg.minX + sdfCfg.maxX)/2,
        (sdfCfg.minY + sdfCfg.maxY)/2,
        (sdfCfg.minZ + sdfCfg.maxZ)/2
      );
      mesh.visible = true; // visible by default
      mesh.renderOrder = 9999; // ensure drawn after opaque
      scene.add(mesh);
      volumeMeshRef.current = mesh;
    }

    // --- Procedural Geofence Generation Helpers ---
    function generateGeofence(meshes: THREE.Object3D[], options: {
      minX: number;
      minZ: number;
      maxX: number;
      maxZ: number;
      cellSize: number;
      buffer: number;            // horizontal safety buffer (world units)
      verticalClearance: number; // vertical buffer above surfaces
    }): GeofenceData {
      const nx = Math.ceil((options.maxX - options.minX) / options.cellSize);
      const nz = Math.ceil((options.maxZ - options.minZ) / options.cellSize);
      const heightMap: number[][] = Array.from({ length: nx }, () => Array(nz).fill(0));
      const occupied: boolean[][] = Array.from({ length: nx }, () => Array(nz).fill(false));

      const raycaster = new THREE.Raycaster();
      const down = new THREE.Vector3(0, -1, 0);

      // Sample height via raycasts
      for (let ix = 0; ix < nx; ix++) {
        const x = options.minX + (ix + 0.5) * options.cellSize;
        for (let iz = 0; iz < nz; iz++) {
          const z = options.minZ + (iz + 0.5) * options.cellSize;
          const origin = new THREE.Vector3(x, 1000, z);
          raycaster.set(origin, down);
          raycaster.far = 2000;
          const hits = raycaster.intersectObjects(meshes, true);
          if (hits.length > 0) {
            // consider topmost intersection
            const topHit = hits.reduce((a, b) => (a.point.y > b.point.y ? a : b));
            heightMap[ix][iz] = topHit.point.y;
            occupied[ix][iz] = true;
          }
        }
      }

      // Dilate occupancy for horizontal buffer
      const dilated: boolean[][] = Array.from({ length: nx }, () => Array(nz).fill(false));
      const rCells = Math.max(1, Math.ceil(options.buffer / options.cellSize));
      for (let ix = 0; ix < nx; ix++) {
        for (let iz = 0; iz < nz; iz++) {
          if (!occupied[ix][iz]) continue;
          for (let dx = -rCells; dx <= rCells; dx++) {
            const jx = ix + dx;
            if (jx < 0 || jx >= nx) continue;
            for (let dz = -rCells; dz <= rCells; dz++) {
              const jz = iz + dz;
              if (jz < 0 || jz >= nz) continue;
              dilated[jx][jz] = true;
              // propagate max height into buffer cells for conservative vertical top
              if (heightMap[jx][jz] < heightMap[ix][iz]) {
                heightMap[jx][jz] = heightMap[ix][iz];
              }
            }
          }
        }
      }

      return {
        heightMap,
        dilated,
        originX: options.minX,
        originZ: options.minZ,
        cellSize: options.cellSize,
        nx,
        nz,
        buffer: options.buffer,
        verticalClearance: options.verticalClearance,
      };
    }

    function renderGeofenceBoundaries(data: GeofenceData): void {
      const boundaryPoints: THREE.Vector3[] = [];
      const yBase = 0.1; // draw close to ground for visibility
      const { originX, originZ, cellSize, nx, nz, dilated } = data;

      // Add line segments along cell edges where mask changes from true->false
      for (let ix = 0; ix < nx; ix++) {
        for (let iz = 0; iz < nz; iz++) {
          if (!dilated[ix][iz]) continue;
          const x0 = originX + ix * cellSize;
          const z0 = originZ + iz * cellSize;
          const x1 = x0 + cellSize;
          const z1 = z0 + cellSize;

          // right edge
          if (ix + 1 < nx && !dilated[ix + 1][iz]) {
            boundaryPoints.push(new THREE.Vector3(x1, yBase, z0));
            boundaryPoints.push(new THREE.Vector3(x1, yBase, z1));
          }
          // bottom edge
          if (iz + 1 < nz && !dilated[ix][iz + 1]) {
            boundaryPoints.push(new THREE.Vector3(x0, yBase, z1));
            boundaryPoints.push(new THREE.Vector3(x1, yBase, z1));
          }
          // left edge (avoid duplicates by only when neighbor empty and we own it)
          if (ix - 1 >= 0 && !dilated[ix - 1][iz]) {
            boundaryPoints.push(new THREE.Vector3(x0, yBase, z0));
            boundaryPoints.push(new THREE.Vector3(x0, yBase, z1));
          }
          // top edge
          if (iz - 1 >= 0 && !dilated[ix][iz - 1]) {
            boundaryPoints.push(new THREE.Vector3(x0, yBase, z0));
            boundaryPoints.push(new THREE.Vector3(x1, yBase, z0));
          }
        }
      }

      if (boundaryPoints.length > 0) {
        const geom = new THREE.BufferGeometry().setFromPoints(boundaryPoints);
        const mat = new THREE.LineBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.8 });
        const lines = new THREE.LineSegments(geom, mat);
        scene.add(lines);
      }
    }

    // Drone
    const droneGroup = new THREE.Group();
    
    const bodyGeometry = new THREE.BoxGeometry(1.2, 0.3, 1.2);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xff3333,
      metalness: 0.7,
      roughness: 0.3,
      emissive: 0xff0000,
      emissiveIntensity: 0.2
    });
    const droneBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
    droneBody.castShadow = true;
    droneGroup.add(droneBody);

    const armGeometry = new THREE.CylinderGeometry(0.08, 0.08, 2.2);
    const armMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x222222,
      metalness: 0.8
    });
    
    const positions = [
      [1.5, 0, 1.5],
      [-1.5, 0, 1.5],
      [1.5, 0, -1.5],
      [-1.5, 0, -1.5]
    ];

    positions.forEach(pos => {
      const arm = new THREE.Mesh(armGeometry, armMaterial);
      arm.position.set(pos[0], pos[1], pos[2]);
      arm.rotation.x = Math.PI / 2;
      droneGroup.add(arm);

      const propGeometry = new THREE.CylinderGeometry(0.6, 0.6, 0.04);
      const propMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x00ff88,
        transparent: true,
        opacity: 0.6,
        emissive: 0x00ff88,
        emissiveIntensity: 0.3
      });
      const propeller = new THREE.Mesh(propGeometry, propMaterial);
      propeller.position.set(pos[0], pos[1], pos[2] > 0 ? pos[2] + 1.1 : pos[2] - 1.1);
      propeller.userData.isPropeller = true;
      droneGroup.add(propeller);
    });

    const ledGeometry = new THREE.SphereGeometry(0.2);
    const ledMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 1
    });
    const led = new THREE.Mesh(ledGeometry, ledMaterial);
    led.position.set(0, -0.3, 1);
    droneGroup.add(led);

    droneGroup.position.set(0, 10, 0);
    scene.add(droneGroup);
    droneGroup.renderOrder = 5000; // below volume fog which is 9999
    // Ensure pitch/roll are evaluated in yawed local frame
    droneGroup.rotation.order = 'YXZ';

    camera.position.set(0, 15, 20);
    camera.lookAt(droneGroup.position);

    const keys: Record<string, boolean> = {};
    const handleKeyDown = (e: KeyboardEvent) => { keys[e.key.toLowerCase()] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keys[e.key.toLowerCase()] = false; };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const droneVelocity = new THREE.Vector3();
    const droneRotation = { y: 0 };
    const maxSpeed = 999;
    const acceleration = 0.06; // snappier input accel
    const drag = 0.965; // slightly less damping

    // AABB collision detection and resolution against buildings
    const checkCollision = (position: THREE.Vector3) => {
      let collided = false;
      for (const b of buildingsMeta) {
        const min = new THREE.Vector3(
          b.center.x - b.halfSize.x,
          b.center.y - b.halfSize.y,
          b.center.z - b.halfSize.z
        );
        const max = new THREE.Vector3(
          b.center.x + b.halfSize.x,
          b.center.y + b.halfSize.y,
          b.center.z + b.halfSize.z
        );
        if (
          position.x >= min.x && position.x <= max.x &&
          position.y >= min.y && position.y <= max.y &&
          position.z >= min.z && position.z <= max.z
        ) {
          // Resolve penetration by minimal axis
          const dx = Math.min(position.x - min.x, max.x - position.x);
          const dy = Math.min(position.y - min.y, max.y - position.y);
          const dz = Math.min(position.z - min.z, max.z - position.z);
          if (dx <= dy && dx <= dz) {
            position.x = position.x - min.x < max.x - position.x ? min.x - 0.01 : max.x + 0.01;
            droneVelocity.x = 0;
          } else if (dy <= dx && dy <= dz) {
            position.y = position.y - min.y < max.y - position.y ? min.y - 0.01 : max.y + 0.01;
            droneVelocity.y = 0 as unknown as number; // y component not explicitly used but safe guard
          } else {
            position.z = position.z - min.z < max.z - position.z ? min.z - 0.01 : max.z + 0.01;
            droneVelocity.z = 0;
          }
          collided = true;
        }
      }
      return collided;
    };

    // 3D APF from precomputed SDF with roof gating
    const computeForceField = (p: THREE.Vector3) => {
      const out = new THREE.Vector3();
      // Hard zero-repulsion zone above landable roofs (entire footprint)
      for (const b of buildingsMeta) {
        if (!b.landable) continue;
        const inFootprint = (p.x >= b.center.x - b.halfSize.x && p.x <= b.center.x + b.halfSize.x &&
                             p.z >= b.center.z - b.halfSize.z && p.z <= b.center.z + b.halfSize.z);
        if (inFootprint) {
          const dy = p.y - b.roofY;
          if (dy >= -0.5 && dy <= fieldParams.hgate) {
            return out;
          }
        }
      }

      const D = sampleSDF(p);
      if (D >= sdfCfg.r0) return out;

      const grad = sampleSDFGrad(p, new THREE.Vector3());
      if (grad.lengthSq() < 1e-8) return out;
      grad.normalize(); // outward approx

      const eps = 1e-3;
      const s = 1/(D+eps) - 1/sdfCfg.r0;
      let mag = fieldParams.eta * s / ((D+eps)*(D+eps));
      mag = Math.min(mag, fieldParams.Fmax);

      // Roof gating: reduce repulsion within a funnel near landable rooftops
      let gate = 1;
      for (const b of buildingsMeta) {
        if (!b.landable) continue;
        const inFootprint = (p.x >= b.center.x - b.halfSize.x && p.x <= b.center.x + b.halfSize.x &&
                             p.z >= b.center.z - b.halfSize.z && p.z <= b.center.z + b.halfSize.z);
        if (!inFootprint) continue;
        const dyAbove = Math.max(0, p.y - b.roofY);
        const r = Math.hypot(p.x - b.center.x, p.z - b.center.z);
        const rp = Math.min(b.halfSize.x, b.halfSize.z) * 0.6;
        const sHeight = 1 - smoothstep(0, fieldParams.hgate, dyAbove);
        const sRadial = 1 - smoothstep(0, rp, r);
        const g = 1 - (sHeight * sRadial);
        gate = Math.min(gate, g);
      }

      out.addScaledVector(grad, mag * gate);
      return out;
    };

    let rafId = 0;
    let isMounted = true;
    let lastTime = performance.now();
    const animate = () => {
      if (!isMounted) return;
      rafId = requestAnimationFrame(animate);
      const now = performance.now();
      let dt = (now - lastTime) / 1000;
      lastTime = now;
      dt = Math.max(0.005, Math.min(0.033, dt));

      droneGroup.children.forEach(child => {
        if (child.userData.isPropeller) {
          child.rotation.y += 0.5;
        }
      });

      let targetVelocity = new THREE.Vector3();
      
      if (keys['w']) targetVelocity.z -= 1;
      if (keys['s']) targetVelocity.z += 1;
      if (keys['a']) targetVelocity.x -= 1;
      if (keys['d']) targetVelocity.x += 1;
      if (keys[' ']) droneGroup.position.y += 0.5; // faster climb
      if (keys['shift']) droneGroup.position.y -= 0.5; // faster descend
      if (keys['arrowleft']) droneRotation.y += 0.03;
      if (keys['arrowright']) droneRotation.y -= 0.03;

      droneGroup.position.y = Math.max(2, Math.min(80, droneGroup.position.y));
      droneGroup.rotation.y = droneRotation.y;

      if (targetVelocity.length() > 0) {
        targetVelocity.normalize().multiplyScalar(acceleration);
        targetVelocity.applyAxisAngle(new THREE.Vector3(0, 1, 0), droneGroup.rotation.y);
        droneVelocity.add(targetVelocity);
      }

      // Apply force field as acceleration (after SDF is ready)
      if (sdfReadyRef.current) {
        const fieldForce = computeForceField(droneGroup.position);
        droneVelocity.add(fieldForce); // apply directly each frame for stronger effect
      }

      // Damping
      droneVelocity.multiplyScalar(drag);
      if (droneVelocity.length() > maxSpeed) {
        droneVelocity.normalize().multiplyScalar(maxSpeed);
      }

      // Apply movement
      const newPosition = droneGroup.position.clone().add(droneVelocity);
      
      // Early-warning: trigger if entering force field or collision (even less sensitive, also require sufficient force)
      let enteringField = false;
      if (sdfReadyRef.current) {
        const Dwarn = sampleSDF(newPosition);
        if (Dwarn < sdfCfg.r0 * 0.3) {
          // Do not warn inside landable roof funnels
          let inLandableFunnel = false;
          for (const b of buildingsMeta) {
            if (!b.landable) continue;
            const inFootprint = (
              newPosition.x >= b.center.x - b.halfSize.x && newPosition.x <= b.center.x + b.halfSize.x &&
              newPosition.z >= b.center.z - b.halfSize.z && newPosition.z <= b.center.z + b.halfSize.z
            );
            if (!inFootprint) continue;
            const dyAbove = Math.max(0, newPosition.y - b.roofY);
            const r = Math.hypot(newPosition.x - b.center.x, newPosition.z - b.center.z);
            const rp = Math.min(b.halfSize.x, b.halfSize.z) * 0.6;
            const sHeight = 1 - smoothstep(0, fieldParams.hgate, dyAbove);
            const sRadial = 1 - smoothstep(0, rp, r);
            if ((sHeight * sRadial) > 0.0) { inLandableFunnel = true; break; }
          }
          // also require the repulsive force to be significant to avoid false positives over gentle regions
          const fMag = computeForceField(newPosition).length();
          enteringField = !inLandableFunnel && fMag > 0.25;
        }
      }
      const collision = checkCollision(newPosition);
      setCollisionWarning(collision || enteringField);
      
      // Update drone position (already modified by checkCollision if needed)
      droneGroup.position.copy(newPosition);
      
      // Keep in world bounds
      droneGroup.position.x = Math.max(-180, Math.min(180, droneGroup.position.x));
      droneGroup.position.z = Math.max(-180, Math.min(180, droneGroup.position.z));

      setSpeed(Math.round(droneVelocity.length() * 100));
      setAltitude(Math.round(droneGroup.position.y));
      setRotation(Math.round((droneRotation.y * 180 / Math.PI) % 360));
      setCoords({ 
        x: Math.round(droneGroup.position.x), 
        z: Math.round(droneGroup.position.z) 
      });

      // Tilt strictly from user input in drone's local frame (ignore world forces)
      const inputForward = (keys['w'] ? 1 : 0) - (keys['s'] ? 1 : 0);  // +1 when W pressed
      const inputRight = (keys['d'] ? 1 : 0) - (keys['a'] ? 1 : 0);    // +1 when D pressed
      const maxTilt = Math.PI / 6; // 30 degrees
      const pitchGain = 0.7; // stronger pitch
      const rollGain = 0.7;  // stronger roll
      const tiltX = clamp(-inputForward * pitchGain, -maxTilt, maxTilt);
      const tiltZ = clamp(-inputRight * rollGain, -maxTilt, maxTilt);
      droneGroup.rotation.x = THREE.MathUtils.lerp(droneGroup.rotation.x, tiltX, 0.3);
      droneGroup.rotation.z = THREE.MathUtils.lerp(droneGroup.rotation.z, tiltZ, 0.3);

      const cameraOffset = new THREE.Vector3(0, 8, 18);
      cameraOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), droneGroup.rotation.y);
      camera.position.lerp(droneGroup.position.clone().add(cameraOffset), 0.1);
      camera.lookAt(droneGroup.position);

      // Predictive trajectory (rollout)
      if (sdfReadyRef.current) {
        updateTrajectory(droneGroup.position, droneVelocity, computeForceField, scene);
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      isMounted = false;
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      if (containerRef.current && renderer.domElement.parentElement === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      if (forceFieldPointsRef.current) {
        scene.remove(forceFieldPointsRef.current);
        forceFieldPointsRef.current.geometry.dispose();
        (forceFieldPointsRef.current.material as THREE.Material).dispose();
        forceFieldPointsRef.current = null;
      }
      if (trajectoryLineRef.current) {
        scene.remove(trajectoryLineRef.current);
        trajectoryLineRef.current.geometry.dispose();
        (trajectoryLineRef.current.material as THREE.Material).dispose();
        trajectoryLineRef.current = null;
      }
      renderer.dispose();
    };
  }, []);

  // Toggle force field visibility when UI state changes
  useEffect(() => {
    if (forceFieldPointsRef.current) {
      forceFieldPointsRef.current.visible = showForceField;
    }
  }, [showForceField]);

  // --- Helpers ---
  function clamp(x: number, a: number, b: number) { return Math.max(a, Math.min(b, x)); }
  function smoothstep(edge0: number, edge1: number, x: number) {
    const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  // nearestPointOnAABB was superseded by SDF-based queries

  function updateTrajectory(pos: THREE.Vector3, vel: THREE.Vector3, fieldFn: (p: THREE.Vector3) => THREE.Vector3, scene: THREE.Scene) {
      const dt = 0.12;
      const steps = 35;
    const maxAccel = 1.5;
    const points: THREE.Vector3[] = [];
    let x = pos.clone();
    let v = vel.clone();
    for (let i = 0; i < steps; i++) {
      const F = fieldFn(x).clampLength(0, maxAccel);
      v = v.clone().addScaledVector(F, dt).multiplyScalar(0.97);
      x = x.clone().addScaledVector(v, dt);
      points.push(x.clone());
    }
    const geom = new THREE.BufferGeometry().setFromPoints(points);
    if (!trajectoryLineRef.current) {
      const mat = new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.9, linewidth: 3 });
      const line = new THREE.Line(geom, mat);
      scene.add(line);
      trajectoryLineRef.current = line;
    } else {
      trajectoryLineRef.current.geometry.dispose();
      trajectoryLineRef.current.geometry = geom;
    }
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      <div ref={containerRef} className="w-full h-full" />
      
      {/* Collision Warning */}
      {collisionWarning && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-600/90 border-4 border-red-500 rounded-2xl px-12 py-6 animate-pulse">
          <div className="text-white text-4xl font-bold text-center mb-2">⚠️ WARNING ⚠️</div>
          <div className="text-white text-xl text-center">GEOGRID PROTECTION ACTIVE</div>
          <div className="text-red-200 text-sm text-center mt-2">Building Protected - Cannot Pass</div>
        </div>
      )}

      {/* Preparing overlay */}
      {preparing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="px-6 py-3 rounded-lg bg-white/10 border border-white/20 text-white font-mono">
            Preparing force field...
          </div>
        </div>
      )}

      {/* Modern Header */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black via-black/80 to-transparent flex items-center justify-between px-6">
        <div className="flex items-center space-x-4">
          <div className={`w-3 h-3 rounded-full ${collisionWarning ? 'bg-red-500' : 'bg-green-500'} animate-pulse`}></div>
          <span className="text-white font-bold text-xl tracking-wider">GEOGRID SYSTEM</span>
        </div>
        <div className={`font-mono text-sm font-semibold ${collisionWarning ? 'text-red-400' : 'text-cyan-400'}`}>
          {collisionWarning ? 'COLLISION DETECTED' : 'SYSTEM ONLINE'}
        </div>
      </div>

      {/* Flight Data - Left Panel */}
      <div className="absolute top-20 left-6 space-y-3">
        <div className="backdrop-blur-md bg-white/10 border border-cyan-500/30 rounded-xl p-4 min-w-[200px]">
          <div className="text-cyan-400 text-xs font-medium mb-1">VELOCITY</div>
          <div className="flex items-baseline space-x-2">
            <span className="text-white text-3xl font-bold">{speed}</span>
            <span className="text-gray-400 text-sm">km/h</span>
          </div>
          <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
              style={{ width: `${speed}%` }}
            ></div>
          </div>
        </div>

        <div className="backdrop-blur-md bg-white/10 border border-emerald-500/30 rounded-xl p-4 min-w-[200px]">
          <div className="text-emerald-400 text-xs font-medium mb-1">ALTITUDE</div>
          <div className="flex items-baseline space-x-2">
            <span className="text-white text-3xl font-bold">{altitude}</span>
            <span className="text-gray-400 text-sm">meters</span>
          </div>
          <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-green-500 transition-all duration-300"
              style={{ width: `${(altitude / 80) * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="backdrop-blur-md bg-white/10 border border-purple-500/30 rounded-xl p-4 min-w-[200px]">
          <div className="text-purple-400 text-xs font-medium mb-1">COORDINATES</div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">X:</span>
              <span className="text-white font-mono">{coords.x}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Z:</span>
              <span className="text-white font-mono">{coords.z}</span>
            </div>
          </div>
        </div>

        {/* Geogrid Status Panel */}
        <div className={`backdrop-blur-md bg-white/10 border ${collisionWarning ? 'border-red-500' : 'border-green-500/30'} rounded-xl p-4 min-w-[200px] transition-all`}>
          <div className={`text-xs font-medium mb-1 ${collisionWarning ? 'text-red-400' : 'text-green-400'}`}>
            GEOGRID STATUS
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white text-sm font-semibold">
              {collisionWarning ? 'PROTECTED' : 'CLEAR'}
            </span>
            <div className={`w-4 h-4 rounded-full ${collisionWarning ? 'bg-red-500' : 'bg-green-500'} animate-pulse`}></div>
          </div>
        </div>
      </div>

      {/* Heading Indicator - Top Right */}
      <div className="absolute top-20 right-6 backdrop-blur-md bg-white/10 border border-yellow-500/30 rounded-xl p-4 min-w-[160px]">
        <div className="text-yellow-400 text-xs font-medium mb-2 text-center">HEADING</div>
        <div className="relative w-24 h-24 mx-auto">
          <div className="absolute inset-0 rounded-full border-2 border-gray-600"></div>
          <div className="absolute inset-2 rounded-full border border-gray-700"></div>
          <div 
            className="absolute top-1/2 left-1/2 w-1 h-10 bg-gradient-to-t from-yellow-500 to-red-500 origin-bottom transition-transform duration-100"
            style={{ 
              transform: `translate(-50%, -100%) rotate(${rotation}deg)`
            }}
          ></div>
          <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-red-500 rounded-full -translate-x-1/2 -translate-y-1/2 shadow-lg shadow-red-500/50"></div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 text-white text-xs font-bold">N</div>
        </div>
        <div className="text-white text-2xl font-bold text-center mt-2">{rotation}°</div>
      </div>

      {/* Controls Panel - Bottom Right */}
      <div className="absolute bottom-6 right-6 backdrop-blur-md bg-white/10 border border-white/20 rounded-xl p-5 max-w-[280px]">
        <div className="text-white font-semibold mb-3 flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
          CONTROLS
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between text-gray-300">
            <span className="font-mono bg-gray-800/50 px-2 py-1 rounded">W A S D</span>
            <span>Movement</span>
          </div>
          <div className="flex items-center justify-between text-gray-300">
            <span className="font-mono bg-gray-800/50 px-2 py-1 rounded">SPACE</span>
            <span>Ascend</span>
          </div>
          <div className="flex items-center justify-between text-gray-300">
            <span className="font-mono bg-gray-800/50 px-2 py-1 rounded">SHIFT</span>
            <span>Descend</span>
          </div>
          <div className="flex items-center justify-between text-gray-300">
            <span className="font-mono bg-gray-800/50 px-2 py-1 rounded">← →</span>
            <span>Rotate</span>
          </div>
          <div className="flex items-center justify-between text-gray-300">
            <div className="flex gap-2">
              <button
                className="mt-2 px-3 py-1 rounded bg-red-600/20 border border-red-500/40 text-red-300 hover:bg-red-600/30 transition"
                onClick={() => setShowForceField(v => !v)}
              >
                {showForceField ? 'Hide Fog Points' : 'Show Fog Points'}
              </button>
              <button
                className={`mt-2 px-3 py-1 rounded border transition ${showVolumeFog ? 'bg-red-600/40 border-red-500 text-red-200' : 'bg-red-600/20 border-red-500/40 text-red-300 hover:bg-red-600/30'}`}
                onClick={() => {
                  const next = !showVolumeFog;
                  setShowVolumeFog(next);
                  if (volumeMeshRef.current) volumeMeshRef.current.visible = next;
                }}
              >
                {showVolumeFog ? 'Hide Volume Fog' : 'Show Volume Fog'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mini Map - Bottom Left */}
      <div className="absolute bottom-6 left-6 backdrop-blur-md bg-white/10 border border-white/20 rounded-xl p-4">
        <div className="text-white text-xs font-medium mb-2">RADAR</div>
        <div className="w-32 h-32 bg-gray-900/50 rounded-lg relative overflow-hidden">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(to right, rgba(0,255,255,0.1) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(0,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '16px 16px'
          }}></div>
        {/* Landable roofs markers on radar */}
        {landablePads.map((p, idx) => {
          const lx = ((p.x + 180) / 360) * 100;
          const lz = ((p.z + 180) / 360) * 100;
          return (
            <div key={`pad-${idx}`} className="absolute w-1.5 h-1.5 bg-green-400 rounded-full shadow" style={{ left: `${lx}%`, top: `${lz}%`, transform: 'translate(-50%, -50%)' }}></div>
          )
        })}
          <div 
            className={`absolute w-2 h-2 rounded-full shadow-lg transition-colors ${collisionWarning ? 'bg-red-500 shadow-red-500/50' : 'bg-green-500 shadow-green-500/50'}`}
            style={{
              left: `${((coords.x + 180) / 360) * 100}%`,
              top: `${((coords.z + 180) / 360) * 100}%`,
              transform: 'translate(-50%, -50%)'
            }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default DroneSimulator;