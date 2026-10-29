# -*- coding: utf-8 -*-
from datetime import date, timedelta
from collections import defaultdict
import json

OUT = r"c:\Users\Usuario\Desktop\PROJETOS IA\evocto-copy-da179fdf (1)\parador-tarefas-corrigidas.json"


def chain(pub, red_offset=6, cap_offset=5, edit_offset=2):
    return {
        "redacao": pub - timedelta(days=red_offset),
        "captacao": pub - timedelta(days=cap_offset),
        "edicao": pub - timedelta(days=edit_offset),
        "publicacao": pub,
    }


entregas = [
    (
        "Feed 01",
        "Lançamento Vinhos do Parador",
        "Vinhos do Parador",
        date(2026, 11, 15),
        7,
        5,
        True,
        {
            "redacao": "Escrever e validar com o cliente a legenda: 'A nossa seleção de vinhos está de portas abertas.'",
            "captacao": "Plano-sequência: pessoa entra na loja, escolhe vinho e queijo, termina no Jardim das Conversas.",
            "edicao": "Montar reels de lançamento inserindo logos da Grand Cru e Vinhos do Parador na tela.",
            "publicacao": "Publicar Reels de lançamento dos Vinhos do Parador.",
        },
    ),
    (
        "Feed 02",
        "Manifesto Sob a figueira",
        "Institucional",
        date(2026, 11, 17),
        7,
        5,
        True,
        {
            "redacao": "Revisar e validar locução de 8 linhas e legenda: 'Há quase dois séculos, uma figueira. À sua sombra, uma casa para dormir, comer e ficar.'",
            "captacao": "Captação da árvore da raiz à copa, manhã ao anoitecer, sem texto na tela.",
            "edicao": "Sincronizar trilha de piano minimalista com voz grave/acolhedora, corte de 40 segundos.",
            "publicacao": "Publicar Reels institucional Manifesto.",
        },
    ),
    (
        "Stories S1",
        "Por dentro da adega",
        "Vinhos do Parador",
        date(2026, 11, 19),
        6,
        5,
        True,
        {
            "redacao": "Escrever e validar textos dos 5 frames: Abertura, Escala da Curadoria (105 rótulos), Acompanhamento, Experiência no Jardim e Fechamento.",
            "captacao": "Gravar 5 stories na adega: chegada, prateleiras iluminadas, close nos queijos, taça no jardim.",
            "edicao": "Montar e formatar sequência de 5 stories para publicação.",
            "publicacao": "Publicar sequência de stories 'Por dentro da adega'.",
        },
    ),
    (
        "Feed 03",
        "Prato em preparo: Atum terra e mar",
        "Figueira Bistrô",
        date(2026, 11, 21),
        6,
        5,
        True,
        {
            "redacao": "Escrever e validar legenda sobre a união do mar e da terra (atum, coalhada fresca, Parma, figos e aspargos).",
            "captacao": "Gravar atum selando, o corte, a montagem sobre coalhada e figo.",
            "edicao": "Montar Reels de preparo do prato do bistrô com textos na tela.",
            "publicacao": "Publicar Reels de preparo do Atum terra e mar.",
        },
    ),
    (
        "Feed 04",
        "A curadoria Grand Cru em Lagoa da Prata",
        "Vinhos do Parador",
        date(2026, 11, 24),
        7,
        5,
        False,
        {
            "redacao": "Escrever e validar textos dos 5 cards do carrossel e a legenda de posicionamento da Grand Cru.",
            "captacao": "Criar artes visuais base dos 5 cards do carrossel de vinhos (layout, tipografia e fotos de apoio).",
            "edicao": "Finalizar montagem visual dos 5 cards do carrossel de vinhos.",
            "publicacao": "Publicar carrossel da curadoria Grand Cru.",
        },
    ),
    (
        "Stories S2",
        "Réveillon",
        "Réveillon",
        date(2026, 11, 26),
        7,
        5,
        False,
        {
            "redacao": "Escrever e validar textos dos 4 stories de Réveillon (clima, proposta, menu e chamada para reserva).",
            "captacao": "Criar design e layout base dos 4 stories de Réveillon, incluindo imagem do menu oficial.",
            "edicao": "Montagem final dos 4 stories de Réveillon prontos para publicação.",
            "publicacao": "Publicar sequência de stories de Réveillon.",
        },
    ),
    (
        "Feed 05",
        "Por dentro dos quartos",
        "Pousada",
        date(2026, 11, 27),
        6,
        5,
        True,
        {
            "redacao": "Escrever e validar legenda: 'Para chegar, respirar fundo e deixar o tempo passar um pouco mais devagar.'",
            "captacao": "Captar porta abrindo, enxoval, luz entrando, vista, banheiro e pessoa lendo.",
            "edicao": "Montar Reels de atmosfera da pousada sem texto na tela.",
            "publicacao": "Publicar Reels da Pousada.",
        },
    ),
    (
        "Feed 06",
        "Jardim das Conversas",
        "Vinhos do Parador",
        date(2026, 12, 1),
        7,
        5,
        True,
        {
            "redacao": "Escrever e validar legenda: 'Escolha a sua garrafa no nosso espaço de vinhos, ocupe uma mesa no Jardim das Conversas...'",
            "captacao": "Captar takes do fim de tarde, mesas do jardim, garrafas, taças, vinho sendo servido e som ambiente.",
            "edicao": "Editar Reels do Jardim das Conversas com inserção do logo no final.",
            "publicacao": "Publicar Reels do Jardim das Conversas.",
        },
    ),
    (
        "Stories S3",
        "Presentes sem erro",
        "Vinhos do Parador",
        date(2026, 12, 3),
        6,
        5,
        True,
        {
            "redacao": "Escrever e validar roteiro para a Maísa apresentar seleções de presentes (combos de rótulos, queijos e caixas) na adega.",
            "captacao": "Gravar sequência em vídeo com a Maísa no espaço de vinhos de forma humanizada e elegante.",
            "edicao": "Cortar e finalizar os stories de sugestão de presentes.",
            "publicacao": "Publicar sequência de stories de presentes.",
        },
    ),
    (
        "Feed 07",
        "Chef: Polvo à lagareiro",
        "Figueira Bistrô",
        date(2026, 12, 5),
        7,
        5,
        True,
        {
            "redacao": "Escrever e validar locução histórica (origem do termo lagar e dos lagareiros) e legenda detalhada do prato.",
            "captacao": "Gravar a chef regando o polvo com azeite quente e retrato.",
            "edicao": "Montar Reels com locução e cenas do preparo do polvo.",
            "publicacao": "Publicar Reels do Polvo à Lagareiro.",
        },
    ),
    (
        "Feed 08",
        "Café da manhã",
        "Pousada",
        date(2026, 12, 9),
        6,
        5,
        True,
        {
            "redacao": "Escrever e validar legenda: 'O cuidado mineiro não se explica, sente-se na essência do nosso café da manhã.'",
            "captacao": "Captar bandeja na cama, mesa na varanda e detalhes do café da manhã seguindo referência.",
            "edicao": "Editar Reels do café da manhã sem texto na tela.",
            "publicacao": "Publicar Reels do Café da manhã.",
        },
    ),
    (
        "Stories S4",
        "Para provar hoje",
        "Figueira Bistrô",
        date(2026, 12, 11),
        6,
        5,
        True,
        {
            "redacao": "Escrever e validar textos dos 7 stories detalhando os pratos da casa (Abertura, Polvo, Bacalhau, Pato, Risoto, Massa e Fechamento).",
            "captacao": "Captar fotos/vídeos curtos dos pratos do bistrô (Polvo, Bacalhau, Magret de canard, Risoto, Gnocchi) e do salão.",
            "edicao": "Montar a sequência de 7 stories com sticker de link para o WhatsApp.",
            "publicacao": "Publicar sequência de stories 'Para provar hoje'.",
        },
    ),
    (
        "Stories S5",
        "Réveillon última chamada",
        "Réveillon",
        date(2026, 12, 13),
        6,
        5,
        False,
        {
            "redacao": "Escrever e validar textos de urgência suave: clima da noite, vagas restantes e CTA de reserva WhatsApp.",
            "captacao": "Criar artes/stories de última chamada Réveillon (menu + urgência + CTA).",
            "edicao": "Finalizar sequência de stories de última chamada Réveillon.",
            "publicacao": "Publicar stories de última chamada Réveillon.",
        },
    ),
    (
        "Stories S6",
        "Vinhos conversão de dezembro",
        "Vinhos do Parador",
        date(2026, 12, 15),
        6,
        5,
        False,
        {
            "redacao": "Escrever e validar textos de conversão: combos, presentes e visita à adega até o fim do ciclo.",
            "captacao": "Criar artes de conversão (combos, caixas e CTA WhatsApp/Maps).",
            "edicao": "Finalizar stories de conversão de Vinhos do Parador.",
            "publicacao": "Publicar stories finais de conversão dos Vinhos do Parador.",
        },
    ),
]

