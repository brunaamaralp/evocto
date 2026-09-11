import { Plus, Trash2 } from 'lucide-react';
import {
  DEFAULT_ENROLLMENT_DISCOUNT_PRESETS,
  formatPresetOptionLabel,
} from '../../../lib/enrollmentDiscountPresets.js';
import { DISCOUNT_TYPES } from '../../../lib/planBilling.js';

export default function FinanceSettingsDiscountPresetsSection({ presets = [], onChange }) {
  const list = Array.isArray(presets) ? presets : [];

  const updateAt = (idx, patch) => {
    const next = list.map((item, i) => (i === idx ? { ...item, ...patch } : item));
    onChange?.(next);
  };

  const addPreset = () => {
    onChange?.([
      ...list,
      {
        id: `preset_${Date.now()}`,
        label: 'Nova condição',
        type: DISCOUNT_TYPES.PERCENT,
        amount: 10,
      },
    ]);
  };

  const removeAt = (idx) => {
    onChange?.(list.filter((_, i) => i !== idx));
  };

  return (
    <div className="finance-discount-presets card">
      <h4 className="finance-discount-presets__title">
        Condições promocionais na matrícula
      </h4>
      <p className="finance-discount-presets__lead">
        Atalhos exibidos ao matricular ou editar o desconto do aluno (ex.: família, segurança
        pública). O valor final sempre usa o <strong>preço do plano</strong> escolhido menos o
        percentual ou valor fixo.
      </p>

      {list.length === 0 ? (
        <p className="finance-discount-presets__empty">
          Nenhuma condição cadastrada. Adicione uma ou restaure os padrões.
        </p>
      ) : (
        <div className="finance-discount-presets__list">
          {list.map((preset, idx) => (
            <div key={preset.id || idx} className="finance-discount-presets__row">
              <div className="finance-discount-presets__fields">
                <label className="finance-discount-presets__field">
                  <span className="finance-discount-presets__label">Nome</span>
                  <input
                    className="form-input"
                    value={preset.label || ''}
                    placeholder="Ex.: Família"
                    onChange={(e) => updateAt(idx, { label: e.target.value })}
                  />
                </label>
                <label className="finance-discount-presets__field finance-discount-presets__field--type">
                  <span className="finance-discount-presets__label">Tipo</span>
                  <select
                    className="form-input"
                    value={
                      preset.type === DISCOUNT_TYPES.FIXED
                        ? DISCOUNT_TYPES.FIXED
                        : DISCOUNT_TYPES.PERCENT
                    }
                    onChange={(e) => updateAt(idx, { type: e.target.value })}
                  >
                    <option value={DISCOUNT_TYPES.PERCENT}>%</option>
                    <option value={DISCOUNT_TYPES.FIXED}>R$</option>
                  </select>
                </label>
                <label className="finance-discount-presets__field finance-discount-presets__field--amount">
                  <span className="finance-discount-presets__label">Valor</span>
                  <input
                    className="form-input"
                    type="text"
                    inputMode="decimal"
                    value={preset.amount ?? ''}
                    onChange={(e) => {
                      const raw = String(e.target.value || '').replace(',', '.');
                      const n = parseFloat(raw);
                      updateAt(idx, { amount: Number.isFinite(n) ? n : 0 });
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="btn-outline btn-sm finance-discount-presets__remove"
                  aria-label="Remover condição"
                  onClick={() => removeAt(idx)}
                >
                  <Trash2 size={14} aria-hidden />
                </button>
              </div>
              {preset.label ? (
                <p className="finance-discount-presets__preview">
                  Na matrícula: {formatPresetOptionLabel(preset)}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <div className="finance-discount-presets__actions">
        <button type="button" className="btn-outline btn-sm" onClick={addPreset}>
          <Plus size={14} aria-hidden />
          Adicionar condição
        </button>
        <button
          type="button"
          className="btn-ghost btn-sm"
          onClick={() => onChange?.([...DEFAULT_ENROLLMENT_DISCOUNT_PRESETS])}
        >
          Restaurar padrões
        </button>
      </div>
    </div>
  );
}
