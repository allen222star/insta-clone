import { useEffect, useState } from "react";
import { Link, useOutletContext, useParams, useSearchParams } from "react-router-dom";
import { userApi } from "../api";
import { useAuth, useRequireAuth } from "../AuthContext";
import Avatar from "../components/Avatar";
import { GridIcon, BookmarkIcon } from "../components/Icons";
import PostGrid from "../components/PostGrid";
import UserListModal from "../components/UserListModal";
import { formatCount } from "../utils";

export default function Profile() {
  const { username } = useParams();
  const { user, refreshMe } = useAuth();
  const requireAuth = useRequireAuth();
  const { openPost, tick } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "saved" ? "saved" : "posts";
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [saved, setSaved] = useState([]);
  const [list, setList] = useState(null);
  const [err, setErr] = useState("");

  async function load() {
    try {
      const { data } = await userApi.get(username);
      setProfile(data);
      setErr("");
      const p = await userApi.posts(username, { limit: 30 });
      setPosts(p.data.items);
      if (data.is_me) {
        const s = await userApi.saved({ limit: 30 });
        setSaved(s.data.items);
      }
    } catch {
      setErr("notfound");
    }
  }

  useEffect(() => {
    load();
  }, [username, tick]);

  async function toggleFollow() {
    if (!requireAuth()) return;
    if (profile.is_following) await userApi.unfollow(username);
    else await userApi.follow(username);
    await load();
    refreshMe();
  }

  async function openList(kind) {
    const { data } = kind === "followers" ? await userApi.followers(username) : await userApi.following(username);
    setList({ title: kind === "followers" ? "팔로워" : "팔로잉", users: data.items || [] });
  }

  async function toggleInList(u) {
    if (!requireAuth()) return;
    if (u.is_following) await userApi.unfollow(u.username);
    else await userApi.follow(u.username);
    setList((l) => ({
      ...l,
      users: l.users.map((x) => (x.id === u.id ? { ...x, is_following: !x.is_following } : x)),
    }));
  }

  if (err === "notfound") return <div className="empty page">이 페이지를 사용할 수 없습니다.</div>;
  if (!profile) return <div className="empty">불러오는 중…</div>;

  const mine = profile.is_me;

  return (
    <div className="profile-page">
      <header className="profile-head">
        <Avatar user={profile} size={150} className="profile-ava" />
        <div>
          <div className="profile-name">
            <h1>{profile.username}</h1>
            {mine ? (
              <Link to="/accounts/edit" className="btn-outline">
                프로필 편집
              </Link>
            ) : (
              <>
                <button className={profile.is_following ? "btn-outline" : "btn-blue"} onClick={toggleFollow}>
                  {profile.is_following ? "팔로잉" : "팔로우"}
                </button>
                <Link
                  to={user ? `/direct/${profile.username}` : "/login"}
                  className="btn-outline"
                  onClick={(e) => {
                    if (!user) requireAuth(e);
                  }}
                >
                  메시지
                </Link>
              </>
            )}
          </div>
          <ul className="stats">
            <li>
              게시물 <b>{formatCount(profile.posts_count)}</b>
            </li>
            <li>
              <button onClick={() => openList("followers")}>
                팔로워 <b>{formatCount(profile.followers_count)}</b>
              </button>
            </li>
            <li>
              <button onClick={() => openList("following")}>
                팔로우 <b>{formatCount(profile.following_count)}</b>
              </button>
            </li>
          </ul>
          <div className="uname">{profile.full_name}</div>
          <p className="bio">{profile.bio}</p>
          {profile.website && (
            <a href={profile.website} target="_blank" rel="noreferrer" className="hash">
              {profile.website}
            </a>
          )}
        </div>
      </header>
      {profile.is_private && !mine && !profile.is_following ? (
        <div className="private-lock">
          <div className="private-lock-ico" aria-hidden>
            🔒
          </div>
          <b>이 계정은 비공개입니다</b>
          <p>사진을 보려면 이 계정을 팔로우하세요.</p>
        </div>
      ) : (
        <>
          <div className="tabs">
            <button className={tab === "posts" ? "on" : ""} onClick={() => setParams({})}>
              <GridIcon /> 게시물
            </button>
            {mine && (
              <button className={tab === "saved" ? "on" : ""} onClick={() => setParams({ tab: "saved" })}>
                <BookmarkIcon /> 저장됨
              </button>
            )}
          </div>
          <PostGrid posts={tab === "saved" ? saved : posts} onOpen={(p) => openPost(p.id)} />
        </>
      )}
      {list && <UserListModal title={list.title} users={list.users} onClose={() => setList(null)} onToggle={toggleInList} />}
    </div>
  );
}
