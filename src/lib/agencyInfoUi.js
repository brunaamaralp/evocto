/** Rótulos e helpers de UI da Central da Agência. */

export const TYPE_META = {
  document: {
    key: 'document',
    label: 'Documentos',
    singular: 'Documento',
    description: 'Contratos, propostas, modelos e materiais internos',
  },
  link: {
    key: 'link',
    label: 'Links',
    singular: 'Link',
    description: 'Ferramentas, Drive, sites e recursos externos',
  },
  note: {
    key: 'note',
    label: 'Informações',
    singular: 'Informação',
    description: 'Procedimentos, orientações e registros internos',
  },
};

export const CATEGORY_OPTIONS = [
  { value: 'administrativo', label: 'Administrativo' },
  { value: 'comercial', label: 'Comercial' },
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'processos', label: 'Processos' },
  { value: 'ferramentas', label: 'Ferramentas' },
  { value: 'referencias', label: 'Referências' },
  { value: 'outros', label: 'Outros' },
];

export function categoryLabel(value) {
  const found = CATEGORY_OPTIONS.find((c) => c.value === value);
  return found?.label || value || 'Sem categoria';
}

export function formatItemCount(n, singular, plural) {
  const num = Number(n) || 0;
  if (num === 1) return `1 ${singular}`;
  return `${num} ${plural}`;
}
