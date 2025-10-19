import { useState } from 'react'
import DroneCityLanding from './DroneCityLanding'
import DroneSimulator from './DroneSimulator'

function App() {
  const [showSimulator, setShowSimulator] = useState(false)

  return (
    <>
      {!showSimulator ? (
        <DroneCityLanding onOpenSimulator={() => setShowSimulator(true)} />
      ) : (
        <>
          <DroneSimulator />
          {/* Button to go back */}
          <button
            onClick={() => setShowSimulator(false)}
            className="fixed top-8 right-8 z-50 bg-gray-800 hover:bg-gray-900 text-white font-bold py-3 px-5 rounded-lg shadow-xl transition-all"
          >
            ← Back to Landing
          </button>
        </>
      )}
    </>
  )
}

export default App
