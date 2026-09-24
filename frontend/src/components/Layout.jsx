import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { msgApi, notifApi } from "../api";
import { useAuth, useRequireAuth } from "../AuthContext";
import { loginPath } from "../utils";
import BottomNav from "./BottomNav";
import CreateModal from "./CreateModal";
import { HeartIcon, LogoMark, PlusSquareIcon } from "./Icons";
import NotifPanel from "./NotifPanel";
import PostModal from "./PostModal";
import SearchPanel from "./SearchPanel";
import Sidebar from "./Sidebar";

export default function Layout() {
  const { user, loading } = useAuth();
  const requireAuth = useRequireAuth();
  const loc = useLocation();
  const nav = useNavigate();
  const [search, setSearch] = useState(false);
  const [notif, setNotif] = useState(false);
  const [create, setCreate] = useState(false);
  const [postId, setPostId] = useState(null);
  const [unreadN, setUnreadN] = useState(0);
  const [unreadM, setUnreadM] = useState(0);
  const [tick, setTick] = useState(0);

  const compact = search || notif || loc.pathname.startsWith("/direct");

  async function poll() {
    if (!user) {
      setUnreadN(0);
      setUnreadM(0);
      return;
    }
    try {
      const [n, m] = await Promise.all([notifApi.unread(), msgApi.unread()]);
      setUnreadN(n.data.count);
      setUnreadM(m.data.count);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    poll();
    const id = setInterval(poll, 30000);
    return () => clearInterval(id);
  }, [tick, user]);

  useEffect(() => {
    setSearch(false);
    setNotif(false);
  }, [loc.pathname]);

  function openCreate() {
    if (!requireAuth()) return;
    if (window.innerWidth <= 768) {
      nav("/create");
      return;
    }
    setCreate(true);
  }

  function openNotif() {
    if (!requireAuth()) return;
    setSearch(false);
    setNotif((v) => !v);
    setUnreadN(0);
  }

  if (loading && localStorage.getItem("ig_token")) {
    return <div className="boot">불러오는 중…</div>;
  }

  return (
    <div className={`app-shell ${compact ? "is-compact" : ""}`}>
      <Sidebar
        compact={compact}
        searchOpen={search}
        notifOpen={notif}
        unreadNotif={unreadN}
        unreadMsg={unreadM}
        onSearch={() => {
          setNotif(false);
          setSearch((v) => !v);
        }}
        onNotif={openNotif}
        onCreate={openCreate}
      />
      {(search || notif) && (
        <div className="panel-wrap">
          {search && <SearchPanel onClose={() => setSearch(false)} />}
          {notif && (
            <NotifPanel
              onClose={() => setNotif(false)}
              onOpenPost={(id) => setPostId(id)}
            />
          )}
        </div>
      )}
      {(search || notif) && <div className="dim" onClick={() => { setSearch(false); setNotif(false); }} />}
      <header className="mobile-top">
        <Link to="/">
          <LogoMark />
        </Link>
        <div className="row">
          {user ? (
            <>
              <button className="icon-btn" onClick={openCreate} aria-label="만들기">
                <PlusSquareIcon />
              </button>
              <Link to="/notifications" className="icon-btn" aria-label="알림">
                <HeartIcon />
                {unreadN > 0 && <span className="badge">{unreadN}</span>}
              </Link>
            </>
          ) : (
            <Link to={loginPath(loc.pathname + loc.search)} className="btn-blue guest-login">
              로그인
            </Link>
          )}
        </div>
      </header>
      <main className="main">
        <Outlet context={{ openPost: setPostId, refresh: () => setTick((t) => t + 1), tick }} />
      </main>
      <BottomNav onCreate={openCreate} />
      {create && (
        <CreateModal
          onClose={() => setCreate(false)}
          onCreated={() => setTick((t) => t + 1)}
        />
      )}
      {postId && <PostModal postId={postId} onClose={() => setPostId(null)} onDeleted={() => setTick((t) => t + 1)} />}
    </div>
  );
}
