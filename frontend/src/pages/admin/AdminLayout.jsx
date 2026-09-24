import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../AuthContext";
import { LogoMark } from "../../components/Icons";

const LINKS = [
  { to: "/admin", label: "대시보드", end: true },
  { to: "/admin/users", label: "회원 관리" },
  { to: "/admin/posts", label: "게시물 관리" },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="admin-shell">
      <aside className="admin-nav">
        <Link to="/admin" className="admin-brand">
          <LogoMark className="logo-word" />
          <span>Admin</span>
        </Link>
        <nav>
          {LINKS.map((it) => (
            <NavLink key={it.to} to={it.to} end={it.end} className={({ isActive }) => (isActive ? "on" : "")}>
              {it.label}
            </NavLink>
          ))}
        </nav>
        <div className="admin-nav-foot">
          <div className="uname">{user?.username}</div>
          <Link to="/">사이트로 돌아가기</Link>
          <button type="button" onClick={logout}>
            로그아웃
          </button>
        </div>
      </aside>
      <div className="admin-main">
        <Outlet />
      </div>
    </div>
  );
}
