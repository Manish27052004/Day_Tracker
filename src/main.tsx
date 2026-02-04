import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// 🔥 FORCE UNREGISTER SERVICE WORKER (Fixes stale cache/zombie SW issues)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function (registrations) {
        for (let registration of registrations) {
            console.log('Unregistering Service Worker:', registration);
            registration.unregister();
        }
    });
}
