import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { postApi, userApi } from "../api";
import { useAuth, useRequireAuth } from "../AuthContext";
import { timeAgo, likeLabel } from "../utils";
import Avatar from "./Avatar";
import Caption from "./Caption";
import { BookmarkIcon, CommentIcon, HeartIcon, MoreIcon, ShareIcon } from "./Icons";
import MediaCarousel from "./MediaCarousel";
import ShareModal from "./ShareModal";
import UserListModal from "./UserListModal";

export default function PostCard({ post, onChange, onOpen }) {
  const { user } = useAuth();
  const requireAuth = useRequireAuth();
  const nav = useNavigate();
  const [data, setData] = useState(post);
  const [comment, setComment] = useState("");
  const [heart, setHeart] = useState(false);
  const [menu, setMenu] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [likers, setLikers] = useState(null);
  const [editCap, setEditCap] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => setData(post), [post]);

  async function toggleLike(e) {
    if (!requireAuth(e)) return;
    const next = !data.liked_by_me;
    setData((d) => ({ ...d, liked_by_me: next, like_count: d.like_count + (next ? 1 : -1) }));
    if (next) {
      setHeart(true);
      setTimeout(() => setHeart(false), 700);
    }
    try {
      const { data: res } = next ? await postApi.like(data.id) : await postApi.unlike(data.id);
      setData((d) => ({ ...d, liked_by_me: res.liked, like_count: res.like_count }));
      onChange?.();
    } catch {
      setData(post);
    }
  }

  async function onDoubleLike(e) {
    if (!requireAuth(e)) return;
    if (!data.liked_by_me) await toggleLike();
    else {
      setHeart(true);
      setTimeout(() => setHeart(false), 700);
    }
  }

  async function toggleSave(e) {
    if (!requireAuth(e)) return;
    const next = !data.saved_by_me;
    setData((d) => ({ ...d, saved_by_me: next }));
    try {
      next ? await postApi.save(data.id) : await postApi.unsave(data.id);
    } catch {
      setData((d) => ({ ...d, saved_by_me: !next }));
    }
  }

  async function submitComment(e) {
    e.preventDefault();
    if (!requireAuth(e)) return;
    if (!comment.trim()) return;
    await postApi.addComment(data.id, comment.trim());
    setComment("");
    setData((d) => ({ ...d, comment_count: d.comment_count + 1 }));
    onChange?.();
  }

  async function share(e) {
    if (!requireAuth(e)) return;
    setShareOpen(true);
  }

  async function showLikers() {
    const { data } = await postApi.likes(data.id);
    setLikers(data.items || []);
  }

  async function saveEdit(e) {
    e.preventDefault();
    const { data: next } = await postApi.edit(data.id, { caption: editCap, location: data.location || "" });
    setData(next);
    setEditCap(null);
  }

  async function remove() {
    if (!confirm("이 게시물을 삭제할까요?")) return;
    await postApi.remove(data.id);
    setMenu(false);
    onChange?.();
  }

  return (
    <article className="post-card">
      <header className="post-head">
        <Link to={`/${data.user.username}`} className="post-user">
          <Avatar user={data.user} size={32} />
          <div>
            <div className="uname">{data.user.username}</div>
            {data.location ? <div className="muted tiny">{data.location}</div> : null}
          </div>
        </Link>
        <span className="muted tiny">{timeAgo(data.created_at)}</span>
        <button className="icon-btn" aria-label="더 보기" onClick={() => setMenu(true)}>
          <MoreIcon />
        </button>
      </header>
      <MediaCarousel images={data.images || [data.image_url]} onDoubleClick={onDoubleLike}>
        {heart && <span className="big-heart">❤</span>}
      </MediaCarousel>
      <div className="post-actions">
        <button className="icon-btn" aria-label="좋아요" onClick={toggleLike}>
          <HeartIcon filled={data.liked_by_me} />
        </button>
        <button className="icon-btn" aria-label="댓글" onClick={() => (onOpen ? onOpen(data) : inputRef.current?.focus())}>
          <CommentIcon />
        </button>
        <button className="icon-btn" aria-label="공유" onClick={share}>
          <ShareIcon />
        </button>
        <button className="icon-btn push" aria-label="저장" onClick={toggleSave}>
          <BookmarkIcon filled={data.saved_by_me} />
        </button>
      </div>
      {data.like_count > 0 && (
        <button className="likes" onClick={showLikers}>
          {likeLabel(data.like_count)}
        </button>
      )}
      <Caption text={data.caption} username={data.user.username} />
      {data.comment_count > 0 && (
        <button className="view-comments" onClick={() => (onOpen ? onOpen(data) : nav(`/p/${data.id}`))}>
          댓글 {data.comment_count}개 모두 보기
        </button>
      )}
      <form
        className="add-comment"
        onSubmit={submitComment}
        onClick={(e) => {
          if (!user) requireAuth(e);
        }}
      >
        <input
          ref={inputRef}
          placeholder={user ? "댓글 달기..." : "로그인하고 댓글 달기..."}
          value={comment}
          readOnly={!user}
          onChange={(e) => setComment(e.target.value)}
        />
        {user ? (
          <button type="submit" disabled={!comment.trim()} className="blue">
            게시
          </button>
        ) : (
          <button type="button" className="blue" onClick={(e) => requireAuth(e)}>
            로그인
          </button>
        )}
      </form>
      {shareOpen && <ShareModal post={data} onClose={() => setShareOpen(false)} />}
      {menu && (
        <div className="modal-bg" onClick={() => setMenu(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            {user?.id === data.user.id && (
              <>
                <button
                  onClick={() => {
                    setEditCap(data.caption);
                    setMenu(false);
                  }}
                >
                  수정
                </button>
                <button className="danger" onClick={remove}>
                  삭제
                </button>
              </>
            )}
            <button
              onClick={() => {
                onOpen ? onOpen(data) : nav(`/p/${data.id}`);
                setMenu(false);
              }}
            >
              게시물로 이동
            </button>
            <button
              onClick={() => {
                share();
                setMenu(false);
              }}
            >
              공유
            </button>
            <button onClick={() => setMenu(false)}>취소</button>
          </div>
        </div>
      )}
      {likers && (
        <UserListModal
          title="좋아요"
          users={likers}
          onClose={() => setLikers(null)}
          onToggle={async (u) => {
            if (!requireAuth()) return;
            if (u.is_following) await userApi.unfollow(u.username);
            else await userApi.follow(u.username);
            setLikers((arr) => arr.map((x) => (x.id === u.id ? { ...x, is_following: !x.is_following } : x)));
          }}
        />
      )}
      {editCap != null && (
        <div className="modal-bg" onClick={() => setEditCap(null)}>
          <form className="sheet" style={{ padding: 16 }} onClick={(e) => e.stopPropagation()} onSubmit={saveEdit}>
            <h3>게시물 수정</h3>
            <textarea value={editCap} onChange={(e) => setEditCap(e.target.value)} />
            <button className="btn-blue wide" type="submit">
              완료
            </button>
          </form>
        </div>
      )}
    </article>
  );
}
