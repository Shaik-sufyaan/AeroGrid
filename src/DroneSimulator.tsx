import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const DroneSimulator = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [speed, setSpeed] = useState(0);
  const [altitude, setAltitude] = useState(10);
  const [rotation, setRotation] = useState(0);
  const [coords, setCoords] = useState({ x: 0, z: 0 });
  const [collisionWarning, setCollisionWarning] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    scene.fog = new THREE.Fog(0x1a1a2e, 0, 500);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);

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

    // Building collision data
    const buildingColliders: Array<{
      x: number;
      z: number;
      width: number;
      depth: number;
      height: number;
      minY: number;
    }> = [];

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

          // GEOGRID PROTECTION SYSTEM
          const gridBuffer = 5; // Safety buffer distance
          const gridWidth = type.w + gridBuffer * 2;
          const gridDepth = type.d + gridBuffer * 2;
          const gridHeight = height + gridBuffer * 2;

          // Create grid lines around building
          const gridMaterial = new THREE.LineBasicMaterial({ 
            color: 0xff0000,
            linewidth: 2,
            transparent: true,
            opacity: 0.8
          });

          // Vertical lines at corners
          const corners = [
            [gridWidth/2, gridDepth/2],
            [-gridWidth/2, gridDepth/2],
            [gridWidth/2, -gridDepth/2],
            [-gridWidth/2, -gridDepth/2]
          ];

          corners.forEach(([x, z]) => {
            const points = [];
            points.push(new THREE.Vector3(x, 0, z));
            points.push(new THREE.Vector3(x, gridHeight, z));
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, gridMaterial);
            line.position.set(blockX + offsetX, -gridBuffer, blockZ + offsetZ);
            scene.add(line);
          });

          // Horizontal lines at different heights
          const numHorizontalLines = Math.ceil(gridHeight / 5);
          for (let h = 0; h <= numHorizontalLines; h++) {
            const y = (h * gridHeight) / numHorizontalLines;
            
            // Top and bottom rectangles
            const rectPoints = [
              new THREE.Vector3(-gridWidth/2, y, -gridDepth/2),
              new THREE.Vector3(gridWidth/2, y, -gridDepth/2),
              new THREE.Vector3(gridWidth/2, y, gridDepth/2),
              new THREE.Vector3(-gridWidth/2, y, gridDepth/2),
              new THREE.Vector3(-gridWidth/2, y, -gridDepth/2)
            ];
            const rectGeometry = new THREE.BufferGeometry().setFromPoints(rectPoints);
            const rectLine = new THREE.Line(rectGeometry, gridMaterial);
            rectLine.position.set(blockX + offsetX, -gridBuffer, blockZ + offsetZ);
            scene.add(rectLine);
          }

          // Additional cross lines for better visibility
          const crossLines = [
            // Diagonal lines on sides
            [
              new THREE.Vector3(gridWidth/2, 0, -gridDepth/2),
              new THREE.Vector3(gridWidth/2, gridHeight, gridDepth/2)
            ],
            [
              new THREE.Vector3(-gridWidth/2, 0, -gridDepth/2),
              new THREE.Vector3(-gridWidth/2, gridHeight, gridDepth/2)
            ],
            [
              new THREE.Vector3(-gridWidth/2, 0, gridDepth/2),
              new THREE.Vector3(gridWidth/2, gridHeight, gridDepth/2)
            ],
            [
              new THREE.Vector3(-gridWidth/2, 0, -gridDepth/2),
              new THREE.Vector3(gridWidth/2, gridHeight, -gridDepth/2)
            ]
          ];

          crossLines.forEach(points => {
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, gridMaterial);
            line.position.set(blockX + offsetX, -gridBuffer, blockZ + offsetZ);
            scene.add(line);
          });

          // Store collider data
          buildingColliders.push({
            x: blockX + offsetX,
            z: blockZ + offsetZ,
            width: gridWidth,
            depth: gridDepth,
            height: gridHeight - gridBuffer,
            minY: -gridBuffer
          });

          // Windows
          const windowGeometry = new THREE.PlaneGeometry(1.5, 2);
          const windowMaterial = new THREE.MeshStandardMaterial({ 
            color: Math.random() > 0.3 ? 0xffdd88 : 0x333366,
            emissive: Math.random() > 0.3 ? 0xffaa44 : 0x000000,
            emissiveIntensity: 0.5
          });
          
          const floors = Math.floor(height / 4);
          const windowsPerFloor = Math.floor(type.w / 3);
          
          for (let floor = 0; floor < floors; floor++) {
            for (let side = 0; side < 4; side++) {
              for (let w = 0; w < windowsPerFloor; w++) {
                const window1 = new THREE.Mesh(windowGeometry, windowMaterial.clone());
                const angle = (Math.PI / 2) * side;
                const dist = side % 2 === 0 ? type.w / 2 + 0.1 : type.d / 2 + 0.1;
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
                scene.add(window1);
              }
            }
          }

          const roofDetail = new THREE.Mesh(
            new THREE.BoxGeometry(type.w * 0.3, 3, type.d * 0.3),
            new THREE.MeshStandardMaterial({ color: 0x444444 })
          );
          roofDetail.position.set(blockX + offsetX, height + 1.5, blockZ + offsetZ);
          scene.add(roofDetail);
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

    // Drone
    const droneGroup = new THREE.Group();
    
    const bodyGeometry = new THREE.BoxGeometry(2, 0.5, 2);
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

    const armGeometry = new THREE.CylinderGeometry(0.1, 0.1, 3);
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

      const propGeometry = new THREE.CylinderGeometry(0.8, 0.8, 0.05);
      const propMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x00ff88,
        transparent: true,
        opacity: 0.6,
        emissive: 0x00ff88,
        emissiveIntensity: 0.3
      });
      const propeller = new THREE.Mesh(propGeometry, propMaterial);
      propeller.position.set(pos[0], pos[1], pos[2] > 0 ? pos[2] + 1.5 : pos[2] - 1.5);
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

    camera.position.set(0, 15, 20);
    camera.lookAt(droneGroup.position);

    const keys: Record<string, boolean> = {};
    const handleKeyDown = (e: KeyboardEvent) => { keys[e.key.toLowerCase()] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keys[e.key.toLowerCase()] = false; };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const droneVelocity = new THREE.Vector3();
    const droneRotation = { y: 0 };
    const maxSpeed = 0.5;
    const acceleration = 0.02;
    const drag = 0.95;

    // Collision detection function
    const checkCollision = (position: THREE.Vector3) => {
      let isColliding = false;
      
      for (const collider of buildingColliders) {
        const dx = position.x - collider.x;
        const dz = position.z - collider.z;
        const dy = position.y;
        
        if (Math.abs(dx) < collider.width / 2 &&
            Math.abs(dz) < collider.depth / 2 &&
            dy > collider.minY &&
            dy < collider.height) {
          isColliding = true;
          
          // Calculate push-back direction
          const pushX = dx > 0 ? 1 : -1;
          const pushZ = dz > 0 ? 1 : -1;
          
          // Determine which axis to push back on
          const overlapX = collider.width / 2 - Math.abs(dx);
          const overlapZ = collider.depth / 2 - Math.abs(dz);
          
          if (overlapX < overlapZ) {
            position.x = collider.x + pushX * collider.width / 2;
          } else {
            position.z = collider.z + pushZ * collider.depth / 2;
          }
          
          // Stop velocity in collision direction
          if (overlapX < overlapZ) {
            droneVelocity.x = 0;
          } else {
            droneVelocity.z = 0;
          }
          
          break;
        }
      }
      
      return isColliding;
    };

    const animate = () => {
      requestAnimationFrame(animate);

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
      if (keys[' ']) droneGroup.position.y += 0.2;
      if (keys['shift']) droneGroup.position.y -= 0.2;
      if (keys['arrowleft']) droneRotation.y += 0.03;
      if (keys['arrowright']) droneRotation.y -= 0.03;

      droneGroup.position.y = Math.max(2, Math.min(80, droneGroup.position.y));
      droneGroup.rotation.y = droneRotation.y;

      if (targetVelocity.length() > 0) {
        targetVelocity.normalize().multiplyScalar(acceleration);
        targetVelocity.applyAxisAngle(new THREE.Vector3(0, 1, 0), droneGroup.rotation.y);
        droneVelocity.add(targetVelocity);
      }

      droneVelocity.multiplyScalar(drag);
      if (droneVelocity.length() > maxSpeed) {
        droneVelocity.normalize().multiplyScalar(maxSpeed);
      }

      // Apply movement
      const newPosition = droneGroup.position.clone().add(droneVelocity);
      
      // Check collision with new position
      const collision = checkCollision(newPosition);
      setCollisionWarning(collision);
      
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

      const cameraOffset = new THREE.Vector3(0, 8, 15);
      cameraOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), droneGroup.rotation.y);
      camera.position.lerp(droneGroup.position.clone().add(cameraOffset), 0.1);
      camera.lookAt(droneGroup.position);

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
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      if (containerRef.current && renderer.domElement.parentElement === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

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