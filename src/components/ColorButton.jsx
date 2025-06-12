import React from 'react'

const ColorButton = ({ color, onClick }) => {
  return (
    <button
      className={`color-button ${color}`}
      onClick={() => onClick(color)}
      style={{ backgroundColor: color }}
    >
      {color.charAt(0).toUpperCase() + color.slice(1)}
    </button>
  )
}

export default ColorButton