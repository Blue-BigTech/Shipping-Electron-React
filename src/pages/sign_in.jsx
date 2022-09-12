// React imports
import React from 'react'
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Img imports
import computerIconWhiteLines from "../images/computerIconWhiteLines.png"
import logoDark from "../images/logo-dark.png"

const SignInPage = ({ setUser }) => {

    // Component States
    const [loginFormError, setLoginFormError] = useState("");
    const [buttonLoading, setButtonLoading] = useState(false);
    const [passwordShowing, setPasswordShowing] = useState(false);

    // Init Navigate
    const navigate = useNavigate();

    // Function to login
    const login = async (e) => {

        // Prevent Default Form Submission
        e.preventDefault();

        // Set button loading
        setButtonLoading(true)

        // Call to electron backend to get user from HQ
        const res = await fetch(`${process.env.REACT_APP_HQ_SHIPPING_ADDRESS}/user`, {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "X-API": process.env.REACT_APP_HQ_SHIPPING_X_API_KEY,
                "X-Real-IP": process.env.REACT_APP_HQ_SHIPPING_X_REAL_IP
            },
            method: "POST",
            body: `username=${encodeURIComponent(e.target[0].value)}&password=${encodeURIComponent(e.target[1].value)}`
        })



        // Error Handle
        if (!res.ok) {
            const errorRes = await res.json();
            const errorMessage = errorRes.error;
            if (await errorMessage && (errorMessage === "pg: no rows in result set" || errorMessage === "username or password is incorrect.")) {
                setLoginFormError("Incorrect Username or Password.")
            } else {
                setLoginFormError("Uh oh. An error has occured. Please try again later.")
            }

            setButtonLoading(false)
            return
        }


        // Set User
        const userData = await res.json();
        setUser(userData)

        // Set user to localstorage so that if the page gets refreshed, user is still logged in
        localStorage.setItem("user", JSON.stringify(userData))

        // Navigate to scan page if it isn't already there
        navigate("/scan")

    }

    // Handles toggle password showing
    const togglePasswordShowing = () => {
        setPasswordShowing(!passwordShowing)
    }

    return (
    <div className='relative w-screen h-screen'>
        <div className="w-full h-full">
            <img src={logoDark} alt="" className="absolute left-8 top-8 h-10" />
            <form className='left-40 absolute top-60' onSubmit={login}>
                <h3 className="text-3xl w-full font-semibold">Sign In</h3>
                <ul className={`list-none bg-red-400 text-white p-3 rounded w-full my-2 ${!loginFormError && "hidden" }`}>{loginFormError}</ul>
                <input type="text" className="w-96 my-8 border-b border-black h-8 p-1 py-4 focus:outline-none block" placeholder='Username' name='username' />
                
                <div className='w-full flex items-center justify-between w-96 my-8 border-b border-black h-8 p-1 py-4'>
                    <input type={passwordShowing ? "text" : "password"} className="block flex-1 focus:outline-none h-8" placeholder='Password' name='password' />
                    {/* eyeball toggle */}
                    <i onClick={togglePasswordShowing} className={`cursor-pointer bi ${ passwordShowing ? "bi-eye" : "bi-eye-slash" }`}></i>
                </div>

                <button type="submit" className="bg-blue-500 hover:bg-blue-400 cursor-pointer rounded py-2 w-96 flex items-center justify-center my-4 text-white font-light transition duration-300" disabled={buttonLoading}>
                    {buttonLoading ? (<img src="https://www.ekathimerini.com/wp-content/themes/nxtheme/images/loading.gif" className='h-6' alt="loading" />) : "Sign In"}
                </button>
            </form>
        </div>
        <div className="bg-blue-500 flex justify-end absolute top-0 right-0 z-1 w-full h-full" style={{clipPath: "polygon(40% 0%, 100% 0, 100% 100%, 60% 100%)"}}>
            <h3 className="top-40 right-40 absolute text-white text-4xl max-w-md text-center tracking-wider">
                All orders in one place for you and your team
            </h3>
            <img src={computerIconWhiteLines} className='w-80 h-80 absolute right-56 top-80' alt="" />
        </div>
    </div>
    )
}

export default SignInPage