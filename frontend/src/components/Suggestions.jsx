import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { userApi } from "../api";
import { useAuth, useRequireAuth } from "../AuthContext";
import { loginPath } from "../utils";
import Avatar from "./Avatar";

export default function Suggestions() {
  const { user } = useAuth();
  const requireAuth = useRequireAuth();
  const loc = useLocation();
  const [list, setList] = useState([]);

  useEffect(() => {
    if (!user) {
      setList([]);
      return;
    }
    userApi.suggested(5).then((r) => setList(r.data)).catch(() => setList([]));
  }, [user]);

  async function toggle(u) {
    if (!requireAuth()) return;
    if (u.is_following) await userApi.unfollow(u.username);
    else await userApi.follow(u.username);
    setList((arr) => arr.map((x) => (x.id === u.id ? { ...x, is_following: !x.is_following } : x)));
  }

  return (
    <aside className="suggestions">
      {user ? (
        <div className="sug-me">
          <Link to={`/${user.username}`} className="post-user">
            <Avatar user={user} size={44} />
            <div>
              <div className="uname">{user.username}</div>
              <div className="muted">{user.full_name}</div>
            </div>
          </Link>
        </div>
      ) : (
        <div className="sug-me sug-guest">
          <div>
            <div className="uname">오신 것을 환영합니다</div>
            <div className="muted tiny">게시하려면 로그인하세요</div>
          </div>
          <Link to={loginPath(loc.pathname)} className="btn-blue">
            로그인
          </Link>
        </div>
      )}
      <div className="sug-head">
        <span className="muted">회원님을 위한 추천</span>
        <Link to="/explore" className="uname tiny">
          모두 보기
        </Link>
      </div>
      {list.map((u) => (
        <div className="sug-row" key={u.id}>
          <Link to={`/${u.username}`} className="post-user">
            <Avatar user={u} size={32} />
            <div>
              <div className="uname">{u.username}</div>
              <div className="muted tiny">{u.full_name || "회원님을 위한 추천"}</div>
            </div>
          </Link>
          <button className="blue" onClick={() => toggle(u)}>
            {u.is_following ? "팔로잉" : "팔로우"}
          </button>
        </div>
      ))}
    </aside>
  );
}
