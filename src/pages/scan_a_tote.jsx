// React Imports
import React from 'react'
import Popup from 'reactjs-popup';
import 'reactjs-popup/dist/index.css';
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom';

// Img Imports
import computerIconBlueLines from "../images/computerIconBlueLines.png"

const ScanATotePage = ({ user }) => {

    // Init Navigate
    const navigate = useNavigate();
    
    // Component states
    const [formError, setFormError] = useState("");
    const [formLoading, setFormLoading] = useState(true);

    // Check if the user already has an order locked
    useEffect(() => {
        getPreviouslyLockedOrder()
    });

    // Gets previously locked order and redirects to that page
    async function getPreviouslyLockedOrder () {

         // Check for previously locked order
         const res = await fetch(`${process.env.REACT_APP_HQ_SHIPPING_ADDRESS}/user-get-locked-order`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API": process.env.REACT_APP_HQ_SHIPPING_X_API_KEY,
                "X-Real-IP": process.env.REACT_APP_HQ_SHIPPING_X_REAL_IP
            },
            body: JSON.stringify({
                user_id: user.ID
            })
        })

        
        if (!res.ok) {
            const errorRes = await res.json();
            const errorMessage = errorRes.error;
            setFormError(errorMessage)
            setFormLoading(false);
            return
        }

        // Parse Data
        const lockedOrder = await res.json();

        // If order is already locked, navigate there
        if (lockedOrder && lockedOrder.ID) {
            navigate(`/order?order_id=${lockedOrder.ID}`)
        }

        // Turn loading off
        setFormLoading(false);
    }

    // Lock order and then go to order page
    async function lockOrder(orderID){

        // clear form error
        setFormError("")

        // set form loading
        setFormLoading(true);
        
        // Data validation
        if (!orderID) {
            setFormError("Order Number is a required field and must be a whole number.")
            setFormLoading(false);
            return
        }

        // Lock Order
        const res = await fetch(`${process.env.REACT_APP_HQ_SHIPPING_ADDRESS}/lock-order`, {
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
            setFormError(errorMessage)
            setFormLoading(false);
            return
        }

        navigate(`/order?order_id=${orderID}`)

    }

    return (
        <div className='max-w-2xl mx-auto flex items-center justify-center flex-col text-centered'>
            <h2 className="text-3xl my-4 tracking-wider">Scan a tote</h2>
            <p className="my-4 font-light tracking-wide">or</p>
            <Popup modal trigger={<button className="bg-blue-500 hover:bg-blue-400 rounded text-white py-3 font-extralight transition duration-300 px-16 text-xl cursor-pointer my-4">Enter an order</button>} position="center">
            {close => (
                <div className="relative">
                    <div className={`absolute left-0 top-0 w-full h-full bg-white flex items-center justify-center ${!formLoading && "hidden"}`}>
                        <img src="https://www.uttf.com.ua/assets/images/loader2.gif" alt="" />
                    </div>
                    <div className='px-8'>
                        <div className="w-full flex items-center justify-between my-4">
                            <h3 className="text-2xl">Enter an order</h3>
                            <button className="close text-3xl" onClick={close}>
                                &times;
                            </button>
                        </div>
                        <form action="/order" onSubmit={(event) => { 
                            event.preventDefault();
                            lockOrder(parseInt(event.target.order_id.value));
                        }}>
                            <div className={`w-full bg-red-400 text-white rounded p-2 flex items-center px-4 ${!formError && "hidden"}`}>{formError}</div>
                            <div className='mt-8 mb-4 w-full'>
                                <label htmlFor="order_id" className='w-full flex items-center justify-start font-light text-sm'>Order Number</label>
                                <input type="text" name='order_id' className='p-2 border border-lightgray rounded-lg w-full focus:outline-none' />
                            </div>
                            <div className="my-4 w-full flex items-center justify-end">
                                <div className="bg-white text-black font-extralight p-2 px-6 rounded hover:bg-gray-200 cursor-pointer transition duration-300 mx-2" onClick={close}>
                                    Cancel
                                </div>
                                <button type='submit' className="bg-blue-500 hover:bg-blue-400 rounded text-white p-2 font-extralight transition duration-300 px-6 cursor-pointer">Submit</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            </Popup>
            <img src={computerIconBlueLines} alt="" className='w-80 mt-20' />
            <div className="absolute bg-blue-500 w-96 h-96 left-0 top-56" style={{clipPath: "ellipse(35% 50% at left)", width: "600px", height: "500px"}}></div>
        </div>
    )
}

export default ScanATotePage