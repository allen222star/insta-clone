import { useState } from "react";

const FAQS = [
  {
    q: "비밀번호를 잊어버렸어요.",
    a: "설정 → 보안에서 이전 비밀번호를 입력한 뒤 새 비밀번호로 바꿀 수 있습니다. 로그아웃된 상태라면 데모 계정 demo / demo1234 또는 테스트 계정 test@gmail.com / 12345 로 다시 들어와 보세요.",
  },
  {
    q: "게시물이 보이지 않아요.",
    a: "홈 피드는 내가 팔로우한 사람과 내 글을 보여줍니다. 팔로우가 없으면 탐색 게시물로 대체됩니다. 비공개 계정의 글은 팔로우 후에만 볼 수 있습니다.",
  },
  {
    q: "계정을 비공개로 만들려면?",
    a: "설정 → 개인정보에서 ‘비공개 계정’을 켜면 됩니다. 다른 사람은 팔로우한 뒤에만 게시물을 볼 수 있습니다.",
  },
  {
    q: "메시지를 보내려면?",
    a: "왼쪽 메뉴의 메시지에서 대화를 열거나, 다른 사람 프로필의 메시지 버튼을 누르세요. 로그인이 필요합니다.",
  },
  {
    q: "알림이 오지 않아요.",
    a: "설정 → 알림에서 좋아요·댓글·팔로우·메시지·스토리 토글이 켜져 있는지 확인하세요.",
  },
];

export default function HelpSettings() {
  const [open, setOpen] = useState(0);

  return (
    <div className="settings-panel">
      <h2>도움말</h2>
      <p className="settings-lead">자주 묻는 질문과 이 클론 앱에 대한 안내입니다.</p>
      <div className="help-list">
        {FAQS.map((item, i) => (
          <div className={`help-item ${open === i ? "open" : ""}`} key={item.q}>
            <button type="button" onClick={() => setOpen(open === i ? -1 : i)}>
              {item.q}
              <span>{open === i ? "−" : "+"}</span>
            </button>
            {open === i && <p>{item.a}</p>}
          </div>
        ))}
      </div>
      <div className="help-about">
        <h3>이 앱 정보</h3>
        <p>학습용 Andygram 클론입니다. 실제 Andygram 계정, 광고, 쇼핑, 라이브, 동영상 릴스는 포함하지 않습니다.</p>
        <ul>
          <li>버전 1.0.0</li>
          <li>React · FastAPI · SQLite</li>
        </ul>
      </div>
    </div>
  );
}
