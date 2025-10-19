import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three-stdlib';
import HowItWorks from './HowItWorks';
import Contact from './Contact';

interface BuildingPosition {
  x: number;
  z: number;
  height: number;
  width: number;
  depth: number;
}

// interface GeofencePosition {
//   x: number;
//   z: number;
//   radius: number;
//   height: number;
// }

interface Drone {
  mesh: THREE.Group;
  progress: number;
}

interface DroneCityLandingProps {
  onOpenSimulator: () => void;
}

const DroneCityLanding = ({ onOpenSimulator }: DroneCityLandingProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<'home' | 'how-it-works' | 'contact'>('home');

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    scene.fog = new THREE.Fog(0x0a0a0a, 50, 200);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(40, 25, 40);
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio
    renderer.shadowMap.enabled = false; // Disable shadows for better performance
    containerRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 25);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Ground
    const groundGeometry = new THREE.PlaneGeometry(200, 200);
    const groundMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x0a0a0a,
      transparent: true,
      opacity: 0.9
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Grid materials
    const gridMaterial = new THREE.LineBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.6
    });
    const gridGlowMaterial = new THREE.LineBasicMaterial({
      color: 0xff3333,
      transparent: true,
      opacity: 0.8
    });

    // Function to create grid for a building
    const createBuildingGrid = (pos: BuildingPosition) => {
      const clearance = 5; // Units of clearance above building
      const gridHeight = pos.height + clearance;
      const gridWidth = pos.width + 4; // Extra space around building
      const gridDepth = pos.depth + 4;
      const divisions = 5; // Grid resolution per building

      const buildingGridGroup = new THREE.Group();

      // Create horizontal grids at different heights
      const numLayers = 5;
      for (let layer = 0; layer <= numLayers; layer++) {
        const h = (layer / numLayers) * gridHeight;
        const points = [];
        
        // Lines parallel to X axis
        for (let i = 0; i <= divisions; i++) {
          const z = (i / divisions - 0.5) * gridDepth;
          points.push(new THREE.Vector3(-gridWidth/2, h, z));
          points.push(new THREE.Vector3(gridWidth/2, h, z));
        }
        
        // Lines parallel to Z axis
        for (let i = 0; i <= divisions; i++) {
          const x = (i / divisions - 0.5) * gridWidth;
          points.push(new THREE.Vector3(x, h, -gridDepth/2));
          points.push(new THREE.Vector3(x, h, gridDepth/2));
        }
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const lineSegments = new THREE.LineSegments(geometry, gridMaterial);
        buildingGridGroup.add(lineSegments);
      }

      // Create vertical grid lines
      const verticalPoints = [];
      for (let i = 0; i <= divisions; i++) {
        for (let j = 0; j <= divisions; j++) {
          const x = (i / divisions - 0.5) * gridWidth;
          const z = (j / divisions - 0.5) * gridDepth;
          verticalPoints.push(new THREE.Vector3(x, 0, z));
          verticalPoints.push(new THREE.Vector3(x, gridHeight, z));
        }
      }
      const verticalGeometry = new THREE.BufferGeometry().setFromPoints(verticalPoints);
      const verticalLines = new THREE.LineSegments(verticalGeometry, gridMaterial);
      buildingGridGroup.add(verticalLines);

      // Add glowing box outline
      const boxPoints = [
        // Bottom square
        new THREE.Vector3(-gridWidth/2, 0, -gridDepth/2),
        new THREE.Vector3(gridWidth/2, 0, -gridDepth/2),
        new THREE.Vector3(gridWidth/2, 0, -gridDepth/2),
        new THREE.Vector3(gridWidth/2, 0, gridDepth/2),
        new THREE.Vector3(gridWidth/2, 0, gridDepth/2),
        new THREE.Vector3(-gridWidth/2, 0, gridDepth/2),
        new THREE.Vector3(-gridWidth/2, 0, gridDepth/2),
        new THREE.Vector3(-gridWidth/2, 0, -gridDepth/2),
        // Top square
        new THREE.Vector3(-gridWidth/2, gridHeight, -gridDepth/2),
        new THREE.Vector3(gridWidth/2, gridHeight, -gridDepth/2),
        new THREE.Vector3(gridWidth/2, gridHeight, -gridDepth/2),
        new THREE.Vector3(gridWidth/2, gridHeight, gridDepth/2),
        new THREE.Vector3(gridWidth/2, gridHeight, gridDepth/2),
        new THREE.Vector3(-gridWidth/2, gridHeight, gridDepth/2),
        new THREE.Vector3(-gridWidth/2, gridHeight, gridDepth/2),
        new THREE.Vector3(-gridWidth/2, gridHeight, -gridDepth/2),
        // Vertical edges
        new THREE.Vector3(-gridWidth/2, 0, -gridDepth/2),
        new THREE.Vector3(-gridWidth/2, gridHeight, -gridDepth/2),
        new THREE.Vector3(gridWidth/2, 0, -gridDepth/2),
        new THREE.Vector3(gridWidth/2, gridHeight, -gridDepth/2),
        new THREE.Vector3(gridWidth/2, 0, gridDepth/2),
        new THREE.Vector3(gridWidth/2, gridHeight, gridDepth/2),
        new THREE.Vector3(-gridWidth/2, 0, gridDepth/2),
        new THREE.Vector3(-gridWidth/2, gridHeight, gridDepth/2),
      ];
      const boxGeometry = new THREE.BufferGeometry().setFromPoints(boxPoints);
      const boxLines = new THREE.LineSegments(boxGeometry, gridGlowMaterial);
      buildingGridGroup.add(boxLines);

      // Position the grid at the building location
      buildingGridGroup.position.set(pos.x, 0, pos.z);
      scene.add(buildingGridGroup);
    };

    // Create realistic buildings with windows
    const buildings: THREE.Group[] = [];
    const buildingPositions: BuildingPosition[] = [
      { x: -15, z: -15, height: 20, width: 6, depth: 6 },
      { x: -15, z: 0, height: 15, width: 5, depth: 5 },
      { x: -15, z: 15, height: 18, width: 6, depth: 6 },
      { x: 0, z: -15, height: 25, width: 7, depth: 7 },
      { x: 0, z: 0, height: 30, width: 8, depth: 8 },
      { x: 0, z: 15, height: 22, width: 6, depth: 6 },
      { x: 15, z: -15, height: 16, width: 5, depth: 5 },
      { x: 15, z: 0, height: 28, width: 7, depth: 7 },
      { x: 15, z: 15, height: 20, width: 6, depth: 6 },
    ];

    buildingPositions.forEach((pos) => {
      // Create grid for this building
      createBuildingGrid(pos);
      
      const buildingGroup = new THREE.Group();
      
      // Main building structure
      const geometry = new THREE.BoxGeometry(pos.width, pos.height, pos.depth);
      const material = new THREE.MeshStandardMaterial({ 
        color: 0x2a2a3a,
        roughness: 0.7,
        metalness: 0.3
      });
      const building = new THREE.Mesh(geometry, material);
      building.castShadow = true;
      building.receiveShadow = true;
      buildingGroup.add(building);

      // Add windows (reduced for performance)
      const floors = Math.floor(pos.height / 3); // Less floors
      const windowsPerRow = Math.max(2, Math.floor(pos.width / 2)); // Fewer windows per row
      
      for (let floor = 0; floor < floors; floor++) {
        for (let win = 0; win < windowsPerRow; win++) {
          // Front windows
          const windowGeometry = new THREE.PlaneGeometry(0.6, 1);
          const isLit = Math.random() > 0.3;
          const windowMaterial = new THREE.MeshBasicMaterial({ 
            color: isLit ? 0xffeb99 : 0x1a1a2e,
            side: THREE.DoubleSide
          });
          const windowMesh = new THREE.Mesh(windowGeometry, windowMaterial);
          windowMesh.position.set(
            (win - windowsPerRow / 2) * 1.2,
            (floor - floors / 2) * 2 + 1,
            pos.depth / 2 + 0.01
          );
          buildingGroup.add(windowMesh);

          // Back windows
          const windowMesh2 = windowMesh.clone();
          windowMesh2.position.z = -pos.depth / 2 - 0.01;
          windowMesh2.rotation.y = Math.PI;
          buildingGroup.add(windowMesh2);
        }
        
        // Side windows
        for (let win = 0; win < Math.floor(pos.depth / 1.5); win++) {
          const windowGeometry = new THREE.PlaneGeometry(0.6, 1);
          const isLit = Math.random() > 0.3;
          const windowMaterial = new THREE.MeshBasicMaterial({ 
            color: isLit ? 0xffeb99 : 0x1a1a2e
          });
          const windowMesh = new THREE.Mesh(windowGeometry, windowMaterial);
          windowMesh.position.set(
            pos.width / 2 + 0.01,
            (floor - floors / 2) * 2 + 1,
            (win - Math.floor(pos.depth / 1.5) / 2) * 1.2
          );
          windowMesh.rotation.y = Math.PI / 2;
          buildingGroup.add(windowMesh);

          const windowMesh2 = windowMesh.clone();
          windowMesh2.position.x = -pos.width / 2 - 0.01;
          windowMesh2.rotation.y = -Math.PI / 2;
          buildingGroup.add(windowMesh2);
        }
      }

      // Add rooftop detail
      const roofGeometry = new THREE.BoxGeometry(pos.width * 0.6, 0.5, pos.depth * 0.6);
      const roofMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x4a4a5a,
        emissive: 0x222233,
        emissiveIntensity: 0.2
      });
      const roof = new THREE.Mesh(roofGeometry, roofMaterial);
      roof.position.y = pos.height / 2 + 0.25;
      buildingGroup.add(roof);

      buildingGroup.position.set(pos.x, pos.height / 2, pos.z);
      scene.add(buildingGroup);
      buildings.push(buildingGroup);
    });

    // Create geofences (red zones) - DISABLED
    const geofences: THREE.Mesh[] = [];
    // const geofencePositions: GeofencePosition[] = [
    //   { x: -15, z: 0, radius: 8, height: 20 },
    //   { x: 0, z: 0, radius: 10, height: 35 },
    //   { x: 15, z: 0, radius: 9, height: 32 },
    //   { x: -15, z: 15, radius: 7, height: 25 },
    // ];

    // geofencePositions.forEach((pos) => {
    //   const geometry = new THREE.CylinderGeometry(pos.radius, pos.radius, pos.height, 32, 1, true);
    //   const material = new THREE.MeshBasicMaterial({
    //     color: 0xff6b6b,
    //     transparent: true,
    //     opacity: 0.25,
    //     side: THREE.DoubleSide
    //   });
    //   const geofence = new THREE.Mesh(geometry, material);
    //   geofence.position.set(pos.x, pos.height / 2, pos.z);
    //   scene.add(geofence);
    //   geofences.push(geofence);

    //   // Add top cap
    //   const capGeometry = new THREE.CircleGeometry(pos.radius, 32);
    //   const cap = new THREE.Mesh(capGeometry, material);
    //   cap.rotation.x = -Math.PI / 2;
    //   cap.position.set(pos.x, pos.height, pos.z);
    //   scene.add(cap);
    // });

    // Create flight path
    const pathPoints = [
      new THREE.Vector3(-30, 20, -30),
      new THREE.Vector3(-20, 18, -10),
      new THREE.Vector3(-5, 22, 5),
      new THREE.Vector3(10, 25, 10),
      new THREE.Vector3(25, 20, -5),
      new THREE.Vector3(30, 18, -20),
    ];

    const curve = new THREE.CatmullRomCurve3(pathPoints);
    const points = curve.getPoints(100); // Reduced from 200 to 100 for performance
    const pathGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const pathMaterial = new THREE.LineBasicMaterial({ 
      color: 0xffa500,
      linewidth: 3
    });
    const pathLine = new THREE.Line(pathGeometry, pathMaterial);
    scene.add(pathLine);

    // Create glowing path effect
    const glowPoints = curve.getPoints(30); // Reduced from 50 to 30 for performance
    const glowGeometry = new THREE.BufferGeometry().setFromPoints(glowPoints);
    const glowMaterial = new THREE.LineBasicMaterial({ 
      color: 0xffeb3b,
      linewidth: 2,
      transparent: true,
      opacity: 0.6
    });
    const glowLine = new THREE.Line(glowGeometry, glowMaterial);
    scene.add(glowLine);

    // Route to the SIDE of buildings - completely avoiding ALL red grid lines
    // Tallest at (0,0): grid extends x=±6, z=±6
    // Fourth tallest at (0,15): grid extends x=±5, z=10 to 20
    const aircraftPathPoints = [
      new THREE.Vector3(10, 33, 25),     // Start from right side (outside all grids)
      new THREE.Vector3(10, 33, 15),     // Along the right side
      new THREE.Vector3(10, 33, 0),      // Continue on safe path
      new THREE.Vector3(10, 33, -15),    // Moving forward
      new THREE.Vector3(10, 33, -30),    // Exit towards front
    ];

    const aircraftCurve = new THREE.CatmullRomCurve3(aircraftPathPoints);
    const aircraftPoints = aircraftCurve.getPoints(80); // Reduced from 150 to 80 for performance
    const aircraftPathGeometry = new THREE.BufferGeometry().setFromPoints(aircraftPoints);
    const aircraftPathMaterial = new THREE.LineBasicMaterial({
      color: 0xff6600,  // Orange color for aircraft route
      linewidth: 4
    });
    const aircraftPathLine = new THREE.Line(aircraftPathGeometry, aircraftPathMaterial);
    scene.add(aircraftPathLine);

    // Create glowing effect for aircraft path
    const aircraftGlowPoints = aircraftCurve.getPoints(30); // Reduced from 50 to 30 for performance
    const aircraftGlowGeometry = new THREE.BufferGeometry().setFromPoints(aircraftGlowPoints);
    const aircraftGlowMaterial = new THREE.LineBasicMaterial({
      color: 0xff8833,  // Lighter orange glow
      linewidth: 3,
      transparent: true,
      opacity: 0.7
    });
    const aircraftGlowLine = new THREE.Line(aircraftGlowGeometry, aircraftGlowMaterial);
    scene.add(aircraftGlowLine);

    // Create drones
    const drones: Drone[] = [];
    for (let i = 0; i < 2; i++) {
      const droneGroup = new THREE.Group();
      
      // Drone body
      const bodyGeometry = new THREE.BoxGeometry(1.5, 0.4, 1);
      const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0xeeeeee });
      const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
      droneGroup.add(body);

      // Propellers
      const propPositions = [
        [-0.6, 0.3, -0.4],
        [0.6, 0.3, -0.4],
        [-0.6, 0.3, 0.4],
        [0.6, 0.3, 0.4]
      ];

      propPositions.forEach(pos => {
        const propGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16);
        const propMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const prop = new THREE.Mesh(propGeometry, propMaterial);
        prop.position.set(pos[0], pos[1], pos[2]);
        droneGroup.add(prop);
      });

      scene.add(droneGroup);
      drones.push({
        mesh: droneGroup,
        progress: i * 0.5
      });
    }

    // Load and animate aircraft
    let aircraft: THREE.Group | null = null;
    let aircraftProgress = 0;

    const loader = new GLTFLoader();
    loader.load(
      '/models/airbus-a380-800/source/Airbus A380-800.glb',
      (gltf) => {
        aircraft = gltf.scene;

        // Scale down the aircraft (A380 is huge, so we make it smaller)
        aircraft.scale.set(0.12, 0.12, 0.12);

        // Position at start of path
        const startPoint = aircraftCurve.getPoint(0);
        aircraft.position.copy(startPoint);

        // Add to scene
        scene.add(aircraft);

        console.log('Aircraft loaded successfully!');
      },
      (progress) => {
        console.log('Loading aircraft...', (progress.loaded / progress.total) * 100 + '%');
      },
      (error) => {
        console.error('Error loading aircraft:', error);
      }
    );

    // Animation
    const animate = () => {
      requestAnimationFrame(animate);

      // Camera positioned to see both drones and aircraft
      const time = Date.now() * 0.0001;
      camera.position.x = Math.cos(time) * 50;
      camera.position.y = 20; // Mid-level to see both drones (18-25) and aircraft (31-32)
      camera.position.z = Math.sin(time) * 50;
      camera.lookAt(0, 25, 0); // Look at a point between drone and aircraft heights

      // Animate drones along path
      drones.forEach(drone => {
        drone.progress += 0.002;
        if (drone.progress > 1) drone.progress = 0;

        const point = curve.getPoint(drone.progress);
        drone.mesh.position.copy(point);

        // Make drone look ahead
        const nextPoint = curve.getPoint((drone.progress + 0.01) % 1);
        drone.mesh.lookAt(nextPoint);
      });

      // Animate aircraft along its path
      if (aircraft) {
        aircraftProgress += 0.002; // Slower, more realistic speed
        if (aircraftProgress > 1) aircraftProgress = 0; // Loop back to start

        const aircraftPoint = aircraftCurve.getPoint(aircraftProgress);
        aircraft.position.copy(aircraftPoint);

        // Make aircraft face its direction of travel
        const nextAircraftPoint = aircraftCurve.getPoint((aircraftProgress + 0.01) % 1);
        aircraft.lookAt(nextAircraftPoint);
      }

      // Pulse geofences
      geofences.forEach((geofence, i) => {
        const material = geofence.material as THREE.MeshBasicMaterial;
        material.opacity = 0.2 + Math.sin(Date.now() * 0.001 + i) * 0.1;
      });

      renderer.render(scene, camera);
    };

    animate();
    setLoading(false);

    // Handle window resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      containerRef.current?.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  return (
    <div className="w-full min-h-screen overflow-y-auto overflow-x-hidden bg-white">
      {/* Hero Section with 3D Animation */}
      <div className="relative w-full h-screen overflow-hidden">
        <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="text-black text-3xl font-black tracking-tight border-4 border-black bg-[#39FF14] px-6 py-3 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              SKYGUARD AI
            </div>
            <div className="flex gap-4 pointer-events-auto">
              <button
                onClick={() => setCurrentPage('how-it-works')}
                className="text-black font-bold text-lg border-4 border-black bg-white px-6 py-3 hover:bg-[#39FF14] transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
              >
                How it works
              </button>
              <button
                onClick={() => setCurrentPage('contact')}
                className="text-black font-bold text-lg border-4 border-black bg-white px-6 py-3 hover:bg-[#39FF14] transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
              >
                Contact
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="absolute inset-0 flex items-center justify-start px-8">
          <div className="max-w-3xl border-8 border-black bg-white p-10 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
            <h1 className="text-7xl font-black text-black mb-6 leading-none uppercase">
              AI-POWERED
              <br />
              <span className="text-black bg-[#39FF14] px-2 inline-block border-4 border-black mt-2">DRONE NAVIGATION</span>
            </h1>
            <p className="text-2xl text-black mb-8 leading-tight font-bold border-l-8 border-black pl-4">
              Advanced fallback systems with real-time geofence detection
              and intelligent avoidance maneuvers for urban airspace.
            </p>
            <div className="flex gap-6 pointer-events-auto">
              <button
                onClick={onOpenSimulator}
                className="px-10 py-5 bg-[#39FF14] text-black border-4 border-black font-black text-xl uppercase hover:translate-x-1 hover:translate-y-1 transition-transform shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              >
                Request Demo
              </button>
              <button className="px-10 py-5 bg-white text-black border-4 border-black font-black text-xl uppercase hover:translate-x-1 hover:translate-y-1 transition-transform shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                Learn More
              </button>
            </div>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="absolute bottom-8 right-8 bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-4 h-4 bg-[#39FF14] border-2 border-black animate-pulse"></div>
            <span className="text-black font-black text-lg uppercase">SYSTEM ACTIVE</span>
          </div>
          <div className="text-black font-bold space-y-2 border-t-2 border-black pt-3">
            <div className="flex justify-between gap-4">
              <span>Geofences:</span>
              <span className="bg-[#39FF14] px-2 border-2 border-black">Active</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Routes:</span>
              <span className="bg-[#39FF14] px-2 border-2 border-black">Optimized</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>AI Fallback:</span>
              <span className="bg-[#39FF14] px-2 border-2 border-black">Engaged</span>
            </div>
          </div>
        </div>
      </div>

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white">
            <div className="text-black text-3xl font-black border-8 border-black bg-[#39FF14] px-12 py-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
              INITIALIZING 3D SCENE...
            </div>
          </div>
        )}
      </div>

      {/* Separator Line */}
      <div className="w-full h-2 bg-black"></div>

      {/* Content Sections */}
      <div className="bg-white">
        {/* Section 1: Statistics */}
        <section className="py-20 px-8">
          <div>
            <h2 className="text-5xl md:text-7xl font-black text-black mb-4 text-center uppercase leading-none">
              The <span className="bg-[#39FF14] border-4 border-black px-3 inline-block">Problem</span>
            </h2>
            <p className="text-2xl text-black font-bold mb-16 max-w-3xl text-center mx-auto border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              Drone and aircraft incidents in urban airspace are on the rise
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              <div className="bg-white border-6 border-black p-10 text-center shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:translate-x-2 hover:translate-y-2 transition-transform hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                <div className="text-7xl font-black text-black mb-4 bg-[#39FF14] border-4 border-black py-4">2,300+</div>
                <h3 className="text-3xl font-black text-black mb-4 uppercase border-b-4 border-black pb-2">Annual Incidents</h3>
                <p className="text-black font-bold text-lg leading-tight">
                  Reported drone-related incidents near restricted airspace globally in 2024
                </p>
              </div>

              <div className="bg-white border-6 border-black p-10 text-center shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:translate-x-2 hover:translate-y-2 transition-transform hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                <div className="text-7xl font-black text-black mb-4 bg-[#39FF14] border-4 border-black py-4">$4.2B</div>
                <h3 className="text-3xl font-black text-black mb-4 uppercase border-b-4 border-black pb-2">Economic Impact</h3>
                <p className="text-black font-bold text-lg leading-tight">
                  Annual cost of airspace violations and safety incidents worldwide
                </p>
              </div>

              <div className="bg-white border-6 border-black p-10 text-center shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:translate-x-2 hover:translate-y-2 transition-transform hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                <div className="text-7xl font-black text-black mb-4 bg-[#39FF14] border-4 border-black py-4">87%</div>
                <h3 className="text-3xl font-black text-black mb-4 uppercase border-b-4 border-black pb-2">Preventable</h3>
                <p className="text-black font-bold text-lg leading-tight">
                  Of incidents could be avoided with AI-powered geofence detection
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Why It's Important */}
        <section className="py-20 px-8 border-y-4 border-black">
          <div>
            <h2 className="text-5xl md:text-7xl font-black text-black mb-4 text-center uppercase leading-none">
              Why <span className="bg-[#39FF14] border-4 border-black px-3 inline-block">SkyGuard AI</span> Matters
            </h2>
            <p className="text-2xl text-black font-bold mb-16 max-w-3xl text-center mx-auto border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              Protecting lives and infrastructure with intelligent airspace management
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
              <div className="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-2 hover:translate-y-2 transition-transform hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="text-5xl mb-4 bg-[#39FF14] border-4 border-black w-20 h-20 flex items-center justify-center">🛡️</div>
                <h3 className="text-3xl font-black text-black mb-4 uppercase border-b-4 border-black pb-2">Safety First</h3>
                <p className="text-black font-bold text-lg leading-tight">
                  Real-time geofence detection prevents collisions with buildings, critical infrastructure,
                  and other aircraft. Our AI system responds instantly to keep everyone safe.
                </p>
              </div>

              <div className="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-2 hover:translate-y-2 transition-transform hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="text-5xl mb-4 bg-[#39FF14] border-4 border-black w-20 h-20 flex items-center justify-center">⚡</div>
                <h3 className="text-3xl font-black text-black mb-4 uppercase border-b-4 border-black pb-2">Instant Response</h3>
                <p className="text-black font-bold text-lg leading-tight">
                  Millisecond-level detection and avoidance maneuvers ensure your aircraft or drone
                  never enters restricted zones, maintaining compliance at all times.
                </p>
              </div>

              <div className="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-2 hover:translate-y-2 transition-transform hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="text-5xl mb-4 bg-[#39FF14] border-4 border-black w-20 h-20 flex items-center justify-center">🌍</div>
                <h3 className="text-3xl font-black text-black mb-4 uppercase border-b-4 border-black pb-2">Urban Ready</h3>
                <p className="text-black font-bold text-lg leading-tight">
                  Purpose-built for complex urban environments with dense buildings and dynamic
                  airspace restrictions. Navigate cities with confidence.
                </p>
              </div>

              <div className="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-2 hover:translate-y-2 transition-transform hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="text-5xl mb-4 bg-[#39FF14] border-4 border-black w-20 h-20 flex items-center justify-center">🤖</div>
                <h3 className="text-3xl font-black text-black mb-4 uppercase border-b-4 border-black pb-2">AI-Powered</h3>
                <p className="text-black font-bold text-lg leading-tight">
                  Machine learning algorithms continuously improve route optimization and prediction
                  accuracy, making your flights safer over time.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Test Demo */}
        <section className="py-20 px-8">
          <div>
            <h2 className="text-5xl md:text-7xl font-black text-black mb-4 text-center uppercase leading-none">
              See It In <span className="bg-[#39FF14] border-4 border-black px-3 inline-block">Action</span>
            </h2>
            <p className="text-2xl text-black font-bold mb-16 max-w-3xl text-center mx-auto border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              Experience the power of AI-driven geofence avoidance in real-time
            </p>

            <div className="bg-white border-6 border-black p-12 mb-12 max-w-5xl mx-auto shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
              <div className="mb-8">
                <div className="inline-block bg-[#39FF14] border-4 border-black px-8 py-4 mb-6">
                  <span className="text-black font-black text-2xl uppercase">LIVE DEMO ABOVE ⬆️</span>
                </div>
                <p className="text-black font-bold text-xl leading-tight border-l-6 border-black pl-6">
                  The 3D visualization above shows our system in action. Watch as the aircraft
                  intelligently navigates around geofenced buildings (marked with red grid lines),
                  automatically adjusting its route to maintain safe clearance.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="text-left border-4 border-black p-4 bg-white">
                  <div className="text-black font-black text-lg mb-2 border-b-2 border-black pb-2">🟥 RED GRIDS</div>
                  <p className="text-black font-bold">Geofenced restricted zones</p>
                </div>
                <div className="text-left border-4 border-black p-4 bg-white">
                  <div className="text-black font-black text-lg mb-2 border-b-2 border-black pb-2">🟧 ORANGE PATH</div>
                  <p className="text-black font-bold">Safe flight route</p>
                </div>
                <div className="text-left border-4 border-black p-4 bg-white">
                  <div className="text-black font-black text-lg mb-2 border-b-2 border-black pb-2">✈️ AIRCRAFT</div>
                  <p className="text-black font-bold">Real-time avoidance</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 justify-center max-w-5xl mx-auto">
              <button
                onClick={onOpenSimulator}
                className="px-12 py-6 bg-[#39FF14] text-black border-6 border-black font-black text-2xl uppercase hover:translate-x-2 hover:translate-y-2 transition-transform shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
              >
                Request Full Demo
              </button>
              <button
                onClick={() => setCurrentPage('contact')}
                className="px-12 py-6 bg-white text-black border-6 border-black font-black text-2xl uppercase hover:translate-x-2 hover:translate-y-2 transition-transform shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
              >
                Contact Sales
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10 py-12 px-8">
          <div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
              <div>
                <h3 className="text-white font-bold text-xl mb-4 font-mono">SKYGUARD AI</h3>
                <p className="text-white/60 font-mono text-sm">
                  AI-powered geofence avoidance for safer urban airspace
                </p>
              </div>

              <div>
                <h4 className="text-white font-bold mb-4 font-mono">Product</h4>
                <ul className="space-y-2">
                  <li>
                    <button
                      onClick={() => setCurrentPage('how-it-works')}
                      className="text-white/60 hover:text-orange-400 transition font-mono text-sm"
                    >
                      How it Works
                    </button>
                  </li>
                  <li><a href="#" className="text-white/60 hover:text-orange-400 transition font-mono text-sm">Features</a></li>
                  <li><a href="#" className="text-white/60 hover:text-orange-400 transition font-mono text-sm">Pricing</a></li>
                </ul>
              </div>

              <div>
                <h4 className="text-white font-bold mb-4 font-mono">Company</h4>
                <ul className="space-y-2">
                  <li><a href="#" className="text-white/60 hover:text-orange-400 transition font-mono text-sm">About Us</a></li>
                  <li>
                    <button
                      onClick={() => setCurrentPage('contact')}
                      className="text-white/60 hover:text-orange-400 transition font-mono text-sm"
                    >
                      Contact
                    </button>
                  </li>
                  <li><a href="#" className="text-white/60 hover:text-orange-400 transition font-mono text-sm">Careers</a></li>
                </ul>
              </div>

              <div>
                <h4 className="text-white font-bold mb-4 font-mono">Legal</h4>
                <ul className="space-y-2">
                  <li><a href="#" className="text-white/60 hover:text-orange-400 transition font-mono text-sm">Privacy Policy</a></li>
                  <li><a href="#" className="text-white/60 hover:text-orange-400 transition font-mono text-sm">Terms of Service</a></li>
                  <li><a href="#" className="text-white/60 hover:text-orange-400 transition font-mono text-sm">Cookie Policy</a></li>
                </ul>
              </div>
            </div>

            <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center">
              <p className="text-white/60 font-mono text-sm">
                © 2025 SkyGuard AI Inc. All rights reserved.
              </p>
              <div className="flex gap-6 mt-4 md:mt-0">
                <a href="#" className="text-white/60 hover:text-orange-400 transition font-mono text-sm">Twitter</a>
                <a href="#" className="text-white/60 hover:text-orange-400 transition font-mono text-sm">LinkedIn</a>
                <a href="#" className="text-white/60 hover:text-orange-400 transition font-mono text-sm">GitHub</a>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Page Overlays */}
      {currentPage === 'how-it-works' && <HowItWorks onBack={() => setCurrentPage('home')} />}
      {currentPage === 'contact' && <Contact onBack={() => setCurrentPage('home')} />}
    </div>
  );
};

export default DroneCityLanding;