tarefas = []
for canal, assunto, frente, pub, red_off, cap_off, is_video, desc in entregas:
    c = chain(pub, red_off, cap_off, 2)
    steps = [
        ("Redação", "redacao", "redator", "redacao"),
        ("Gravar" if is_video else "Criar artes", "captacao" if is_video else "criacao_artes", "videomaker", "captacao"),
        ("Edição", "edicao", "videomaker", "edicao"),
        ("Publicar", "publicacao", "gestor_projeto", "publicacao"),
    ]
    for titulo_label, tipo, resp, key in steps:
        tarefas.append(
            {
                "titulo": f"{titulo_label} · {canal} · {assunto}",
                "vencimento": c[key].isoformat(),
                "descricao": desc[key],
                "frente": frente,
                "tipo": tipo,
                "dataPublicacao": pub.isoformat(),
                "responsavelSugerido": resp,
            }
        )

trafego = [
    {
        "titulo": "Configurar · Tráfego · Campanha conversão Vinhos do Parador",
        "vencimento": "2026-11-10",
        "descricao": "Estruturar campanha Meta Ads de conversão (WhatsApp/visita) com públicos lookalike + interesse em vinhos/gastronomia; pixels e eventos validados.",
        "frente": "Tráfego Pago",
        "tipo": "trafego",
        "dataPublicacao": "2026-11-15",
        "responsavelSugerido": "gestor_trafego",
        "campanhaAlvo": "Vinhos do Parador",
    },
    {
        "titulo": "Ativar · Tráfego · Lançamento Vinhos do Parador",
        "vencimento": "2026-11-15",
        "descricao": "Disparar campanha de conversão alinhada ao Feed 01 (Reels de lançamento). Orçamento inicial de arrancada e criativos do lançamento.",
        "frente": "Tráfego Pago",
        "tipo": "trafego",
        "dataPublicacao": "2026-11-15",
        "responsavelSugerido": "gestor_trafego",
        "campanhaAlvo": "Vinhos do Parador",
    },
    {
        "titulo": "Configurar · Tráfego · Campanha Réveillon reservas",
        "vencimento": "2026-11-21",
        "descricao": "Montar campanha de conversão para reservas de Réveillon (mensagens/WhatsApp), com criativos de menu e prova social.",
        "frente": "Tráfego Pago",
        "tipo": "trafego",
        "dataPublicacao": "2026-11-26",
        "responsavelSugerido": "gestor_trafego",
        "campanhaAlvo": "Réveillon",
    },
    {
        "titulo": "Otimizar · Tráfego · Amplificar carrossel Grand Cru",
        "vencimento": "2026-11-24",
        "descricao": "Impulsionar Feed 04 (carrossel Grand Cru) com segmentação local Lagoa da Prata + raio; pausar anúncios de baixo CTR.",
        "frente": "Tráfego Pago",
        "tipo": "trafego",
        "dataPublicacao": "2026-11-24",
        "responsavelSugerido": "gestor_trafego",
        "campanhaAlvo": "Vinhos do Parador",
    },
    {
        "titulo": "Ativar · Tráfego · Arrancada Réveillon",
        "vencimento": "2026-11-26",
        "descricao": "Ativar campanha Réveillon junto com Stories S2. Priorizar orçamento e remarketing de engajamento no perfil.",
        "frente": "Tráfego Pago",
        "tipo": "trafego",
        "dataPublicacao": "2026-11-26",
        "responsavelSugerido": "gestor_trafego",
        "campanhaAlvo": "Réveillon",
    },
    {
        "titulo": "Escalar · Tráfego · Vinhos presentes (Stories S3)",
        "vencimento": "2026-12-03",
        "descricao": "Amplificar Stories S3 (Presentes sem erro) com foco em combos e caixas; ajustar lances para CPL de mensagem.",
        "frente": "Tráfego Pago",
        "tipo": "trafego",
        "dataPublicacao": "2026-12-03",
        "responsavelSugerido": "gestor_trafego",
        "campanhaAlvo": "Vinhos do Parador",
    },
    {
        "titulo": "Escalar · Tráfego · Réveillon meados de dezembro",
        "vencimento": "2026-12-08",
        "descricao": "Aumentar verba da campanha Réveillon, refrescar criativos e reforçar urgência (vagas/mesas).",
        "frente": "Tráfego Pago",
        "tipo": "trafego",
        "dataPublicacao": "2026-12-13",
        "responsavelSugerido": "gestor_trafego",
        "campanhaAlvo": "Réveillon",
    },
    {
        "titulo": "Disparo final · Tráfego · Conversão Réveillon",
        "vencimento": "2026-12-13",
        "descricao": "Disparo final alinhado à Stories S5 (última chamada): maximizar mensagens/reservas até 15/12.",
        "frente": "Tráfego Pago",
        "tipo": "trafego",
        "dataPublicacao": "2026-12-13",
        "responsavelSugerido": "gestor_trafego",
        "campanhaAlvo": "Réveillon",
    },
    {
        "titulo": "Disparo final · Tráfego · Conversão Vinhos do Parador",
        "vencimento": "2026-12-15",
        "descricao": "Fechar ciclo com boost dos stories S6 de conversão (presentes/adega) e retargeting de quem engajou no mês.",
        "frente": "Tráfego Pago",
        "tipo": "trafego",
        "dataPublicacao": "2026-12-15",
        "responsavelSugerido": "gestor_trafego",
        "campanhaAlvo": "Vinhos do Parador",
    },
]

