export function timeAgo(iso) {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  const now = Date.now();
  const s = Math.max(0, Math.floor((now - then) / 1000));
  if (s < 60) return "방금 전";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}분`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}주`;
  return new Date(iso).toLocaleDateString("ko-KR");
}

export function formatDateTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
}

export function formatCount(n) {
  if (n == null) return "0";
  if (n >= 10000) return `${(n / 10000).toFixed(1).replace(/\.0$/, "")}만`;
  return n.toLocaleString("ko-KR");
}

export function likeLabel(n) {
  return `좋아요 ${formatCount(n)}개`;
}

export function errMsg(e, fallback = "요청을 처리하지 못했습니다.") {
  const detail = e?.response?.data?.detail;
  if (typeof detail === "string" && detail) return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg;
  return fallback;
}

export function safeNextPath(value, fallback = "/") {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  if (value.startsWith("/login") || value.startsWith("/signup")) return fallback;
  return value;
}

export function loginPath(from = "/") {
  const next = safeNextPath(from);
  return next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`;
}
