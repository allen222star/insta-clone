import NotifPanel from "../components/NotifPanel";
import { useOutletContext } from "react-router-dom";

export default function NotificationsPage() {
  const { openPost } = useOutletContext();
  return (
    <div className="page-narrow">
      <NotifPanel onClose={() => {}} onOpenPost={openPost} />
    </div>
  );
}
