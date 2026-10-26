/**
 * Converte erros t�cnicos em mensagens amig�veis.
 * Nunca expor e.message diretamente ao usu�rio.
 */

import { describeAppwriteError, getAppwriteDevHint } from './appwriteErrors.js';

const ERROR_MAP = {
  // Appwrite
  'Document with the requested ID could not be found':
    'Registro n�o encontrado. Recarregue a p�gina.',
  'Collection with the requested ID could not be found':
    'Servi�o temporariamente indispon�vel. Tente novamente em instantes.',
  'Invalid document structure':
    'Dados inv�lidos. Verifique as informa��es e tente novamente.',
  'Unknown attribute':
    'N�o foi poss�vel salvar porque alguns dados ainda n�o est�o dispon�veis. Tente novamente ou fale com o suporte.',
  'Missing required attribute':
    'Preencha todos os campos obrigat�rios.',
  'create_document_schema_incompatible':
    'N�o foi poss�vel salvar porque alguns dados ainda n�o est�o dispon�veis. Tente novamente ou fale com o suporte.',
  'update_document_schema_incompatible':
    'N�o foi poss�vel salvar porque alguns dados ainda n�o est�o dispon�veis. Tente novamente ou fale com o suporte.',

  // Sess�o / academia
  session_required: 'Sess�o expirada. Fa�a login novamente.',
  academy_required: 'Ag�ncia n�o selecionada. Recarregue a p�gina.',
  academy_missing: 'Ag�ncia n�o selecionada. Recarregue a p�gina.',
  jwt_missing: 'Sess�o expirada. Fa�a login novamente.',
  'JWT inv�lido': 'Sess�o expirada. Fa�a login novamente.',
  'JWT ausente': 'Sess�o expirada. Fa�a login novamente.',
  user_missing: 'Usu�rio n�o identificado. Recarregue a p�gina.',
  api_proxy_unavailable:
    'Servidor de API local indispon�vel. Rode `npx vercel dev --listen 3000` e recarregue a p�gina.',

  // Zapster
  instance_not_found: 'WhatsApp desconectado. Verifique a p�gina Agente IA.',
  instance_not_connected: 'WhatsApp sem sinal. Reconecte o dispositivo.',

  no_recent_interaction:
    'Sem conversa recente no WhatsApp com este contato. Envie manualmente pelo Inbox.',
  phone_duplicate: 'Este telefone j� est� cadastrado como aluno ativo.',
  phone_duplicate_active: 'Este telefone j� est� cadastrado como aluno ativo.',

  // Auth
  'Invalid credentials': 'Email ou senha incorretos.',
  'already exists': 'Este email j� est� cadastrado.',
  'Rate limit': 'Muitas tentativas. Aguarde alguns segundos.',
  '401': 'Sess�o expirada. Recarregue a p�gina.',
  unauthorized: 'Sem permiss�o para esta a��o.',
  '429': 'Muitas tentativas. Aguarde alguns segundos.',

  // Rede
  'Failed to fetch': 'Sem conex�o. Verifique sua internet.',
  'fetch failed': 'Sem conex�o. Verifique sua internet e tente novamente.',
  NetworkError: 'Sem conex�o. Verifique sua internet.',
  AbortError: 'A opera��o demorou muito. Tente novamente.',
  timeout: 'Servidor demorou para responder. Tente novamente.',
  error_500: 'Algo deu errado no servidor. Tente novamente em instantes.',
  error_404: 'Recurso n�o encontrado. Recarregue a p�gina.',
  'HTTP 500': 'Algo deu errado no servidor. Tente novamente em instantes.',
  'HTTP 502': 'Servi�o temporariamente indispon�vel. Tente novamente.',
  'HTTP 503': 'Servi�o temporariamente indispon�vel. Tente novamente.',

  // Anthropic / agente IA
  ai_not_configured: 'Servi�o de IA temporariamente indispon�vel. Fale com o suporte.',
  appwrite_not_configured: 'Servi�o temporariamente indispon�vel. Tente novamente em instantes.',
  rate_limit_exceeded: 'Servi�o temporariamente sobrecarregado. Aguarde.',
  context_length_exceeded: 'Conversa muito longa. Inicie um novo atendimento.',
  prompt_nao_configurado: 'Configure o assistente na configura��o guiada antes de testar.',
  limite_diario: 'Limite di�rio de testes atingido. Tente novamente amanh�.',
  upstream_error: 'Erro no assistente. Tente novamente ou fale com o suporte.',
  claude_timeout: 'A IA demorou para responder. Tente novamente em instantes.',
  empty_summary: 'N�o foi poss�vel gerar o resumo com os dados dispon�veis.',
  anthropic_invalid_json: 'Resposta inv�lida da IA. Tente novamente.',
  generateFn_required: 'N�o foi poss�vel gerar o resumo. Tente novamente.',
  ANTHROPIC_API_KEY: 'Servi�o de IA temporariamente indispon�vel. Fale com o suporte.',
  'ANTHROPIC_API_KEY n�o configurado': 'Servi�o de IA temporariamente indispon�vel. Fale com o suporte.',
  anthropic_not_configured: 'Servi�o de IA temporariamente indispon�vel. Fale com o suporte.',
  anthropic_no_file: 'A IA n�o conseguiu gerar o arquivo. Tente novamente.',
  anthropic_files_error: 'N�o foi poss�vel baixar o arquivo gerado. Tente novamente.',
  anthropic_error: 'Erro no servi�o de IA. Tente novamente em instantes.',
  unsupported_file_type: 'Use um arquivo PDF, DOCX ou TXT.',
  file_too_large: 'Arquivo muito grande. Use um arquivo de at� 3 MB.',
  empty_document: 'N�o foi poss�vel ler texto suficiente neste arquivo.',
  no_fields_extracted: 'N�o encontramos dados de briefing neste arquivo.',
  ia_parse_failed: 'A IA n�o retornou dados v�lidos. Tente novamente.',
  ia_failed: 'Falha ao ler o briefing. Tente novamente em instantes.',
  file_read_failed: 'N�o foi poss�vel ler o arquivo selecionado.',
  job_in_progress: 'J� existe uma gera��o em andamento para este cliente. Aguarde.',
  job_not_found: 'Gera��o n�o encontrada. Inicie novamente.',
  client_not_found: 'Cliente n�o encontrado.',
  session_required: 'Fa�a login novamente para continuar.',
  invalid_payload: 'Dados inv�lidos. Revise o formul�rio.',
  invalid_context: 'Contexto do cliente incompleto para gerar o material.',
  lead_not_found: 'Lead do Comercial n�o encontrado nesta ag�ncia.',
  lead_obrigatorio: 'Lead obrigat�rio.',
  nome_obrigatorio: 'Informe o nome da empresa ou do contato no lead.',

  // Contratos / permiss�es
  owner_required: 'Apenas o titular da ag�ncia pode fazer esta altera��o.',
  autentique_not_configured: 'Integra��o com assinatura digital n�o configurada. Fale com o suporte.',
  autentique_not_configured_for_academy:
    'Conecte a conta Autentique da academia em Integra��es para usar contratos digitais.',

  // Zapster / WhatsApp
  zapster_timeout: 'WhatsApp demorou para responder. Tente novamente em instantes.',
  ZAPSTER_TOKEN_MISSING: 'WhatsApp n�o configurado no servidor. Fale com o suporte.',

  // Gen�ricos de API
  internal: 'A��o n�o conclu�da. Tente novamente.',
  server_error: 'Algo deu errado. Tente novamente ou fale com o suporte.',
  summary_failed: 'N�o foi poss�vel carregar o resumo financeiro. Tente novamente.',
  forecast_failed: 'N�o foi poss�vel carregar a previs�o. Tente novamente.',
  bank_balances_failed: 'N�o foi poss�vel carregar os saldos das contas. Tente novamente.',
  receivables_failed: 'N�o foi poss�vel carregar as contas a receber. Tente novamente.',
  payables_failed: 'N�o foi poss�vel carregar as contas a pagar. Tente novamente.',
  reconcile_failed: 'N�o foi poss�vel verificar os lan�amentos. Tente novamente.',

  // Empr�stimo de kimono (recep��o)
  kimono_loans_collection_missing:
    'Empr�stimos de kimono ainda n�o est�o ativos no banco. Rode o script de schema (verify-and-fix-schema).',
};

