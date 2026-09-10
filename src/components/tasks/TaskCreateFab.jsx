import React from "react";
import { Button } from "@/components/ui/button";
import TaskCreateModal from "./TaskCreateModal";
import { Plus } from "lucide-react";

export default function TaskCreateFab() {
  const [open, setOpen] = React.useState(false);

  // Atualização simples: recarregar ou notificar listeners
  const handleSuccess = () => {
    // Listener na página pode interceptar 'task:created' para refetch
    // Fallback: recarrega a página para refletir imediatamente
    setTimeout(() => {
      try {
        // Tenta acionar um evento de refresh alternativo
        window.dispatchEvent(new CustomEvent("task:refresh"));
      } catch (_err) {
        // ignore CustomEvent failures
      }
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    }, 300);
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-[60] pb-[env(safe-area-inset-bottom)]">
        <Button
          onClick={() => setOpen(true)}
          className="shadow-lg gap-2 rounded-full h-12 w-12 p-0 sm:h-10 sm:w-auto sm:rounded-md sm:px-4"
          aria-label="Nova tarefa"
        >
          <Plus className="w-5 h-5 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">Nova tarefa</span>
        </Button>
      </div>

      <TaskCreateModal
        open={open}
        onOpenChange={setOpen}
        onSuccess={handleSuccess}
      />
    </>
  );
}