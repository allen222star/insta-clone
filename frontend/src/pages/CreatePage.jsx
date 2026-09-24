import CreateModal from "../components/CreateModal";
import { useNavigate } from "react-router-dom";

export default function CreatePage() {
  const nav = useNavigate();
  return <CreateModal onClose={() => nav(-1)} onCreated={() => nav("/")} />;
}
