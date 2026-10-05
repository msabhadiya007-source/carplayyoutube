import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import CarPlayer from "@/components/CarPlayer";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<CarPlayer />} />
          <Route path="/watch/:videoId" element={<CarPlayer />} />
          <Route path="/search" element={<CarPlayer />} />
        </Routes>
      </BrowserRouter>
      <Toaster
        theme="dark"
        position="top-center"
        toastOptions={{
          style: {
            background: "#1A1A20",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "#fff",
          },
        }}
      />
    </div>
  );
}

export default App;
