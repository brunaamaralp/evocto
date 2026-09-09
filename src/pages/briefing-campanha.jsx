import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, FileText, Keyboard, Loader2, ArrowLeft, Building2 } from 'lucide-react';
import { useSession } from '@/components/auth/SessionManager';
import { Client } from '@/api/entities';
import { createPageUrl } from '@/utils';
import { getEmpresaByClientId } from '@/lib/empresaConfig';
import ConfigurarEmpresaModal from '@/components/empresa/ConfigurarEmpresaModal';
import BriefingFormSimples from '@/components/briefing/campanha/BriefingFormSimples';
import BriefingTextLivre from '@/components/briefing/campanha/BriefingTextLivre';
import BriefingReviewSimples from '@/components/briefing/campanha/BriefingReviewSimples';

/**
 * Fluxo completo: escolha de modo → formulário / texto livre → review → sucesso.
 */
export default function BriefingCampanhaPage() {
  const { agencyId, isAuthenticated } = useSession();
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const clientId = urlParams.get('clientId');
  const initialMode = urlParams.get('mode'); // form | texto

  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState(null);
  const [empresa, setEmpresa] = useState(null);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(
    initialMode === 'texto' ? 'texto' : initialMode === 'form' ? 'form' : 'choose'
  );
  const [empresaModalOpen, setEmpresaModalOpen] = useState(false);
  const [textoLivre, setTextoLivre] = useState('');
  const [parsed, setParsed] = useState(null);
  const [reviewForm, setReviewForm] = useState(null);
  const [savedBriefing, setSavedBriefing] = useState(null);

  const load = useCallback(async () => {
    if (!clientId || !agencyId) return;
    try {
      setLoading(true);
      setError(null);
      const clientData = await Client.get(clientId);
      if (!clientData || clientData.agencyId !== agencyId) {
        throw new Error('Cliente não encontrado');
      }
      setClient(clientData);
      const emp = await getEmpresaByClientId(clientId, agencyId);
      setEmpresa(emp);
      if (!emp && (initialMode === 'form' || initialMode === 'texto')) {
        setEmpresaModalOpen(true);
      }
    } catch (err) {
      setError(err.message || 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, [clientId, agencyId, initialMode]);

  useEffect(() => {
    if (isAuthenticated) load();
  }, [isAuthenticated, load]);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!clientId) {
    return (
      <div className="p-6">
        <p className="text-red-600">clientId obrigatório na URL.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[#6C47D8]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-red-600 mb-3">{error}</p>
        <Button variant="outline" onClick={load}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  const backToList = () => {
    navigate(`${createPageUrl('client-briefing')}?clientId=${clientId}`);
  };

  if (step === 'sucesso' && savedBriefing) {
    return (
      <div className="max-w-xl mx-auto">
        <Card className="rounded-2xl border-transparent shadow-sm">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto" />
            <h1 className="text-2xl font-bold tracking-tight text-[#18162A]">Briefing criado</h1>
            <p className="text-[#7A7595]">
              <strong>{savedBriefing.nome_campanha || savedBriefing.title}</strong> —{' '}
              {empresa?.nome || client?.name}
            </p>
            <p className="text-sm text-slate-500">
              Configuração da empresa herdada. Equipe notificada.
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <Button onClick={backToList}>Ver briefings</Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSavedBriefing(null);
                  setParsed(null);
                  setReviewForm(null);
                  setTextoLivre('');
                  setStep('choose');
                }}
              >
                Novo briefing
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" className="-ml-2 mb-1" onClick={backToList}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold tracking-tight text-[#18162A]">
            Novo Briefing — {empresa?.nome || client?.name}
          </h1>
          <p className="text-sm text-[#7A7595] mt-1">
            Só os 5 campos da campanha. Público, formato, orçamento e tom vêm da empresa.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setEmpresaModalOpen(true)}
        >
          <Building2 className="w-4 h-4 mr-1.5" />
          {empresa ? 'Editar Empresa' : 'Configurar Empresa'}
        </Button>
      </div>

      {step === 'choose' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Card
            className="rounded-2xl border-transparent shadow-sm bg-[#EDE9FB] cursor-pointer hover:border-[#D4CBF5] hover:shadow-md transition-all"
            onClick={() => setStep('form')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-[#18162A]">
                <Keyboard className="w-4 h-4 text-[#6C47D8]" />
                Formulário rápido
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-[#7A7595]">
              Preencha os 5 campos essenciais (~2 min).
            </CardContent>
          </Card>
          <Card
            className="rounded-2xl border-transparent shadow-sm bg-[#EAF2FB] cursor-pointer hover:border-[#C5DBF0] hover:shadow-md transition-all"
            onClick={() => setStep('texto')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-[#18162A]">
                <FileText className="w-4 h-4 text-[#6C47D8]" />
                Descrever a mão
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-[#7A7595]">
              Cole notas da reunião; o parser detecta os campos.
            </CardContent>
          </Card>
        </div>
      )}

      {step === 'form' && (
        <Card className="rounded-2xl border-transparent shadow-sm">
          <CardContent className="pt-6">
            <BriefingFormSimples
              clientId={clientId}
              empresa={empresa}
              onNeedEmpresa={() => setEmpresaModalOpen(true)}
              onSwitchToText={() => setStep('texto')}
              onSuccess={(b) => {
                setSavedBriefing(b);
                setStep('sucesso');
              }}
            />
          </CardContent>
        </Card>
      )}

      {step === 'texto' && (
        <Card className="rounded-2xl border-transparent shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-[#18162A]">Modo Texto Livre</CardTitle>
          </CardHeader>
          <CardContent>
            <BriefingTextLivre
              empresa={empresa}
              initialText={textoLivre}
              onUseForm={() => setStep('form')}
              onCancel={() => setStep('choose')}
              onAnalyzed={({ parsed: p, formValues, texto }) => {
                setParsed(p);
                setReviewForm(formValues);
                setTextoLivre(texto);
                setStep('review');
              }}
            />
          </CardContent>
        </Card>
      )}

      {step === 'review' && (
        <Card className="rounded-2xl border-transparent shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-[#18162A]">Briefing analisado — Revise</CardTitle>
          </CardHeader>
          <CardContent>
            <BriefingReviewSimples
              clientId={clientId}
              empresa={empresa}
              parsed={parsed}
              initialForm={reviewForm}
              textoLivre={textoLivre}
              onBack={() => setStep('texto')}
              onSuccess={(b) => {
                setSavedBriefing(b);
                setStep('sucesso');
              }}
            />
          </CardContent>
        </Card>
      )}

      <ConfigurarEmpresaModal
        open={empresaModalOpen}
        onOpenChange={setEmpresaModalOpen}
        clientId={clientId}
        clientName={client?.name}
        empresa={empresa}
        onSaved={(saved) => setEmpresa(saved)}
      />
    </div>
  );
}
