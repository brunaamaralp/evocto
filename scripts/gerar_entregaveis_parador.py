# -*- coding: utf-8 -*-
"""Gera JSON: Projeto → Entregáveis → Checklist (modelo Asana-like)."""
from datetime import date, timedelta
from collections import defaultdict
import json

OUT = r"c:\Users\Usuario\Desktop\PROJETOS IA\evocto-copy-da179fdf (1)\parador-entregaveis.json"
HOJE = date(2026, 10, 28)


def offsets(pub, red=6, cap=5, edit=2):
    return {
        "redacao": pub - timedelta(days=red),
        "captacao": pub - timedelta(days=cap),
        "edicao": pub - timedelta(days=edit),
        "publicacao": pub,
    }


def item(etapa, responsavel, descricao, vencimento=None):
    """vencimento=None → só checklist (não agenda/notificação)."""
    return {
        "etapa": etapa,
        "vencimentoInternal": vencimento.isoformat() if isinstance(vencimento, date) else vencimento,
        "responsavel": responsavel,
        "descricao": descricao,
        "apareceNaAgenda": vencimento is not None,
    }


def checklist_conteudo(pub, desc, is_video=True, red=6, cap=5, extras=None):
    c = offsets(pub, red, cap, 2)
    cap_etapa = "Captação / Gravação" if is_video else "Criação de Artes / Layout"
    items = [
        item(
            "Redação & Validação com Cliente",
            "redator",
            desc["redacao"],
            c["redacao"],
        ),
        item(cap_etapa, "videomaker", desc["captacao"], c["captacao"]),
        item("Edição & Montagem Final", "videomaker", desc["edicao"], c["edicao"]),
        item(
            "Publicação & Agendamento",
            "gestor_projeto",
            desc["publicacao"],
            c["publicacao"],
        ),
    ]
    if extras:
        items.extend(extras)
    return items


