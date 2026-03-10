import { getBoards, createBoard, deleteBoard } from "@/actions/board-actions";
import { BOARD_BACKGROUNDS } from "@/lib/db";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateBoardButton, DeleteBoardButton } from "@/components/home-client";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const boards = await getBoards();

  async function handleCreateBoard(formData: FormData) {
    "use server";
    const name = formData.get("name") as string;
    const bg = formData.get("background") as string;
    if (!name?.trim()) return;
    const board = await createBoard(name.trim(), bg || "gradient-1");
    redirect(`/board/${board.id}`);
  }

  async function handleDeleteBoard(formData: FormData) {
    "use server";
    const id = formData.get("boardId") as string;
    if (id) {
      await deleteBoard(id);
      redirect("/");
    }
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--color-surface-0)" }}>
      {/* Header */}
      <header className="border-b" style={{ borderColor: "var(--color-border)", background: "var(--color-surface-1)" }}>
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl" style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              background: "linear-gradient(135deg, #6C5CE7, #EC4899)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>
              ◈ KanFlow
            </span>
          </div>
          <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            Your dev task boards
          </span>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-1" style={{ fontFamily: "var(--font-display)", color: "var(--color-text-primary)" }}>
              Boards
            </h1>
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              {boards.length} board{boards.length !== 1 ? "s" : ""}
            </p>
          </div>
          <CreateBoardButton action={handleCreateBoard} />
        </div>

        {boards.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4 opacity-30">◈</div>
            <h2 className="text-xl font-semibold mb-2" style={{ color: "var(--color-text-secondary)" }}>
              No boards yet
            </h2>
            <p className="text-sm mb-6" style={{ color: "var(--color-text-muted)" }}>
              Create your first board to start tracking tasks
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {boards.map((board) => {
              const bg = BOARD_BACKGROUNDS.find((b) => b.id === board.background);
              return (
                <div key={board.id} className="group relative fade-in">
                  <Link href={`/board/${board.id}`} className="block">
                    <div
                      className="rounded-xl overflow-hidden border transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-black/20"
                      style={{ borderColor: "var(--color-border)" }}
                    >
                      <div
                        className="h-24 relative"
                        style={{ background: bg?.css || "var(--color-surface-3)" }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                      </div>
                      <div className="p-4" style={{ background: "var(--color-surface-2)" }}>
                        <h3 className="font-semibold text-base mb-1 truncate" style={{ fontFamily: "var(--font-display)" }}>
                          {board.name}
                        </h3>
                        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                          Updated {new Date(board.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </Link>
                  <DeleteBoardButton boardId={board.id} action={handleDeleteBoard} />
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
