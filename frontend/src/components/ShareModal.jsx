import { useEffect, useState } from "react";
import { msgApi, userApi } from "../api";
import { useAuth } from "../AuthContext";
import Avatar from "./Avatar";

export default function ShareModal({ post, onClose }) {
  const { user } = useAuth();
  const [people, setPeople] = useState([]);
  const [sent, setSent] = useState({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user?.username) return;
    userApi.following(user.username).then((r) => setPeople(r.data.items || []));
  }, [user?.username]);

  async function send(u) {
    await msgApi.send(u.username, { content: "", post_id: post.id });
    setSent((s) => ({ ...s, [u.id]: true }));
  }

  async function copy() {
    await navigator.clipboard.writeText(`${window.location.origin}/p/${post.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="sheet list-sheet" onClick={(e) => e.stopPropagation()}>
        <h3>공유</h3>
        <div className="panel-list">
          {people.map((u) => (
            <div className="panel-user" key={u.id}>
              <Avatar user={u} size={40} />
              <div className="grow">
                <div className="uname">{u.username}</div>
                <div className="muted tiny">{u.full_name}</div>
              </div>
              <button className="btn-blue" disabled={sent[u.id]} onClick={() => send(u)}>
                {sent[u.id] ? "보냄" : "보내기"}
              </button>
            </div>
          ))}
          {!people.length && <div className="empty">팔로우한 사람이 없습니다. 링크를 복사하세요.</div>}
        </div>
        <button onClick={copy}>{copied ? "복사됨" : "링크 복사"}</button>
        <button onClick={onClose}>닫기</button>
      </div>
    </div>
  );
}
