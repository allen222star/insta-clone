import { timeAgo } from "../utils";

export default function TimeAgo({ iso, className = "muted tiny" }) {
  return <span className={className}>{timeAgo(iso)}</span>;
}
