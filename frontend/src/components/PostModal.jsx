import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { postApi } from "../api";
import { useAuth, useRequireAuth } from "../AuthContext";
import { timeAgo, likeLabel } from "../utils";
import Avatar from "./Avatar";
import Caption from "./Caption";
import { BookmarkIcon, CloseIcon, HeartIcon, ShareIcon } from "./Icons";
import MediaCarousel from "./MediaCarousel";

export default function PostModal({ postId, onClose, onDeleted }) {
  const { user } = useAuth();
  const requireAuth = useRequireAuth();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);

  async function load() {
    const [{ data: p }, { data: c }] = await Promise.all([postApi.get(postId), postApi.comments(postId, { limit: 100 })]);
    setPost(p);
    setComments(c.items || []);
  }

  useEffect(() => {
    load();
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [postId]);

  if (!post) return null;

  async function toggleLike(e) {
    if (!requireAuth(e)) return;
    const next = !post.liked_by_me;
    setPost((d) => ({ ...d, liked_by_me: next, like_count: d.like_count + (next ? 1 : -1) }));
    const { data: res } = next ? await postApi.like(post.id) : await postApi.unlike(post.id);
    setPost((d) => ({ ...d, liked_by_me: res.liked, like_count: res.like_count }));
  }

  async function toggleSave(e) {
    if (!requireAuth(e)) return;
    const next = !post.saved_by_me;
    setPost((d) => ({ ...d, saved_by_me: next }));
    next ? await postApi.save(post.id) : await postApi.unsave(post.id);
  }

  async function add(e) {
    e.preventDefault();
    if (!requireAuth(e)) return;
    if (!text.trim()) return;
    const { data } = await postApi.addComment(post.id, text.trim());
    setComments((c) => [...c, data]);
    setText("");
    setPost((p) => ({ ...p, comment_count: p.comment_count + 1 }));
  }

  async function delComment(id) {
    await postApi.deleteComment(id);
    setComments((c) => c.filter((x) => x.id !== id));
  }

  async function share() {
    await navigator.clipboard.writeText(`${window.location.origin}/p/${post.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function delPost() {
    if (!confirm("이 게시물을 삭제할까요?")) return;
    await postApi.remove(post.id);
    onDeleted?.();
    onClose();
  }

  return (
    <div className="modal-bg post-modal-bg" onClick={onClose}>
      <button className="modal-x" aria-label="닫기" onClick={onClose}>
        <CloseIcon />
      </button>
      <div className="post-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pm-media">
          <MediaCarousel images={post.images || [post.image_url]} />
        </div>
        <div className="pm-side">
          <header className="post-head">
            <Link to={`/${post.user.username}`} className="post-user" onClick={onClose}>
              <Avatar user={post.user} size={32} />
              <div>
                <div className="uname">{post.user.username}</div>
                {post.location ? <div className="muted tiny">{post.location}</div> : null}
              </div>
            </Link>
            {user?.id === post.user.id && (
              <button className="text-btn danger" onClick={delPost}>
                삭제
              </button>
            )}
          </header>
          <div className="pm-comments">
            {post.caption && (
              <div className="cmt-row">
                <Avatar user={post.user} size={32} />
                <div>
                  <Caption text={post.caption} username={post.user.username} />
                  <div className="muted tiny">{timeAgo(post.created_at)}</div>
                </div>
              </div>
            )}
            {comments.map((c) => (
              <div className="cmt-row" key={c.id}>
                <Link to={`/${c.user.username}`} onClick={onClose}>
                  <Avatar user={c.user} size={32} />
                </Link>
                <div className="grow">
                  <Caption text={c.content} username={c.user.username} />
                  <div className="muted tiny">{timeAgo(c.created_at)}</div>
                </div>
                {(user?.id === c.user.id || user?.id === post.user.id) && (
                  <button className="tiny muted" onClick={() => delComment(c.id)}>
                    삭제
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="post-actions">
            <button className="icon-btn" onClick={toggleLike} aria-label="좋아요">
              <HeartIcon filled={post.liked_by_me} />
            </button>
            <button className="icon-btn" onClick={share} aria-label="공유">
              <ShareIcon />
            </button>
            <button className="icon-btn push" onClick={toggleSave} aria-label="저장">
              <BookmarkIcon filled={post.saved_by_me} />
            </button>
          </div>
          {post.like_count > 0 && <div className="likes">{likeLabel(post.like_count)}</div>}
          <div className="muted tiny pad-h">{timeAgo(post.created_at)}</div>
          <form
            className="add-comment"
            onSubmit={add}
            onClick={(e) => {
              if (!user) requireAuth(e);
            }}
          >
            <input
              placeholder={user ? "댓글 달기..." : "로그인하고 댓글 달기..."}
              value={text}
              readOnly={!user}
              onChange={(e) => setText(e.target.value)}
            />
            {user ? (
              <button className="blue" disabled={!text.trim()}>
                게시
              </button>
            ) : (
              <button type="button" className="blue" onClick={(e) => requireAuth(e)}>
                로그인
              </button>
            )}
          </form>
          {copied && <div className="toast">링크가 복사되었습니다</div>}
        </div>
      </div>
    </div>
  );
}
