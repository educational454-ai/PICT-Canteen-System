import { Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import MenuPage from './pages/MenuPage';
import CoordinatorDashboard from './pages/CoordinatorDashboard';
import CanteenManagerDashboard from './pages/CanteenManagerDashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';

// 1. Import your Footer component
import Footer from './components/Footer';

function App() {
  return (
    // 2. Wrap the whole app in a flex column that takes up at least the full screen height
    <div className="flex flex-col min-h-screen">
      
      {/* 3. The main content (Routes) gets "flex-grow" to push the footer down */}
      <div className="flex-grow">
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/coordinator" element={<CoordinatorDashboard />} />
          <Route path="/manager" element={<CanteenManagerDashboard />} />
          <Route path="/admin" element={<SuperAdminDashboard />} />
        </Routes>
      </div>

      {/* 4. Global Footer stays at the bottom! */}
      <Footer />
      
    </div>
  );
}

export default App;