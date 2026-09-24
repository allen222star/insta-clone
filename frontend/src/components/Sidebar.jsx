import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { loginPath } from "../utils";
import Avatar from "./Avatar";
import {
  ExploreIcon,
  HeartIcon,
  HomeIcon,
  LogoMark,
  MessengerIcon,
  MoreIcon,
  PlusSquareIcon,
  ReelsIcon,
  SearchIcon,
} from "./Icons";

export default function Sidebar({
  compact,
  onSearch,
  onNotif,
  onCreate,
  searchOpen,
  notifOpen,
  unreadNotif,
  unreadMsg,
}) {
  const { user, logout } = useAuth();
  const loc = useLocation();
  const nav = useNavigate();
  const from = loc.pathname + loc.search;

  const items = [
    { to: "/", label: "홈", icon: <HomeIcon filled={loc.pathname === "/" && !searchOpen && !notifOpen} /> },
    { action: onSearch, label: "검색", icon: <SearchIcon filled={searchOpen} />, active: searchOpen },
    { to: "/explore", label: "탐색 탭", icon: <ExploreIcon filled={loc.pathname.startsWith("/explore")} /> },
    { to: "/reels", label: "릴스", icon: <ReelsIcon /> },
    { action: onNotif, label: "알림", icon: <HeartIcon filled={notifOpen} />, badge: user ? unreadNotif : 0, active: notifOpen },
    { action: onCreate, label: "만들기", icon: <PlusSquareIcon /> },
  ];

  if (user) {
    items.splice(4, 0, { to: "/direct", label: "메시지", icon: <MessengerIcon />, badge: unreadMsg });
    items.push({ to: `/${user.username}`, label: "프로필", avatar: true });
  }

  return (
    <aside className={`sidebar ${compact ? "compact" : ""}`}>
      <NavLink to="/" className="side-logo" aria-label="Instagram">
        {compact ? (
          <svg viewBox="0 0 24 24" width="24" height="24">
            <rect x="2" y="2" width="20" height="20" rx="6" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="17.5" cy="6.5" r="1.2" />
          </svg>
        ) : (
          <LogoMark />
        )}
      </NavLink>
      <nav>
        {items.map((it) =>
          it.action ? (
            <button key={it.label} className={`side-item ${it.active ? "active" : ""}`} onClick={it.action}>
              <span className="ico">
                {it.icon}
                {it.badge > 0 && <span className="badge">{it.badge > 9 ? "9+" : it.badge}</span>}
              </span>
              {!compact && <span>{it.label}</span>}
            </button>
          ) : (
            <NavLink
              key={it.label}
              to={it.to}
              className={({ isActive }) => `side-item ${isActive && !searchOpen && !notifOpen ? "active" : ""}`}
            >
              <span className="ico">
                {it.avatar ? <Avatar user={user} size={24} /> : it.icon}
                {it.badge > 0 && <span className="badge">{it.badge > 9 ? "9+" : it.badge}</span>}
              </span>
              {!compact && <span>{it.label}</span>}
            </NavLink>
          )
        )}
      </nav>
      <div className="side-more">
        {user ? (
          <details>
            <summary className="side-item">
              <span className="ico">
                <MoreIcon />
              </span>
              {!compact && <span>더 보기</span>}
            </summary>
            <div className="more-menu">
              <button onClick={() => nav("/accounts/edit")}>설정</button>
              {user.is_admin && <button onClick={() => nav("/admin")}>관리자</button>}
              <button onClick={() => nav(`/${user.username}?tab=saved`)}>저장됨</button>
              <button onClick={logout}>로그아웃</button>
            </div>
          </details>
        ) : (
          <div className="guest-side-auth">
            <Link to={loginPath(from)} className={`btn-blue wide ${compact ? "icon-only" : ""}`}>
              {compact ? "로그인" : "로그인"}
            </Link>
            {!compact && (
              <Link to="/signup" className="btn-outline wide">
                가입하기
              </Link>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
