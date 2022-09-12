// React imports
import React from 'react'
import { useSearchParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from 'react';

// Component Import
import Dropdown from "../components/Dropdown"
import Card from "../components/Card"
import Error from '../components/Error';
import Loading from '../components/Loading';
import Popup from 'reactjs-popup';

// Img imports
import placeholderImage from "../images/placeholderItemImage.png"
import loader from "../images/loading.gif"

// Electron imports
const { ipcRenderer, shell } = window.require("electron");


const OrderPage = ({user}) => {

    // Init Navigate Function
    const navigate = useNavigate();

    // Component States
    const [order, setOrder] = useState(null);
    const [orderError, setOrderError] = useState("");
    const [loading, setLoading] = useState(true);
    const [orderWeight, setOrderWeight] = useState(0);
    const [orderBoxID, setOrderBoxID] = useState(null);
    const [orderItemsPackedStatus, setOrderItemsPackedStatus] = useState([]);
    const [printers, setPrinters] = useState([]);
    const [selectedPrinter, setSelectedPrinter] = useState("");
    let barcodeScan = "";

    // Shipping To Form States
    const [shipToFormLoading, setShipToFormLoading] = useState(false);
    const [shippingFormError, setShippingFormError] = useState("");
    
    //  Shipping Rates Popup States
    const [shippingRates, setShippingRates] = useState(null);
    const [shippingRatesError, setShippingRatesError] = useState("");
    const [selectedRate, setSelectedRate] = useState("");
    const [shippingRatesPopupLoading, setShippingRatesPopupLoading] = useState(false);
    const [shippingRatesPopupOpen, setShippingRatesPopupOpen] = useState(false);

    // Shipments States
    const [shipmentsLoading, setShipmentsLoading] = useState(false);
    const [shipments, setShipments] = useState(null);

    // Flag for error state
    const [flaggedError, setFlaggedError] = useState("");

    // Use Search Params
    const [searchParams] = useSearchParams();

    // Refs
    const weightInputRef = useRef();
    const boxContainerRef = useRef();

    // useEffect Hooks for page

    // Get Initial Data On Page Load Function
    useEffect(() => {

        

        // Get Initial Data On Page Load Function
        async function getInitialPageData () {

            // Set Page To Loading
            setLoading(true);

            // Request all available printers
            fetchPrinters();

            // FETCH DATA

            /*
                I'm fetching first, then setting the data here 
                as a way to make multiple requests at once and speed up the requests
            */

            // Get Order ID
            const orderID = searchParams.get("order_id")

            // Fetch Order
            const fetchedOrder = await fetchOrder(orderID)
            // Fetch Shipments
            const fetchedShipments = await fetchShipments(fetchedOrder.ID);

            
            // Set Order into state
            if (!fetchedOrder && !orderError) {
                setOrderError("An error has occured while fetching the order. Try again later.")
                return;
            }
            setOrder(fetchedOrder);


            // Set shipments into state
            setShipments(fetchedShipments);

            // Weight Validation
            if (!fetchedOrder.EstimatedWeight || fetchedOrder.EstimatedWeight === "0") {
                setOrderError("This order doesn't have a weight. Please set in the error bin, and notify Brian.")
                return
            }

            // SET DATA INTO STATES AFTER FETCHING


            // Set Order Weight
            setOrderWeight(fetchedOrder.EstimatedWeight);
            

            // Set Order items Packed Status
            if (orderItemsPackedStatus.length < 1) {
                const initialOrderItemsPackedStatus = [];
                let orderItemScanned = false;
                for (let i = 0; i < fetchedOrder.Items.length; i++) {

                    // set packed true if order Item ID was scanned
                    if (fetchedOrder.Items[i].ID.toString() === orderID && !orderItemScanned) {

                        
                        initialOrderItemsPackedStatus.push({
                            index: `${i}`,
                            id: fetchedOrder.Items[i].ID,
                            packed: true
                        })

                        for (let j = 0; j < parseInt(fetchedOrder.Items[i].Quantity) - 1; j++) {
                            initialOrderItemsPackedStatus.push({
                                index: `${i}-${j}`,
                                id: fetchedOrder.Items[i].ID,
                                packed: false
                            })
                        }

                        orderItemScanned = true;

                        continue;
                    }

                    for (let j = 0; j < parseInt(fetchedOrder.Items[i].Quantity); j++) {
                        initialOrderItemsPackedStatus.push({
                            index: `${i}-${j}`,
                            id: fetchedOrder.Items[i].ID,
                            packed: false
                        })
                    }
                }

                setOrderItemsPackedStatus(initialOrderItemsPackedStatus)
            }

            // Set Order Box ID
            if (!orderBoxID) {
                for (let i = 0; i < fetchedOrder.Boxes.length; i++) {
                    if (fetchedOrder.Boxes[i].SuggestedBox) {
                        setOrderBoxID(fetchedOrder.Boxes[i].ID);
                        break;
                    }
                }
            }

            // Turn off loading screen
            setLoading(false);

        }

        // Run Function
        getInitialPageData();

    }, []);

     // Listens for and handles barcode scan
     useEffect(() => {

        // Handles Keydown
        function handleKeyDown (e) {
            
            // If keyCode is 13 (enter) then check if there are barcode scan keys and if there are handle barcode scan
            if (e.keyCode === 13 && barcodeScan.length > 3) {
                handleBarcodeScan(barcodeScan, orderItemsPackedStatus)
                return
            }

            // Skip if pressed key is shift key
            if (e.keyCode === 16) {
                return
            }

            // Push Keycode to barcode scan variable
            barcodeScan += e.key;

            // Set Timeout to clear state
            setTimeout(() => {
                barcodeScan = ""
            }, 110)

        }
        
        // Adds event listener to page for keydown
        document.addEventListener('keydown', handleKeyDown)

        // Don't forget to clean up
        return function cleanup() {
            document.removeEventListener('keydown', handleKeyDown);
        }
    }, [orderWeight, orderItemsPackedStatus, orderBoxID, selectedPrinter, shipments])


    // API CALL FUNCTIONS

    // Fetches an order by Order ID
    const fetchOrder = async (orderID) => {

        // Error Handle validation
        if (!orderID) {
            setOrderError("You cannot fetch an order without the parameter orderID.")
            return;
        }

        // Fetch Order
        const res = await fetch(`${process.env.REACT_APP_HQ_SHIPPING_ADDRESS}/order/${orderID}`, {
            headers: {
                "X-API": process.env.REACT_APP_HQ_SHIPPING_X_API_KEY,
                "X-Real-IP": process.env.REACT_APP_HQ_SHIPPING_X_REAL_IP
            }
        })

        // Error handle response
        if (!res.ok) {
            const errorRes = await res.json();
            const errorMessage = errorRes.error;
            setOrderError(errorMessage)

            // unlock order
            postUnlockOrder(orderID)

            return
        }


        // Parse data
        const orderData = await res.json();

        // Return Data
        return orderData;
        
    }

    // Fetches Shipments By Order ID
    const fetchShipments = async (orderID) => {
        
        // Validate orderID parameter
        if (!orderID) {
            setOrderError("Unable to fetch shipments without an orderID parameter");
            return;
        }

        // Fetch Shipments from HQ
        const res = await fetch(`${process.env.REACT_APP_HQ_SHIPPING_ADDRESS}/order/${orderID}/shipments`, {
            headers: {
                "X-API": process.env.REACT_APP_HQ_SHIPPING_X_API_KEY,
                "X-Real-IP": process.env.REACT_APP_HQ_SHIPPING_X_REAL_IP
            }
        })

        // Handle Errors in response
        if (!res.ok) {
            const errorRes = await res.json();
            const errorMessage = errorRes.error;
            setOrderError(errorMessage)
            return
        }

        // return Shipments
        const fetchedShipments = await res.json()
        return fetchedShipments;

    }

    // Fetches Printers from electron
    const fetchPrinters = () => {

        // Send Request for printers
        ipcRenderer.send("get-printer-list");

        // Set listener for receiving printer list
        ipcRenderer.on("get-printer-list-reply", (event, printerList) => {

            // Set the printer list
            setPrinters(printerList)

            // Set default printer as selected for first time fetching printers
            if (!selectedPrinter) {
                for (let i = 0; i < printerList.length; i++) {
                    if (printerList[i].isDefault) {
                        setSelectedPrinter(printerList[i])
                    }
                }
            }

        })

        return;

    }

    // Fetches Shipping Rates Based on Current Info
    const fetchShippingRates = async (orderID, orderWeightToFetch, orderBoxIDToFetch) => {

        // Validate Params

        // orderID
        if (!orderID) {
            alert("Unable to fetch shipping rates without orderID parameter.");
            return;
        }

        // orderWeightToFetch
        if (!orderWeightToFetch) {
            alert("Unable to fetch shipping rates without orderWeightToFetch parameter.");
            return;
        }

        // orderBoxIDToFetch
        if (!orderBoxIDToFetch) {
            alert("Unable to fetch shipping rates without orderBoxIDToFetch parameter.");
            return;
        }

        // Fetch Shipping Rates
        const res = await fetch(`${process.env.REACT_APP_HQ_SHIPPING_ADDRESS}/get-rates`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API": process.env.REACT_APP_HQ_SHIPPING_X_API_KEY,
                "X-Real-IP": process.env.REACT_APP_HQ_SHIPPING_X_REAL_IP
            },
            body: JSON.stringify({
                order_id: orderID,
                weight: parseFloat(orderWeightToFetch),
                box_id: parseInt(orderBoxIDToFetch) 
            })
        })

        // Handle Response Error
        if (!res.ok) {
            const errorRes = await res.json();
            const errorMessage = errorRes.error;
            setShippingRatesError(errorMessage)
            return
        }

        // Parse and Return Shipping Rates
        const fetchedShippingRatesRes = await res.json()
        return fetchedShippingRatesRes.Rates;
    }

    // Makes request to HQ to unlock order
    const postUnlockOrder = async (orderID) => {

        // Order ID parameter validation
        if (!orderID) {
            setOrderError("Unable to unlock order without orderID parameter.");
            return;
        }

        // Unlock Order Request to HQ
        const res = await fetch(`${process.env.REACT_APP_HQ_SHIPPING_ADDRESS}/unlock-order`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API": process.env.REACT_APP_HQ_SHIPPING_X_API_KEY,
                "X-Real-IP": process.env.REACT_APP_HQ_SHIPPING_X_REAL_IP
            },
            body: JSON.stringify({
                order_id: parseInt(orderID),
                user_id: user.ID
            })
        })

        // Error Handle in response
        if (!res.ok) {
            const errorRes = await res.json();
            const errorMessage = errorRes.error;
            setOrderError(errorMessage)
            return
        }

    }

    // Fetches an existing label based on a shipment ID
    const fetchExistingLabel = async (shipmentID) => {

        // Parameter Validation
        if (!shipmentID) {
            setOrderError("Unable to view fetch an existing label without a shipmentID");
            return;
        }

        // Fetch Label
        const res = await fetch(`${process.env.REACT_APP_HQ_SHIPPING_ADDRESS}/view-label/${shipmentID}`, {
            headers: {
                "X-API": process.env.REACT_APP_HQ_SHIPPING_X_API_KEY,
                "X-Real-IP": process.env.REACT_APP_HQ_SHIPPING_X_REAL_IP
            }
        })

        // Handle response error
        if (!res.ok) {
            const errorRes = await res.json();
            const errorMessage = errorRes.error;
            setOrderError(errorMessage)
            return
        }

        const labelRes = await res.json()
        return labelRes.URL;

    }

    // Makes Request to HQ to update shipping address
    const postUpdateShippingAddress = async (newAddressData) => {

        // Make Request to change address
        const res = await fetch(`${process.env.REACT_APP_HQ_SHIPPING_ADDRESS}/edit-address`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API": process.env.REACT_APP_HQ_SHIPPING_X_API_KEY,
                "X-Real-IP": process.env.REACT_APP_HQ_SHIPPING_X_REAL_IP
            },
            body: JSON.stringify(newAddressData)
        });

        // Error Handle
        if (!res.ok) {
            const errorRes = await res.json();
            const errorMessage = errorRes.error;
            setShippingFormError(errorMessage)
            return
        }

    }

    // Makes Request to update Carrier Method
    const postUpdateCarrierMethod = async (orderID, selectedCarrier, selectedMethod) => {

        // Validate Parameters
        
        // orderID
        if (!orderID) {
            setShippingRatesError("Unable to update carrier method without orderID parameter.");
            return;
        }

        // selectedCarrier
        if (!selectedCarrier) {
            setShippingRatesError("Unable to update carrier method without selectedCarrier parameter.");
            return;
        }

        // selectedMethod
        if (!selectedMethod) {
            setShippingRatesError("Unable to update carrier method without selectedMethod parameter.");
            return;
        }

        // Make Request to Update Carrier Method
        const res = await fetch(`${process.env.REACT_APP_HQ_SHIPPING_ADDRESS}/update-carrier-method`, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                "X-API": process.env.REACT_APP_HQ_SHIPPING_X_API_KEY,
                "X-Real-IP": process.env.REACT_APP_HQ_SHIPPING_X_REAL_IP
            },
            body: JSON.stringify({
                order_id: orderID,
                carrier: selectedCarrier,
                method: selectedMethod
            })
        })

        // Error Handle Response
        if (!res.ok) {
            const errorRes = await res.json();
            const errorMessage = errorRes.error;
            setShippingRatesError(errorMessage)
            return
        }


    }

    // Makes Request To Void Label by ShipmentID
    const postVoidLabel = async (shipmentID) => {

        // Parameter Validation
        if (!shipmentID) {
            alert("Unable to void label without parameter shipmentID");
            return;
        }

        // Make request to void label
        const res = await fetch(`${process.env.REACT_APP_HQ_SHIPPING_ADDRESS}/get-refund`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API": process.env.REACT_APP_HQ_SHIPPING_X_API_KEY,
                "X-Real-IP": process.env.REACT_APP_HQ_SHIPPING_X_REAL_IP
            },
            body: JSON.stringify({
                shipment_id: shipmentID
            })
        })

        // Handle Errors in response
        if (!res.ok) {
            const errorRes = await res.json();
            const errorMessage = errorRes.error;
            setOrderError(errorMessage)
        }

    }

    // Makes Request to purchase new label
    const postPurchaseLabel = async (orderID, weight, boxID, userID) => {

        // Parameter Validation

        // orderID
        if (!orderID) {
            alert("Unable to purchase label without orderID parameter.");
            return;
        }

        // weight
        if (!weight) {
            alert("Unable to purchase label without weight parameter.");
            return;
        }

        // boxID
        if (!boxID) {
            alert("Unable to purchase label without boxID parameter.");
            return;
        }

        // userID
        if (!userID) {
            alert("Unable to purchase label without userID parameter.");
            return;
        }

        // Make Request to purchase label
        const res = await fetch(`${process.env.REACT_APP_HQ_SHIPPING_ADDRESS}/get-label`, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                "X-API": process.env.REACT_APP_HQ_SHIPPING_X_API_KEY,
                "X-Real-IP": process.env.REACT_APP_HQ_SHIPPING_X_REAL_IP
            },
            body: JSON.stringify({
                order_id: parseInt(orderID),
                weight: parseFloat(weight),
                box_id: parseInt(boxID),
                user_id: parseInt(userID)
            })
        })

        // Error Handle Response
        if (!res.ok) {
            const errorRes = await res.json();
            const errorMessage = errorRes.error;
            setOrderError(errorMessage)
            return
        }


        // Parse and return Label Response
        const labelRes = await res.json()
        return labelRes.label_url;

    }

    // Make Request to flag for error
    const postFlagError = async (orderID, errorMessage) => {
        
        // Parameter Validation
        if (!orderID) {
            alert("Unable to flag error without orderID parameter.");
            return;
        }

        if (!errorMessage) {
            alert("Unable to flag error without errorMessage parameter.");
            return;
        }

        // Make Request to flag error
        const res = await fetch(`${process.env.REACT_APP_HQ_SHIPPING_ADDRESS}/report-error`, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                "X-API": process.env.REACT_APP_HQ_SHIPPING_X_API_KEY,
                "X-Real-IP": process.env.REACT_APP_HQ_SHIPPING_X_REAL_IP
            },
            body: JSON.stringify({
                order_id: parseInt(orderID),
                user_id: parseInt(user.ID),
                error_note: errorMessage
            })

        })

        // Error Handle Response
        if (!res.ok) {
            const errorRes = await res.json();
            const errorMessage = errorRes.error;
            setOrderError(errorMessage)
            return
        }

    }

    // ACTION HANDLE FUNCTIONS


    // Selects Box
    const handleBoxSelect = (event) => {

        // Set new Box
        setOrderBoxID(event.target.value);

        // Scroll to top of box container
        boxContainerRef.current.scrollTop = 0;

    }

    // Print Label
    const handlePrintLabel = async () => {

        // Loop through shipments -- if one is not voided, ship that
        if (shipments) {
            for (let i = 0; i < shipments.length; i++) {
                if (!shipments[i].Voided) {

                    // If Shipment isn't voided fetch label and print
                    const existingLabelURL = await fetchExistingLabel(shipments[i].ID);    

                    // print label if it exists
                    if (existingLabelURL) {
                        ipcRenderer.send("print-label", JSON.stringify({URL: existingLabelURL, printerName: selectedPrinter.name}))
                    }

                    // return so other label doesn't get printed
                    return;

                }
            }
        }

        // If all existing shipments are voided, purchase label (which creates shipment), print label, and update shipments

        // Set shipments loading
        setLoading(true);

        // Purchase Label
        const newLabelURL = await postPurchaseLabel(order.ID, orderWeight, orderBoxID, user.ID);

        // print label if it exists
        if (newLabelURL) {
            ipcRenderer.send("print-label", JSON.stringify({URL: newLabelURL, printerName: selectedPrinter.name}))
        }

        // Update Shipments
        const fetchedShipments = await fetchShipments(order.ID);
        setShipments(fetchedShipments)

        // Set shipments to not loading
        setLoading(false);
    }

    // Unlocks order when user goes back to tote page
    const handleBackToTotePageClick = async () => {

        // Set Screen Loading
        setLoading(true);

        // Unlock Order
        if (order && order.ID) {
            await postUnlockOrder(order.ID);
        }

        // Navigate back to tote page
        navigate("/scan")

        // Turn of loading in case
        setLoading(false);

    }

    // Updates Shipping Info
    const handleSaveShipToSubmit = async (event, closePopup) => {

        // Prevent Default Submit action
        event.preventDefault();

        // Clear shipping form error
        setShippingFormError("")

        // Set Shipping Form Loading
        setShipToFormLoading(true)

        // Get Data and create post data
        const newAddressData = {
            order_id: order.ID,
            name: event.target.name.value,
            company: event.target.company.value,
            street1: event.target.street1.value,
            street2: event.target.street2.value,
            city: event.target.city.value,
            state: event.target.state.value,
            postal_code: event.target.zip.value,
            country: event.target.country.value,
            phone: event.target.phone.value
        }

        // Make call to update ship to in HQ
        await postUpdateShippingAddress(newAddressData);
        
        // Set ShipTo Address and order
        const newOrder = order;
        newOrder.ShipTo = {
            Name: newAddressData.name,
            Company: newAddressData.company,
            Street1: newAddressData.street1,
            Street2: newAddressData.street2,
            City: newAddressData.city,
            State: newAddressData.state,
            PostalCode: newAddressData.postal_code,
            Country: newAddressData.country,
            Phone: newAddressData.phone
        };
        setOrder(newOrder);

        // Turn off loading
        setShipToFormLoading(false)

        // Close popup
        closePopup();
        
    }

    // Edits Weight
    const handleEditWeightSubmit = (event, closePopup) => {

        // Prevent Default Action
        event.preventDefault();

        // Set new order weight
        setOrderWeight(parseFloat(event.target.weight.value))

        // Closes Popup
        closePopup();

    }

    // Pack Item
    const handlePackItem = (orderItemID) => {

        //set new array to work with
        let updatedOrderItemPackedStatus = (orderItemsPackedStatus)

        // Find index of item in array to update
        let indexToUpdate = updatedOrderItemPackedStatus.findIndex((item) => (item.id === orderItemID && item.packed === false))
        updatedOrderItemPackedStatus[indexToUpdate].packed = true;
        
        // Set array
        setOrderItemsPackedStatus([...updatedOrderItemPackedStatus]);

    }

    // Unpack Item
    const handleUnpackItem = (orderItemID) => {

                //set new array to work with
                let updatedOrderItemPackedStatus = (orderItemsPackedStatus)

                // Find index of item in array to update
                let indexToUpdate = updatedOrderItemPackedStatus.findIndex((item) => (item.id === orderItemID && item.packed === true))
                updatedOrderItemPackedStatus[indexToUpdate].packed = false;
                
                // Set array
                setOrderItemsPackedStatus([...updatedOrderItemPackedStatus]);

    }

    // Populates Shipping Rates Popup
    const handlePopulateShippingRates = async () => {

        // Validation
        if (!orderWeight) {
            alert("Order Weight is required to get shipping rates")
            setShippingRatesPopupOpen(false)
            return
        }

        if (!orderBoxID) {
            alert("Box is required to get shipping rates")
            setShippingRatesPopupOpen(false)
            return
        }


        setShippingRatesPopupOpen(true)

        // set loading to true
        setShippingRatesPopupLoading(true)

        // Fetch Shipping Rates
        const fetchedShippingRates = await fetchShippingRates(order.ID, orderWeight, orderBoxID);
        

        // Parse Shipping Rates into object
        const shippingRatesParsed = {}

        // Sort Rates into provider
        for (let i = 0; i < fetchedShippingRates.length; i++) {

            // Create Provider if it doesn't exist
            if (!shippingRatesParsed[fetchedShippingRates[i].provider]) {
                shippingRatesParsed[fetchedShippingRates[i].provider] = [];
            }

            // Push Rate to provider
            shippingRatesParsed[fetchedShippingRates[i].provider].push(fetchedShippingRates[i]);
        }

        // Set Shipping Rates State
        setShippingRates(shippingRatesParsed);

        // Turn off loading screen
        setShippingRatesPopupLoading(false);
    }

    // Handles a barcode scan
    const handleBarcodeScan = async (scannedCode, currentOrderItemsPackedStatus) => {

        // handle if barcode scan is bx_
        if (scannedCode.startsWith("bx_")) {
            
            // Get Box ID
            const boxID = scannedCode.split("_")[1];
            
            setOrderBoxID(boxID);

            // Scroll to top of box container
            boxContainerRef.current.scrollTop = 0;

            return;
        }

        // handle if barcode scan is hs_
        if (scannedCode.startsWith("hs_")) {

            // get scan code
            const scanCode = scannedCode.split("_")[1];

            if (scanCode === "000001") {

                // validate order weight
                if (!orderWeight || orderWeight === "0") {
                    // alert order weight is required to print label
                    alert("Order Weight is required to print label");
                    return;
                }

                // validate selected printer
                if (!selectedPrinter.name) {
                    // alert printer is required to print label
                    alert("Selected Printer is required to print label");
                    return;
                }

                // validate order items packed status
                if ((orderItemsPackedStatus.filter(item => !item.packed)).length) {
                    // alert order items are required to be packed to print label
                    alert("Order Items are required to be packed to print label");
                    return;
                }

                // print label
                handlePrintLabel();

            }

            if (scanCode === "000002") {
               
                // validate order item packed status
                if ((orderItemsPackedStatus.filter(item => !item.packed)).length) {
                    // alert order items are required to be packed to complete order
                    alert("Order Items are required to be packed to complete order");
                    return;
                }

                // validate shipments
                if (!shipments || (!shipments.filter(shipment => !shipment.Voided).length)) {
                    // alert shipments are required to complete order
                    alert("at least 1 non-Voided shipment is required to complete order");
                    return;
                }

                handleCompleteOrder();

            }

        }

        // handle if barcode scan is order item
        for (let i = 0; i < currentOrderItemsPackedStatus.length; i++) {

            if (currentOrderItemsPackedStatus[i].id.toString() !== scannedCode) {
                continue;
            }

            if(currentOrderItemsPackedStatus[i].packed) {
                // handleUnpackItem(currentOrderItemsPackedStatus[i].id)
            } else {
                handlePackItem(currentOrderItemsPackedStatus[i].id)
            }
        }

    }

    // Handles click on rate selection
    const handleRateClick = (rateSelected) => {
        setSelectedRate(rateSelected);
    }

    // Updates Carrier Method On Save inside Shipping Method popup
    const handleUpdateCarrierMethodSubmit = async (closePopup) => {
        
        // Clear Error Message
        setShippingRatesError("");

        // Set to loading
        setShippingRatesPopupLoading(true)

        // Make call to update carrier method
        await postUpdateCarrierMethod(order.ID, selectedRate.carrier, selectedRate.method);

        // Re-Fetch updated order and set it in state so that shipping method aligns
        const updatedOrder = await fetchOrder(order.ID);
        setOrder(updatedOrder);
        
        // Turn off loading
        setShippingRatesPopupLoading(false);

        // Close popup
        closePopup();

    }

    // Handles Voids a label click on shipment
    const handleVoidLabel = async (shipmentID) => {

        // set loading to true
        setShipmentsLoading(true)

        // Void Label
        await postVoidLabel(shipmentID);

        // Re-Fetch shipments and set to state to update shipments
        const updatedShipments = await fetchShipments(order.ID);
        setShipments(updatedShipments)

        // Turn off loading screen
        setShipmentsLoading(false)

    }

    // Handles View Label Button Click
    const handleViewLabelClick = async (shipmentID) => {

        // set loading to true
        setShipmentsLoading(true)

        // Fetch label
        const existingLabelURL = await fetchExistingLabel(shipmentID);    

        // Open window with label if it exists
        if (existingLabelURL) {
            window.open(existingLabelURL)
        }

        // Turn off loading screen
        setShipmentsLoading(false)

    }

    // Handles Complete Order (Just unlocks order)
    const handleCompleteOrder = async () => {

        // Set Screen Loading
        setLoading(true);

        // Unlock Order
        await postUnlockOrder(order.ID);

        // Navigate back to tote page
        navigate("/scan")

        // Turn of loading in case
        setLoading(false);

    }

    // Handles Flag Order for error
    const handleFlagForError = async (orderID, flaggedError) => {
        
        // Set Screen Loading
        setLoading(true);

        // Flag Order
        await postFlagError(orderID, flaggedError);

        // unlock order
        await postUnlockOrder(order.ID);

        // Navigate back to tote page
        navigate("/scan")

        // Turn of loading in case
        setLoading(false);


    }




    // RENDER PROPER PAGE

    // Show order error screen
    if (orderError) {
        return (
            <Error message={orderError} onClick={handleBackToTotePageClick} buttonText="Go back to Tote page"></Error>
        )
    }

     // Show Loading Screen
     if (loading) {
        return (
            <Loading></Loading>
        )
    }

   
    // Show Order Page
    return (
        <div className="flex flex-col gap-4 flex-1">
            <div className="w-full">
                <p onClick={handleBackToTotePageClick} className='hover:text-blue-500 transition duration-300 text-sm cursor-pointer inline'> <i className="bi bi-arrow-left"></i> Go back to Tote page</p>
                <div className="w-full flex items-center justify-between my-1">
                    <h2 className="text-2xl font-semibold">Order #{order.Number}</h2>
                    <div className="flex items-center justify-end gap-6">
                        <div target="_blank" onClick={() => {shell.openExternal( `https://whsrv.hoopswagg.com/hq/orders/view/${order.ID}` )}} className="text-white rounded font-light bg-blue-500 hover:bg-blue-400 py-2 px-3 flex items-center justify-center transition cursor-pointer">View in Dashboard</div>
                        <Dropdown text={`${selectedPrinter ? selectedPrinter.displayName : "Select Label Printer" }`} textColorClass='text-black' className="mx-2" >
                            {
                                printers.map(printer => (
                                    <li className="w-full">
                                        <button className="w-full text-black text-left cursor-pointer hover:bg-gray-200 transition duration-300 pl-4 p-2 text-sm select-none" onClick={() =>  setSelectedPrinter(printer)}>{printer.displayName}</button>
                                    </li> 
                                ))
                            }
                        </Dropdown>
                    </div>
                </div>
            </div>
            <div className='w-full flex flex-1 gap-4'>
                
                <div className="flex flex-col w-1/3 gap-4">

                    {/* Non-Packed Order Items Card */}
                    <Card className="flex-1">
                        <div className="w-full flex items-center justify-between border-b border-blue-500 pb-2 h-1/6">
                            <h4 className="text-lg font-semibold">Order Items</h4>
                            <h4 className="text-blue-500 text-lg font-semibold">{(orderItemsPackedStatus.filter(item => !item.packed)).length} Items</h4>
                        </div>
                        <div className="py-3 flex items-center justify-between border-b border-gray-300 h-1/6">
                            <p className="text-xs text-gray-500">Product</p>
                        </div>
                        <div className="h-2/3 pb-2 overflow-scroll">
                            {
                                    orderItemsPackedStatus.map(function(orderItemStatus){
                                    
                                    // don't render if item is packed
                                    if (orderItemStatus.packed) {
                                        return <></>
                                    }

                                    // Get Item
                                    const itemArray = order.Items.filter(orderItem => orderItem.ID === orderItemStatus.id);
                                    const item = itemArray[0]
                                        return (
                                            <div className="w-full flex items-center justify-between py-2 border-b border-gray-300 gap-2 cursor-pointer hover:bg-gray-200 transition duration-300" onClick={() => {handlePackItem(item.ID)}}>
                                                <img src={item.ImageURL ? item.ImageURL : placeholderImage} alt="" className="w-16" />
                                                <p className="w-3/4 truncate text-xs px-2 text-blue-500"><strong>{item.RenderID}</strong>: {item.ProductName}</p>
                                            </div>
                                        )

                                })
                            }
                        </div>
                    </Card>

                    {/* Packed Order Items Card */}
                    <Card className="flex-1">
                        <div className="w-full flex items-center justify-between border-b border-blue-500 pb-2 h-1/6">
                            <h4 className="text-lg font-semibold">Packed Items</h4>
                            <h4 className="text-blue-500 text-lg font-semibold">{(orderItemsPackedStatus.filter(item => item.packed)).length} Items</h4>
                        </div>
                        <div className="py-3 flex items-center justify-between border-b border-gray-300 h-1/6">
                            <p className="text-xs text-gray-500">Product</p>
                        </div>
                        <div className="pb-2 h-2/3 overflow-scroll">
                        {
                                orderItemsPackedStatus.map(function(orderItemStatus){
                                    
                                    // Don't render if the item isn't packed
                                    if (!orderItemStatus.packed) {
                                        return <></>
                                    }

                                    // Get Item
                                    const itemArray = order.Items.filter(orderItem => orderItem.ID === orderItemStatus.id);
                                    const item = itemArray[0]

                                    return (
                                        <div className="w-full flex items-center justify-between py-2 border-b border-gray-300 gap-2">
                                            <img src={item.ImageURL ? item.ImageURL : placeholderImage} alt="" className="w-16" />
                                            <p className="w-5/8 truncate text-xs px-2 text-blue-500"><strong>{item.RenderID}</strong>: {item.ProductName}</p>
                                            <button className="w-1/8 text-xs rounded-full bg-blue-200 p-1 px-2 cursor-pointer hover:bg-blue-100 transition" onClick={() => {handleUnpackItem(item.ID)}}>unpack</button>
                                        </div>
                                    )
                                    

                                })
                            }
                        </div>
                    </Card>
                </div>

                <div className="flex-1 flex flex-col w-2/3 gap-4">
                    <div className="flex-1 flex gap-4">

                        {/* Ship To Card */}
                        <Card className="flex-1">
                            <div className="w-full flex items-center justify-between pb-3">
                                <h4 className="text-lg font-semibold">Ship to</h4>
                                <Popup modal trigger={<p className='text-blue-500 cursor-pointer text-sm'>Edit</p>} position="center">
                                {close => (
                                    <div className="relative" style={{ maxHeight: "90vh" }}>
                                        <div className={`absolute left-0 top-0 w-full h-full bg-white flex items-center justify-center ${!shipToFormLoading && "hidden"}`}>
                                            <img src={loader} alt="" />
                                        </div>
                                        <div className="px-8">
                                            <div className="w-full flex items-center justify-between my-4 border-b border-black py-2">
                                                <h3 className="text-2xl">Shipping Information</h3>
                                                <button className="close text-3xl" onClick={close}>
                                                    &times;
                                                </button>
                                            </div>
                                            <form onSubmit={(event) => handleSaveShipToSubmit(event, close)}>
                                            <div className={`w-full bg-red-400 text-white rounded p-2 flex items-center px-4 ${!shippingFormError && "hidden"}`}>{shippingFormError}</div>
                                                <div className='mt-8 mb-4 w-full flex items-center justify-between gap-6'>
                                                    <div className="w-full">
                                                        <label htmlFor="name" className='w-full flex items-center justify-start font-light text-sm mb-2'>Name</label>
                                                        <input type="text" name='name' className='p-2 border border-lightgray rounded-lg w-full focus:outline-none' defaultValue={order.ShipTo.Name} />
                                                    </div>
                                                </div>
                                                <div className='mt-4 mb-4 w-full flex items-center justify-between gap-6'>
                                                    <div className="w-1/2">
                                                        <label htmlFor="company" className='w-full flex items-center justify-start font-light text-sm mb-2'>Company</label>
                                                        <input type="text" name='company' className='p-2 border border-lightgray rounded-lg w-full focus:outline-none' defaultValue={order.ShipTo.Company} />
                                                    </div>
                                                    <div className="w-1/2">
                                                        <label htmlFor="phone" className='w-full flex items-center justify-start font-light text-sm mb-2'>Phone Number</label>
                                                        <input type="text" name='phone' className='p-2 border border-lightgray rounded-lg w-full focus:outline-none' defaultValue={order.ShipTo.Phone} />
                                                    </div>
                                                </div>
                                                <div className='mt-8 mb-4 w-full flex items-center justify-between gap-6'>
                                                    <div className="w-full">
                                                        <label htmlFor="street1" className='w-full flex items-center justify-start font-light text-sm mb-2'>Address Line 1</label>
                                                        <input type="text" name='street1' className='p-2 border border-lightgray rounded-lg w-full focus:outline-none' defaultValue={order.ShipTo.Street1} />
                                                    </div>
                                                </div>
                                                <div className='mt-8 mb-4 w-full flex items-center justify-between gap-6'>
                                                    <div className="w-full">
                                                        <label htmlFor="street2" className='w-full flex items-center justify-start font-light text-sm mb-2'>Address Line 2</label>
                                                        <input type="text" name='street2' className='p-2 border border-lightgray rounded-lg w-full focus:outline-none' defaultValue={order.ShipTo.Street2} />
                                                    </div>
                                                </div>
                                                <div className='mt-4 mb-4 w-full flex items-center justify-between gap-6'>
                                                    <div className="w-1/2">
                                                        <label htmlFor="city" className='w-full flex items-center justify-start font-light text-sm mb-2'>City</label>
                                                        <input type="text" name='city' className='p-2 border border-lightgray rounded-lg w-full focus:outline-none' defaultValue={order.ShipTo.City} />
                                                    </div>
                                                    <div className="w-1/2">
                                                        <label htmlFor="state" className='w-full flex items-center justify-start font-light text-sm mb-2'>State</label>
                                                        <input type="text" name='state' className='p-2 border border-lightgray rounded-lg w-full focus:outline-none' defaultValue={order.ShipTo.State} />
                                                    </div>
                                                </div>
                                                <div className='mt-4 mb-4 w-full flex items-center justify-between gap-6'>
                                                    <div className="w-1/2">
                                                        <label htmlFor="country" className='w-full flex items-center justify-start font-light text-sm mb-2'>Country</label>
                                                        <input type="text" name='country' className='p-2 border border-lightgray rounded-lg w-full focus:outline-none' defaultValue={order.ShipTo.Country} />
                                                    </div>
                                                    <div className="w-1/2">
                                                        <label htmlFor="zip" className='w-full flex items-center justify-start font-light text-sm mb-2'>Zip Code</label>
                                                        <input type="text" name='zip' className='p-2 border border-lightgray rounded-lg w-full focus:outline-none' defaultValue={order.ShipTo.PostalCode} />
                                                    </div>
                                                </div>
                                                <div className="my-4 w-full flex items-center justify-end">
                                                    <button className="bg-white text-black font-extralight p-2 px-6 rounded hover:bg-gray-200 cursor-pointer transition duration-300 mx-2" onClick={close}>
                                                        Cancel
                                                    </button>
                                                    <input type='submit' className="bg-blue-500 hover:bg-blue-400 rounded text-white p-2 font-extralight transition duration-300 px-10 cursor-pointer" value="Save" />
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                )}
                                </Popup>
                            </div>
                            <p className="font-semibold text-sm">{order.ShipTo.Name}</p>
                            <p className="text-sm">{order.ShipTo.Street1}</p>
                            {order.ShipTo.Street2 && (<p className="text-sm">{order.ShipTo.Street2}</p>)}
                            {order.ShipTo.Street3 && (<p className="text-sm">{order.ShipTo.Street3}</p>)}
                            <p className="text-sm">{order.ShipTo.City}, {order.ShipTo.State}, {order.ShipTo.PostalCode}</p>
                        </Card>

                        {/* Shipping Method Card */}
                        <Card className="flex-1">
                            <div className="w-full flex items-center justify-between pb-3">
                                <h4 className="text-lg font-semibold">Shipping Method</h4>
                                <p className='text-blue-500 cursor-pointer text-sm' onClick={handlePopulateShippingRates}>View Rates</p>
                                <Popup modal open={shippingRatesPopupOpen} onClose={() => {setShippingRatesPopupOpen(false)}} position="center">
                                {close => (
                                    <div className="relative p-4 flex flex-col" style={{ maxHeight: "90vh" }}>
                                            <div className={`absolute left-0 top-0 w-full h-full bg-white flex items-center justify-center ${!shippingRatesPopupLoading && "hidden"}`}>
                                                <img src={loader} alt="" />
                                            </div>
                                        
                                            <div className="w-full flex items-center justify-between py-3 border-b border-black">
                                                <h3 className="text-2xl font-semibold">Shipping Rates</h3>
                                                <button className="close text-3xl" onClick={close}>
                                                    &times;
                                                </button>
                                            </div>
                                            <div className={`w-full bg-red-400 text-white rounded p-2 flex items-center px-4 ${!shippingRatesError && "hidden"}`}>{shippingRatesError}</div>
                                            {shippingRates && (
                                            <div className="overflow-scroll">
                                                {
                                                    Object.entries(shippingRates).map((rates, key) => {
                                                        return (
                                                        <>
                                                            <div className="w-full py-4 border-b border-gray-300">
                                                            <h3 className="text-lg font-semibold">{rates[0]}</h3>
                                                            </div>
                                                            {
                                                                rates[1].map(rate => {
                                                                    return (
                                                                    <div onClick={() => handleRateClick({object_id: rate.object_id, carrier: rate.provider, method: rate.servicelevel.token})} className={`w-full py-4 border-b border-gray-300 flex items-center justify-between hover:bg-blue-100 transition duration-300 px-2 ${selectedRate.object_id === rate.object_id ? "bg-blue-100" : "cursor-pointer"}`}>
                                                                        <div>
                                                                            <h5 className='text-gray-600'>{rate.servicelevel.name}</h5>
                                                                        </div>
                                                                        <p>${rate.amount}</p>
                                                                    </div>
                                                                    )
                                                                })
                                                            }
                                                            
                                                        </>
                                                    )
                                                    })
                                                }
                                            </div>
                                            )}
                                            <div className="w-full flex items-center justify-end px-4 my-4 gap-2">
                                                <div className="bg-white cursor-pointer text-black font-light px-10 py-3 hover:bg-gray-300 transition duration-300 rounded" onClick={close}>Cancel</div>
                                                <div className="bg-blue-500 cursor-pointer text-white font-light px-10 py-3 hover:bg-blue-400 transition duration-300 rounded" onClick={() => handleUpdateCarrierMethodSubmit(close)}>Save</div>
                                            </div>
                                        
                                    </div>
                                )}
                                </Popup>
                            </div>
                            <div className="w-full">
                                <p className='my-2'><span className="font-semibold">Carrier Method</span>: {order.CarrierToken.toUpperCase()} / {order.MethodToken}</p>
                                <p className='my-2'><span className="font-semibold">Shipping Service</span>: {order.RequestedShippingService}</p>
                            </div>
                        </Card>

                        {/* Internal Notes Card */}
                        { order.InternalNotes && (
                            <Card className="flex-1 border-2 border-red-500">
                                <h4 className="text-lg font-semibold">Internal Notes</h4>
                                <p className="my-2">
                                    {order.InternalNotes}
                                </p>
                            </Card>
                        )}

                        {/* Edit Weight Card */}
                        <Card className="flex-1">
                            <div className="w-full flex items-center justify-between pb-3">
                                <h4 className="text-lg font-semibold">Weight</h4>
                                <Popup modal onOpen={() => {weightInputRef.current.focus()}} trigger={<p className='text-blue-500 cursor-pointer text-sm'>Edit</p>} position="center">
                                {close => (
                                    <div className="relative" style={{ maxHeight: "90vh" }}>
                                        <div className="px-8">
                                            <div className="w-full flex items-center justify-between my-4">
                                                <h3 className="text-2xl">Edit Weight</h3>
                                                <button className="close text-3xl" onClick={close}>
                                                    &times;
                                                </button>
                                            </div>
                                            <form onSubmit={(event) => { handleEditWeightSubmit(event, close); }}>
                                                <div className="my-4 w-full">
                                                        <label htmlFor="weight" className='w-full flex items-center justify-start font-light text-sm mb-2'>Weight</label>
                                                        <input type="number" name='weight' className='p-2 border border-lightgray rounded-lg w-full focus:outline-none' ref={weightInputRef} defaultValue={orderWeight} step="0.01" />
                                                </div>
                                                <div className="my-4 w-full flex items-center justify-end">
                                                    <button type='button' className="bg-white text-black font-extralight p-2 px-6 rounded hover:bg-gray-200 cursor-pointer transition duration-300 mx-2" onClick={close}>
                                                        Cancel
                                                    </button>
                                                    <input type='submit' className="bg-blue-500 hover:bg-blue-400 rounded text-white p-2 font-extralight transition duration-300 px-10 cursor-pointer" value="Save" />
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                )}
                                </Popup>
                            </div>
                            <div className="w-full mt-10 text-3xl font-semibold text-blue-500 text-center">{orderWeight}oz</div>
                        </Card>
                    </div>

                    {/* Box Card */}
                    <Card className="flex-1" ref={boxContainerRef}>
                        <div className="w-full flex border-b border-blue-500 pb-2">
                            <h4 className="text-lg font-semibold">Suggested Box</h4>
                        </div>
                        <div>
                            {
                                order.Boxes.map(function(box){

                                    if (orderBoxID) {

                                        if (box.ID !== parseInt(orderBoxID)) {
                                            return <></>;
                                        }

                                        return (
                                            <label htmlFor={"box_" + box.ID} className="w-full flex items-center justify-start py-2 border-b border-gray-300 gap-6 cursor-pointer">
                                                <input onChange={handleBoxSelect} type="checkbox" name={"box_" + box.ID} id={"box_" + box.ID} value={box.ID} checked={box.ID === parseInt(orderBoxID)} className="w-5 h-5" />
                                                <label htmlFor={"box_" + box.ID} className="text-sm tracking-widest cursor-pointer">{box.Name}</label>
                                            </label>
                                        )

                                    }

                                    if (!box.SuggestedBox) {
                                        return <></>
                                    }

                                    return (
                                        <label htmlFor={"box_" + box.ID} className="w-full flex items-center justify-start py-2 border-b border-gray-300 gap-6 cursor-pointer">
                                            <input onChange={handleBoxSelect} type="checkbox" name={"box_" + box.ID} id={"box_" + box.ID} value={box.ID} checked={box.ID === parseInt(orderBoxID)} className="w-5 h-5" />
                                            <label htmlFor={"box_" + box.ID} className="text-sm tracking-widest cursor-pointer">{box.Name}</label>
                                        </label>
                                    )
                                })
                            }
                            {
                                order.Boxes.map(function(box, i){

                                    if (box.ID === parseInt(orderBoxID)) {
                                        return <></>
                                    }


                                    if (box.SuggestedBox && !orderBoxID) {
                                        return <></>
                                    }

                                    return (
                                        <label htmlFor={"box_" + box.ID} className="w-full flex items-center justify-start py-2 border-b border-gray-300 gap-6 cursor-pointer">
                                            <input onChange={handleBoxSelect} type="checkbox" name={"box_" + box.ID} id={"box_" + box.ID} value={box.ID} checked={box.ID === parseInt(orderBoxID)} className="w-5 h-5" />
                                            <label htmlFor={"box_" + box.ID} className="text-sm tracking-widest cursor-pointer">{box.Name}</label>
                                        </label>
                                    )
                                })
                            }
                        </div>
                    </Card>

                    {/* Shipments Card */}
                    <Card className="flex-1">
                        <div className="w-full flex items-center justify-between border-b border-blue-500 pb-2">
                            <h4 className="text-lg font-semibold">Shipments</h4>
                        </div>
                        <div className="relative">
                            <div className={`absolute left-0 top-28 w-full h-full bg-white flex items-center justify-center ${!shipmentsLoading && "hidden"}`}>
                                <img src={loader} alt="" />
                            </div>
                            <table className={`w-full overflow-scroll ${shipmentsLoading && "hidden"}`}>
                                <tr className="border-b border-gray-200">
                                    <th className="text-gray-500 text-xs py-2 px-1 text-left">Carrier</th>
                                    <th className="text-gray-500 text-xs py-2 px-1 text-left">Cost</th>
                                    <th className="text-gray-500 text-xs py-2 px-1 text-left">Tracking Number</th>
                                    <th className="text-gray-500 text-xs py-2 px-1 text-left">Service</th>
                                    <th className="text-gray-500 text-xs py-2 px-1 text-center">Status</th>
                                    <th className="text-gray-500 text-xs py-2 px-1 text-right">Actions</th>
                                </tr>
                                {
                                    shipments && shipments.map(shipment => {
                                        return (
                                            <tr className="border-b border-gray-200">
                                                <td className="py-2 text-left text-sm px-1">{shipment.CarrierCode}</td>
                                                <td className="py-2 text-left text-sm px-1">{shipment.ShipmentCost}</td>
                                                <td className="py-2 text-left text-sm px-1 text-blue-500">{shipment.TrackingNumber}</td>
                                                <td className="py-2 text-left text-sm px-1">{shipment.ServiceCode}</td>
                                                <td className="py-1 text-center text-sm"> <div className={`rounded-3xl p-1 text-xs ${shipment.Voided ? "bg-red-200 text-red-600" : "bg-green-200 text-green-600"}`}>{shipment.Voided ? "Voided" : "Shipped"}</div> </td>
                                                <td className="text-sm text-right"> 
                                                    {!shipment.Voided && ( 
                                                        <Dropdown text="Actions" textColorClass='text-blue-500' className={"justify-end"} >
                                                                <li className="w-full">
                                                                    <button className="w-full text-black text-left cursor-pointer hover:bg-gray-200 transition duration-300 p-1 px-2 text-xs select-none" onClick={() => handleVoidLabel(shipment.ID)}>Void</button>
                                                                </li>
                                                                <li className="w-full">
                                                                    <button className="w-full text-black text-left cursor-pointer hover:bg-gray-200 transition duration-300 p-1 px-2 text-xs select-none" onClick={() => handleViewLabelClick(shipment.ID)}>View Label</button>
                                                                </li>
                                                        </Dropdown> 
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })
                                }
                            </table>
                        </div>
                    </Card>
                </div>
            </div>

        {/* Complete Order, Print Label, and Report Error Buttons */}
        <div className="flex w-full items-center justify-end gap-2">
                <Popup onClose={() => {setFlaggedError("")}} trigger={<button className="bg-red-500 hover:bg-red-400 transition text-white font-light py-3 px-6 rounded">Flag for Error</button>} modal position="center" >
                    {close => (
                        <div className="bg-white rounded-lg p-4" style={{ maxHeight: "90vh" }}>
                            <h3 className="text-xl font-semibold w-full text-center">Once order is flagged for error, please set it aside</h3>
                            
                            <div className='my-4'>
                                <label htmlFor="reason" className="text-lg">Reason flagged for error</label>
                                <input onInput={(event) => { setFlaggedError(event.target.value) }} type="text" id="reason" className="w-full p-2 border-2 border-gray-300 rounded-lg" />
                            </div>
    
                            
                            <div className="flex justify-end gap-4">
                                <button onClick={close} className="bg-white hover:bg-gray-200 duration-300 transition text-black font-light py-3 px-6 rounded">Cancel</button>
                                <button onClick={() => { handleFlagForError(order.ID, flaggedError) }} className={`${ flaggedError ? "bg-red-500 hover:bg-red-400" : "bg-red-400 cursor-not-allowed" } transition text-white font-light py-3 px-6 rounded`} disabled={!flaggedError}>Flag For Error</button>
                            </div>
                            
                        </div>
                    )}
                </Popup>
                <button className={`bg-blue-500 px-6 py-3 font-light rounded ${orderWeight > 0 && selectedPrinter.name && !(orderItemsPackedStatus.filter(item => !item.packed)).length ? "cursor-pointer hover:bg-blue-400" : "cursor-not-allowed opacity-70" } text-white transition duration-200`} disabled={`${orderWeight > 0 && selectedPrinter.name && !(orderItemsPackedStatus.filter(item => !item.packed)).length ? "" : true}`} onClick={handlePrintLabel}>Print Label</button>
                <button className={`bg-blue-500 px-6 py-3 font-light rounded text-white transition duration-200 ${(orderItemsPackedStatus.filter(item => !item.packed)).length || !shipments || (!shipments.filter(shipment => !shipment.Voided).length) ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:bg-blue-400" }`} disabled={`${(orderItemsPackedStatus.filter(item => !item.packed)).length || !shipments || !shipments.filter(shipment => !shipment.Voided).length ? true : ""}`} onClick={handleCompleteOrder} >Complete Order</button>
            </div>
        </div>
        )
}

export default OrderPage