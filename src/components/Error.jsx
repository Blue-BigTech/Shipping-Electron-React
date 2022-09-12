// React Imports
import React from 'react'

// Component Imports
import Card from './Card'
import Popup from 'reactjs-popup'

const Error = ({message, buttonText, onClick}) => {

  const convertErrorMessage = (errorMessage) => {
    
    return errorMessage

  }

  return (
    <div className="mx-auto flex items-center">
        <Card className="px-10">
            <div className="text-4xl font-semibold text-center p-8">OOPS, There's been an error!</div>
            <p className="text-center text-xl text-red-600">{convertErrorMessage(message)}</p>

            {/* more details popup */}
            <Popup trigger={<button className="text-center text-xl text-blue-600 w-full my-4">More Details</button>} modal>
              <p className='w-full text-center'>{message}</p>
            </Popup>

            <div className='text-lg flex justify-center my-4'>
              <div onClick={onClick} className='bg-blue-500 p-3 text-white rounded font-light px-6 hover:bg-blue-400 transition cursor-pointer'>
                {buttonText}
              </div>
            </div>
        </Card>
    </div>
  )
}

export default Error