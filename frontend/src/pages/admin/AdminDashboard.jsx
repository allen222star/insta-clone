import { useEffect, useState } from "react";
import { adminApi } from "../../api";
import { formatCount, errMsg } from "../../utils";

function Card({ label, value, hint }) {
  return (
    <div className="admin-card">
      <div className="muted tiny">{label}</div>
      <div className="admin-metric">{formatCount(value)}</div>
      {hint && <div className="muted tiny">{hint}</div>}
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    adminApi
      .stats()
      .then((r) => setData(r.data))
      .catch((e) => setErr(errMsg(e)));
  }, []);

  if (err) return <div className="empty">{err}</div>;
  if (!data) return <div className="empty">불러오는 중…</div>;

  const max = Math.max(data.series_max || 1, 1);

  return (
    <div className="admin-page">
      <h1>통계 대시보드</h1>
      <p className="muted">서비스 현황을 한눈에 확인합니다.</p>
      <div className="admin-cards">
        <Card label="전체 회원" value={data.users} hint={`오늘 ${data.users_today} · 7일 ${data.users_week}`} />
        <Card label="게시물" value={data.posts} hint={`오늘 ${data.posts_today} · 7일 ${data.posts_week}`} />
        <Card label="댓글" value={data.comments} />
        <Card label="좋아요" value={data.likes} />
        <Card label="팔로우" value={data.follows} />
        <Card label="메시지" value={data.messages} />
        <Card label="활성 스토리" value={data.stories} />
      </div>
      <h2>최근 14일</h2>
      <div className="admin-chart">
        {data.series.map((row) => (
          <div className="admin-chart-col" key={row.date}>
            <div className="admin-bars">
              <div className="admin-bar users" style={{ height: `${(row.users / max) * 100}%` }} title={`가입 ${row.users}`} />
              <div className="admin-bar posts" style={{ height: `${(row.posts / max) * 100}%` }} title={`게시 ${row.posts}`} />
            </div>
            <span>{row.date.slice(5)}</span>
          </div>
        ))}
      </div>
      <div className="admin-legend">
        <span>
          <i className="users" /> 가입
        </span>
        <span>
          <i className="posts" /> 게시물
        </span>
      </div>
    </div>
  );
}
