import React from 'react'

const Card = (props, ref) => {
  return (
    <div ref={ref} className={`${props.className} rounded-lg bg-white p-4 overflow-scroll basis-0 grow`}>{props.children}</div>
  )
}

export default React.forwardRef(Card)