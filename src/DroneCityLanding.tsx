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
    <div className="w-full min-h-screen overflow-y-auto overflow-x-hidden bg-black">
      {/* Hero Section with 3D Animation */}
      <div className="relative w-full h-screen overflow-hidden">
        <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <img src="/logo2.png" alt="AeroGrid Logo" className="h-12 w-12 rounded-full object-cover" />
              <span className="text-white text-2xl font-bold tracking-wider font-mono">AeroGrid</span>
            </div>
            <div className="flex gap-6 text-white pointer-events-auto font-mono">
              <button
                onClick={() => setCurrentPage('how-it-works')}
                className="hover:text-yellow-400 transition"
              >
                How it works
              </button>
              <button
                onClick={() => setCurrentPage('contact')}
                className="hover:text-yellow-400 transition"
              >
                Contact
              </button>
            </div>
          </div>
        </div>

        {/* Main Content - Top Left */}
        <div className="absolute top-24 left-8">
          <div className="max-w-2xl">
            <h1 className="text-7xl font-black text-white mb-4 leading-none font-mono uppercase">
              <span className="text-yellow-400">FLIGHT</span>BOUNDARY
            </h1>
            <p className="text-2xl text-white/90 font-bold leading-tight font-mono border-l-4 border-yellow-400 pl-4">
              Dynamic Geospatial Safety for Smart Skies
            </p>
          </div>
        </div>

        {/* CTA Buttons - Center Bottom */}
        <div className="absolute bottom-12 left-0 right-0 flex justify-center gap-6 pointer-events-auto px-8">
          <button
            onClick={onOpenSimulator}
            className="px-10 py-4 bg-yellow-500 text-black rounded-lg font-semibold hover:bg-yellow-600 transition-all shadow-lg hover:shadow-xl font-mono text-lg"
          >
            Request Demo
          </button>
          <button className="px-10 py-4 bg-white/10 backdrop-blur text-white rounded-lg font-semibold hover:bg-white/20 transition-all border border-white/30 font-mono text-lg">
            Learn More
          </button>
        </div>

        {/* Status Indicator */}
        <div className="absolute bottom-28 right-8 bg-white/10 backdrop-blur-lg rounded-lg p-4 border border-white/20 font-mono">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-white font-semibold">SYSTEM ACTIVE</span>
          </div>
          <div className="text-white/70 text-sm space-y-1">
            <div>Geofences: Active</div>
            <div>Routes: Optimized</div>
            <div>AI Fallback: Engaged</div>
          </div>
        </div>
      </div>

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-white text-xl font-mono">Initializing 3D Scene...</div>
          </div>
        )}
      </div>

      {/* Separator Line */}
      <div className="w-full h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent"></div>

      {/* Content Sections */}
      <div className="bg-black">
        {/* Section 1: Statistics */}
        <section className="py-20 px-8">
          <div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 font-mono text-center">
              The <span className="text-yellow-400">Problem</span>
            </h2>
            <p className="text-xl text-white/70 mb-12 font-mono max-w-3xl text-center mx-auto">
              Drone and aircraft incidents in urban airspace are on the rise
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              <div className="bg-white/5 backdrop-blur-lg rounded-lg p-8 border border-white/10 text-center">
                <div className="text-6xl font-bold text-yellow-400 mb-4 font-mono">2,300+</div>
                <h3 className="text-2xl font-bold text-white mb-3 font-mono">Annual Incidents</h3>
                <p className="text-white/70 font-mono">
                  Reported drone-related incidents near restricted airspace USA in 2025
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-lg rounded-lg p-8 border border-white/10 text-center">
                <div className="text-6xl font-bold text-yellow-400 mb-4 font-mono">$4.2B</div>
                <h3 className="text-2xl font-bold text-white mb-3 font-mono">Economic Impact</h3>
                <p className="text-white/70 font-mono">
                  Annual cost of airspace violations and safety incidents worldwide
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-lg rounded-lg p-8 border border-white/10 text-center">
                <div className="text-6xl font-bold text-yellow-400 mb-4 font-mono">87%</div>
                <h3 className="text-2xl font-bold text-white mb-3 font-mono">Preventable</h3>
                <p className="text-white/70 font-mono">
                  Of incidents could be avoided with geofence detection
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* What We're Solving Section */}
        <section className="py-20 px-8 bg-black border-y-2 border-yellow-500/30">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 font-mono text-center">
              What We're <span className="text-yellow-400">Solving</span>
            </h2>
            <p className="text-xl text-white/70 mb-12 font-mono max-w-4xl text-center mx-auto leading-relaxed">
              The future of urban airspace requires intelligent segregation and strict compliance
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              <div className="bg-white/5 backdrop-blur-lg rounded-lg p-8 border-2 border-yellow-500/40">
                <div className="text-5xl mb-4">🏛️</div>
                <h3 className="text-2xl font-bold text-yellow-400 mb-4 font-mono">Government Mandate</h3>
                <p className="text-white/80 font-mono leading-relaxed text-lg">
                  Strict geofencing is now <span className="text-yellow-400 font-bold">mandated by the US government</span> for all drone companies.
                  AeroGrid ensures your compliance with federal airspace regulations, protecting you from legal liability.
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-lg rounded-lg p-8 border-2 border-yellow-500/40">
                <div className="text-5xl mb-4">🛰️</div>
                <h3 className="text-2xl font-bold text-yellow-400 mb-4 font-mono">NASA-Powered Technology</h3>
                <p className="text-white/80 font-mono leading-relaxed text-lg">
                  Built on <span className="text-yellow-400 font-bold">NASA's patented technology</span> combined with our proprietary
                  AI fallback mechanism, AeroGrid provides the most advanced airspace segregation system available.
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-yellow-500/10 via-yellow-500/5 to-yellow-500/10 rounded-lg p-10 border-2 border-yellow-500/50">
              <div className="text-center">
                <div className="text-5xl mb-4">⚙️</div>
                <h3 className="text-3xl font-bold text-white mb-4 font-mono">Advanced AI Fallback Mechanism</h3>
                <p className="text-white/80 font-mono leading-relaxed text-lg max-w-4xl mx-auto">
                  Our custom-developed AI algorithm continuously monitors flight paths and instantly activates
                  fallback protocols when geofence violations are detected. This dual-layer protection ensures
                  <span className="text-yellow-400 font-bold"> 100% airspace compliance</span> even in system failure scenarios.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Why It's Important */}
        <section className="py-20 px-8 bg-white/5">
          <div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 font-mono text-center">
              Why <span className="text-yellow-400">AeroGrid</span> Matters
            </h2>
            <p className="text-xl text-white/70 mb-12 font-mono max-w-3xl text-center mx-auto">
              Protecting lives and infrastructure with intelligent airspace management
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
              <div className="bg-black/50 backdrop-blur-lg rounded-lg p-8 border border-yellow-500/20 text-center">
                <div className="text-4xl mb-4">🛡️</div>
                <h3 className="text-2xl font-bold text-white mb-4 font-mono">Safety First</h3>
                <p className="text-white/70 font-mono leading-relaxed">
                  Real-time geofence detection prevents collisions with buildings, critical infrastructure,
                  and other aircraft. Our AI system responds instantly to keep everyone safe.
                </p>
              </div>

              <div className="bg-black/50 backdrop-blur-lg rounded-lg p-8 border border-yellow-500/20 text-center">
                <div className="text-4xl mb-4">⚡</div>
                <h3 className="text-2xl font-bold text-white mb-4 font-mono">Instant Response</h3>
                <p className="text-white/70 font-mono leading-relaxed">
                  Millisecond-level detection and avoidance maneuvers ensure your aircraft or drone
                  never enters restricted zones, maintaining compliance at all times.
                </p>
              </div>

              <div className="bg-black/50 backdrop-blur-lg rounded-lg p-8 border border-yellow-500/20 text-center">
                <div className="text-4xl mb-4">🌍</div>
                <h3 className="text-2xl font-bold text-white mb-4 font-mono">Urban Ready</h3>
                <p className="text-white/70 font-mono leading-relaxed">
                  Purpose-built for complex urban environments with dense buildings and dynamic
                  airspace restrictions. Navigate cities with confidence.
                </p>
              </div>

              <div className="bg-black/50 backdrop-blur-lg rounded-lg p-8 border border-yellow-500/20 text-center">
                <div className="text-4xl mb-4">🤖</div>
                <h3 className="text-2xl font-bold text-white mb-4 font-mono">Algorithmically optimized</h3>
                <p className="text-white/70 font-mono leading-relaxed">
                  Machine learning algorithms continuously improve route optimization and prediction
                  accuracy.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Separator Line */}
        <div className="w-full h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent"></div>

        {/* Easy Integration Section - PROMINENT */}
        <section className="py-24 px-8 bg-gradient-to-b from-yellow-500/10 via-black to-black border-y-4 border-yellow-500">
          <div className="max-w-5xl mx-auto">
            <div className="bg-black/80 backdrop-blur-xl rounded-2xl p-12 border-4 border-yellow-500 shadow-2xl shadow-yellow-500/20">
              <div className="text-center mb-8">
                <h2 className="text-5xl md:text-7xl font-black text-white mb-6 font-mono leading-tight">
                  <span className="text-yellow-400">Seamless Integration</span>
                  <br />
                  For Any Drone
                </h2>
                <p className="text-2xl text-white/90 font-bold font-mono leading-relaxed max-w-3xl mx-auto">
                  Our algorithm can be <span className="text-yellow-400 underline decoration-4 decoration-yellow-400">easily integrated into any drone</span> regardless of manufacturer, model, or existing systems.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
                <div className="bg-white/5 rounded-lg p-6 border-2 border-yellow-500/30 text-center">
                  <div className="text-4xl mb-3">⚡</div>
                  <h4 className="text-xl font-bold text-yellow-400 mb-2 font-mono">Quick Setup</h4>
                  <p className="text-white/70 font-mono text-sm">Deploy in hours, not months</p>
                </div>
                <div className="bg-white/5 rounded-lg p-6 border-2 border-yellow-500/30 text-center">
                  <div className="text-4xl mb-3">🔧</div>
                  <h4 className="text-xl font-bold text-yellow-400 mb-2 font-mono">Zero Hardware</h4>
                  <p className="text-white/70 font-mono text-sm">Pure software solution</p>
                </div>
                <div className="bg-white/5 rounded-lg p-6 border-2 border-yellow-500/30 text-center">
                  <div className="text-4xl mb-3">🌐</div>
                  <h4 className="text-xl font-bold text-yellow-400 mb-2 font-mono">Universal</h4>
                  <p className="text-white/70 font-mono text-sm">Works with all platforms</p>
                </div>
              </div>

              <div className="mt-10 text-center">
                <p className="text-lg text-white/60 font-mono mb-6">
                  No need to redesign your drone. No expensive retrofits. Just better, safer flight.
                </p>
                <button className="px-12 py-5 bg-yellow-500 text-black rounded-lg font-black text-xl uppercase hover:bg-yellow-600 transition-all shadow-lg hover:shadow-xl font-mono">
                  See Integration Guide
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Business Model Section */}
        <section className="py-20 px-8 bg-gradient-to-b from-black via-yellow-500/5 to-black border-t-2 border-yellow-500/30">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 font-mono text-center">
              Business <span className="text-yellow-400">Model</span>
            </h2>
            <p className="text-xl text-white/70 mb-16 font-mono max-w-3xl text-center mx-auto">
              A scalable, profitable solution for the future of airspace safety
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
              {/* Investment */}
              <div className="bg-white/5 backdrop-blur-lg rounded-lg p-8 border-2 border-yellow-500/40">
                <div className="text-5xl mb-4 text-center">💰</div>
                <h3 className="text-2xl font-bold text-yellow-400 mb-4 font-mono text-center">Investment Needed</h3>
                <div className="text-center mb-6">
                  <div className="text-5xl font-black text-white mb-2 font-mono">$100K-$250K</div>
                  <p className="text-white/60 font-mono text-sm">Initial capital requirement</p>
                </div>
                <ul className="space-y-3 text-white/70 font-mono text-sm">
                  <li className="flex items-start">
                    <span className="text-yellow-400 mr-2">•</span>
                    <span>R&D completion & testing</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-yellow-400 mr-2">•</span>
                    <span>Regulatory certifications</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-yellow-400 mr-2">•</span>
                    <span>Marketing & partnerships</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-yellow-400 mr-2">•</span>
                    <span>Platform infrastructure</span>
                  </li>
                </ul>
              </div>

              {/* Pricing */}
              <div className="bg-white/5 backdrop-blur-lg rounded-lg p-8 border-2 border-yellow-500/40">
                <div className="text-5xl mb-4 text-center">💵</div>
                <h3 className="text-2xl font-bold text-yellow-400 mb-4 font-mono text-center">Pricing Model</h3>
                <div className="space-y-6">
                  <div className="bg-black/50 rounded-lg p-6 border border-yellow-500/30">
                    <div className="text-3xl font-black text-white mb-2 font-mono">$25,000</div>
                    <p className="text-white/60 font-mono text-sm mb-3">per drone model</p>
                    <p className="text-white/80 font-mono text-xs">
                      One-time licensing fee for integration into each drone model
                    </p>
                  </div>
                  <div className="bg-black/50 rounded-lg p-6 border border-yellow-500/30">
                    <div className="text-3xl font-black text-yellow-400 mb-2 font-mono">+ 3%</div>
                    <p className="text-white/60 font-mono text-sm mb-3">royalty per unit sold</p>
                    <p className="text-white/80 font-mono text-xs">
                      Recurring revenue stream from every drone manufactured
                    </p>
                  </div>
                </div>
              </div>

              {/* Profit Projection */}
              <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 backdrop-blur-lg rounded-lg p-8 border-2 border-yellow-500/60">
                <div className="text-5xl mb-4 text-center">📈</div>
                <h3 className="text-2xl font-bold text-yellow-400 mb-4 font-mono text-center">Revenue Potential</h3>
                <div className="space-y-4">
                  <div className="bg-black/40 rounded-lg p-4 border border-yellow-500/30">
                    <p className="text-white/60 font-mono text-xs mb-2">Example: 10 Drone Companies</p>
                    <div className="text-2xl font-bold text-white font-mono">$250K</div>
                    <p className="text-white/70 font-mono text-xs mt-1">Licensing fees (Year 1)</p>
                  </div>
                  <div className="bg-black/40 rounded-lg p-4 border border-yellow-500/30">
                    <p className="text-white/60 font-mono text-xs mb-2">10,000 drones/company @ $1K avg</p>
                    <div className="text-2xl font-bold text-yellow-400 font-mono">$3M/yr</div>
                    <p className="text-white/70 font-mono text-xs mt-1">Recurring royalties</p>
                  </div>
                  <div className="bg-yellow-500/20 rounded-lg p-4 border-2 border-yellow-500">
                    <div className="text-3xl font-black text-white font-mono">$3.25M+</div>
                    <p className="text-white/90 font-mono text-sm font-bold">Year 1 Revenue</p>
                    <p className="text-yellow-400 font-mono text-xs mt-2 font-bold">
                      1,200%+ ROI in first year
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-black/60 backdrop-blur-lg rounded-lg p-8 border-2 border-yellow-500/50 max-w-4xl mx-auto">
              <h4 className="text-2xl font-bold text-white mb-4 font-mono text-center">
                Scalability & Growth
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-white/80 font-mono text-sm">
                <div className="flex items-start">
                  <span className="text-yellow-400 text-2xl mr-3">✓</span>
                  <div>
                    <p className="font-bold text-white mb-1">Market Mandate</p>
                    <p className="text-white/60">Government compliance = guaranteed demand</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <span className="text-yellow-400 text-2xl mr-3">✓</span>
                  <div>
                    <p className="font-bold text-white mb-1">Recurring Revenue</p>
                    <p className="text-white/60">3% royalty on every unit sold</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <span className="text-yellow-400 text-2xl mr-3">✓</span>
                  <div>
                    <p className="font-bold text-white mb-1">Low Marginal Cost</p>
                    <p className="text-white/60">Software scales without additional hardware</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <span className="text-yellow-400 text-2xl mr-3">✓</span>
                  <div>
                    <p className="font-bold text-white mb-1">Global Opportunity</p>
                    <p className="text-white/60">Expand to international markets</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Test Demo */}
        <section className="py-20 px-8">
          <div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 font-mono text-center">
              See It In <span className="text-yellow-400">Action</span>
            </h2>
            <p className="text-xl text-white/70 mb-8 font-mono max-w-3xl text-center mx-auto">
              Experience the power of geofence avoidance in real-time
            </p>

            <div className="bg-white/5 backdrop-blur-lg rounded-lg p-12 border border-yellow-500/30 mb-8 max-w-5xl mx-auto">
              <div className="mb-8 text-center">
                <div className="inline-block bg-yellow-500/20 rounded-full px-6 py-3 mb-6">
                  <span className="text-yellow-400 font-bold font-mono text-lg">LIVE DEMO ABOVE ⬆️</span>
                </div>
                <p className="text-white/80 font-mono text-lg leading-relaxed text-left">
                  The 3D visualization above shows our system in action. Watch as the aircraft
                  intelligently navigates around geofenced buildings (marked with red grid lines),
                  automatically adjusting its route to maintain safe clearance.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="text-left">
                  <div className="text-yellow-400 font-bold font-mono mb-2">🟥 Red Grids</div>
                  <p className="text-white/70 font-mono text-sm">Geofenced restricted zones</p>
                </div>
                <div className="text-left">
                  <div className="text-yellow-400 font-bold font-mono mb-2">🟧 Orange Path</div>
                  <p className="text-white/70 font-mono text-sm">Safe flight route</p>
                </div>
                <div className="text-left">
                  <div className="text-yellow-400 font-bold font-mono mb-2">✈️ Aircraft</div>
                  <p className="text-white/70 font-mono text-sm">Real-time avoidance</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-5xl mx-auto">
              <button
                onClick={onOpenSimulator}
                className="px-10 py-5 bg-yellow-500 text-black rounded-lg font-bold text-lg hover:bg-yellow-600 transition shadow-lg font-mono"
              >
                Request Full Demo
              </button>
              <button
                onClick={() => setCurrentPage('contact')}
                className="px-10 py-5 bg-white/10 backdrop-blur text-white rounded-lg font-bold text-lg hover:bg-white/20 transition border border-white/30 font-mono"
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
                <h3 className="text-white font-bold text-xl mb-4 font-mono">AeroGrid</h3>
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
                      className="text-white/60 hover:text-yellow-400 transition font-mono text-sm"
                    >
                      How it Works
                    </button>
                  </li>
                  <li><a href="#" className="text-white/60 hover:text-yellow-400 transition font-mono text-sm">Features</a></li>
                  <li><a href="#" className="text-white/60 hover:text-yellow-400 transition font-mono text-sm">Pricing</a></li>
                </ul>
              </div>

              <div>
                <h4 className="text-white font-bold mb-4 font-mono">Company</h4>
                <ul className="space-y-2">
                  <li><a href="#" className="text-white/60 hover:text-yellow-400 transition font-mono text-sm">About Us</a></li>
                  <li>
                    <button
                      onClick={() => setCurrentPage('contact')}
                      className="text-white/60 hover:text-yellow-400 transition font-mono text-sm"
                    >
                      Contact
                    </button>
                  </li>
                  <li><a href="#" className="text-white/60 hover:text-yellow-400 transition font-mono text-sm">Careers</a></li>
                </ul>
              </div>

              <div>
                <h4 className="text-white font-bold mb-4 font-mono">Legal</h4>
                <ul className="space-y-2">
                  <li><a href="#" className="text-white/60 hover:text-yellow-400 transition font-mono text-sm">Privacy Policy</a></li>
                  <li><a href="#" className="text-white/60 hover:text-yellow-400 transition font-mono text-sm">Terms of Service</a></li>
                  <li><a href="#" className="text-white/60 hover:text-yellow-400 transition font-mono text-sm">Cookie Policy</a></li>
                </ul>
              </div>
            </div>

            <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center">
              <p className="text-white/60 font-mono text-sm">
                © 2025 AeroGrid Inc. All rights reserved.
              </p>
              <div className="flex gap-6 mt-4 md:mt-0">
                <a href="#" className="text-white/60 hover:text-yellow-400 transition font-mono text-sm">Twitter</a>
                <a href="#" className="text-white/60 hover:text-yellow-400 transition font-mono text-sm">LinkedIn</a>
                <a href="#" className="text-white/60 hover:text-yellow-400 transition font-mono text-sm">GitHub</a>
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