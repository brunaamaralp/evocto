import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { SurveyResponse } from "@/api/entities";
import { useSession } from "@/components/auth/SessionManager";
import { toast } from "sonner";

const STORAGE_KEY = "evocto_last_survey_ts";

export default function SatisfactionSurvey() {
  const { user } = useSession();
  const [visible, setVisible] = useState(false);
  const [rating, setRating] = useState(null);
  const [comment, setComment] = useState("");

  useEffect(() => {
    const last = Number(localStorage.getItem(STORAGE_KEY) || 0);
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - last > sevenDays) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const page = typeof window !== "undefined" ? window.location.pathname : "";

  const submit = async () => {
    if (rating == null) {
      toast.message("Selecione uma nota de 0 a 10");
      return;
    }
    try {
      await SurveyResponse.create({
        agencyId: user?.agencyId,
        userId: user?.id || null,
        type: "pulse",
        rating,
        comment: comment || null,
        page,
        context: { source: "auto-weekly" }
      });
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
      toast.success("Obrigado pelo seu feedback!");
      setVisible(false);
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível salvar agora.");
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-xl">
      <Card className="shadow-lg border-slate-200">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold text-slate-900">Como foi sua experiência hoje?</div>
              <div className="text-sm text-slate-600">Dê uma nota de 0 a 10</div>
            </div>
            <button className="text-slate-400 hover:text-slate-600" onClick={() => setVisible(false)} aria-label="Fechar pesquisa">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-1">
            {[...Array(11)].map((_, n) => (
              <button
                key={n}
                onClick={() => setRating(n)}
                className={`h-8 w-8 rounded-md text-sm font-medium border ${rating === n ? "bg-slate-900 text-white border-slate-900" : "bg-white hover:bg-slate-50 border-slate-300"}`}
                aria-pressed={rating === n}
              >
                {n}
              </button>
            ))}
          </div>

          <textarea
            placeholder="Quer nos contar algo específico? (opcional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="mt-3 w-full border rounded-md p-2 text-sm border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
            rows={3}
          />

          <div className="mt-3 flex justify-end">
            <Button onClick={submit}>Enviar</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}