import { Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import MenuPage from './pages/MenuPage';
import CoordinatorDashboard from './pages/CoordinatorDashboard';
import CanteenManagerDashboard from './pages/CanteenManagerDashboard';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/menu" element={<MenuPage />} />
      <Route path="/coordinator" element={<CoordinatorDashboard />} />
      <Route path="/manager" element={<CanteenManagerDashboard />} />
    </Routes>
  );
}

export default App;