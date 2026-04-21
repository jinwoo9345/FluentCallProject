import { BoardPage } from '../components/Board/BoardPage';

export default function InfoBoard() {
  return (
    <BoardPage
      collectionName="info_posts"
      title="정보 게시판"
      description="영어 학습 팁, 튜터 추천 방법, 학습 루틴, 공지사항 등 수강생들끼리 나누는 정보 공간입니다."
      accentColor="emerald"
    />
  );
}
