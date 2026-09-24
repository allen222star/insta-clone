import { mediaUrl } from "../api";
import { formatCount } from "../utils";

export default function PostGrid({ posts, onOpen }) {
  if (!posts?.length) return <div className="empty">게시물이 없습니다.</div>;
  return (
    <div className="post-grid">
      {posts.map((p) => (
        <button key={p.id} className="grid-item" onClick={() => onOpen?.(p)} aria-label="게시물">
          <img src={mediaUrl(p.image_url)} alt="" />
          <span className="grid-hover">
            ❤ {formatCount(p.like_count)} &nbsp; 💬 {formatCount(p.comment_count)}
          </span>
        </button>
      ))}
    </div>
  );
}