const FINANCE_TX_CODES = {
  cannot_settle_cancelled: 'N�o � poss�vel liquidar um lan�amento cancelado.',
  cannot_cancel_settled: 'N�o � poss�vel cancelar um lan�amento j� liquidado.',
  already_cancelled: 'Este lan�amento j� est� cancelado.',
  already_settled: 'Este lan�amento j� foi liquidado.',
  only_settled_can_reverse: 'S� � poss�vel estornar lan�amentos liquidados.',
  already_reversed: 'Este lan�amento j� foi estornado.',
  cannot_reverse_reversal: 'N�o � poss�vel estornar um lan�amento de estorno.',
  cannot_reverse_recurrence_template: 'N�o � poss�vel estornar o modelo de recorr�ncia.',
  cannot_settle_recurrence_template:
    'N�o � poss�vel liquidar um template de recorr�ncia. Liquide a inst�ncia do m�s.',
  only_settled_can_assign_bank: 'S� � poss�vel atribuir conta em lan�amentos liquidados.',
  create_failed: 'N�o foi poss�vel criar o lan�amento. Tente novamente.',
  save_failed: 'N�o foi poss�vel salvar o lan�amento. Tente novamente.',
  snapshot_mismatch: 'Os valores mudaram desde a �ltima visualiza��o. Recarregue e tente de novo.',
  duplicate_payment: 'J� existe um lan�amento com este valor e data para este aluno.',
  valor_invalido: 'Informe um valor maior que zero.',
  valor_acima_do_limite: 'Valor acima do limite permitido para lan�amentos.',
  only_settled: 'S� � poss�vel antecipar lan�amentos j� liquidados.',
  only_inflow: 'S� � poss�vel antecipar entradas (recebimentos).',
  method_not_eligible: 'Antecipa��o dispon�vel apenas para PIX e cart�o.',
  already_anticipated: 'Este lan�amento j� tem uma taxa de antecipa��o registrada.',
  anticipation_fee_required:
    'Informe a taxa de antecipa��o ou configure o percentual em Configura��es ? Taxas da operadora.',
  fee_exceeds_net: 'A taxa de antecipa��o n�o pode ser maior que o valor l�quido do lan�amento.',
  invalid_origin: 'Este tipo de lan�amento n�o pode ser antecipado.',
  tx_id_required: 'Lan�amento n�o identificado. Recarregue a p�gina e tente novamente.',
};