conteudos = [
    dict(
        titulo="Feed 01 · Lançamento Vinhos do Parador",
        frente="Vinhos do Parador",
        formato="reels",
        pub=date(2026, 11, 15),
        red=7,
        cap=5,
        is_video=True,
        blocoGravacao="GRAV-ADEGA",
        responsavelGeral="gestor_projeto",
        desc=dict(
            redacao="Escrever e validar com o cliente a legenda: 'A nossa seleção de vinhos está de portas abertas.'",
            captacao="Plano-sequência: pessoa entra na loja, escolhe vinho e queijo, termina no Jardim das Conversas.",
            edicao="Montar Reels de lançamento com logos Grand Cru e Vinhos do Parador na tela.",
            publicacao="Publicar Reels de lançamento; marcar Grand Cru se aplicável.",
        ),
        extras=[
            item("Subir raw e takes no Drive", "videomaker", "Pasta do entregável + nomeação padrão.", None),
        ],
    ),
    dict(
        titulo="Feed 02 · Manifesto Sob a figueira",
        frente="Institucional",
        formato="reels",
        pub=date(2026, 11, 17),
        red=7,
        cap=5,
        is_video=True,
        blocoGravacao="GRAV-FIGUEIRA",
        responsavelGeral="gestor_projeto",
        desc=dict(
            redacao="Revisar e validar locução de 8 linhas e legenda: 'Há quase dois séculos, uma figueira. À sua sombra, uma casa para dormir, comer e ficar.'",
            captacao="Captação da árvore da raiz à copa, manhã ao anoitecer, sem texto na tela.",
            edicao="Sincronizar trilha de piano minimalista com voz grave/acolhedora; corte ~40s.",
            publicacao="Publicar Reels institucional Manifesto.",
        ),
        extras=[
            item("Gravar / aprovar locução em áudio", "redator", "Voz grave e acolhedora; entregar WAV limpo.", None),
        ],
    ),
    dict(
        titulo="Stories S1 · Por dentro da adega",
        frente="Vinhos do Parador",
        formato="stories",
        pub=date(2026, 11, 19),
        red=6,
        cap=5,
        is_video=True,
        blocoGravacao="GRAV-ADEGA",
        responsavelGeral="gestor_projeto",
        desc=dict(
            redacao="Escrever e validar textos dos 5 frames: Abertura, Escala da Curadoria (105 rótulos), Acompanhamento, Experiência no Jardim e Fechamento.",
            captacao="Gravar 5 stories na adega: chegada, prateleiras iluminadas, close nos queijos, taça no jardim.",
            edicao="Montar e formatar sequência de 5 stories para publicação.",
            publicacao="Publicar sequência 'Por dentro da adega'.",
        ),
        extras=[],
    ),
    dict(
        titulo="Feed 03 · Prato em preparo: Atum terra e mar",
        frente="Figueira Bistrô",
        formato="reels",
        pub=date(2026, 11, 21),
        red=6,
        cap=5,
        is_video=True,
        blocoGravacao="GRAV-BISTRO",
        responsavelGeral="gestor_projeto",
        desc=dict(
            redacao="Escrever e validar legenda sobre a união do mar e da terra (atum, coalhada fresca, Parma, figos e aspargos).",
            captacao="Gravar atum selando, o corte, a montagem sobre coalhada e figo.",
            edicao="Montar Reels de preparo com textos na tela.",
            publicacao="Publicar Reels de preparo do Atum terra e mar.",
        ),
        extras=[],
    ),
    dict(
        titulo="Feed 04 · A curadoria Grand Cru em Lagoa da Prata",
        frente="Vinhos do Parador",
        formato="carrossel",
        pub=date(2026, 11, 24),
        red=7,
        cap=5,
        is_video=False,
        blocoGravacao=None,
        responsavelGeral="gestor_projeto",
        desc=dict(
            redacao="Escrever e validar textos dos 5 cards e legenda de posicionamento da Grand Cru.",
            captacao="Criar artes base dos 5 cards (layout, tipografia e fotos de apoio).",
            edicao="Finalizar montagem visual dos 5 cards do carrossel.",
            publicacao="Publicar carrossel da curadoria Grand Cru.",
        ),
        extras=[],
    ),
    dict(
        titulo="Stories S2 · Réveillon",
        frente="Réveillon",
        formato="stories",
        pub=date(2026, 11, 26),
        red=7,
        cap=5,
        is_video=False,
        blocoGravacao=None,
        responsavelGeral="gestor_projeto",
        desc=dict(
            redacao="Escrever e validar textos dos 4 stories (clima, proposta, menu e chamada para reserva).",
            captacao="Criar design/layout base dos 4 stories, incluindo imagem do menu oficial.",
            edicao="Montagem final dos 4 stories prontos para publicação.",
            publicacao="Publicar sequência de stories de Réveillon com CTA de reserva.",
        ),
        extras=[
            item("Anexar PDF/imagem do menu oficial", "gestor_projeto", "Garantir versão aprovada pelo cliente.", None),
        ],
    ),
    dict(
        titulo="Feed 05 · Por dentro dos quartos",
        frente="Pousada",
        formato="reels",
        pub=date(2026, 11, 27),
        red=6,
        cap=5,
        is_video=True,
        blocoGravacao="GRAV-POUSADA",
        responsavelGeral="gestor_projeto",
        desc=dict(
            redacao="Escrever e validar legenda: 'Para chegar, respirar fundo e deixar o tempo passar um pouco mais devagar.'",
            captacao="Captar porta abrindo, enxoval, luz entrando, vista, banheiro e pessoa lendo.",
            edicao="Montar Reels de atmosfera da pousada sem texto na tela.",
            publicacao="Publicar Reels da Pousada.",
        ),
        extras=[],
    ),
    dict(
        titulo="Feed 06 · Jardim das Conversas",
        frente="Vinhos do Parador",
        formato="reels",
        pub=date(2026, 12, 1),
        red=7,
        cap=5,
        is_video=True,
        blocoGravacao="GRAV-ADEGA",
        responsavelGeral="gestor_projeto",
        desc=dict(
            redacao="Escrever e validar legenda: 'Escolha a sua garrafa no nosso espaço de vinhos, ocupe uma mesa no Jardim das Conversas...'",
            captacao="Captar takes de fim de tarde, mesas, garrafas, taças, vinho sendo servido e som ambiente.",
            edicao="Editar Reels com inserção do logo no final.",
            publicacao="Publicar Reels do Jardim das Conversas.",
        ),
        extras=[],
    ),
    dict(
        titulo="Stories S3 · Presentes sem erro",
        frente="Vinhos do Parador",
        formato="stories",
        pub=date(2026, 12, 3),
        red=6,
        cap=5,
        is_video=True,
        blocoGravacao="GRAV-ADEGA",
        responsavelGeral="gestor_projeto",
        desc=dict(
            redacao="Escrever e validar roteiro para a Maísa apresentar combos de rótulos, queijos e caixas.",
            captacao="Gravar sequência humanizada e elegante com a Maísa no espaço de vinhos.",
            edicao="Cortar e finalizar stories de sugestão de presentes.",
            publicacao="Publicar sequência de stories de presentes.",
        ),
        extras=[
            item("Confirmar disponibilidade da Maísa", "gestor_projeto", "Alinhar horário no bloco de gravação da adega.", None),
        ],
    ),
    dict(
        titulo="Feed 07 · Chef: Polvo à lagareiro",
        frente="Figueira Bistrô",
        formato="reels",
        pub=date(2026, 12, 5),
        red=7,
        cap=5,
        is_video=True,
        blocoGravacao="GRAV-BISTRO",
        responsavelGeral="gestor_projeto",
        desc=dict(
            redacao="Escrever e validar locução histórica (lagar/lagareiros) e legenda detalhada do prato.",
            captacao="Gravar a chef regando o polvo com azeite quente e retrato.",
            edicao="Montar Reels com locução e cenas do preparo.",
            publicacao="Publicar Reels do Polvo à Lagareiro.",
        ),
        extras=[],
    ),
    dict(
        titulo="Feed 08 · Café da manhã",
        frente="Pousada",
        formato="reels",
        pub=date(2026, 12, 9),
        red=6,
        cap=5,
        is_video=True,
        blocoGravacao="GRAV-POUSADA",
        responsavelGeral="gestor_projeto",
        desc=dict(
            redacao="Escrever e validar legenda: 'O cuidado mineiro não se explica, sente-se na essência do nosso café da manhã.'",
            captacao="Captar bandeja na cama, mesa na varanda e detalhes do café seguindo referência.",
            edicao="Editar Reels do café da manhã sem texto na tela.",
            publicacao="Publicar Reels do Café da manhã.",
        ),
        extras=[],
    ),
    dict(
        titulo="Stories S4 · Para provar hoje",
        frente="Figueira Bistrô",
        formato="stories",
        pub=date(2026, 12, 11),
        red=6,
        cap=5,
        is_video=True,
        blocoGravacao="GRAV-BISTRO",
        responsavelGeral="gestor_projeto",
        desc=dict(
            redacao="Escrever e validar textos dos 7 stories (Abertura, Polvo, Bacalhau, Pato, Risoto, Massa e Fechamento).",
            captacao="Captar fotos/vídeos curtos dos pratos (Polvo, Bacalhau, Magret, Risoto, Gnocchi) e do salão.",
            edicao="Montar sequência de 7 stories com sticker de link para WhatsApp.",
            publicacao="Publicar sequência 'Para provar hoje'.",
        ),
        extras=[],
    ),
    dict(
        titulo="Stories S5 · Réveillon última chamada",
        frente="Réveillon",
        formato="stories",
        pub=date(2026, 12, 13),
        red=6,
        cap=5,
        is_video=False,
        blocoGravacao=None,
        responsavelGeral="gestor_projeto",
        desc=dict(
            redacao="Escrever e validar textos de urgência suave: clima da noite, vagas restantes e CTA WhatsApp.",
            captacao="Criar artes de última chamada (menu + urgência + CTA).",
            edicao="Finalizar sequência de stories de última chamada.",
            publicacao="Publicar stories de última chamada Réveillon.",
        ),
        extras=[],
    ),
    dict(
        titulo="Stories S6 · Vinhos conversão de dezembro",
        frente="Vinhos do Parador",
        formato="stories",
        pub=date(2026, 12, 15),
        red=6,
        cap=5,
        is_video=False,
        blocoGravacao=None,
        responsavelGeral="gestor_projeto",
        desc=dict(
            redacao="Escrever e validar textos de conversão: combos, presentes e visita à adega.",
            captacao="Criar artes de conversão (combos, caixas e CTA WhatsApp/Maps).",
            edicao="Finalizar stories de conversão de Vinhos do Parador.",
            publicacao="Publicar stories finais de conversão dos Vinhos do Parador.",
        ),
        extras=[],
    ),
]

