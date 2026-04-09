import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';
import ScrollToTop from './components/ScrollToTop/ScrollToTop';
import CookieConsent from './components/CookieConsent/CookieConsent';
import Loader from './components/Loader/Loader';
import { useAuthStore } from './store/store';
import './App.css';

// Lazy load pages for better performance
const Home = lazy(() => import('./pages/Home/Home'));
const Login = lazy(() => import('./pages/Login/Login'));
const Register = lazy(() => import('./pages/Register/Register'));
const Products = lazy(() => import('./pages/Products/Products'));
const ProductDetail = lazy(() => import('./pages/ProductDetail/ProductDetail'));
const Cart = lazy(() => import('./pages/Cart/Cart'));
const Checkout = lazy(() => import('./pages/Checkout/Checkout'));
const Orders = lazy(() => import('./pages/Orders/Orders'));
const OrderDetail = lazy(() => import('./pages/OrderDetail/OrderDetail'));
const Profile = lazy(() => import('./pages/Profile/Profile'));
const About = lazy(() => import('./pages/About/About'));
const Contact = lazy(() => import('./pages/Contact/Contact'));
const NotFound = lazy(() => import('./pages/NotFound/NotFound'));
const AdminDashboard = lazy(() => import('./pages/Admin/AdminDashboard'));
const DashboardOverview = lazy(() => import('./pages/Admin/DashboardOverview'));
const ProductsManagement = lazy(() => import('./pages/Admin/ProductsManagement'));

function AppContent() {
  const location = useLocation();
  const { user } = useAuthStore();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isAdminProfile = user?.isAdmin && location.pathname.startsWith('/profile');
  const hidePublicChrome = isAdminRoute || isAdminProfile; // hide header/footer for admin-only areas

  return (
    <div className="app">
      {!hidePublicChrome && <Header />}
      <main className="main-content">
        <Suspense fallback={<Loader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/products" element={<Products />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/order/:id" element={<OrderDetail />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminDashboard />}>
              <Route index element={<DashboardOverview />} />
              <Route path="products" element={<ProductsManagement />} />
            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
        {!hidePublicChrome && (
        <>
          <Footer />
          <ScrollToTop />
          <CookieConsent />
        </>
      )}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