const DEFAULT_ERRORS = {
  save: 'N�o foi poss�vel salvar. Tente novamente.',
  load: 'N�o foi poss�vel carregar. Recarregue a p�gina.',
  delete: 'N�o foi poss�vel excluir. Tente novamente.',
  send: 'N�o foi poss�vel enviar. Tente novamente.',
  action: 'A��o n�o conclu�da. Tente novamente.',
  sale: 'N�o foi poss�vel registrar a venda. Tente novamente.',
  network: 'Problema de conex�o. Verifique sua internet.',
  download: 'N�o foi poss�vel baixar o arquivo. Tente novamente.',
};

function extractRawMessage(err) {
  if (!err) return '';
  if (typeof err === 'string') return err.trim();
  const parts = [err.message, err.erro, err.error, err.code, err.detail]
    .map((v) => (v == null ? '' : String(v).trim()))
    .filter(Boolean);
  return parts[0] || String(err);
}

function logTechnicalError(err, friendly, raw) {
  if (typeof console === 'undefined') return;
  const devHint = getAppwriteDevHint(err);
  if (devHint || (raw && friendly && raw !== friendly)) {
    console.warn('[friendlyError]', { friendly, raw, devHint });
  }
}

/**
 * Uso:
 * import { friendlyError } from '../lib/errorMessages';
 *
 * } catch (e) {
 *   addToast(friendlyError(e, 'save'), 'error');
 * }
 */
