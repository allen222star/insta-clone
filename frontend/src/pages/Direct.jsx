import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { mediaUrl, msgApi, userApi } from "../api";
import { useAuth } from "../AuthContext";
import Avatar from "../components/Avatar";
import { timeAgo } from "../utils";

export default function Direct() {
  const { username } = useParams();
  const { user } = useAuth();
  const [cons, setCons] = useState([]);
  const [thread, setThread] = useState([]);
  const [other, setOther] = useState(null);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const endRef = useRef();

  async function loadCons() {
    try {
      const { data } = await msgApi.conversations();
      setCons(Array.isArray(data) ? data : []);
    } catch {
      setCons([]);
    }
  }

  async function loadThread(name) {
    try {
      const [{ data: t }, { data: u }] = await Promise.all([msgApi.thread(name, { limit: 100 }), userApi.get(name)]);
      setThread(t.items || []);
      setOther(u);
      setErr("");
      loadCons();
    } catch {
      setThread([]);
      setOther(null);
      setErr("대화를 불러오지 못했습니다.");
    }
  }

  useEffect(() => {
    loadCons();
  }, []);

  useEffect(() => {
    if (username) loadThread(username);
    else {
      setThread([]);
      setOther(null);
    }
  }, [username]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread]);

  async function send(e) {
    e.preventDefault();
    if (!text.trim() || !username) return;
    const { data } = await msgApi.send(username, text.trim());
    setThread((t) => [...t, data]);
    setText("");
    loadCons();
  }

  return (
    <div className="dm">
      <aside className="dm-list">
        <header className="dm-inbox-head">
          <h2>{user.username}</h2>
        </header>
        {cons.map((c) => (
          <Link key={c.user.id} to={`/direct/${c.user.username}`} className={`dm-row ${username === c.user.username ? "on" : ""}`}>
            <Avatar user={c.user} size={44} />
            <div className="grow">
              <div className="uname">{c.user.username}</div>
              <div className="muted tiny">
                {c.last_message} · {timeAgo(c.last_at)}
              </div>
            </div>
            {c.unread_count > 0 && <span className="dot" />}
          </Link>
        ))}
        {!cons.length && <div className="empty">아직 메시지가 없습니다.</div>}
      </aside>
      <section className="dm-thread">
        {!username && <div className="empty tall">친구에게 메시지를 보내 보세요.</div>}
        {username && err && !other && <div className="empty tall">{err}</div>}
        {username && other && (
          <>
            <header className="dm-head">
              <Link to={`/${other.username}`} className="post-user">
                <Avatar user={other} size={28} />
                <b>{other.username}</b>
              </Link>
            </header>
            <div className="dm-msgs">
              {thread.map((m) => (
                <div key={m.id} className={`bubble ${m.sender_id === user.id ? "mine" : ""}`}>
                  {m.post && (
                    <Link to={`/p/${m.post.id}`} className="share-thumb">
                      <img src={mediaUrl(m.post.image_url)} alt="" />
                    </Link>
                  )}
                  {m.content}
                </div>
              ))}
              <div ref={endRef} />
            </div>
            <form className="dm-input" onSubmit={send}>
              <input placeholder="메시지 입력..." value={text} onChange={(e) => setText(e.target.value)} />
              <button type="submit" className="blue" disabled={!text.trim()}>
                보내기
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
