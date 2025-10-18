interface HowItWorksProps {
  onBack: () => void;
}

const HowItWorks = ({ onBack }: HowItWorksProps) => {
  return (
    <div className="fixed inset-0 w-full h-full bg-black/95 z-50 overflow-y-auto">
      <div className="min-h-full px-8 py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-12">
          <div className="text-white text-2xl font-bold tracking-wider font-mono">
            SKYGUARD AI
          </div>
          <button
            onClick={onBack}
            className="text-white hover:text-orange-400 transition font-mono"
          >
            ← Back to Home
          </button>
        </div>

        {/* Content */}
        <div className="max-w-5xl mx-auto">
          <h1 className="text-5xl font-bold text-white mb-8 font-mono">
            How It <span className="text-orange-400">Works</span>
          </h1>

          {/* Step 1 */}
          <div className="mb-12 bg-white/5 backdrop-blur-lg rounded-lg p-8 border border-white/10">
            <div className="flex items-start gap-6">
              <div className="text-6xl font-bold text-orange-400 font-mono">1</div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-4 font-mono">Geofence Detection</h2>
                <p className="text-white/80 text-lg leading-relaxed font-mono">
                  Our AI system continuously monitors the airspace using real-time 3D grid mapping.
                  Red grid lines indicate restricted zones around buildings and critical infrastructure.
                  The system detects these geofenced areas instantly.
                </p>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="mb-12 bg-white/5 backdrop-blur-lg rounded-lg p-8 border border-white/10">
            <div className="flex items-start gap-6">
              <div className="text-6xl font-bold text-orange-400 font-mono">2</div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-4 font-mono">Intelligent Routing</h2>
                <p className="text-white/80 text-lg leading-relaxed font-mono">
                  When approaching a geofenced zone, the system calculates safe alternative routes.
                  Orange flight paths show optimized trajectories that avoid all restricted areas
                  while maintaining efficiency.
                </p>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="mb-12 bg-white/5 backdrop-blur-lg rounded-lg p-8 border border-white/10">
            <div className="flex items-start gap-6">
              <div className="text-6xl font-bold text-orange-400 font-mono">3</div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-4 font-mono">Automatic Avoidance</h2>
                <p className="text-white/80 text-lg leading-relaxed font-mono">
                  Aircraft and drones automatically divert from restricted zones without manual intervention.
                  The system executes smooth avoidance maneuvers, climbing or turning as needed to maintain
                  safe clearance from all geofenced areas.
                </p>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="mb-12 bg-white/5 backdrop-blur-lg rounded-lg p-8 border border-white/10">
            <div className="flex items-start gap-6">
              <div className="text-6xl font-bold text-orange-400 font-mono">4</div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-4 font-mono">Continuous Monitoring</h2>
                <p className="text-white/80 text-lg leading-relaxed font-mono">
                  The AI fallback system remains engaged throughout the entire flight, constantly monitoring
                  for new geofences, changes in airspace restrictions, and potential hazards. Real-time
                  adjustments ensure maximum safety at all times.
                </p>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="mt-16">
            <h2 className="text-3xl font-bold text-white mb-8 font-mono">Key Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/5 backdrop-blur-lg rounded-lg p-6 border border-white/10">
                <h3 className="text-xl font-bold text-orange-400 mb-3 font-mono">Real-Time Processing</h3>
                <p className="text-white/70 font-mono">
                  Lightning-fast detection and response times ensure immediate reaction to geofence boundaries.
                </p>
              </div>
              <div className="bg-white/5 backdrop-blur-lg rounded-lg p-6 border border-white/10">
                <h3 className="text-xl font-bold text-orange-400 mb-3 font-mono">3D Spatial Awareness</h3>
                <p className="text-white/70 font-mono">
                  Complete understanding of airspace in all three dimensions for precise navigation.
                </p>
              </div>
              <div className="bg-white/5 backdrop-blur-lg rounded-lg p-6 border border-white/10">
                <h3 className="text-xl font-bold text-orange-400 mb-3 font-mono">Smooth Transitions</h3>
                <p className="text-white/70 font-mono">
                  Gradual, safe maneuvers that prioritize passenger comfort and flight stability.
                </p>
              </div>
              <div className="bg-white/5 backdrop-blur-lg rounded-lg p-6 border border-white/10">
                <h3 className="text-xl font-bold text-orange-400 mb-3 font-mono">AI-Powered</h3>
                <p className="text-white/70 font-mono">
                  Machine learning algorithms continuously improve route optimization and safety protocols.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;
