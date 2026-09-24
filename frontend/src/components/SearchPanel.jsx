import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { postApi, userApi } from "../api";
import Avatar from "./Avatar";

export default function SearchPanel({ onClose }) {
  const [q, setQ] = useState("");
  const [users, setUsers] = useState([]);
  const [tags, setTags] = useState([]);

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const [{ data: u }, { data: h }] = await Promise.all([userApi.search(q), postApi.hashtags(q)]);
        setUsers(u.items || []);
        setTags(h.items || []);
      } catch {
        setUsers([]);
        setTags([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="side-panel">
      <h2>검색</h2>
      <input autoFocus placeholder="검색" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="panel-list">
        {tags.map((tag) => (
          <Link key={tag.name} to={`/explore/tags/${tag.name}`} className="panel-user" onClick={onClose}>
            <span className="hash-bubble">#</span>
            <div>
              <div className="uname">#{tag.name}</div>
              <div className="muted">게시물 {tag.posts_count}</div>
            </div>
          </Link>
        ))}
        {users.map((u) => (
          <Link key={u.id} to={`/${u.username}`} className="panel-user" onClick={onClose}>
            <Avatar user={u} size={44} />
            <div>
              <div className="uname">{u.username}</div>
              <div className="muted">{u.full_name}</div>
            </div>
          </Link>
        ))}
        {q && !users.length && !tags.length && <div className="empty">검색 결과가 없습니다.</div>}
      </div>
    </div>
  );
}
