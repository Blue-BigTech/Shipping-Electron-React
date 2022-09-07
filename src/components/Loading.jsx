import React from 'react'

import loader from '../images/loading.gif'

const Loading = () => {
  return (
    <div className='w-full h-full flex items-center justify-center'>
        <img src={loader} alt="" />
    </div>
  )
}

export default Loading