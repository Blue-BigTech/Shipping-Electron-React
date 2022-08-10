import React from 'react'
import { useState } from 'react'

const Dropdown = ({children, icon, text, textColorClass = "text-white", arrowColorClass = "text-blue-500",  className}) => {

    // Menu Open State
    const [dropdownOpen, setDropdownOpen] = useState(false);

    // Opens and closes dropdown
    const toggleDropdown = function () {
        setDropdownOpen(!dropdownOpen)
    }

    return (
        <div className={`relative select-none flex items-center gap-2 ${className}`}>
            {icon}
            <span className={`block ${textColorClass}`}>{text}</span>
            <i className={`bi ${ dropdownOpen ? "bi-caret-up-fill" : "bi-caret-down-fill"} ${arrowColorClass} cursor-pointer`} onClick={toggleDropdown}></i>
            <div className={`absolute left-0 top-6 w-full shadow-lg rounded py-2 bg-white ${!dropdownOpen && "hidden"}`}>
                <ul className='w-full' onClick={toggleDropdown}>
                    {children}
                </ul>
            </div>
        </div>
    )
}

export default Dropdown