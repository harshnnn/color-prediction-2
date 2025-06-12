import { useState } from 'react'
import GameBoard from './components/GameBoard'
import './App.css'

function App() {
  const [bet, setBet] = useState(null)

  return (
    <div className="min-h-screen">
      <GameBoard bet={bet} setBet={setBet} />
    </div>
  )
}

export default App
