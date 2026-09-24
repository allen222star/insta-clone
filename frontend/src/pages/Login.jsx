import { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { LogoMark } from "../components/Icons";
import { errMsg, safeNextPath } from "../utils";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [params] = useSearchParams();
  const next = safeNextPath(params.get("next") || loc.state?.from);
  const [username, setUsername] = useState("test@gmail.com");
  const [password, setPassword] = useState("12345");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await login(username, password);
      nav(next);
    } catch (e) {
      setErr(errMsg(e, "로그인에 실패했습니다."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-layout">
        <div className="phone-stage" aria-hidden="true">
          <div className="phone-shell back">
            <img src="https://picsum.photos/id/1015/390/844" alt="" />
          </div>
          <div className="phone-shell front">
            <img src="https://picsum.photos/id/1011/390/844" alt="" />
          </div>
        </div>
        <div className="auth-col">
          <form className="auth-card" onSubmit={onSubmit}>
            <LogoMark className="logo-word lg" />
            <input
              placeholder="전화번호, 사용자 이름 또는 이메일"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <input type="password" placeholder="비밀번호" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button className="btn-blue wide" disabled={busy || !username || !password}>
              {busy ? "로그인 중…" : "로그인"}
            </button>
            {err && <p className="error">{err}</p>}
            <p className="muted tiny center">테스트 계정: test@gmail.com / 12345</p>
          </form>
          <div className="auth-card slim">
            계정이 없으신가요? <Link to="/signup">가입하기</Link>
          </div>
          <p className="muted tiny center">
            <Link to="/">피드로 돌아가기</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
