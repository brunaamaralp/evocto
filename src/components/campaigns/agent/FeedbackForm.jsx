import { useState } from 'react';

const API_BASE = '/api/campaigns-agent';

const EMPTY_FORM = {
  vendas_realizado: '',
  engajamento_realizado: '',
  conversoes: '',
  alcance: '',
  o_que_funcionou: '',
  o_que_nao_funcionou: '',
  aprendizados: '',
  nota_geral: '',
  notas_criativas: '',
  notas_producao: '',
  recomendacoes_proxima: '',
};

function toNumberOrNull(value) {
  if (value === '' || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Formulário de feedback ao final do ciclo.
 *
 * @param {{
 *   cycleId: string,
 *   onSubmit?: (feedbackId: string) => void,
 *   initialValues?: object,
 * }} props
 */
export default function FeedbackForm({ cycleId, onSubmit, initialValues }) {
  const [form, setForm] = useState(() => ({
    ...EMPTY_FORM,
    ...(initialValues || {}),
  }));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
    setSuccess(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!cycleId) {
      setError('cycleId é obrigatório');
      return;
    }

    const nota = toNumberOrNull(form.nota_geral);
    if (nota != null && (nota < 1 || nota > 10)) {
      setError('Nota geral deve ser entre 1 e 10');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    const body = {
      cycleId,
      vendas_realizado: toNumberOrNull(form.vendas_realizado),
      engajamento_realizado: toNumberOrNull(form.engajamento_realizado),
      conversoes: toNumberOrNull(form.conversoes),
      alcance: toNumberOrNull(form.alcance),
      o_que_funcionou: String(form.o_que_funcionou || '').trim(),
      o_que_nao_funcionou: String(form.o_que_nao_funcionou || '').trim(),
      aprendizados: String(form.aprendizados || '').trim(),
      nota_geral: nota,
      notas_criativas: String(form.notas_criativas || '').trim(),
      notas_producao: String(form.notas_producao || '').trim(),
      recomendacoes_proxima: String(form.recomendacoes_proxima || '').trim(),
    };

    try {
      const response = await fetch(`${API_BASE}?route=save-feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        throw new Error(data?.message || data?.error || `http_${response.status}`);
      }
      setSuccess(true);
      onSubmit?.(data.feedbackId);
    } catch (err) {
      console.error('[FeedbackForm]', err);
      setError(err?.message || 'Falha ao salvar feedback');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <h2 style={styles.title}>Feedback do ciclo</h2>
      <p style={styles.hint}>
        Registre o resultado real. Essas notas alimentam o histórico do agent
        (próximas conversas via loadContext).
      </p>

      {/* 1. Resultados */}
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Resultados</h3>
        <div style={styles.grid2}>
          <label style={styles.label}>
            Vendas (%)
            <input
              type="number"
              min={0}
              max={100}
              step="any"
              placeholder="ex: 15"
              value={form.vendas_realizado}
              onChange={(e) => setField('vendas_realizado', e.target.value)}
              style={styles.input}
            />
          </label>
          <label style={styles.label}>
            Engajamento (%)
            <input
              type="number"
              min={0}
              max={100}
              step="any"
              placeholder="ex: 8"
              value={form.engajamento_realizado}
              onChange={(e) => setField('engajamento_realizado', e.target.value)}
              style={styles.input}
            />
          </label>
          <label style={styles.label}>
            Conversões
            <input
              type="number"
              min={0}
              step="any"
              placeholder="ex: 45"
              value={form.conversoes}
              onChange={(e) => setField('conversoes', e.target.value)}
              style={styles.input}
            />
          </label>
          <label style={styles.label}>
            Alcance
            <input
              type="number"
              min={0}
              step="any"
              placeholder="ex: 5000"
              value={form.alcance}
              onChange={(e) => setField('alcance', e.target.value)}
              style={styles.input}
            />
          </label>
        </div>
      </section>

      {/* 2. Aprendizados */}
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Aprendizados</h3>
        <label style={styles.label}>
          O que funcionou?
          <textarea
            value={form.o_que_funcionou}
            onChange={(e) => setField('o_que_funcionou', e.target.value)}
            style={styles.textarea}
            rows={3}
          />
        </label>
        <label style={styles.label}>
          O que NÃO funcionou?
          <textarea
            value={form.o_que_nao_funcionou}
            onChange={(e) => setField('o_que_nao_funcionou', e.target.value)}
            style={styles.textarea}
            rows={3}
          />
        </label>
        <label style={styles.label}>
          Aprendizados
          <textarea
            value={form.aprendizados}
            onChange={(e) => setField('aprendizados', e.target.value)}
            style={styles.textarea}
            rows={3}
          />
        </label>
        <label style={styles.label}>
          Nota Geral (1–10)
          <input
            type="number"
            min={1}
            max={10}
            value={form.nota_geral}
            onChange={(e) => setField('nota_geral', e.target.value)}
            style={styles.input}
          />
        </label>
      </section>

      {/* 3. Próxima Campanha */}
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Próxima Campanha</h3>
        <label style={styles.label}>
          Notas Criativas
          <textarea
            value={form.notas_criativas}
            onChange={(e) => setField('notas_criativas', e.target.value)}
            style={styles.textarea}
            rows={3}
          />
        </label>
        <label style={styles.label}>
          Notas de Produção
          <textarea
            value={form.notas_producao}
            onChange={(e) => setField('notas_producao', e.target.value)}
            style={styles.textarea}
            rows={3}
          />
        </label>
        <label style={styles.label}>
          Recomendações Próxima
          <textarea
            value={form.recomendacoes_proxima}
            onChange={(e) => setField('recomendacoes_proxima', e.target.value)}
            style={styles.textarea}
            rows={3}
          />
        </label>
      </section>

      {error ? (
        <p style={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p style={styles.success} role="status">
          Feedback salvo com sucesso.
        </p>
      ) : null}

      <button type="submit" disabled={loading || !cycleId} style={styles.submit}>
        {loading ? 'Salvando…' : 'Salvar feedback'}
      </button>
    </form>
  );
}

const styles = {
  form: {
    maxWidth: 640,
    margin: '0 auto',
    padding: '1.25rem',
    color: '#333',
    background: '#fff',
    borderRadius: 8,
  },
  title: { margin: '0 0 0.35rem', fontSize: 18, fontWeight: 700 },
  hint: { margin: '0 0 1rem', fontSize: 13, color: '#666', lineHeight: 1.4 },
  section: {
    borderTop: '1px solid #e5e5e5',
    paddingTop: '1rem',
    marginTop: '1rem',
  },
  sectionTitle: {
    margin: '0 0 0.75rem',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: '#007bff',
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.75rem',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    fontSize: 13,
    fontWeight: 600,
    marginBottom: '0.75rem',
  },
  input: {
    padding: '0.55rem 0.65rem',
    borderRadius: 8,
    border: '1px solid #ccc',
    fontSize: 14,
    fontWeight: 400,
    fontFamily: 'inherit',
  },
  textarea: {
    width: '100%',
    minHeight: 80,
    padding: '0.75rem',
    borderRadius: 8,
    border: '1px solid #ccc',
    fontSize: 14,
    fontWeight: 400,
    fontFamily: 'inherit',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  error: {
    margin: '0.5rem 0',
    padding: '0.55rem 0.75rem',
    background: '#fdecea',
    color: '#c0392b',
    borderRadius: 8,
    fontSize: 13,
  },
  success: {
    margin: '0.5rem 0',
    padding: '0.55rem 0.75rem',
    background: '#e8f8ef',
    color: '#1e7e34',
    borderRadius: 8,
    fontSize: 13,
  },
  submit: {
    width: '100%',
    marginTop: '0.75rem',
    padding: '0.75rem 1rem',
    borderRadius: 8,
    border: 'none',
    background: '#007bff',
    color: '#fff',
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
  },
};
