import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import App from "./App.tsx"
import { JournalProvider } from "./context.tsx"
import { loadSettings } from "./lib.ts"
import "./index.css"

document.documentElement.dataset.theme = loadSettings().theme

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <JournalProvider>
        <App />
      </JournalProvider>
    </BrowserRouter>
  </StrictMode>,
)
