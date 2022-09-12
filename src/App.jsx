// Bootstrap imports
import "bootstrap-icons/font/bootstrap-icons.css";

// React + React Dom Imports
import { useState } from "react";
import {
  HashRouter as Router,
  Routes,
  Route
} from "react-router-dom";



// Page Imports
import ScanATotePage from './pages/scan_a_tote';
import OrderPage from "./pages/order"
import SignInPage from "./pages/sign_in";

// Component Imports
import Layout from "./components/Layout";

function App() {

  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user")));

  if (!user) {
    return <Router><SignInPage setUser={setUser} /></Router>
  }

  return (
    <Router>
        <Routes>
        <Route path="/sign-in" element={<SignInPage setUser={setUser} />}>
        </Route>
        <Route path="/scan" element={<Layout user={user} setUser={setUser} ><ScanATotePage user={user} /></Layout>}>
        </Route>
        <Route path="/order" element={<Layout user={user} setUser={setUser}><OrderPage user={user} /></Layout>}>
        </Route>
        <Route path="/" element={<Layout user={user} setUser={setUser} ><ScanATotePage user={user} /></Layout>}></Route>
        </Routes>
    </Router>
  );
}

export default App;
