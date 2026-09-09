import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from '@/components/auth/SessionManager';
import { UploadFile } from '@/api/integrations';
import {
  empresaToForm,
  isEmpresaFormComplete,
  saveEmpresa,
  validateEmpresaForm,
} from '@/lib/empresaConfig';
import ProdutosLinhasEditor from '@/components/briefing/anual/ProdutosLinhasEditor';

/**
 * Modal create/edit da configuração padrão da empresa (cliente).
 */
export default function ConfigurarEmpresaModal({
  open,
  onOpenChange,
  clientId,
  clientName = '',
  empresa = null,
  onSaved,
}) {
  const { user, agencyId } = useSession();
  const [form, setForm] = useState(() => empresaToForm(empresa, clientName));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setForm(empresaToForm(empresa, clientName));
      setErrors({});
    }
  }, [open, empresa, clientName]);

  const canSave = useMemo(() => isEmpresaFormComplete(form) && !saving, [form, saving]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const setFormato = (key, value) => {
    setForm((prev) => ({
      ...prev,
      formato_padrao: { ...prev.formato_padrao, [key]: value },
    }));
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const okType =
      file.type === 'application/pdf' ||
      file.type.startsWith('image/') ||
      /\.(pdf|png|jpe?g|webp)$/i.test(file.name);
    if (!okType) {
      toast.error('Envie PDF ou imagem');
      return;
    }
    try {
      setUploading(true);
      const { file_url } = await UploadFile({ file });
      setField('brand_guidelines', {
        url: file_url,
        name: file.name,
        type: file.type,
        size: file.size,
      });
      toast.success('Arquivo anexado');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao anexar arquivo');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSave = async () => {
    const { valid, errors: nextErrors } = validateEmpresaForm(form);
    setErrors(nextErrors);
    if (!valid) return;

    try {
      setSaving(true);
      const saved = await saveEmpresa({
        empresaId: empresa?.id || null,
        agencyId,
        clientId,
        form,
        userId: user?.id || user?.$id || null,
      });
      toast.success('✓ Empresa configurada');
      onSaved?.(saved);
      onOpenChange?.(false);
    } catch (err) {
      console.error(err);
      if (err?.errors) setErrors(err.errors);
      toast.error('Erro ao salvar. Tente novamente');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar Empresa</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="emp-nome">* Nome da Empresa</Label>
            <Input
              id="emp-nome"
              value={form.nome}
              onChange={(e) => setField('nome', e.target.value)}
              placeholder="MALU / Jak Pizzaria / ..."
            />
            {errors.nome && <p className="text-xs text-red-600">{errors.nome}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="emp-publico">* Público-Alvo (padrão)</Label>
            <Textarea
              id="emp-publico"
              value={form.publico_alvo}
              onChange={(e) => setField('publico_alvo', e.target.value)}
              placeholder="Mulheres 25-45, classe AB, com poder de compra"
              className="min-h-[72px]"
            />
            {errors.publico_alvo && (
              <p className="text-xs text-red-600">{errors.publico_alvo}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="emp-videos">* Número de Vídeos</Label>
              <Input
                id="emp-videos"
                type="number"
                min={0}
                value={form.formato_padrao.num_videos}
                onChange={(e) => setFormato('num_videos', e.target.value)}
              />
              {errors.num_videos && (
                <p className="text-xs text-red-600">{errors.num_videos}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-designs">* Número de Designs</Label>
              <Input
                id="emp-designs"
                type="number"
                min={0}
                value={form.formato_padrao.num_designs}
                onChange={(e) => setFormato('num_designs', e.target.value)}
              />
              {errors.num_designs && (
                <p className="text-xs text-red-600">{errors.num_designs}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="emp-duracao">* Duração dos Vídeos</Label>
            <Input
              id="emp-duracao"
              value={form.formato_padrao.duracao_videos}
              onChange={(e) => setFormato('duracao_videos', e.target.value)}
              placeholder="30-45s"
            />
            {errors.duracao_videos && (
              <p className="text-xs text-red-600">{errors.duracao_videos}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="emp-orcamento">* Orçamento Mensal Padrão</Label>
            <Input
              id="emp-orcamento"
              type="number"
              min={0}
              step="0.01"
              value={form.orcamento_padrao_mensal}
              onChange={(e) => setField('orcamento_padrao_mensal', e.target.value)}
              placeholder="2500"
            />
            {errors.orcamento_padrao_mensal && (
              <p className="text-xs text-red-600">{errors.orcamento_padrao_mensal}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="emp-tom">* Tom de Marca</Label>
            <Textarea
              id="emp-tom"
              value={form.tom_brand}
              onChange={(e) => setField('tom_brand', e.target.value)}
              placeholder="Premium, aconchego, autêntico"
              className="min-h-[72px]"
            />
            {errors.tom_brand && (
              <p className="text-xs text-red-600">{errors.tom_brand}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="emp-restricoes">Restrições criativas</Label>
            <Textarea
              id="emp-restricoes"
              value={form.restricoes_criativas || ''}
              onChange={(e) => setField('restricoes_criativas', e.target.value)}
              placeholder="Sem atores profissionais, autenticidade, casais reais…"
              className="min-h-[64px]"
            />
          </div>

          <ProdutosLinhasEditor
            value={form.produtos_linhas || []}
            onChange={(produtos_linhas) => setField('produtos_linhas', produtos_linhas)}
            errors={errors}
          />

          <div className="space-y-1.5">
            <Label>Brand Guidelines (opcional)</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => document.getElementById('emp-brand-file')?.click()}
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Anexar
              </Button>
              <span className="text-sm text-muted-foreground truncate">
                {form.brand_guidelines?.name || 'Nenhum arquivo selecionado'}
              </span>
              <input
                id="emp-brand-file"
                type="file"
                accept=".pdf,image/*"
                className="hidden"
                onChange={handleUpload}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange?.(false)}>
            Cancelar
          </Button>
          <Button type="button" disabled={!canSave} onClick={handleSave}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar Configuração
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
