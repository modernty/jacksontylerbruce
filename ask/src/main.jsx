import { createRoot } from "react-dom/client";
import { projectCard, resolveView } from "./registry.js";
import { AskApp } from "./ask.jsx";

window.AskViews = { projectCard, resolveView };

const root = document.getElementById("ask-root");
createRoot(root).render(<AskApp />);
