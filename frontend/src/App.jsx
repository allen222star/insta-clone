import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/Home";
import Explore from "./pages/Explore";
import Reels from "./pages/Reels";
import Profile from "./pages/Profile";
import EditProfile from "./pages/EditProfile";
import PostPage from "./pages/PostPage";
import Direct from "./pages/Direct";
import NotificationsPage from "./pages/NotificationsPage";
import TagPage from "./pages/TagPage";
import CreatePage from "./pages/CreatePage";
import NotFound from "./pages/NotFound";
import SettingsLayout from "./components/SettingsLayout";
import NotificationSettings from "./pages/NotificationSettings";
import PrivacySettings from "./pages/PrivacySettings";
import PasswordSettings from "./pages/PasswordSettings";
import LanguageSettings from "./pages/LanguageSettings";
import HelpSettings from "./pages/HelpSettings";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminPosts from "./pages/admin/AdminPosts";
import { loginPath } from "./utils";

function Guard({ children, guest }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="boot">불러오는 중…</div>;
  if (guest) return user ? <Navigate to="/" replace /> : children;
  return user ? children : <Navigate to={loginPath(loc.pathname + loc.search)} replace />;
}

function AdminGuard({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="boot">불러오는 중…</div>;
  if (!user) return <Navigate to="/admin/login" replace />;
  if (!user.is_admin) return <Navigate to="/admin/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <Guard guest>
            <Login />
          </Guard>
        }
      />
      <Route
        path="/signup"
        element={
          <Guard guest>
            <Signup />
          </Guard>
        }
      />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin"
        element={
          <AdminGuard>
            <AdminLayout />
          </AdminGuard>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="posts" element={<AdminPosts />} />
      </Route>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/explore/tags/:name" element={<TagPage />} />
        <Route path="/reels" element={<Reels />} />
        <Route path="/p/:id" element={<PostPage />} />
        <Route
          path="/direct"
          element={
            <Guard>
              <Direct />
            </Guard>
          }
        />
        <Route
          path="/direct/:username"
          element={
            <Guard>
              <Direct />
            </Guard>
          }
        />
        <Route
          path="/notifications"
          element={
            <Guard>
              <NotificationsPage />
            </Guard>
          }
        />
        <Route
          path="/create"
          element={
            <Guard>
              <CreatePage />
            </Guard>
          }
        />
        <Route
          element={
            <Guard>
              <SettingsLayout />
            </Guard>
          }
        >
          <Route path="/accounts/edit" element={<EditProfile />} />
          <Route path="/accounts/notifications" element={<NotificationSettings />} />
          <Route path="/accounts/privacy" element={<PrivacySettings />} />
          <Route path="/accounts/password" element={<PasswordSettings />} />
          <Route path="/accounts/language" element={<LanguageSettings />} />
          <Route path="/accounts/help" element={<HelpSettings />} />
        </Route>
        <Route path="/:username" element={<Profile />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
