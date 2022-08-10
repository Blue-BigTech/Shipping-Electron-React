// React Imports
import React from 'react'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

// Component Imports
import Dropdown from "./Dropdown"
import Error from './Error'
import Loading from './Loading'

const Layout = ({children, user, setUser}) => {

  // Layout States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Use search Params
  const [searchParams] = useSearchParams();

  // Init Navigate
  const navigate = useNavigate();

  // Logs user out
  const logout = async function () {
    setLoading(true)

    const orderID = searchParams.get("order_id")
    if (orderID) {
      const ok = await unlockOrder(parseInt(orderID))
      if (!ok) {
        setLoading(false)
        return
      }
    }

    localStorage.removeItem("user")
    setUser();
    setLoading(false)

  }


  // Unlocks order when user goes back to tote page
  async function unlockOrder(orderID){

    // Unlock Order
    const res = await fetch(`${process.env.REACT_APP_HQ_SHIPPING_ADDRESS}/unlock-order`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-API": process.env.REACT_APP_HQ_SHIPPING_X_API_KEY,
            "X-Real-IP": process.env.REACT_APP_HQ_SHIPPING_X_REAL_IP
        },
        body: JSON.stringify({
            order_id: orderID,
            user_id: user.ID
        })
    })

    if (!res.ok) {
        const errorRes = await res.json();
        const errorMessage = errorRes.error;
        setError(errorMessage)
        return false
    }

    navigate("/sign-in")

  }

  if (error) {
    return (
      <div className='flex items-strech flex-col'>
      <div className="bg-blue-500 w-full sticky py-4 px-12 flex items-center justify-between text-white">
          <img src="/images/logo-light.png" alt="" width={150} height={75} />
          <Dropdown arrowColorClass='text-white' icon={<i className="bi bi-person-fill text-white"></i>} text={user.Username}>
              <li className="w-full">
                <button className="w-full text-black text-left cursor-pointer hover:bg-gray-200 transition duration-300 pl-4 p-1 select-none" onClick={logout}>Sign Out</button>
              </li>
        </Dropdown>
      </div>
      <div className="p-12 md:px-32 grow" style={{backgroundColor: "#F3F5F5"}}>
        <Error message={error} linkPath="/sign-in" linkText="Back to sign in"></Error>
      </div>
  </div>
    )
  }

  if (loading) {
    return (
      <div className='flex items-strech flex-col h-full'>
        <div className="bg-blue-500 w-full sticky py-4 px-12 flex items-center justify-between text-white">
            <img src="/images/logo-light.png" alt="" width={150} height={75} />
            <Dropdown arrowColorClass='text-white' icon={<i className="bi bi-person-fill text-white"></i>} text={user.Username}>
                <li className="w-full">
                  <button className="w-full text-black text-left cursor-pointer hover:bg-gray-200 transition duration-300 pl-4 p-1 select-none" onClick={logout}>Sign Out</button>
                </li>
          </Dropdown>
        </div>
        <div className="p-12 md:px-32 grow" style={{backgroundColor: "#F3F5F5"}}>
          <Loading></Loading>
        </div>
    </div>
    )
  }

  return (
    <div className='flex items-strech flex-col h-full'>
        <div className="bg-blue-500 w-full sticky py-4 px-12 flex items-center justify-between text-white">
            <img src="/images/logo-light.png" alt="" width={150} height={75} />
            <Dropdown arrowColorClass='text-white' icon={<i className="bi bi-person-fill text-white"></i>} text={user.Username}>
                <li className="w-full">
                  <button className="w-full text-black text-left cursor-pointer hover:bg-gray-200 transition duration-300 pl-4 p-1 select-none" onClick={logout}>Sign Out</button>
                </li>
          </Dropdown>
        </div>
        <div className="p-12 md:px-32 grow" style={{backgroundColor: "#F3F5F5"}}>{children}</div>
    </div>
  )
}

export default Layout