export function friendlyError(err, context = 'action') {
  const raw = extractRawMessage(err);
  const errObj = typeof err === 'object' && err !== null ? err : { message: raw };

  if (errObj?.name === 'BillingGateClientError' && raw) {
    return raw;
  }

  const appwriteSpecific = describeAppwriteError(errObj);
  if (appwriteSpecific) {
    logTechnicalError(errObj, appwriteSpecific, raw);
    return appwriteSpecific;
  }

  if (raw.startsWith('phone_duplicate_active:')) {
    const name = raw.slice('phone_duplicate_active:'.length).trim();
    const friendly = name
      ? `Este telefone j� est� cadastrado � ${name}`
      : ERROR_MAP.phone_duplicate;
    logTechnicalError(errObj, friendly, raw);
    return friendly;
  }

  if (raw && ERROR_MAP[raw]) {
    const friendly = ERROR_MAP[raw];
    logTechnicalError(errObj, friendly, raw);
    return friendly;
  }

  for (const [key, friendly] of Object.entries(ERROR_MAP)) {
    if (raw.toLowerCase().includes(key.toLowerCase())) {
      logTechnicalError(errObj, friendly, raw);
      return friendly;
    }
  }

  const fallback = DEFAULT_ERRORS[context] ?? DEFAULT_ERRORS.action;
  logTechnicalError(errObj, fallback, raw);
  return fallback;
}

const SALE_ERROR_CODES = {
  no_stock: 'Produto sem estoque dispon�vel.',
  stock_stale: 'Estoque atualizado. Verifique as quantidades.',
  session_required: 'Sess�o expirada. Fa�a login novamente.',
  academy_required: 'Ag�ncia n�o selecionada. Recarregue a p�gina.',
  invalid_items: 'Um ou mais itens est�o inv�lidos.',
  item_not_found: 'Produto n�o encontrado. Atualize o cat�logo e tente de novo.',
  parent_not_variant: 'Selecione o tamanho do produto antes de concluir a venda.',
  duplicate_sale: 'Esta venda j� foi registrada.',
  create_failed: 'N�o foi poss�vel registrar a venda. Revise as informa��es e tente novamente.',
  server_error: 'N�o foi poss�vel registrar a venda. Tente novamente.',
  error_500: 'N�o foi poss�vel registrar a venda. Tente novamente em instantes.',
  sales_not_configured: 'Vendas n�o configuradas. Fale com o suporte.',
  shift_required: 'Abra o caixa antes de registrar vendas.',
  due_date_required: 'Informe a data de vencimento da venda a prazo.',
  cash_shift_not_configured: 'Turno de caixa n�o configurado. Execute o script de provisionamento.',
  sale_not_concluded: 'S� � poss�vel trocar produto em vendas conclu�das, pendentes ou parciais.',
  sale_item_not_found: 'Item da venda n�o encontrado.',
  same_item: 'Selecione um produto diferente do atual.',
  invalid_price: 'Pre�o inv�lido para o novo produto.',
  forbidden: 'Sem permiss�o para alterar esta venda.',
  forbidden_role: 'Apenas titular ou administrador pode cancelar ou trocar produtos na venda.',
  stock_revert_failed:
    'O caixa foi atualizado, mas o estoque n�o. Abra a venda e use Concluir cancelamento � ou Restaurar estoque se j� estiver cancelada.',
  stock_item_not_found: 'Produto da venda n�o foi encontrado no estoque. Verifique o cat�logo.',
  cancel_in_progress: 'Cancelamento incompleto. Abra a venda e use Concluir cancelamento.',
  no_sale_items:
    'N�o foram encontrados os itens desta venda para devolver o estoque. Fale com o suporte.',
  academy_missing: 'Venda sem academia vinculada. Fale com o suporte.',
  forbidden_sale_academy: 'Esta venda pertence a outra academia. Abra em Loja ? Vendas.',
  invalid_status: 'S� � poss�vel cancelar vendas conclu�das, pendentes ou parciais.',
  financial_refund_failed: 'N�o foi poss�vel estornar o pagamento. Verifique o Caixa.',
  sale_not_open: 'Esta venda n�o est� pendente ou parcial � n�o � poss�vel registrar pagamento.',
  sale_payment_stale: 'O pagamento desta venda foi atualizado em outra aba. Recarregue os detalhes.',
  sale_not_draft: 'S� � poss�vel descartar vendas em rascunho.',
  invalid_pagamentos: 'Informe ao menos uma forma de pagamento v�lida.',
  pagamentos_exceed_remaining: 'O valor informado excede o saldo em aberto da venda.',
  pagamentos_total_mismatch: 'O valor do pagamento n�o confere com o saldo em aberto.',
  pagamentos_json_too_large: 'Muitos pagamentos nesta venda. Fale com o suporte.',
  update_failed: 'N�o foi poss�vel atualizar a venda. Tente novamente.',
  sale_item_mismatch: 'Item da venda n�o confere. Recarregue e tente novamente.',
  quantidade_invalida: 'Quantidade inv�lida para o item.',
  forbidden_item: 'Produto n�o pertence a esta academia.',
  price_not_configured: 'Pre�o do produto n�o configurado no cadastro.',
  rental_price_not_configured: 'Pre�o de loca��o n�o configurado no cadastro.',
  not_found: 'Venda n�o encontrada.',
  invalid_payload: 'Dados inv�lidos. Recarregue a p�gina e tente novamente.',
  'SALES_CANCEL_FN_ID not set': 'Cancelamento de vendas n�o configurado. Fale com o suporte.',
};

