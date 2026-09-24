import { useEffect, useState } from "react";
import { mediaUrl, storyApi } from "../api";
import { useAuth } from "../AuthContext";
import Avatar from "./Avatar";
import { CloseIcon } from "./Icons";

export default function StoryViewer({ groups, start, onClose, onChange }) {
  const { user } = useAuth();
  const [gi, setGi] = useState(start);
  const [si, setSi] = useState(0);

  const group = groups[gi];
  const item = group?.items[si];

  useEffect(() => {
    const t = setTimeout(() => next(), 5000);
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [gi, si]);

  function next() {
    if (!group) return onClose();
    if (si + 1 < group.items.length) setSi(si + 1);
    else if (gi + 1 < groups.length) {
      setGi(gi + 1);
      setSi(0);
    } else onClose();
  }

  function prev() {
    if (si > 0) setSi(si - 1);
    else if (gi > 0) {
      setGi(gi - 1);
      setSi(groups[gi - 1].items.length - 1);
    }
  }

  async function remove() {
    await storyApi.remove(item.id);
    onChange?.();
    onClose();
  }

  if (!item) return null;

  return (
    <div className="story-viewer">
      <button className="modal-x" onClick={onClose} aria-label="닫기">
        <CloseIcon />
      </button>
      <div className="story-frame">
        <div className="story-bars">
          {group.items.map((_, i) => (
            <span key={i} className={i <= si ? "on" : ""} />
          ))}
        </div>
        <div className="story-top">
          <Avatar user={group.user} size={32} />
          <b>{group.user.username}</b>
          {user?.id === group.user.id && (
            <button className="text-btn" onClick={remove}>
              삭제
            </button>
          )}
        </div>
        <img src={mediaUrl(item.image_url)} alt="" />
        <button className="hit left" onClick={prev} aria-label="이전" />
        <button className="hit right" onClick={next} aria-label="다음" />
      </div>
    </div>
  );
}
