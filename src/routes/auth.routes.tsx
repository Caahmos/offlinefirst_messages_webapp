import { Routes, Route } from "react-router-dom";
import Login from "../components/Pages/login";
import Register from "../components/Pages/register";

const AuthRoutes = () => {
    return (
        <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/register" element={<Register />} />
        </Routes>
    )
};

export default AuthRoutes;