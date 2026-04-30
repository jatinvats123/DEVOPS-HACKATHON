import { createBrowserRouter } from "react-router";
import NotFound from "./NotFound";

export const router = createBrowserRouter([
    {
        path: "/",
        element: <div>Home</div>,
    },
    {
        path: "*",
        element: <NotFound />
    }
]);