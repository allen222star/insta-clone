import { useState } from "react";
import { mediaUrl } from "../api";

export default function MediaCarousel({ images, onDoubleClick, children }) {
  const list = images?.length ? images : [];
  const [i, setI] = useState(0);
  if (!list.length) return null;
  const cur = list[Math.min(i, list.length - 1)];

  return (
    <div className="post-media" onDoubleClick={onDoubleClick}>
      <img src={mediaUrl(cur)} alt="" />
      {list.length > 1 && (
        <>
          {i > 0 && (
            <button className="caro-btn left" aria-label="이전" onClick={() => setI(i - 1)}>
              ‹
            </button>
          )}
          {i < list.length - 1 && (
            <button className="caro-btn right" aria-label="다음" onClick={() => setI(i + 1)}>
              ›
            </button>
          )}
          <span className="caro-dots">
            {list.map((_, n) => (
              <i key={n} className={n === i ? "on" : ""} />
            ))}
          </span>
        </>
      )}
      {children}
    </div>
  );
}
