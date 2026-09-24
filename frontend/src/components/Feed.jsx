import PostCard from "./PostCard";

export default function Feed({ items, onOpen, onChange, fallback, more, onMore }) {
  return (
    <>
      {fallback && <p className="fallback-note">아직 팔로우한 사람이 없어 탐색 게시물을 보여줍니다.</p>}
      {items.map((p) => (
        <PostCard key={p.id} post={p} onOpen={(post) => onOpen(post.id)} onChange={onChange} />
      ))}
      {more && (
        <button className="btn-outline wide" onClick={onMore}>
          더 보기
        </button>
      )}
      {!items.length && <div className="empty">아직 피드가 비어 있습니다. 사진을 올려 보세요.</div>}
    </>
  );
}