# Blocos de gravação (agrupam captações do período — sem palavra "set")
blocos_gravacao = [
    {
        "id": "GRAV-ADEGA",
        "titulo": "Bloco de gravação · Adega & Jardim das Conversas",
        "frente": "Vinhos do Parador",
        "formato": "bloco_gravacao",
        "dataPublicacao": "2026-11-14",
        "responsavelGeral": "videomaker",
        "entregaveisCobertos": [
            "Feed 01 · Lançamento Vinhos do Parador",
            "Stories S1 · Por dentro da adega",
            "Feed 06 · Jardim das Conversas",
            "Stories S3 · Presentes sem erro",
        ],
        "checklist": [
            item(
                "Agendar dia de campo (adega + jardim)",
                "gestor_projeto",
                "Combinar acesso, luz natural e presença da Maísa (S3).",
                date(2026, 11, 10),
            ),
            item(
                "Captação agrupada no local",
                "videomaker",
                "Rodar takes de Feed 01, S1, Feed 06 e S3 no mesmo deslocamento quando possível.",
                date(2026, 11, 14),
            ),
            item(
                "Organizar takes por entregável no Drive",
                "videomaker",
                "Pastas nomeadas por código ENT-xxx.",
                None,
            ),
        ],
    },
    {
        "id": "GRAV-FIGUEIRA",
        "titulo": "Bloco de gravação · Figueira (Manifesto)",
        "frente": "Institucional",
        "formato": "bloco_gravacao",
        "dataPublicacao": "2026-11-12",
        "responsavelGeral": "videomaker",
        "entregaveisCobertos": ["Feed 02 · Manifesto Sob a figueira"],
        "checklist": [
            item(
                "Captação da figueira (raiz à copa)",
                "videomaker",
                "Manhã ao anoitecer; sem texto na tela.",
                date(2026, 11, 12),
            ),
            item("Backup e entrega de raw", "videomaker", "Drive do entregável Feed 02.", None),
        ],
    },
    {
        "id": "GRAV-BISTRO",
        "titulo": "Bloco de gravação · Figueira Bistrô",
        "frente": "Figueira Bistrô",
        "formato": "bloco_gravacao",
        "dataPublicacao": "2026-11-16",
        "responsavelGeral": "videomaker",
        "entregaveisCobertos": [
            "Feed 03 · Prato em preparo: Atum terra e mar",
            "Feed 07 · Chef: Polvo à lagareiro",
            "Stories S4 · Para provar hoje",
        ],
        "checklist": [
            item(
                "Alinhar pratos e chef disponíveis",
                "gestor_projeto",
                "Atum (F03), Polvo (F07) e bank de pratos para S4.",
                date(2026, 11, 14),
            ),
            item(
                "Captação de cozinha / salão",
                "videomaker",
                "Priorizar F03 nesta data; marcar retorno para F07/S4 se necessário.",
                date(2026, 11, 16),
            ),
            item("Organizar banco de takes do bistrô", "videomaker", "Reuso entre F07 e S4.", None),
        ],
    },
    {
        "id": "GRAV-POUSADA",
        "titulo": "Bloco de gravação · Pousada",
        "frente": "Pousada",
        "formato": "bloco_gravacao",
        "dataPublicacao": "2026-11-22",
        "responsavelGeral": "videomaker",
        "entregaveisCobertos": [
            "Feed 05 · Por dentro dos quartos",
            "Feed 08 · Café da manhã",
        ],
        "checklist": [
            item(
                "Liberar quarto / enxoval / café para filmagem",
                "gestor_projeto",
                "Alinhar com recepção e cozinha.",
                date(2026, 11, 20),
            ),
            item(
                "Captação quartos + café (mesmo deslocamento)",
                "videomaker",
                "F05 completo; se possível bank de café para F08.",
                date(2026, 11, 22),
            ),
            item("Entrega de raw no Drive", "videomaker", "Pastas F05 e F08.", None),
        ],
    },
]

