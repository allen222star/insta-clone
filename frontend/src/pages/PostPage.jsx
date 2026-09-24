import { useParams } from "react-router-dom";
import PostModal from "../components/PostModal";

export default function PostPage() {
  const { id } = useParams();
  return (
    <div className="page-wide">
      <PostModal postId={Number(id)} onClose={() => window.history.back()} />
    </div>
  );
}
