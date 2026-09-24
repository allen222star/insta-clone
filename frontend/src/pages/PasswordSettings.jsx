import { useState } from "react";
import { authApi } from "../api";
import { useAuth } from "../AuthContext";
import { errMsg } from "../utils";

export default function PasswordSettings() {
  const { user } = useAuth();
  const [oldPassword, setOld] = useState("");
  const [nextPassword, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(e) {
    e.preventDefault();
    setErr("");
    setOk("");
    if (nextPassword !== confirm) {
      setErr("새 비밀번호가 일치하지 않습니다.");
      return;
    }
    setBusy(true);
    try {
      await authApi.changePassword({ old_password: oldPassword, new_password: nextPassword });
      setOk("비밀번호가 변경되었습니다.");
      setOld("");
      setNext("");
      setConfirm("");
    } catch (e) {
      setErr(errMsg(e, "비밀번호를 변경하지 못했습니다."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="settings-panel" onSubmit={save}>
      <h2>보안</h2>
      <p className="settings-lead">비밀번호를 정기적으로 바꾸면 계정을 더 안전하게 지킬 수 있습니다.</p>
      <div className="settings-id-card">
        <div className="uname">{user.username}</div>
        <div className="muted">{user.email}</div>
      </div>
      <label>
        이전 비밀번호
        <input type="password" autoComplete="current-password" value={oldPassword} onChange={(e) => setOld(e.target.value)} required />
      </label>
      <label>
        새 비밀번호
        <input type="password" autoComplete="new-password" value={nextPassword} onChange={(e) => setNext(e.target.value)} required minLength={6} />
      </label>
      <label>
        새 비밀번호 확인
        <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} />
      </label>
      {err && <p className="error">{err}</p>}
      {ok && <p className="settings-saved">{ok}</p>}
      <button className="btn-blue" disabled={busy || !oldPassword || !nextPassword}>
        비밀번호 변경
      </button>
    </form>
  );
}