trafego = [
    {
        "titulo": "Tráfego · Campanha conversão Vinhos do Parador",
        "frente": "Tráfego Pago",
        "formato": "trafego_pago",
        "dataPublicacao": "2026-11-15",
        "responsavelGeral": "gestor_trafego",
        "checklist": [
            item(
                "Configuração de Campanha & Tracking",
                "gestor_trafego",
                "Meta Ads (WhatsApp/visita), lookalike + interesses; validar pixel/eventos.",
                date(2026, 11, 10),
            ),
            item(
                "Ativação · Lançamento (Feed 01)",
                "gestor_trafego",
                "Disparar alinhado ao Reels de lançamento; orçamento de arrancada.",
                date(2026, 11, 15),
            ),
            item(
                "Otimização · Carrossel Grand Cru (Feed 04)",
                "gestor_trafego",
                "Impulsionar carrossel; raio Lagoa da Prata; pausar baixo CTR.",
                date(2026, 11, 24),
            ),
            item(
                "Escala · Presentes (Stories S3)",
                "gestor_trafego",
                "Amplificar S3; ajustar CPL de mensagem.",
                date(2026, 12, 3),
            ),
            item(
                "Disparo Final · Conversão (Stories S6)",
                "gestor_trafego",
                "Boost S6 + retargeting; fechar ciclo até 15/12.",
                date(2026, 12, 15),
            ),
            item(
                "Registrar aprendizados de CPL/CTR",
                "gestor_trafego",
                "Notas para o próximo ciclo (sem prazo de agenda).",
                None,
            ),
        ],
    },
    {
        "titulo": "Tráfego · Campanha Réveillon reservas",
        "frente": "Tráfego Pago",
        "formato": "trafego_pago",
        "dataPublicacao": "2026-11-26",
        "responsavelGeral": "gestor_trafego",
        "checklist": [
            item(
                "Configuração de Campanha & Criativos",
                "gestor_trafego",
                "Conversão mensagens/WhatsApp; menu e prova social.",
                date(2026, 11, 21),
            ),
            item(
                "Ativação · Arrancada (Stories S2)",
                "gestor_trafego",
                "Ativar com S2; remarketing de engajamento.",
                date(2026, 11, 26),
            ),
            item(
                "Escala · Meados de dezembro",
                "gestor_trafego",
                "Aumentar verba; refrescar criativos; urgência de vagas.",
                date(2026, 12, 8),
            ),
            item(
                "Disparo Final · Última chamada (Stories S5)",
                "gestor_trafego",
                "Maximizar reservas até 15/12.",
                date(2026, 12, 13),
            ),
            item(
                "Registrar aprendizados de CPL/CTR",
                "gestor_trafego",
                "Notas para o próximo ciclo (sem prazo de agenda).",
                None,
            ),
        ],
    },
]

