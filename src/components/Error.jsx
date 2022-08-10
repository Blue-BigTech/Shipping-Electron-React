// React Imports
import React from 'react'
import { Link } from 'react-router-dom'

const Error = ({message, linkPath, linkText}) => {
  return (
    <div className="w-full h-full flex items-center justify-center">
        <div>
            <img src="/images/errorIcon.png" className='w-60 mx-auto' alt="" />
            <p className="text-center text-xl text-red-600 mx-auto">Whoops, an error has occured: {message}</p>
            <Link to={linkPath} className='hover:text-blue-500 transition duration-300 text-lg text-center mx-auto block my-2 underline'>{linkText}</Link>
        </div>
    </div>
  )
}

export default Error