/**
 * Mensagens amig�veis para erros de venda (c�digos da API / SalesApiError).
 */
/** C�digos de erro da API finance-tx (campo `error` no JSON). */
export function financeTxFriendlyError(codeOrErr, context = 'action') {
  const code = String(
    typeof codeOrErr === 'string' ? codeOrErr : codeOrErr?.message || codeOrErr?.code || ''
  ).trim();
  if (code && FINANCE_TX_CODES[code]) return FINANCE_TX_CODES[code];
  if (/j� existe um lan�amento/i.test(code)) return FINANCE_TX_CODES.duplicate_payment;
  return friendlyError(codeOrErr, context);
}

const STUDENT_PAYMENT_CODES = {
  lead_id_required: 'Aluno n�o identificado. Recarregue a p�gina e tente novamente.',
  reference_month_required: 'M�s de refer�ncia obrigat�rio.',
  student_payments_collection_not_configured:
    'Pagamentos de alunos n�o configurados. Fale com o suporte.',
};

/** Erros de createPayment / API student-payments (mensalidades, vendas). */
export function studentPaymentFriendlyError(codeOrErr, context = 'save') {
  const code = String(
    typeof codeOrErr === 'string' ? codeOrErr : codeOrErr?.message || codeOrErr?.code || ''
  ).trim();
  if (code && STUDENT_PAYMENT_CODES[code]) return STUDENT_PAYMENT_CODES[code];
  if (/j� existe um lan�amento/i.test(code)) return FINANCE_TX_CODES.duplicate_payment;
  if (/valor deve estar entre/i.test(code)) return code;
  return financeTxFriendlyError(codeOrErr, context);
}

export function friendlySaleError(err) {
  if (!err) return null;
  const code =
    typeof err === 'string'
      ? err.trim()
      : String(err?.code || err?.message || '').trim();
  if (code && SALE_ERROR_CODES[code]) {
    return SALE_ERROR_CODES[code];
  }
  const bodyCode = String(err?.body?.error || err?.body?.erro || '').trim();
  if (bodyCode && SALE_ERROR_CODES[bodyCode]) return SALE_ERROR_CODES[bodyCode];
  return friendlyError(err, 'sale');
}
