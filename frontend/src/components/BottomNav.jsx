import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { loginPath } from "../utils";
import Avatar from "./Avatar";
import { ExploreIcon, HomeIcon, PlusSquareIcon, ReelsIcon } from "./Icons";

export default function BottomNav({ onCreate }) {
  const { user } = useAuth();
  const loc = useLocation();
  return (
    <nav className="bottom-nav">
      <NavLink to="/" className={({ isActive }) => (isActive ? "on" : "")}>
        <HomeIcon filled={loc.pathname === "/"} />
      </NavLink>
      <NavLink to="/explore" className={({ isActive }) => (isActive ? "on" : "")}>
        <ExploreIcon filled={loc.pathname.startsWith("/explore")} />
      </NavLink>
      <button onClick={onCreate} aria-label="만들기">
        <PlusSquareIcon />
      </button>
      <NavLink to="/reels">
        <ReelsIcon />
      </NavLink>
      {user ? (
        <NavLink to={`/${user.username}`}>
          <Avatar user={user} size={24} />
        </NavLink>
      ) : (
        <Link to={loginPath(loc.pathname + loc.search)} className="guest-tab-login">
          로그인
        </Link>
      )}
    </nav>
  );
}
