import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../AuthContext";

const LINKS = [
  { to: "/accounts/edit", label: "프로필 수정" },
  { to: "/accounts/notifications", label: "알림" },
  { to: "/accounts/privacy", label: "개인정보" },
  { to: "/accounts/password", label: "보안" },
  { to: "/accounts/language", label: "언어" },
  { to: "/accounts/help", label: "도움말" },
];

export default function SettingsLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="settings">
      <aside className="settings-nav">
        <h1>설정</h1>
        <nav>
          {LINKS.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              className={({ isActive }) => `settings-link ${isActive ? "on" : ""}`}
            >
              {it.label}
            </NavLink>
          ))}
          <Link className="settings-link" to={`/${user.username}?tab=saved`}>
            저장됨
          </Link>
          {user.is_admin && (
            <Link className="settings-link" to="/admin">
              관리자
            </Link>
          )}
          <button type="button" className="settings-link" onClick={logout}>
            로그아웃
          </button>
        </nav>
      </aside>
      <div className="settings-main">
        <Outlet />
      </div>
    </div>
  );
}