# Validate content chain order
order_rank = {"redacao": 0, "captacao": 1, "criacao_artes": 1, "edicao": 2, "publicacao": 3}
by_pub = defaultdict(list)
for t in tarefas:
    by_pub[t["dataPublicacao"]].append(t)

errors = []
for pub, items in by_pub.items():
    sorted_items = sorted(items, key=lambda x: order_rank[x["tipo"]])
    dates = [x["vencimento"] for x in sorted_items]
    if dates != sorted(dates):
        errors.append((pub, [(x["tipo"], x["vencimento"]) for x in sorted_items]))

payload = {
    "cliente": "Parador da Figueira",
    "periodo": "15/11/2026 a 15/12/2026",
    "regrasCadeia": {
        "redacao": "5 a 7 dias antes da publicação (inclui validação com cliente)",
        "captacaoOuArtes": "4 a 5 dias antes da publicação",
        "edicao": "2 dias antes da publicação",
        "publicacao": "data exata do calendário",
    },
    "resumo": {
        "totalTarefas": len(tarefas) + len(trafego),
        "conteudo": len(tarefas),
        "trafego": len(trafego),
        "entregas": len(entregas),
    },
    "tarefas": tarefas + trafego,
}

with open(OUT, "w", encoding="utf-8") as f:
    json.dump(payload, f, ensure_ascii=False, indent=2)

print("errors", errors)
print("resumo", payload["resumo"])
print("saved", OUT)
