import Dashboard from './Component/Dashboard';
import FileUploader from './Component/FileUploader';
import { BrowserRouter, Routes, Route } from "react-router-dom";
function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" />
            <Route index element={<FileUploader />} />
            <Route path = "dashboard" element={<Dashboard />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
