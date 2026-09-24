import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi, mediaUrl } from "../../api";
import { errMsg, formatCount, formatDateTime } from "../../utils";

export default function AdminPosts() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(null);

  async function load(term = q) {
    try {
      const { data } = await adminApi.posts({ q: term, limit: 50 });
      setItems(data.items || []);
      setErr("");
    } catch (e) {
      setErr(errMsg(e));
    }
  }

  useEffect(() => {
    const t = setTimeout(() => load(q), 200);
    return () => clearTimeout(t);
  }, [q]);

  async function remove(p) {
    if (!confirm("이 게시물을 삭제할까요?")) return;
    setBusy(p.id);
    try {
      await adminApi.deletePost(p.id);
      setItems((list) => list.filter((x) => x.id !== p.id));
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="admin-page">
      <h1>게시물 관리</h1>
      <p className="muted">게시물을 검색하고 삭제할 수 있습니다.</p>
      <input className="admin-search" placeholder="캡션 또는 작성자 검색" value={q} onChange={(e) => setQ(e.target.value)} />
      {err && <p className="error">{err}</p>}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>게시물</th>
              <th>작성자</th>
              <th>작성일</th>
              <th>반응</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id}>
                <td>
                  <div className="admin-post">
                    <img src={mediaUrl(p.image_url)} alt="" />
                    <div>
                      <Link to={`/p/${p.id}`} className="uname">
                        #{p.id}
                      </Link>
                      <div className="muted tiny admin-clip">{p.caption || "캡션 없음"}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <Link to={`/${p.user?.username}`}>{p.user?.username}</Link>
                </td>
                <td>{formatDateTime(p.created_at)}</td>
                <td>
                  좋아요 {formatCount(p.like_count)} · 댓글 {formatCount(p.comment_count)}
                </td>
                <td>
                  <button className="danger" disabled={busy === p.id} onClick={() => remove(p)}>
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length && <div className="empty">게시물이 없습니다.</div>}
      </div>
    </div>
  );
}
