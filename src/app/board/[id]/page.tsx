import { getBoardWithData, getBoards } from "@/actions/board-actions";
import { notFound } from "next/navigation";
import BoardClient from "@/components/board-client";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BoardPage({ params }: Props) {
  const { id } = await params;
  const [result, boards] = await Promise.all([
    getBoardWithData(id),
    getBoards(),
  ]);

  if (!result) notFound();

  return (
    <BoardClient
      board={result.board}
      initialColumns={result.columns}
      allLabels={result.labels}
      allBoards={boards}
    />
  );
}
