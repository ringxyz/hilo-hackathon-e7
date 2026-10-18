import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AppErrorBoundary } from "./AppUtilities";
import "./styles.css";
import "./v1.css";
import "./clean-home.css";
createRoot(document.getElementById("root")!).render(<React.StrictMode><AppErrorBoundary><App/></AppErrorBoundary></React.StrictMode>);
if("serviceWorker" in navigator&&!import.meta.env.DEV)navigator.serviceWorker.register("/sw.js").catch(()=>{});
import "./focus-support.css";

import './recovery.css';
