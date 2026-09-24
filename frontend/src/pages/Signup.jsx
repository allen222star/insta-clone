import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { LogoMark } from "../components/Icons";
import { errMsg } from "../utils";

export default function Signup() {
  const { signup } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ email: "", full_name: "", username: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
  const usernameValid = /^[a-zA-Z0-9._]{3,30}$/.test(form.username);
  const ready = form.email && form.username && form.password.length >= 6;

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    if (!emailValid) {
      setErr("올바른 이메일 형식을 입력해주세요.");
      return;
    }
    if (!usernameValid) {
      setErr("사용자 이름은 3~30자의 영문, 숫자, 마침표, 밑줄만 사용할 수 있습니다.");
      return;
    }
    setBusy(true);
    try {
      await signup(form);
      nav("/");
    } catch (e) {
      setErr(errMsg(e, "가입에 실패했습니다."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-col">
        <form className="auth-card" onSubmit={onSubmit}>
          <LogoMark className="logo-word lg" />
          <p className="muted center">친구들의 사진과 동영상을 보려면 가입하세요.</p>
          <input placeholder="이메일" value={form.email} onChange={(e) => set("email", e.target.value)} />
          <input placeholder="성명" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
          <input placeholder="사용자 이름" value={form.username} onChange={(e) => set("username", e.target.value)} />
          <input type="password" placeholder="비밀번호" value={form.password} onChange={(e) => set("password", e.target.value)} />
          <button className="btn-blue wide" disabled={busy || !ready}>
            {busy ? "가입 중…" : "가입"}
          </button>
          {err && <p className="error">{err}</p>}
        </form>
        <div className="auth-card slim">
          계정이 있으신가요? <Link to="/login">로그인</Link>
        </div>
        <p className="muted tiny center">
          <Link to="/">피드로 돌아가기</Link>
        </p>
      </div>
    </div>
  );
}
