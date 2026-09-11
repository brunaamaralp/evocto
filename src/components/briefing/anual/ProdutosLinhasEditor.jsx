import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2 } from 'lucide-react';
import {
  EMPTY_PRODUTO_LINHA,
  normalizeProdutoLinha,
} from '@/lib/campanhaAnualSchema';

/**
 * Editor de linhas/produtos da Empresa.
 * No cadastro, só nome + descrição — detalhes comerciais vêm depois no plano.
 */
export default function ProdutosLinhasEditor({ value = [], onChange, errors = {} }) {
  const list = Array.isArray(value) ? value : [];

  const updateAt = (index, patch) => {
    const next = list.map((item, i) =>
      i === index ? normalizeProdutoLinha({ ...item, ...patch }, i) : item
    );
    onChange?.(next);
  };

  const removeAt = (index) => {
    onChange?.(list.filter((_, i) => i !== index));
  };

  const addLinha = () => {
    onChange?.([
      ...list,
      normalizeProdutoLinha(
        { ...EMPTY_PRODUTO_LINHA, nome: `Linha ${list.length + 1}` },
        list.length
      ),
    ]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <Label>Linhas / produtos</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Nome e descrição bastam no cadastro. Preço e margem entram depois, se precisar.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addLinha}>
          <Plus className="w-4 h-4 mr-1" />
          Linha
        </Button>
      </div>

      {errors.produtos_linhas && (
        <p className="text-xs text-red-600">{errors.produtos_linhas}</p>
      )}

      {list.length === 0 ? (
        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Nenhuma linha cadastrada. Adicione Premium, Clássica, etc.
        </div>
      ) : (
        <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
          {list.map((produto, index) => (
            <div
              key={produto.id || index}
              className="rounded-lg border bg-white p-3 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <Input
                  value={produto.nome}
                  onChange={(e) => updateAt(index, { nome: e.target.value })}
                  placeholder="Nome da linha"
                  className="font-medium"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-slate-500 hover:text-red-600"
                  onClick={() => removeAt(index)}
                  aria-label="Remover linha"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <Textarea
                value={produto.descricao || ''}
                onChange={(e) => updateAt(index, { descricao: e.target.value })}
                placeholder="Descrição breve (opcional)"
                className="min-h-[56px]"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
