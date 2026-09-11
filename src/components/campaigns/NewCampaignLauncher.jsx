import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, Keyboard, Sparkles, CalendarDays, X, Loader2, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import { useSession } from '@/components/auth/SessionManager';
import { getEmpresaByClientId } from '@/lib/empresaConfig';
import { materializeAnualMesToCycle } from '@/lib/materializeAnualMesToCycle';
import {
  buildAnnualPlanHref,
  buildBrainstormHref,
  buildBriefingCampanhaHref,
  getPlanMonth,
  MES_NOMES,
} from '@/lib/planoAnualHub';
import { buildClientCampaignHref } from '@/lib/campaignHref';
import { buildCampaignWorkspaceTasksPath } from '@/lib/campaignWorkspaceHref';

/**
 * Modal de decisão: mês do plano / brainstorm / formulário / texto.
 */
export default function NewCampaignLauncher({
  open,
  onClose,
  clientId,
  serviceId = null,
  annualPlan = null,
  mes = new Date().getMonth() + 1,
  ano = new Date().getFullYear(),
  onPlanUpdated,
}) {
  const navigate = useNavigate();
  const { agencyId, user, userId } = useSession();
  const [selectedMes, setSelectedMes] = useState(Number(mes) || new Date().getMonth() + 1);
  const [materializing, setMaterializing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setSelectedMes(Number(mes) || new Date().getMonth() + 1);
      setError(null);
    }
  }, [open, mes]);

  const monthInfo = useMemo(
    () => getPlanMonth(annualPlan, selectedMes),
    [annualPlan, selectedMes]
  );

  if (!open) return null;

  const year = annualPlan?.ano || ano;
  const brainstormHref = buildBrainstormHref(clientId, {
    mes: selectedMes,
    ano: year,
    planId: annualPlan?.id,
    modo: 'plano',
    serviceId,
  });
  const brainstormAvulsoHref = buildBrainstormHref(clientId, {
    mes: selectedMes,
    ano,
    modo: 'avulso',
    serviceId,
  });
  const formHref = buildBriefingCampanhaHref(clientId, 'form', serviceId);
  const textoHref = buildBriefingCampanhaHref(clientId, 'texto', serviceId);
  const planHref = buildAnnualPlanHref(clientId, annualPlan?.id);

  const handleMaterialize = async () => {
    if (!annualPlan?.id || !monthInfo?.campanha || materializing) return;
    setMaterializing(true);
    setError(null);
    try {
      const empresa = await getEmpresaByClientId(clientId, agencyId);
      if (!empresa?.id) {
        throw new Error('Configure a empresa do cliente antes de materializar');
      }
      const result = await materializeAnualMesToCycle({
        briefingId: annualPlan.id,
        campanhaMes: monthInfo.campanha,
        existingPayload: annualPlan,
        agencyId,
        clientId,
        empresa,
        ano: year,
        userId: userId || user?.id || user?.$id || null,
        generateTasks: true,
        serviceId: serviceId || null,
      });
      const briefId = result?.briefingMensal?.id;
      const svcId = result?.service?.id || serviceId || null;
      onPlanUpdated?.(result?.anualPayload || null);
      onClose?.();
      if (briefId && svcId) {
        navigate(
          buildCampaignWorkspaceTasksPath({
            serviceId: svcId,
            clientId,
            campaignId: briefId,
          })
        );
      } else if (briefId) {
        navigate(
          createPageUrl(
            buildClientCampaignHref({ clientId, briefingId: briefId, serviceId: svcId })
          )
        );
      } else if (result?.cyclePlan?.id) {
        navigate(`/campaigns/cycles/${result.cyclePlan.id}`);
      }
    } catch (err) {
      console.error('[NewCampaignLauncher] materialize', err);
      setError(err?.message || 'Falha ao materializar o mês');
    } finally {
      setMaterializing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-campaign-launcher-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2
              id="new-campaign-launcher-title"
              className="text-lg font-semibold text-[#111]"
            >
              Nova campanha
            </h2>
            <p className="mt-1 text-sm text-[#555]">
              Escolha como começar este mês
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#666] hover:bg-[#f5f5f5]"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {annualPlan ? (
          <div className="mb-4 rounded-xl border border-[#e8e8e8] bg-[#fafafa] p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#007bff]">
                Plano anual {year}
              </p>
              <Link
                to={planHref}
                className="text-xs font-medium text-[#555] hover:text-[#111]"
                onClick={onClose}
              >
                Ver plano completo
              </Link>
            </div>
            <label className="block text-xs text-[#555]">
              Mês
              <select
                className="mt-1 w-full rounded-lg border border-[#ddd] bg-white px-2 py-1.5 text-sm text-[#111]"
                value={selectedMes}
                onChange={(e) => setSelectedMes(Number(e.target.value))}
              >
                {MES_NOMES.slice(1).map((label, i) => (
                  <option key={label} value={i + 1}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            {monthInfo?.campanha || monthInfo?.tema ? (
              <p className="mt-2 text-sm text-[#333]">
                {monthInfo.campanha?.nome_campanha || monthInfo.tema?.titulo || 'Sem título'}
                {monthInfo.status_mes ? (
                  <span className="ml-2 text-xs text-[#666]">
                    · {monthInfo.status_mes}
                  </span>
                ) : null}
              </p>
            ) : (
              <p className="mt-2 text-sm text-[#666]">
                Sem campanha gerada para este mês no plano.
              </p>
            )}

            {error ? (
              <p className="mt-2 text-xs text-[#c0392b]" role="alert">
                {error}
              </p>
            ) : null}

            {monthInfo?.actionable || monthInfo?.tema?.titulo ? (
              <div className="mt-3 flex flex-col gap-2">
                <Button asChild className="w-full bg-[#007bff] hover:bg-[#0056b3]">
                  <Link to={brainstormHref} onClick={onClose}>
                    <CalendarDays className="mr-1.5 h-4 w-4" />
                    Brainstorm a partir do plano
                  </Link>
                </Button>
                {monthInfo?.actionable ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={materializing}
                    onClick={handleMaterialize}
                  >
                    {materializing ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <Rocket className="mr-1.5 h-4 w-4" />
                    )}
                    {materializing ? 'Materializando…' : 'Materializar mês'}
                  </Button>
                ) : null}
              </div>
            ) : null}

            {monthInfo?.materializado && monthInfo.brief_mensal_id ? (
              <Button asChild variant="outline" className="mt-2 w-full">
                <Link
                  to={createPageUrl(
                    buildClientCampaignHref({
                      clientId,
                      briefingId: monthInfo.brief_mensal_id,
                    })
                  )}
                  onClick={onClose}
                >
                  Abrir campanha do mês
                </Link>
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="mb-4 rounded-xl border border-dashed border-[#ddd] p-3 text-sm text-[#555]">
            Ainda não há plano anual. Você pode criar campanha avulsa ou{' '}
            <Link to={planHref} className="font-medium text-[#007bff]" onClick={onClose}>
              montar o plano
            </Link>
            .
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-3">
          <Link
            to={brainstormAvulsoHref}
            onClick={onClose}
            className="rounded-xl border border-[#eee] bg-[#E8F1FF] p-3 text-left transition hover:border-[#BFD7FF]"
          >
            <Sparkles className="mb-1 h-4 w-4 text-[#007bff]" />
            <p className="text-sm font-semibold text-[#111]">Brainstorm</p>
            <p className="mt-0.5 text-xs text-[#555]">Ideias com IA</p>
          </Link>
          <Link
            to={formHref}
            onClick={onClose}
            className="rounded-xl border border-[#eee] bg-[#EDE9FB] p-3 text-left transition hover:border-[#D4CBF5]"
          >
            <Keyboard className="mb-1 h-4 w-4 text-[#6C47D8]" />
            <p className="text-sm font-semibold text-[#111]">Formulário</p>
            <p className="mt-0.5 text-xs text-[#555]">5 campos rápidos</p>
          </Link>
          <Link
            to={textoHref}
            onClick={onClose}
            className="rounded-xl border border-[#eee] bg-[#EAF2FB] p-3 text-left transition hover:border-[#C5DBF0]"
          >
            <FileText className="mb-1 h-4 w-4 text-[#6C47D8]" />
            <p className="text-sm font-semibold text-[#111]">Texto livre</p>
            <p className="mt-0.5 text-xs text-[#555]">Notas da reunião</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
