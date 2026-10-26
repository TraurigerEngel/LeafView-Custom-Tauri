import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { setLocales } from "./setLocales";
import { App } from "./App";
import "./index.scss";
setLocales("ru");
createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
