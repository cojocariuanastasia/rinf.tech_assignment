import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import SearchPage from './pages/SearchPage';
import Auth from './pages/Auth';
import LandingPage from './pages/LandingPage';
import CollectionPage from './pages/CollectionPage';
import DiscoverPage from './pages/DiscoverPage';
import PerfumeDetailsPage from './pages/PerfumeDetailsPage';
import EditProfilePage from './pages/EditProfilePage';
import Advisor from './pages/Advisor';
import motifs from './assets/motifs.jpg';


function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const isAuthenticated = !!currentUser;

  const Header = () => {
    const navigate = useNavigate();

    const handleLogout = () => {
      setCurrentUser(null);
      navigate('/');
    };

    return (
      <nav className="p-4 bg-perfume-black text-white border-b border-gray-800 flex justify-between font-serif">
        <Link to="/" className="text-xl tracking-tighter uppercase">
          Fragrance Wardrobe & Scent Advisor
        </Link>
        <div className="space-x-8 text-sm uppercase tracking-widest flex items-center">
          <Link to="/discover" className="hover:text-perfume-gold">
            Discover
          </Link>
          <Link to="/collection" className="hover:text-perfume-gold">
            My Collection
          </Link>
          {isAuthenticated && (
            <Link to="/advisor" className="hover:text-perfume-gold">
              Advisor
            </Link>
          )}
          {!isAuthenticated ? (
            <Link to="/auth" className="hover:text-perfume-gold">
              Sign In
            </Link>
          ) : (
            <>
              <Link to="/edit-profile" className="hover:text-perfume-gold">
                Edit Profile
              </Link>
              <button
                onClick={handleLogout}
                className="hover:text-perfume-gold"
              >
                LOG OUT
              </button>
            </>
          )}
        </div>
      </nav>
    );
  };

  const AppLayout = () => {
    const location = useLocation();
    const isLandingPage = location.pathname === '/';

    return (
      <div className="relative min-h-screen">
        {!isLandingPage && (
          <div
            className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${motifs})`,
              opacity: 0.5,
              filter: 'brightness(0.45)',
            }}
          />
        )}

        <div className="relative z-10">
          <Header />

          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route
              path="/discover"
              element={
                <DiscoverPage
                  isAuthenticated={isAuthenticated}
                  currentUser={currentUser}
                />
              }
            />
            <Route
              path="/auth"
              element={
                <Auth
                  onAuthSuccess={(user) => {
                    setCurrentUser(user);
                  }}
                />
              }
            />
            <Route
              path="/collection"
              element={
                isAuthenticated ? (
                  <CollectionPage currentUser={currentUser} />
                ) : (
                  <Navigate to="/auth" replace />
                )
              }
            />
            <Route
              path="/perfume/:perfumeId"
              element={<PerfumeDetailsPage currentUser={currentUser} />}
            />
            <Route
              path="/edit-profile"
              element={
                isAuthenticated ? (
                  <EditProfilePage
                    currentUser={currentUser}
                    onProfileUpdated={setCurrentUser}
                  />
                ) : (
                  <Navigate to="/auth" replace />
                )
              }
            />
            <Route path="/searchgpage" element={<SearchPage />} />

            <Route
              path="/advisor"
              element={
                isAuthenticated ? (
                  <Advisor
                    currentUser={currentUser}
                    onProfileUpdated={setCurrentUser}
                  />
                ) : (
                  <Navigate to="/auth" replace />
                )
              }
            />
          </Routes>
        </div>
      </div>
    );
  };

  return (
    <Router>
      <AppLayout />
    </Router>
  );
}

export default App;

