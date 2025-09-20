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
      } catch {}
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    }, 300);
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-[60]">
        <Button onClick={() => setOpen(true)} className="shadow-lg gap-2">
          <Plus className="w-4 h-4" />
          Nova tarefa
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