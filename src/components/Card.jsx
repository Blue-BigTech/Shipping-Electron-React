import React from 'react'

const Card = ({children, className}) => {
  return (
    <div className={`${className} rounded-lg bg-white p-4 overflow-scroll`}>{children}</div>
  )
}

export default Card