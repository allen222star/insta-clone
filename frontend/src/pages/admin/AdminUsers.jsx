import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi, mediaUrl } from "../../api";
import { errMsg, formatCount, formatDateTime } from "../../utils";

export default function AdminUsers() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");

  async function load(term = q) {
    try {
      const { data } = await adminApi.users({ q: term, limit: 50 });
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

  async function remove(u) {
    if (u.is_admin) return;
    if (!confirm(`${u.username} 계정을 탈퇴 처리할까요? 게시물과 메시지가 모두 삭제됩니다.`)) return;
    setBusy(u.username);
    try {
      await adminApi.deleteUser(u.username);
      setItems((list) => list.filter((x) => x.id !== u.id));
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="admin-page">
      <h1>회원 관리</h1>
      <p className="muted">가입일을 확인하고 계정을 탈퇴 처리할 수 있습니다.</p>
      <input className="admin-search" placeholder="사용자 이름, 이메일, 이름 검색" value={q} onChange={(e) => setQ(e.target.value)} />
      {err && <p className="error">{err}</p>}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>회원</th>
              <th>이메일</th>
              <th>가입일</th>
              <th>게시물</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((u) => (
              <tr key={u.id}>
                <td>
                  <div className="admin-user">
                    {u.avatar_url ? <img src={mediaUrl(u.avatar_url)} alt="" /> : <span className="admin-ava">{u.username[0]}</span>}
                    <div>
                      <Link to={`/${u.username}`} className="uname">
                        {u.username}
                      </Link>
                      <div className="muted tiny">
                        {u.full_name || "이름 없음"}
                        {u.is_admin ? " · 관리자" : ""}
                        {u.is_private ? " · 비공개" : ""}
                      </div>
                    </div>
                  </div>
                </td>
                <td>{u.email}</td>
                <td>{formatDateTime(u.created_at)}</td>
                <td>{formatCount(u.posts_count)}</td>
                <td>
                  {u.is_admin ? (
                    <span className="muted tiny">보호됨</span>
                  ) : (
                    <button className="danger" disabled={busy === u.username} onClick={() => remove(u)}>
                      탈퇴
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length && <div className="empty">회원이 없습니다.</div>}
      </div>
    </div>
  );
}
