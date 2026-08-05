import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Pending = {
  prev: any[];
  next: any[];
  apply: (items: any[]) => void | Promise<void>;
  label?: string;
};

/**
 * Pede confirmação antes de salvar uma nova ordem (drag-and-drop) e
 * oferece "Desfazer" depois de salvar.
 */
export function useConfirmReorder() {
  const [pending, setPending] = useState<Pending | null>(null);

  const requestReorder = <T,>(
    prev: T[],
    next: T[],
    apply: (items: T[]) => void | Promise<void>,
    label?: string
  ) => {
    setPending({ prev: [...prev], next: [...next], apply: apply as any, label });
  };

  const confirm = async () => {
    const p = pending;
    setPending(null);
    if (!p) return;
    await p.apply(p.next);
    toast.success("Nova ordem salva!", {
      duration: 10000,
      action: {
        label: "Desfazer",
        onClick: async () => {
          await p.apply(p.prev);
          toast.info("Ordem anterior restaurada.");
        },
      },
    });
  };

  const dialog = (
    <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Salvar nova ordem?</AlertDialogTitle>
          <AlertDialogDescription>
            {pending?.label
              ? `A ordem de "${pending.label}" será atualizada no site.`
              : "A nova ordem será aplicada no site."}{" "}
            Você poderá desfazer logo depois de salvar.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={confirm}>Salvar ordem</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { requestReorder, confirmReorderDialog: dialog };
}
