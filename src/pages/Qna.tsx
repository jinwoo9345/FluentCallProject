import { BoardPage } from '../components/Board/BoardPage';

export default function Qna() {
  return (
    <BoardPage
      collectionName="qna_posts"
      title="Q&A 게시판"
      description="수업·수강권·결제 등 EnglishBites 이용 중 궁금한 점을 자유롭게 질문해 주세요. 회원 간 답변이 오갈 수 있고, 관리자가 확인 후 답변을 달기도 합니다."
      accentColor="blue"
    />
  );
}
