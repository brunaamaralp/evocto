import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import EmpresaConfigResumo from '@/components/briefing/campanha/EmpresaConfigResumo';
import {
  validatePublicBriefingToken,
  savePublicBriefingResponse,
} from '@/api/functions';
import {
  EMPTY_CAMPANHA_FORM,
  isCampanhaFormComplete,
  validateCampanhaForm,
} from '@/lib/campanhaBriefing';

/**
 * Formulário público do briefing de campanha (cliente, sem login).
 */
export default function PublicBriefingPage() {
  const token = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('token');
  }, []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [ctx, setCtx] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_CAMPANHA_FORM });
  const [errors, setErrors] = useState({});
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!token) {
        setError('Link inválido: token ausente');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const result = await validatePublicBriefingToken({ token });
        if (cancelled) return;
        setCtx(result.data);
        setForm({ ...EMPTY_CAMPANHA_FORM, ...(result.data.draftForm || {}) });
        if (result.data.alreadySubmitted) {
          setDone(true);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err.message || 'Não foi possível validar o link');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const canSubmit = isCampanhaFormComplete(form) && !saving && !done;

  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      await savePublicBriefingResponse({ token, campanhaForm: form, draft: true });
      toast.success('Rascunho salvo');
    } catch (err) {
      toast.error(err.message || 'Erro ao salvar rascunho');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    const { valid, errors: next } = validateCampanhaForm(form);
    setErrors(next);
    if (!valid) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    try {
      setSaving(true);
      await savePublicBriefingResponse({ token, campanhaForm: form, draft: false });
      setDone(true);
      toast.success('Briefing enviado com sucesso');
    } catch (err) {
      console.error(err);
      if (err?.errors) setErrors(err.errors);
      toast.error(err.message || 'Erro ao enviar. Tente novamente');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-slate-700" />
          <p className="text-slate-600">Validando link...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-3">
            <Lock className="w-12 h-12 text-slate-400 mx-auto" />
            <h1 className="text-xl font-semibold">Link indisponível</h1>
            <p className="text-slate-600 text-sm">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-3">
            <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto" />
            <h1 className="text-2xl font-semibold">Briefing recebido</h1>
            <p className="text-slate-600">
              Obrigado! As respostas de <strong>{ctx?.clientName}</strong> já foram registradas.
            </p>
            <p className="text-sm text-slate-500">
              A equipe do estúdio já pode seguir com a campanha.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-xl mx-auto space-y-4">
        <div>
          <p className="text-sm text-slate-500 mb-1">Briefing de campanha</p>
          <h1 className="text-2xl font-bold text-slate-900">{ctx?.clientName}</h1>
          <p className="text-sm text-slate-600 mt-1">
            Preencha os 5 campos desta campanha. Público, formato, orçamento e tom já vêm configurados.
          </p>
        </div>

        {!ctx?.empresaConfig && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-700" />
            <AlertDescription className="text-amber-900">
              Configuração da empresa ainda não foi definida pelo estúdio. Você ainda pode enviar os dados da campanha.
            </AlertDescription>
          </Alert>
        )}

        {ctx?.empresaConfig && <EmpresaConfigResumo config={ctx.empresaConfig} />}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados desta campanha</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>* Nome da Campanha</Label>
              <Input
                value={form.nome_campanha}
                onChange={(e) => setField('nome_campanha', e.target.value)}
                placeholder="Outono / Black Friday..."
              />
              {errors.nome_campanha && (
                <p className="text-xs text-red-600">{errors.nome_campanha}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>* Objetivo Comercial</Label>
              <Input
                value={form.objetivo}
                onChange={(e) => setField('objetivo', e.target.value)}
                placeholder="Aumentar vendas"
              />
              {errors.objetivo && <p className="text-xs text-red-600">{errors.objetivo}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>* Ações Comerciais</Label>
              <Textarea
                value={form.acoes_comerciais}
                onChange={(e) => setField('acoes_comerciais', e.target.value)}
                placeholder="Lança linha Gold, desconto 15%"
                className="min-h-[80px]"
              />
              {errors.acoes_comerciais && (
                <p className="text-xs text-red-600">{errors.acoes_comerciais}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>* Quem Aparece / Locação</Label>
              <Input
                value={form.talento_locacao}
                onChange={(e) => setField('talento_locacao', e.target.value)}
                placeholder="Dona, interior da loja"
              />
              {errors.talento_locacao && (
                <p className="text-xs text-red-600">{errors.talento_locacao}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>* Gravação (início)</Label>
                <Input
                  type="date"
                  value={form.data_gravacao_inicio}
                  onChange={(e) => setField('data_gravacao_inicio', e.target.value)}
                />
                {errors.data_gravacao_inicio && (
                  <p className="text-xs text-red-600">{errors.data_gravacao_inicio}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>* Gravação (fim)</Label>
                <Input
                  type="date"
                  value={form.data_gravacao_fim}
                  onChange={(e) => setField('data_gravacao_fim', e.target.value)}
                />
                {errors.data_gravacao_fim && (
                  <p className="text-xs text-red-600">{errors.data_gravacao_fim}</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button disabled={!canSubmit} onClick={handleSubmit}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Enviar briefing
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={handleSaveDraft}
              >
                Salvar rascunho
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
