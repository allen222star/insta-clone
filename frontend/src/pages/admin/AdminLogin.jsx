import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../AuthContext";
import { LogoMark } from "../../components/Icons";
import { errMsg } from "../../utils";

export default function AdminLogin() {
  const { user, login, logout } = useAuth();
  const nav = useNavigate();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("pass123");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  if (user?.is_admin) return <Navigate to="/admin" replace />;

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const me = await login(username, password);
      if (!me?.is_admin) {
        logout();
        setErr("관리자 계정이 아닙니다.");
        return;
      }
      nav("/admin", { replace: true });
    } catch (e) {
      setErr(errMsg(e, "로그인에 실패했습니다."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-login">
      <form className="admin-login-card" onSubmit={onSubmit}>
        <LogoMark className="logo-word lg" />
        <h1>관리자 로그인</h1>
        <p className="muted center">회원·게시물·통계를 관리합니다.</p>
        {user && !user.is_admin && <p className="error">이 계정은 관리자 권한이 없습니다.</p>}
        <input placeholder="사용자 이름" value={username} onChange={(e) => setUsername(e.target.value)} />
        <input type="password" placeholder="비밀번호" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="btn-blue wide" disabled={busy || !username || !password}>
          {busy ? "로그인 중…" : "관리자 로그인"}
        </button>
        {err && <p className="error">{err}</p>}
        <p className="muted tiny center">admin / pass123</p>
        <p className="muted tiny center">
          <Link to="/">사이트로 돌아가기</Link>
        </p>
      </form>
    </div>
  );
}
