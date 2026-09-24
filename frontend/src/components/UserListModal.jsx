import { Link } from "react-router-dom";
import Avatar from "./Avatar";

export default function UserListModal({ title, users, onClose, onToggle }) {
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="sheet list-sheet" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <div className="panel-list">
          {users.map((u) => (
            <div className="panel-user" key={u.id}>
              <Link to={`/${u.username}`} className="post-user grow" onClick={onClose}>
                <Avatar user={u} size={40} />
                <div>
                  <div className="uname">{u.username}</div>
                  <div className="muted tiny">{u.full_name}</div>
                </div>
              </Link>
              {!u.is_me && (
                <button className={u.is_following ? "btn-outline" : "btn-blue"} onClick={() => onToggle(u)}>
                  {u.is_following ? "팔로잉" : "팔로우"}
                </button>
              )}
            </div>
          ))}
          {!users.length && <div className="empty">아직 없습니다.</div>}
        </div>
        <button onClick={onClose}>닫기</button>
      </div>
    </div>
  );
}
