import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { mediaUrl, notifApi } from "../api";
import { timeAgo } from "../utils";
import Avatar from "./Avatar";

const COPY = {
  like: "님이 회원님의 사진을 좋아합니다.",
  comment: "님이 댓글을 남겼습니다.",
  follow: "님이 회원님을 팔로우하기 시작했습니다.",
  message: "님이 메시지를 보냈습니다.",
};

export default function NotifPanel({ onClose, onOpenPost }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await notifApi.list();
        setItems(Array.isArray(data) ? data : []);
        await notifApi.read();
      } catch {
        setItems([]);
      }
    })();
  }, []);

  return (
    <div className="side-panel">
      <h2>알림</h2>
      <div className="panel-list">
        {items.map((n) => (
          <div className="panel-user" key={n.id}>
            <Link to={`/${n.actor.username}`} onClick={onClose}>
              <Avatar user={n.actor} size={44} />
            </Link>
            <div className="grow">
              <Link to={`/${n.actor.username}`} className="uname" onClick={onClose}>
                {n.actor.username}
              </Link>
              {COPY[n.type] || ""} <span className="muted">{timeAgo(n.created_at)}</span>
            </div>
            {n.post && (
              <button
                className="thumb"
                onClick={() => {
                  onOpenPost?.(n.post.id);
                  onClose();
                }}
              >
                <img src={mediaUrl(n.post.image_url)} alt="" />
              </button>
            )}
          </div>
        ))}
        {!items.length && <div className="empty">아직 알림이 없습니다.</div>}
      </div>
    </div>
  );
}
