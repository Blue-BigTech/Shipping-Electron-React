// React Imports
import React from 'react'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

// Component Imports
import Dropdown from "./Dropdown"
import Error from './Error'
import Loading from './Loading'

// Img Imports
import logoLight from "../images/logo-light.png"

const Layout = ({children, user, setUser}) => {

  // Layout States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Use search Params
  const [searchParams] = useSearchParams();

  // Init Navigate
  const navigate = useNavigate();

  // Logs user out
  const logout = async () => {
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
  const unlockOrder = async (orderID) => {

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

    // Error Handling
    if (!res.ok) {
        const errorRes = await res.json();
        const errorMessage = errorRes.error;
        setError(errorMessage)
        return false
    }

    // Navigate to sign in
    navigate("/sign-in")

  }

  return (
    <div className='flex flex-col h-screen'>
        <div className="bg-blue-500 py-4 px-12 flex justify-between">
            <img src={logoLight} alt="" width={150} height={75} />
            <Dropdown arrowColorClass='text-white' icon={<i className="bi bi-person-fill text-white"></i>} text={user.Username}>
                <li onClick={logout} className='cursor-pointer hover:bg-gray-200 transition duration-300 pl-4 p-1 select-none'>
                  Sign Out
                </li>
          </Dropdown>
        </div>
        <div className="p-6 px-20 flex flex-1" style={{backgroundColor: "#F3F5F5"}}>

          {/* Render error message */}
          { error && <Error message={error} onClick={logout} buttonText="Back to sign in"></Error> }

          {/* Render Loading */}
          {loading && !error && <Loading></Loading>}

          {/* Render Children */}
          {!loading && !error && children}


        </div>
    </div>
  )
}

export default Layout