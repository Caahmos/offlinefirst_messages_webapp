import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MessageUI from "../App";
import Login from "../components/Pages/login";
import { useAuth } from "../hooks/useAuth";
import AuthRoutes from "./auth.routes";

const AppRoutes = () => {
    const { user } = useAuth();

    return (
        <Router>
            {
                user ?
                    <Routes>
                        <Route path="/" element={<MessageUI />} />
                    </Routes>
                    :
                    <AuthRoutes />
            }
        </Router>
    )
};

export default AppRoutes;