projeto = {
    "id": "PROJ-001",
    "titulo": "Parador da Figueira · Ciclo 15/11 a 15/12/2026",
    "cliente": "Parador da Figueira",
    "periodo": {"inicio": "2026-11-15", "fim": "2026-12-15"},
    "descricao": "Projeto-mãe do ciclo: agrupa entregáveis de conteúdo, blocos de gravação e campanhas de tráfego.",
}

entregaveis = []
eid = 1

# 1) Blocos de gravação primeiro (operação de campo)
for b in blocos_gravacao:
    entregaveis.append(
        {
            "id": f"ENT-{eid:03d}",
            "projetoId": projeto["id"],
            "blocoId": b["id"],
            "titulo": b["titulo"],
            "frente": b["frente"],
            "formato": b["formato"],
            "dataPublicacao": b["dataPublicacao"],
            "responsavelGeral": b["responsavelGeral"],
            "entregaveisCobertos": b["entregaveisCobertos"],
            "checklist": b["checklist"],
            "regraConclusao": "Pode concluir com checklist incompleto; UI deve pedir confirmação listando itens abertos.",
        }
    )
    eid += 1

mapa_bloco_ent = {b["id"]: None for b in blocos_gravacao}
for e in entregaveis:
    if e.get("blocoId"):
        mapa_bloco_ent[e["blocoId"]] = e["id"]

# 2) Conteúdo
for item_c in conteudos:
    bloco_ref = item_c.get("blocoGravacao")
    ent = {
        "id": f"ENT-{eid:03d}",
        "projetoId": projeto["id"],
        "titulo": item_c["titulo"],
        "frente": item_c["frente"],
        "formato": item_c["formato"],
        "dataPublicacao": item_c["pub"].isoformat(),
        "responsavelGeral": item_c["responsavelGeral"],
        "checklist": checklist_conteudo(
            item_c["pub"],
            item_c["desc"],
            is_video=item_c["is_video"],
            red=item_c["red"],
            cap=item_c["cap"],
            extras=item_c.get("extras") or [],
        ),
        "regraConclusao": "Pode concluir com checklist incompleto; UI deve pedir confirmação listando itens abertos.",
    }
    if bloco_ref:
        ent["blocoGravacaoId"] = bloco_ref
        ent["blocoGravacaoEntregavelId"] = mapa_bloco_ent.get(bloco_ref)
    entregaveis.append(ent)
    eid += 1

# 3) Tráfego
for t in trafego:
    entregaveis.append(
        {
            "id": f"ENT-{eid:03d}",
            "projetoId": projeto["id"],
            "titulo": t["titulo"],
            "frente": t["frente"],
            "formato": t["formato"],
            "dataPublicacao": t["dataPublicacao"],
            "responsavelGeral": t["responsavelGeral"],
            "checklist": t["checklist"],
            "regraConclusao": "Pode concluir com checklist incompleto; UI deve pedir confirmação listando itens abertos.",
        }
    )
    eid += 1

# Alertas
alertas = []
for e in entregaveis:
    if e["formato"] in ("trafego_pago", "bloco_gravacao"):
        continue
    for ch in e["checklist"]:
        if ch["etapa"].startswith("Redação") and ch["vencimentoInternal"]:
            red_d = date.fromisoformat(ch["vencimentoInternal"])
            if (red_d - HOJE).days < 5:
                alertas.append(
                    f"Prazo Curto: {e['titulo']} — redação em {ch['vencimentoInternal']} (<5 dias a partir de {HOJE.isoformat()})."
                )

gravacoes = defaultdict(list)
for e in entregaveis:
    if e["formato"] != "bloco_gravacao":
        continue
    for ch in e["checklist"]:
        if ch.get("apareceNaAgenda") and "Captação" in ch["etapa"]:
            gravacoes[ch["vencimentoInternal"]].append(e["titulo"])
for dia, lista in sorted(gravacoes.items()):
    if len(lista) > 2:
        alertas.append(
            f"Conflito de Agenda ({dia}): {len(lista)} blocos de gravação — {', '.join(lista)}."
        )

alertas.append(
    "Lacuna de Tráfego (cobertura parcial): Figueira Bistrô e Pousada têm conteúdo orgânico sem campanha paga dedicada — intencional se o combustível for só Vinhos + Réveillon."
)

total_checklist = sum(len(e["checklist"]) for e in entregaveis)
com_agenda = sum(
    1 for e in entregaveis for c in e["checklist"] if c.get("apareceNaAgenda")
)
sem_agenda = total_checklist - com_agenda

payload = {
    "projeto": projeto,
    "cliente": projeto["cliente"],
    "periodo": "15/11/2026 a 15/12/2026",
    "regrasOperacionais": {
        "hierarquia": "Projeto → Entregável → Checklist",
        "agendaENotificacoes": (
            "Itens de checklist COM vencimentoInternal entram na agenda e geram notificação "
            "(comportamento tipo subtarefa com prazo). Itens SEM data (null) aparecem só no checklist do card."
        ),
        "conclusaoDoEntregavel": (
            "O entregável PODE ser marcado como concluído mesmo com checklist incompleto. "
            "A UI deve pedir confirmação explícita listando os itens ainda abertos."
        ),
        "blocoDeGravacao": (
            "Entregáveis com formato bloco_gravacao agrupam captações de vários posts no mesmo deslocamento. "
            "Posts vinculados referenciam blocoGravacaoId."
        ),
        "cadeiaTemporalConteudo": {
            "redacao": "5 a 7 dias antes da publicação",
            "captacaoOuArtes": "4 a 5 dias antes da publicação",
            "edicao": "2 dias antes da publicação",
            "publicacao": "data exata do calendário",
        },
    },
    "resumoExecutivo": {
        "totalEntregaveis": len(entregaveis),
        "totalItensChecklist": total_checklist,
        "itensComAgenda": com_agenda,
        "itensSoChecklist": sem_agenda,
        "blocosGravacao": len(blocos_gravacao),
        "conteudo": len(conteudos),
        "trafego": len(trafego),
    },
    "alertasGestao": alertas,
    "entregaveis": entregaveis,
}

with open(OUT, "w", encoding="utf-8") as f:
    json.dump(payload, f, ensure_ascii=False, indent=2)

print("projeto", projeto["id"], projeto["titulo"])
print("entregaveis", len(entregaveis))
print("checklist", total_checklist, "agenda", com_agenda, "silent", sem_agenda)
print("alertas", len(alertas))
print("saved", OUT)
