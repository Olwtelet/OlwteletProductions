# Olwtelet Productions — transformação da réplica

Registro da passagem da réplica técnica para o site da **Olwtelet Productions** (16/11/2026). A réplica continua
documentada em `docs/REPORT.md` e `docs/evidence/**` como **documentação da reprodução**; as menções ao site
reproduzido nesses arquivos são históricas. Ponto de recuperação: commit `228dc9e0`, tag `phantom-replica-checkpoint`
(branch `olwtelet-productions`).

## Fontes usadas

- **Marca**: `assets-src/brand/olwtelet-logo-source.png`, o anexo do proprietário (1024², "A" geométrico branco
  sobre preto).
- **Vetor**: traçado publicado em https://olwtelet.vercel.app/favicon.svg, comparado com o anexo. Mesma proporção
  (0,7987 × 0,7991) e IoU de 0,9946 a 1024 px (`scripts/brand/README.md`). O anexo prevalece: o vetor só é usado porque
  reproduz a geometria dele (`src/content/brand-mark.ts`, sete faces, sem escala nem suavização).
- **Fatos**: o briefing do proprietário e os sites https://olwtelet.vercel.app/ e
  https://filmeshdonlinegratis.vercel.app/, lidos em 16/11/2026 apenas com GET.
- **Capturas** do site de cinema: `assets-src/projects/filmes-hd-online-gratis/` (data, método e lista no README da
  pasta).

## Dados centralizados

| Arquivo | Conteúdo |
|---|---|
| `src/content/brand.ts` | nome, assinatura, tagline, criador, local e fuso, e-mail, links, projetos (status, tipo, categorias, slot no grid, tema), rótulos e contagens, origem configurada |
| `src/content/brand-mark.ts` | símbolo vetorial |
| `scripts/brand/build-content.mjs` | gera `src/content/{projects,home,pages,settings,taxonomies,page-themes}.json` a partir de brand.ts |
| `scripts/brand/build-brand-assets.mjs` | gera logos, ícones, Open Graph, quadros da intro, modelo de partículas, sequência e máscaras do Sobre, atlas e `src/content/blueprint.json`, imagens dos projetos |

Header, rodapé, relógio, grid, lista, filtros, case, Sobre, contato, metadados, JSON-LD, sitemap e manifest leem
esses dados (direto ou pelos JSON gerados).

## O que mudou

**Identidade**: símbolo inline no header (`currentColor`, segue o tema: branco no escuro, preto no claro); símbolo e
render no rodapé (no lugar do selo de certificação); favicon, ícone SVG adaptável, apple-icon e manifest; OG;
`<html lang="pt-BR">`; JSON-LD da Olwtelet Productions (sem endereço de rua, VAT, CNPJ ou URL inventada); fundo do 404.

**Intro**: palavras OLWTELET / PRODUCTIONS no loader; o mosaico de pixels e a troca de quadros mostram o símbolo
iluminado em 6 materiais (desktop) e 3 (celular); a nuvem de partículas é amostrada das faces do símbolo
(`public/assets/models/olwtelet-mark.glb`, 4 704 pontos). O ritmo e a sequência (mosaico → quadros → partículas →
explosão → grid) são os mesmos. Os 1 450 quadros antigos e o modelo antigo foram retirados.

**Grid**: mapa explícito de 121 posições: Filmes HD Online Grátis no slot 0, Veil no slot 2 (diagonal), cada um
uma vez por período da malha infinita. As demais posições mostram 5 desenhos de célula vazia (cantos, cruz,
moldura tracejada, pontos e superfície escura), distribuídos para que vizinhos nunca repitam o desenho. Células vazias
não têm hover, clique nem foco por teclado. A vista inicial centraliza o projeto publicado (`HOME_FOCUS`). Tab passa
pelos projetos e Enter abre. Filtros sem correspondência deixam as posições vazias, sem cópias.

**Lista e filtros**: grupos "Publicados" e "Em desenvolvimento"; contagem "1 projeto publicado · 1 em
desenvolvimento"; estado vazio com "Ver todos os projetos"; filtros TIPO (Web, Jogo) e CATEGORIA (Cinema, Curadoria,
Comunidade, Estratégia, Navegador), só com valores existentes.

A lista adapta as colunas da réplica ao tamanho real dos textos (`src/components/home/ui/listView.module.css`, seção
"Olwtelet: real text lengths"). Tipografia, cores, divisórias e espaçamentos são os da réplica.
- **Abaixo de 768 px**: o rótulo do grupo fica numa linha e as linhas de projeto ocupam a largura toda. Cada projeto
  mostra o título numa linha e o endereço (ou "Apresentação do projeto") na linha de baixo.
- **768–1023 px**: título e endereço na mesma linha. O rótulo do grupo cabe numa linha, as colunas dos dois grupos
  ficam alinhadas e o endereço ocupa no máximo 45 % da linha.
- **1024–1439 px**: a contagem começa sobre a coluna dos projetos, como a réplica já faz a partir de 1440 px.
- **A partir de 1440 px**: a coluna do título cede espaço para o endereço completo e as etiquetas.
- **Contagem**: a partir de 360 px, quebra só no " · ". Abaixo disso, uma parte pode quebrar entre palavras (3 linhas
  em 320 px). Título e contagem ficam separados por pelo menos 32 px lado a lado, ou empilhados.
- **Abaixo de 1024 px**: os textos mantêm distância do botão grade/lista e do rótulo "SOM", fixos no meio da altura
  (34 px à esquerda, 48–56 px à direita). As divisórias continuam no comprimento original.
- **Celulares baixos** (altura visível abaixo de 660 px): a lista começa 60 px mais acima.
- **Rolagem**: a lista só rola quando o conteúdo é mais alto que a tela. Antes ela rolava 164 px de espaço vazio e
  levava o título para baixo do header.
- **Endereço longo**: se um dia não couber, é encurtado com reticências. O texto completo continua no DOM e no
  atributo `title`.
- **Faixas de largura**: usam sintaxe de intervalo (`width < 1024px`), sem lacunas em larguras fracionárias de zoom.

**Controles fixos nos celulares** (achados da revisão final desta rodada). Os rótulos em português são mais longos que
os da réplica e se encostavam:
- **Sobre**: abaixo de 480 px, o seletor Estúdio | Processo passa para logo abaixo da linha do header. Antes ele
  cobria "Vamos conversar" em 360 e 390 px.
- **Filtrar**: abaixo de 384 px, o botão se desloca para a esquerda e mantém pelo menos 8 px de "Vamos conversar",
  também com a fonte substituta. Antes eles se tocavam em 360 px sem as fontes da Adobe e se sobrepunham em 320 px.
- **Contato**:
  - abaixo de 768 px, "Política de privacidade" vem logo depois dos cartões. Antes ficava presa ao pé da tela, sobre o
    botão do e-mail;
  - o endereço de e-mail pode quebrar depois do "@" e não sai mais do botão;
  - no formulário, o rótulo "Nome completo*" mantém 0,75 rem do texto digitado (em 390 px eles se encostavam).
- **Botão grade/lista**: em exatamente 1024 px (iPad na horizontal) ele segue a orientação horizontal das faixas CSS.
  O destaque branco não sai mais da pílula.

**Projetos**:
- `/projects/filmes-hd-online-gratis`: case no mesmo sistema editorial, com "VER O SITE" para o endereço público,
  capturas reais e nota de data das capturas.
- `/projects/veil`: apresentação tipográfica marcada "Em desenvolvimento", sem link, sem captura, sem botão de jogar.
- Os 140 projetos antigos, as rotas de vagas, as páginas de políticas antigas e o espelho de mídia (`public/remote`,
  ~1,9 GB) saíram. As URLs antigas respondem 404.

**Sobre**: Estúdio (`/about/studio`) e Processo (`/about/process`). Estúdio traz o texto-base do proprietário, as
linhas dos dois projetos, a apresentação do criador, o painel de partículas com o símbolo, o bloco de Brasília e os
contatos. Processo conta o processo do proprietário: os projetos nascem de uma epifania e, quando ela se mostra
promissora, entram em análise e desenvolvimento. São três etapas, cada uma com um diagrama próprio (segunda rodada do
proprietário, 18/11/2026, abaixo), sem métodos, equipe, clientes ou serviços.

**Contato**: assuntos "Projetos e parcerias", "Veil" (e-mail com assunto) e "Outros assuntos" (e-mail e LinkedIn).
O formulário aceita nomes com acento, tem empresa opcional e informa a falha de envio com o e-mail, sem sucesso
simulado.

**Política de privacidade** em pt-BR, alinhada ao código: dados do formulário, armazenamento no navegador, Adobe
Fonts, análise só quando configurada e direitos pela LGPD.

**Removido**: vagas e candidatura, escritórios de Londres e Auckland, certificado ISO, prêmios, clientes, equipe,
redes do site antigo, `phantom.land` em canonicals, metadados e sitemap.

## Rodada de ajustes do proprietário (17/11/2026)

Seis pedidos a partir do uso real. Os defeitos herdados da réplica foram corrigidos com autorização do proprietário. A
composição de Estúdio não mudou: na comparação antes/depois em 390, 768, 1440 e 2560 px, títulos, textos e caixas do
conteúdo são idênticos. As diferenças registradas são estas:
- o rótulo do som;
- a posição do carrossel automático;
- o relógio do cabeçalho, que mostra a hora da captura (1440 e 2560 px);
- em 768 px, o seletor Estúdio | Processo e a navegação inferior. São elementos fixos, anotados com a rolagem do
  momento da captura, por isso aparecem 130 px mais abaixo;
- na lista de elementos, o conteúdo do parágrafo do e-mail do rodapé. Ele agora traz o endereço duas vezes, porque o
  link tem as duas versões do item 7, mas só uma é exibida. O texto visível e as caixas são iguais.

Abaixo de 360 px, o rodapé e os contatos de Estúdio receberam um ajuste local (item 7). Capturas, vídeos e medições:
`docs/evidence/olwtelet/rodada-proprietario/` (os scripts estão em `scripts/brand/owner-checks/`).

### 1. "Ver todos os projetos" nas páginas de projeto

- **Causa**: a réplica dimensionava a frase curta em inglês para encher uma linha: fonte até 329 px, sem quebra, numa
  caixa com `overflow: hidden`. A frase em português é 1,7 vez mais larga, e cerca de 40 % dela ficava sempre cortada
  (sobrava "todos os proj").
- **Agora**: um bloco que quebra linha, numa escala editorial entre o título da página e os subtítulos
  (`clamp(2.5rem, 7.5vw, 8.5rem)`), com respiro acima e nas laterais. A cor (#777) é legível sobre #222. O hover
  aparece só em dispositivos com hover, e o foco por teclado também acende. Arquivo:
  `src/components/project/related.module.css`.
- **Medido nas duas páginas de projeto**:

  | Largura | Fonte | Linhas | Frase |
  |---|---|---|---|
  | 390 | 40 px | 2 ("Ver todos / os projetos") | inteira |
  | 768 | 57,6 px | 1 | inteira |
  | 1440 | 108 px | 1 | inteira |
  | 1920 e 2560 | 136 px | 1 | inteira |

  Antes, a frase perdia de 112 a 604 px por lado. No fim da rolagem, a frase fica acima da navegação inferior, com
  53 px de folga em 390 px, 81 px em 1440 px e 96 px em 2560 px.
- **Pelo teclado**: o foco por Tab rolava o link só até a borda de baixo da tela, e a navegação inferior o cobria em
  1024–1920 px. Um `scroll-margin-bottom` reserva o espaço da navegação. Medido com Tab até o link: 54 a 68 px acima
  da navegação em 1024, 1280, 1440 e 1920 px, nenhum ponto da frase coberto.
- **Outro corte real**: no título da página Filmes HD Online Grátis, a máscara das linhas cortava metade do acento de
  "GRÁTIS". A máscara não esconde nenhuma animação (o título anima as próprias linhas), então ficou visível
  (`caseStudy.module.css`). Títulos com letra acentuada ganham 0,08 em entre as linhas, para o acento não encostar na
  linha de cima: a folga medida é de 3 px em 390 px, 13 px em 1440 px e 20 px em 2560 px. Títulos sem acento não
  mudam. Na página do Veil, apresentação, textos e categorias não têm outros cortes (capturas da página inteira em
  1440, 390 e 2560 px).

### 2. Som ligado por padrão

- **Estado**: sem escolha salva, o som está ligado ("Som [LIG]"). A escolha do visitante fica em `localStorage`
  (`olwtelet:sound`, `src/lib/soundPref.ts`) e é respeitada em toda a navegação e nas próximas visitas. A política de
  privacidade cita esse armazenamento.
- **Reprodução**:
  - quando o navegador permite, toca sozinho;
  - quando bloqueia, o primeiro clique, toque ou tecla em qualquer ponto da página libera o áudio. Não é preciso achar
    o botão de som;
  - nenhuma flag nem configuração do navegador é usada.
- **Um único AudioContext por documento**, com uma única trilha de fundo:
  - o motor é um singleton (`audioEngine`);
  - a trilha só começa depois que o áudio de fato roda, então nada fica enfileirado para estourar no desbloqueio;
  - efeitos pedidos com o áudio suspenso são descartados.
- **Botão de som**:
  - continua ligando e desligando;
  - com o áudio ainda bloqueado, o primeiro toque no botão libera o som em vez de desligá-lo (o rótulo já dizia "LIG",
    e quem clica quer ouvir). Esse toque não grava nenhuma escolha; o toque seguinte desliga;
  - agora também por teclado (Enter/Espaço). Para leitores de tela, o nome é fixo ("Som") e o estado vem de
    `aria-pressed`;
  - o ícone mostra o que se ouve, e o rótulo mostra a escolha.
- **Contato**: a trilha que começa já em `/contact` (o primeiro clique foi no "Vamos conversar") nasce com o filtro
  abafado do contato (300 Hz), como quando se abre o contato com a trilha tocando.
- **Desligar no meio de uma troca de página**: a trilha que ainda estava carregando é descartada; nenhuma trilha volta
  a tocar depois do "DESL".
- **Trocar de página com a trilha ainda carregando**:
  - antes, o pedido da nova página era ignorado e só era refeito numa nova renderização. Em Sobre, essa renderização
    pode ficar retida por segundos enquanto a textura do painel de partículas carrega;
  - numa rede lenta, a trilha da home tocava em Sobre por cerca de 9 s, ou, depois de desligar e religar, nada tocava
    com o rótulo em "LIG";
  - agora o pedido de outra trilha substitui a que está carregando, sem esperar renderização. Medido com rede lenta
    simulada (DevTools, 400 ms e 200 KB/s): a trilha de Sobre assume, a da home não é ouvida, e desligar e religar
    volta a tocar na hora.
- **Páginas fora da lista** (política de privacidade, 404): ao abrir uma delas direto, nenhuma trilha começava, com o
  rótulo em "LIG". Agora toca a última trilha ouvida, a da home por padrão, como já acontecia no contato.
- **Ícone**: a transição ligar/desligar é escolhida no mesmo ciclo da mudança. Com as renderizações retidas, um
  desligar/religar rápido deixava o ícone em "mudo" com a trilha tocando.
- **Tecla mantida**: segurar Espaço ou Enter no botão alterna uma vez só. Antes, alternava a cada repetição da tecla e
  salvava um estado qualquer.
- **Trilha ainda carregando ao abrir o contato, a política ou um 404**: ela conta como a trilha atual e continua.
  Numa rede lenta, ela era trocada pela da home.
- **Filtro do contato**: abrir o contato menos de 2 s depois de chegar numa página deixava a trilha sem abafar,
  porque a transição de abertura do filtro (2 s) continuava rodando. Agora cada transição do filtro substitui a
  anterior.
- **Falha de rede**: uma trilha cujo download falhou (conexão caindo por um instante) é buscada de novo na próxima vez.
  Antes, aquela página ficava muda pelo resto da visita, com o rótulo em "LIG".
- **`/index`** (a home sob outro endereço) toca a trilha da home também depois de Voltar.
- **Abertura**: o aviso da intro passou a dizer "CLIQUE PARA OUVIR O SOM" enquanto o navegador segura o áudio e "SOM
  ATIVADO" quando ele toca. Ele não aparece para quem desligou o som.
- **Medido com o Chrome nas configurações normais**: um AnalyserNode na saída mede o sinal real (RMS), não o rótulo.

  | Momento | Rótulo | Contexto | Sinal (RMS) | Trilhas | Escolha salva |
  |---|---|---|---|---|---|
  | primeira visita, sem clique | LIG | suspenso pelo navegador | 0 | 0 | nenhuma |
  | depois do primeiro clique na página | LIG | rodando | 0,33 | 1 | nenhuma |
  | primeiro toque no botão de som, com o áudio ainda bloqueado | LIG | rodando | 0,09 | 1 | nenhuma |
  | navegando entre páginas | LIG | 1 contexto | 0,18–0,30 | 1 | nenhuma |
  | ao desligar no botão | DESL | rodando | 0 | 0 | off |
  | ao navegar, clicar e recarregar depois disso | DESL | — | 0 | 0 | off |
  | ao religar (mouse ou Enter) | LIG | rodando | 0,18 / 0,16 | 1 | on |
  | primeira trilha começando já no contato | LIG | rodando, filtro em 300 Hz | 0,16 | 1 | nenhuma |
  | política de privacidade ou 404 abertas direto, depois de um clique | LIG | rodando | 0,30 / 0,30 | 1 | nenhuma |

  Em todos os momentos há um único AudioContext. O RMS varia com o trecho da trilha em que a medição cai. Fontes:
  `medicoes/estados-depois.json` (sequência principal), `revisao-correcoes-depois.json` (botão bloqueado e contato)
  e `revisao-final-correcoes-depois.json` (política e 404). Todos são do build final.

### 3. Página Processo

> **Substituído na segunda rodada (18/11/2026)**: o proprietário informou que as quatro etapas abaixo não representam
> como os projetos são criados. Título, introdução, etapas e diagramas foram refeitos (seção "Segunda rodada do
> proprietário"). Este item registra o que valia no build `2ScPNEWZjIwoLexHOGa25`.

A página mantém o título "DA IDEIA AO REFINAMENTO." e o carrossel. O que mudou:
- **Introdução**: curta, na medida de cerca de quatro linhas.
- **Etapas**: as quatro etapas trazem os textos do proprietário.
- **Diagramas**: cada etapa tem o seu, num mesmo sistema (`src/components/about/ProcessDiagrams.tsx`):
  - grade de construção, linhas de 1 px;
  - três rótulos mono tirados palavra por palavra do texto, entrando no desenho;
  - as cores da página.
- **Narrativa**: o símbolo passa de esboço a objeto pronto ao longo das etapas.

  | Etapa | O que o diagrama mostra |
  |---|---|
  | 01 Ideia | o escopo e o símbolo só em contorno |
  | 02 Investigação | referências, necessidades e restrições convergem; três possibilidades, uma escolhida |
  | 03 Construção | conteúdo, interação e tecnologia como camadas conectadas que sustentam o símbolo |
  | 04 Refinamento | testar → revisar → ajustar em ciclo; o símbolo pronto com a peça ajustada e o fantasma de antes |

- **Leitura**: os números das etapas usam a cor da página a 50 %. Os quatro diagramas têm o mesmo tamanho e a mesma
  borda esquerda (coluna fixa para os rótulos): 250 px em 390 px e 462 px em 1440 px.
- **Botão "Vamos conversar"** no fim da página (estilo `About_View`): usa a cor da página. Em Processo, o fundo é
  claro e o botão ficava branco sobre branco; em Estúdio continua igual (branco a 15 %, texto branco).
- **Removido**: os quatro quadrados pretos com a mesma logo e o parágrafo "Atenção", que repetia o texto de Estúdio.
- **Código e conteúdo**:
  - CSS e componentes próprios (`ProcessSteps.tsx`, `processSteps.module.css`). Estúdio continua com os componentes e
    o CSS de antes;
  - conteúdo gerado por `scripts/brand/build-content.mjs`; só o registro de Processo (e a política de privacidade)
    mudou em `pages.json`.
- **Medido**: sem rolagem horizontal de 320 a 2560 px. Em 1920 px o carrossel ultrapassa 24 px, como já fazia em
  Estúdio (corpo com `overflow-x: hidden`). A página ficou mais curta e sem vazios: em 390 px, de 3918 para 2949 px de altura; em 768 px, de 5270 para 3430 px.

### 4. Imagens dos cards do contato

- **Causa**: as imagens estáticas usavam a regra herdada dos vídeos de fundo, um quadrado de 150 % do card centrado
  atrás do texto. A logo invadia o texto e o slide do Veil perdia a palavra VEIL e o subtítulo.
- **Agora** (`ContactForm.tsx`, `contact.module.css`): imagem e vídeo têm tratamentos separados, e cada card tem um
  enquadramento próprio:
  - **logo**: inteira (`contain`), no recorte do próprio símbolo;
  - **Veil**: o slide inteiro em 16:9 (qualquer recorte perderia a palavra ou o subtítulo).
- **Onde aparecem**: sempre dentro do card e nunca sob o texto ou a seta, numa área livre:
  - a partir de 1440 px: abaixo do título, ao lado da seta;
  - em 768–1023 px: canto inferior direito;
  - em 1024–1439 px o card é uma linha só, sem área livre, então nenhuma imagem é mostrada (o fundo do card reage, como
    no terceiro card);
  - abaixo de 768 px também não há imagem.
- **Comportamento**:
  - hover só em dispositivos com hover, e o foco por teclado espelha o hover;
  - em toque nada fica preso, incluindo a seta invertida que ficava depois do link de e-mail. Os cards de e-mail e
    LinkedIn também invertiam com o toque e ficavam assim ao voltar do aplicativo; agora só invertem com hover ou foco
    por teclado;
  - a seta dos cards em linha (1024–1439 px) não é mais espremida num oval: 32 × 32 px;
  - o card do LinkedIn não usa mais o ícone de envelope do e-mail.
- **Medido** (`contact-hover.mjs`, `medicoes/contato-cards-depois.json`):
  - com mouse, em 768 (`t768h`), 1440, 1920 e 2560 px: as imagens ficam dentro do card e fora do título, do rótulo e
    da seta, aparecem no hover e no foco por teclado e somem na saída;
  - em 1024 e 1280 px não há imagem, como previsto;
  - com toque, em 390 e 768 px: um toque real em cada card não mostra imagem, e o card interno e a seta ficam com as
    cores de repouso (`tapNLook` igual a `restLook`). Depois de tocar os cards de e-mail e LinkedIn, os dois ficam
    com a cor de repouso (`tilesAfterTaps` igual a `restTiles`).

### 5. Ciclo de vida do modal de contato

> **Corrigido na segunda rodada (18/11/2026)**: o fechamento logo depois de Voltar, que deixava a página perto do topo
> e depois a fazia saltar, foi corrigido na causa (ver "Segunda rodada do proprietário", item 2). A manutenção da
> posição abaixo descreve o build atual; a medição desse caso no fim do item é a do build anterior e está marcada
> assim. O restante do item continua valendo.

- **Causa**:
  - o slot paralelo `@contact` não tinha página para as outras rotas. Na navegação pelo cliente o Next mantém a última
    página ativa do slot (documentação instalada, `parallel-routes.md`), por isso o modal continuava aberto sobre
    `/privacy-policy`;
  - o fechamento só chamava `router.back()` e nunca fechava o diálogo nativo. Depois da política, o X voltava a
    `/contact` com o diálogo aberto e opacidade 0, bloqueando cliques;
  - o Esc fechava o diálogo mas deixava a URL em `/contact` e a página travada.
- **Agora**:
  - **Rotas**: páginas nulas do slot para cada rota existente (`@contact/page.tsx`, `[uid]`, `about/[uid]`,
    `projects/[uid]`). Um `[...catchAll]` criaria uma rota nova e tomaria os 404 profundos. Status e título dos 404
    profundos continuam iguais;
  - **Fechamento centralizado** em `ContactModal.tsx`. X, Esc, "Concluir" e um fechamento nativo seguem o mesmo
    caminho, que roda uma vez por abertura:
    - esmaece o diálogo e o fecha nativamente;
    - libera a rolagem e devolve o foco;
    - só então navega, uma única vez: `router.back()` se o modal abriu sobre uma página, `router.replace('/')` no
      acesso direto;
  - **Desmontagem** (Voltar/Avançar, links internos): faz a mesma limpeza. O Lenis é recriado na página de volta;
  - **Grid**: ignora teclas enquanto há um diálogo aberto, e Enter/Espaço só valem com o foco no próprio grid. Antes,
    um Enter dentro do modal sobre a home abria um projeto atrás dele, e um Enter no "Vamos conversar" do header
    abria o contato e, ao mesmo tempo, um projeto;
  - **Foco**: ao fechar, volta para quem abriu. Se foi o "Contato" da navegação inferior (que não existe em
    `/contact`), o foco volta a esse link quando a página reaparece;
  - **Rolagem**: Política → Voltar reabre o modal sobre a página na posição em que estava:
    - o caminho e a posição da página ficam no próprio registro `/contact` do histórico (`history.state`, que o Next
      preserva em Voltar/Avançar);
    - com dois registros `/contact` no histórico, cada um volta à sua página. Com um valor único compartilhado, a
      página ficava presa na posição da outra;
    - a página remontada sob o modal já vem inteira: as páginas Sobre montam o conteúdo de imediato nesse caso
      (segunda rodada, item 2), e a posição volta atrás do modal no primeiro quadro. Ela é mantida por pelo menos 1,5 s
      e 45 quadros desenhados, porque o SplitType da página remontada repõe com `window.scrollTo` a posição que leu ao
      dividir o texto. A manutenção continua depois de fechar, então um X ou Esc logo após Voltar mostra a página no
      lugar. Para quando o endereço muda para outra página ou na primeira ação do visitante na página: roda, toque,
      clique ou qualquer tecla, inclusive Tab, cuja rolagem até o foco é mantida;
    - ao fechar, a página fica onde o visitante a vê sob o modal: essa posição é mantida durante a volta, com as mesmas
      regras de parada. No caso medido, ela fica em 3000 px e, por dois quadros, oscila 1 a 3 px. Sem isso, o navegador restaura a posição salva do registro da página, de forma suave
      (`scroll-behavior: smooth`). Depois de Voltar → rolar → Avançar até `/contact`, essa posição era outra, e o
      fechamento fazia a página deslizar sozinha cerca de 2400 px. `history.scrollRestoration` não resolve: vale por
      registro, e o que conta é o da página;
    - antes, a página ficava em 272 px sob o modal e deslizava até 1100 px depois do X;
  - **Clique duplo no X**: o "Vamos conversar" do header fica sob o X em todas as larguras. O segundo clique de um
    clique duplo caía nele depois do fechamento, reabria o contato e criava um segundo `/contact`. O ponto do X ignora
    cliques por 0,7 s a partir do clique no X, cerca de 0,4 s depois de o diálogo fechar. Cobre um clique duplo (até
    0,5 s entre os cliques); um clique deliberado depois disso volta a funcionar;
  - **Teclado nas etapas**:
    - as etapas ficam empilhadas no DOM. As que não estão na tela agora são `inert`. Antes, o Tab depois da política
      entrava na etapa 2 (um campo invisível, o contêiner rolável, as caixas de seleção) e rolava o modal 621–900 px;
    - ao trocar de etapa, o foco vai ao primeiro botão da nova etapa: "Etapa anterior" na etapa 2, o primeiro card na
      volta. Nunca vai a um campo de texto, para não abrir o teclado do celular.
- **Medido no fluxo real**:
  - Home → contato → Política: a URL vira `/privacy-policy`, o diálogo sai e a política aparece;
  - Esc e X sobre Estúdio rolado: volta a `/about/studio` na mesma posição (scrollY 900), com o Lenis ativo;
  - X duas vezes: uma navegação só;
  - Voltar/Avançar: URL e interface coerentes;
  - reabrir: abre limpo;
  - Tab/Enter dentro do modal sobre a home: não navega para nenhum projeto;
  - acesso direto + X: vai para `/`;
  - Enter no "Vamos conversar" sobre a home: abre o contato e fica em `/contact`; o Esc volta para `/` com o foco no
    mesmo link;
  - "Contato" da navegação + Esc: o foco volta ao link "Contato";
  - Estúdio rolado até 1100 px → contato → Política → Voltar → X: a página fica em 1100 px sob o modal e depois do X,
    sem deslizar;
  - dois registros `/contact` (Estúdio em 1200 → contato → Política → contato → Voltar → Voltar): o modal reabre
    sobre o Estúdio em 1200, e o X fecha sem deslizar;
  - **No build anterior** (`2ScPNEWZjIwoLexHOGa25`; corrigido na segunda rodada, item 2), Esc ou X logo depois de
    Voltar: a página terminava em 1200 px, sem deslizar, mas não de imediato. Quadros contados por
    `requestAnimationFrame`, em duas execuções da rodada anterior:
    - com 300 ms, ela ficava 26 a 27 quadros em 168 px e então saltava para 1200;
    - com 150 ms, ficava 50 a 54 quadros em 168 px e passava um quadro em 272 px antes dos 1200;
    - com 700 ms, já estava em 1200 desde o primeiro quadro.

    A medição do mesmo build na segunda rodada (item 2), com tempos, mostra a página em 168 px até cerca de 0,2 s
    (300 ms) e 0,36 s (150 ms) depois do fechamento, e em 272 px por cerca de 0,1 s. Uma conversão anterior para
    segundos supunha 60 quadros por segundo, o que esses tempos não confirmam. Duas execuções com travamento
    terminaram em 272 e 212 px.

    Os números cobrem duas execuções naquele build; a de `revisao-final-correcoes-depois.json` tem a sequência em
    `quickClose`, campo `steps`. Era o mesmo comportamento do build anterior a ele. A versão anterior deste texto
    dizia "num único passo", o que a medição não confirmou;
  - um clique no X e, 350, 450 ou 600 ms depois, um clique duplo no mesmo ponto (1440 px); no celular (390 px), dois
    toques com 350 ms entre eles: uma navegação, modal fechado;
  - em todos os casos, o diálogo sai do DOM e a rolagem fica liberada, e o elemento no centro da tela é da própria
    página. O ponto do X em si não é sondado. Ali os cliques são ignorados por 0,7 s de propósito, como proteção
    contra o clique duplo, e o teste do clique duplo mostra que o segundo clique não reabre o contato.

### 6. Linhas do grid

- **Reproduzido em movimento antes da correção**: o script arrasta o grid em passos de 1 px e captura cada passo. Com
  o nível gráfico alto, as linhas apareciam e sumiam. Em 1440×900, DPR 1:
  - o brilho de pico variava de 9 a 45;
  - o número de linhas visíveis ia de 0 a 2.
- **Causas**:
  - **(a)** as "linhas" eram o vão de 0,002 unidade entre os planos (0,35–1 px na tela), desenhado sem antialiasing no
    alvo do pós-processamento. Cada linha ficava inteira ou sumia conforme a fração de pixel;
  - **(b)** os traços finos das células vazias vinham de uma textura sem mipmaps;
  - **(c)** os buffers do pós-processamento nunca acompanhavam o tamanho da janela ou o DPR. Depois de redimensionar, a
    distorção reduzia uma imagem maior que o canvas;
  - **(d)** um clique numa célula vazia deixava o grid na escala "pressionada" até o próximo arraste.
- **Correções**, mantendo curvatura, perspectiva, arraste e inércia:
  - **(a)** os planos se encostam e o shader desenha o mesmo vão com a cobertura exata de cada pixel, na mesma cor. A
    energia da linha é constante em qualquer fração de pixel;
  - **(b)** atlas de rótulos com mipmaps e alfa pré-multiplicado, com o mesmo resultado nos centros dos texels;
  - **(c)** o compositor segue o tamanho e o DPR do canvas, e o coeficiente da distorção segue a proporção;
  - **(d)** a câmera volta ao repouso, a menos que o clique abra um projeto.
- **Medido no build final**:

  | Caso | Salto entre quadros antes → depois | Pico das linhas antes → depois |
  |---|---|---|
  | 1440 DPR 1 | 0,032 → 0,007 | 9–45 → 13–19 |
  | 1440 DPR 2 | 0,041 → 0,007 | 9–32 → 19–25 |
  | 2560 | 0,027 → 0,005 | 9–37 → 20–25 |
  | depois de redimensionar a janela | 0,049 → 0,007 | target 1680×1050 → 1440×900 (igual ao canvas) |

  No tablet e no celular, a região medida inclui desenhos e parte de um projeto. O salto caiu de 0,062 para 0,021 no
  tablet e de 0,032 para 0,023 no celular.

  Uma linha antialiasada de cerca de 1 px ainda varia um pouco de pico entre quadros. O que mudou é que ela não some
  mais nem muda de espessura de forma errática.

### 7. Rodapé e contatos de Estúdio abaixo de 360 px

Os dois defeitos já existiam antes desta rodada. Cada correção vale só abaixo de uma largura (360 px no rodapé, 340 px
nos contatos); acima dela, nada muda.

- **Rodapé** (Estúdio, Processo e Política de privacidade):
  - **Causa**: abaixo de 1024 px, os dois blocos de texto terminam na mesma altura. O e-mail (204 px, alinhado à direita)
    fica na mesma linha que "Brasília, DF". As duas linhas se sobrepunham 30 px em 320 px e 10 px em 340 px. De 350 a
    359 px, ficavam a menos de 10 px uma da outra (0,4 px medidos em 350; a distância cresce 1 px por pixel de
    largura).
  - **Correção**: abaixo de 360 px, o e-mail aparece em duas linhas, OLWTELET@ / OUTLOOK.COM.
    - Na altura de "Brasília, DF" fica só OUTLOOK.COM, a 63 px de "DF" em 320 px e a 43 px em 300 px.
    - A dupla mais próxima numa mesma linha passa a ser OLWTELET.VERCEL.APP / "Brasil": 40,7 px em 320 e 20,7 px em 300.
  - **Como funciona**:
    - O link tem as duas versões, e só uma é exibida. Por isso o endereço é lido e focado uma vez só (`Footer.tsx`,
      `footer.module.css`).
    - A partir de 360 px aparece a de uma linha, com o mesmo texto de antes.
    - A de duas linhas quebra num ponto de quebra opcional (`<wbr>`), dentro de um bloco da largura do maior pedaço. Ela
      quebra sempre no mesmo lugar e, ao copiar, o endereço sai numa linha só.
- **Endereço e contatos de Estúdio**:
  - **Causa**: LINKEDIN.COM/IN/OLWTELET tem 157 px e não pode quebrar.
    - **A coluna**: a dos contatos ocupa 4 de 8 trilhas e é mais estreita que essa linha até cerca de 370 px (132 px em
      320, 152 px em 360) e em 600 px (126 px). Abaixo de 599 px, a grade de 8 trilhas tem a largura da janela
      menos 40 px, por causa das laterais de 20 px da página. A partir de 599 px, a seção se divide em duas colunas com
      24 px entre elas, e a grade passa a ter (janela − 64) / 2: 268 px em 600 px.
    - **A linha**: as trilhas não mudam de tamanho; a linha passa da própria coluna. Abaixo de cerca de 330 px ela passa
      também da borda da tela: chegava a 324,7 px em 320, e a página ficava com 325 px de largura. No celular, a página
      inteira encolhia um pouco para caber. Numa janela de computador de 320 px, o documento também tinha 325 px. Como
      o corpo tem `overflow-x: hidden`, os 5 px a mais ficavam fora da tela, como o excesso do carrossel em 1920 px.
    - **De 340 px para cima**: a linha fica dentro da margem lateral, ou da coluna vazia ao lado, em 600 px. Isso é o que
      já acontecia e não mudou.
  - **Correção**: abaixo de 340 px, endereço e contatos começam uma trilha antes e ocupam 5 trilhas: 169 px em 320, onde
    o LinkedIn termina em 287,7 px. O logo fica com 3 trilhas, como já fica a partir de 1440 px. É só CSS
    (`whereWeAre.module.css`), sem mudança na marcação.
    - De 330 a 339 px a linha não passava da tela, mas parava a menos de 5 px da borda. O corte em 340 px inclui essa
      faixa como folga.
    - Sem as fontes da Adobe, com a fonte substituta, o LinkedIn termina em 284,4 px em 320, também dentro da coluna.
- **Tentativas descartadas**:
  - **Pontos de quebra em todos os contatos**: `<wbr>` depois de "/" e "@" nos contatos, e um `span` no domínio do
    e-mail. Resolvia 320 px, mas os contatos passavam a quebrar também em 340–360 px e em 600 px. Dividir o texto em
    pedaços também mudava o desenho das letras em até 0,1 px em todas as larguras.
  - **Quebra de linha forçada**: um `<br>` na versão de duas linhas do e-mail. O desenho era o mesmo da versão final,
    mas copiar o endereço o trazia partido em dois, e a busca na página não o encontrava (achado da revisão abaixo). A
    versão final é idêntica a ela pixel a pixel em todas as larguras.
- **Medido** com `scripts/brand/owner-checks/narrow-widths.mjs`:
  - **Antes**: no build `P8C65N6TJlkS5tbYPfqyw`, com a primeira versão do script, que já fazia as mesmas medidas e
    capturas.
  - **O que a versão final do script acrescentou**:
    - Processo e a política em 300 px;
    - a cópia do e-mail;
    - o que passa da borda da tela;
    - a opção sem fontes externas.
  - **Depois**: no build final, com e sem as fontes da Adobe.

  | Largura | Rodapé: menor distância entre linhas na mesma altura | Largura da página de Estúdio |
  |---|---|---|
  | 300 px | −49,6 → 20,7 px | 315 → 315 px (outra causa, abaixo) |
  | 320 px | −29,6 → 40,7 px | 325 → 320 px |
  | 340 px | −9,6 → 60,7 px | 340 px, igual |
  | 350 px | 0,4 → 70,7 px | 350 px, igual |
  | 360 px e acima | igual (10,4 px em 360) | igual |

  - **Comparação pixel a pixel**: nas capturas dos dois blocos, com os elementos fixos ocultos e a imagem central
    sorteada mascarada, antes e depois são idênticos:
    - no rodapé, de 360 px para cima: 360, 375, 390, 414, 600, 768, 1024, 1280, 1440, 1920 e 2560 px em Estúdio, e
      360, 390, 768 e 1440 px em Processo e na política;
    - no bloco de contatos de Estúdio, de 340 px para cima.

    A máscara também cobre a parte do e-mail que passa sobre a imagem. Ali valem as caixas das linhas dos dois blocos de
    texto, iguais antes e depois nos 19 casos de 360 px para cima. Só mudam o rodapé de 300 a 350 px e os contatos de
    300 a 320 px.
  - **Copiar o e-mail** dá `OLWTELET@OUTLOOK.COM`, numa linha, em todas as larguras e nas três páginas.
  - **Em 300 px**, abaixo da menor largura pedida, sobram três problemas que já existiam:
    - Estúdio continua com 315 px de largura, ou 319 px sem as fontes da Adobe. A primeira linha do título,
      "SOFTWARE,", no tamanho mínimo da escala dele (40 px), termina em 314,8 px, ou 317,8 px sem as fontes;
    - Processo fica com 311 px, por causa de "REFINAMENTO.", que termina em 309,5 px (título anterior; o atual está na
      segunda rodada);
    - no rodapé, o link da política encosta no ícone do GitHub; em 320 px eles ficam a cerca de 10 px.

    Corrigir os dois primeiros exigiria mudar o tamanho dos títulos, o que o proprietário descartou, e 300 px fica
    abaixo da largura dos celulares mais estreitos (320 px).
  - **Prancha**: `rodada-proprietario/rodape-e-contatos-320-antes-depois.jpg`.
    - No rodapé, o bloco magenta é a máscara sobre a imagem central sorteada.
    - No "antes" dos contatos, a captura do bloco corta a linha do LinkedIn na borda dele (300 px). Na tela, a linha ia
      até 324,7 px.

### Revisão independente da rodada

Seis revisores somente leitura, um por pedido, mediram o site servido. Cada achado passou por dois verificadores
adversariais, que tentaram reproduzi-lo do zero.
- **19 achados**: 16 com ao menos um voto e 3 rejeitados pelos dois verificadores (dois sobre o tamanho das imagens
  do contato em 768–1023 px, um sobre um ramo de vídeo que o site não usa).
- **15 corrigidos** e medidos de novo no build final (`scripts/brand/owner-checks/review-fixes.mjs`). Estão descritos
  nas seções acima:
  - acento de "GRÁTIS" encostando na linha de cima;
  - "Ver todos os projetos" muito perto da navegação;
  - primeiro toque no botão de som desligando em vez de liberar;
  - trilha atrasada depois de desligar;
  - nome do botão de som mudando junto com `aria-pressed`;
  - botão "Vamos conversar" invisível em Processo;
  - contraste dos números das etapas;
  - diagramas em escalas diferentes;
  - cards de e-mail/LinkedIn presos no toque;
  - seta oval;
  - ícone do LinkedIn;
  - Enter no header abrindo um projeto;
  - filtro do contato;
  - foco depois do contato aberto pela navegação;
  - rolagem depois de Política → Voltar → X.
- **1 deixado para o proprietário, depois corrigido**: em 320 px, no rodapé, "Brasília, DF" e o e-mail se sobrepunham
  em cerca de 30 px, como já acontecia antes desta rodada. Como a correção toca o rodapé de Estúdio, ela esperou a
  decisão do proprietário, que pediu a melhor opção. Está no item 7, com um segundo defeito de 320 px encontrado ao
  medir.

**Revisão final**, sobre as correções acima, no build servido:
- **Revisores**: quatro, somente leitura (som; modal e teclado; visual; documentação contra as evidências).
- **13 achados**:
  - os 6 mais graves passaram por um verificador adversarial, e os 6 foram confirmados;
  - os outros 7, de gravidade baixa, foram conferidos contra o código e as evidências e também procediam.
- **Todos os 13 corrigidos**. Os 9 de comportamento foram medidos de novo por
  `scripts/brand/owner-checks/review2-fixes.mjs`; os 4 de documentação foram conferidos contra as evidências. Estão
  descritos nas seções acima:
  - "Ver todos os projetos" coberto pela navegação quando focado por Tab;
  - posição do modal compartilhada entre registros do histórico;
  - clique duplo no X reabrindo o contato;
  - fechamento logo após Voltar;
  - etapas fora da tela no Tab;
  - trilha da página anterior tocando em Sobre numa rede lenta;
  - ícone preso em "mudo";
  - política e 404 sem trilha;
  - tecla mantida no botão de som;
  - quatro pontos da documentação: valores de RMS, a frase sobre os cliques de teste, o que a medição dos cards
    cobria em 768 px e no toque, e a tarefa `sprite` no README dos scripts.

**Verificação final**, sobre essas correções, no build servido:
- **Revisores**: três, somente leitura (contato e modal; som; documentação).
- **11 achados**:
  - os 5 mais graves passaram por um verificador adversarial, e os 5 foram confirmados;
  - os outros 6 foram conferidos contra o código e as evidências e também procediam.
- **Todos os 11 corrigidos**:
  - **introduzidos pelas correções anteriores**:
    - uma trilha ainda carregando contava como "nada tocando", e o contato, a política e o 404 a trocavam pela trilha
      da home numa rede lenta. Agora a trilha em carregamento conta como a atual;
    - a manutenção de 1,5 s da posição desfazia a rolagem do Tab logo após fechar. Agora para em qualquer tecla ou
      clique na página;
  - **herdados da réplica**:
    - o filtro do contato era sobrescrito por uma transição de 2 s ainda em curso da página anterior, e a trilha
      tocava sem abafar atrás do modal. Agora a nova transição substitui a anterior;
    - uma trilha cujo download falhou uma vez nunca era buscada de novo, e a página ficava muda pelo resto da visita.
      Agora a falha é esquecida e a próxima vez busca de novo;
    - Voltar para `/index` (a home sob outro endereço) mantinha a trilha anterior. Agora `/index` toca a da home;
    - Voltar → rolar → Avançar até `/contact` → fechar fazia a página deslizar cerca de 2400 px (descrito no item 5);
  - **cinco pontos desta documentação**:
    - o botão de Processo é o "Vamos conversar", não um "Ver" do carrossel;
    - os 0,7 s do clique duplo contam a partir do clique no X;
    - as medições dos cards de toque agora leem o card interno e a seta e cobrem os cards de e-mail e LinkedIn;
    - o crédito a `review2-fixes.mjs` separa comportamento e documentação;
    - o nome do arquivo das linhas do grid.
- **Medido de novo** com os casos que os revisores usaram, nos casos acrescentados ao fim de `review2-fixes.mjs`:
  - Tab logo após fechar;
  - Avançar e fechar tarde;
  - trilha em carregamento indo ao contato e à política, com rede lenta;
  - filtro do contato aberto menos de 2 s depois de chegar na página;
  - nova busca depois de ficar offline;
  - `/index` depois de Voltar.

**Revisão do item 7** (rodapé e contatos abaixo de 360 px):
- **Revisores**: três, somente leitura (rodapé; contatos de Estúdio; documentação contra as medições). Rodaram sem
  navegador, para não disputar a máquina com as verificações em andamento.
- **Verificação**: cada achado passou por dois verificadores adversariais.
- **16 achados**: 13 confirmados por ao menos um verificador e 3 rejeitados pelos dois.
- **Os 13 confirmados foram tratados**:
  - **1 no código**: a quebra forçada (`<br>`) no e-mail de duas linhas partia o endereço ao copiar e escondia o
    endereço da busca na página. Agora é um ponto de quebra opcional (`<wbr>`), com o mesmo desenho, conferido pixel a
    pixel.
  - **11 em textos**: comentários do CSS, documentação e README. Alguns foram apontados por mais de um revisor, por isso
    viram 10 temas.
    - Mecanismo do rodapé: OUTLOOK.COM fica, sim, na altura de "Brasília, DF".
    - Largura da coluna nova: 169 px em 320, e não 174.
    - As trilhas não cresciam.
    - Faixa em que a linha do LinkedIn passa da coluna (até cerca de 370 px) e da tela (abaixo de cerca de 330 px).
    - "Cortado em OLWTE" era o recorte da captura, e não da tela.
    - A remissão "ver abaixo" para 300 px não levava a nada.
    - A causa real em 300 px é o título.
    - A métrica descrita no README.
    - Qual versão do script mediu o "antes".
    - A prancha citada, ainda não gerada quando a revisão rodou.
  - **1 registrado sem correção**: em 300 px, o link da política encosta no ícone do GitHub. É anterior a esta rodada
    e fica abaixo da faixa pedida.

## Segunda rodada do proprietário (18/11/2026)

Dois pedidos: a narrativa de Processo e a rolagem ao fechar o contato logo depois de Voltar. Rodapé, cards, CTA, som,
grid e Estúdio ficaram como estavam; o registro de Estúdio em `src/content/pages.json` é idêntico ao anterior.
- **Build testado**: `_kmMjqBIsp2D5eFvDbNj_` (`.next/BUILD_ID` de 18/11/2026, 14:58:45 de Brasília), servido em
  http://localhost:3000. Toda medição de "depois" abaixo é desse build.
- **"Antes"**: build anterior, `2ScPNEWZjIwoLexHOGa25`, medido nesta rodada antes de qualquer mudança.
  - `process-narrative.mjs`: numa versão anterior do script, que só diferia ao juntar as partes de cada linha. Ela
    separava por espaço as letras do título que se tocam: em `processo-antes.json`, o título em 360 px aparece como
    "D A I D E I A A O". As quebras e as demais medidas são as mesmas.
  - `modal-restore.mjs`: numa versão anterior do script, com o mesmo fluxo, a mesma matriz e as mesmas métricas por
    quadro. Ela ainda não registrava as tarefas longas (`longTasks`) nem o caso Avançar (`forwardSoon`), e iniciava a
    gravação de quadros só depois do Voltar.
- **Evidências**: `docs/evidence/olwtelet/segunda-rodada/`, com o build de cada arquivo em `index.json`. Os scripts
  estão em `scripts/brand/owner-checks/`; `process-narrative.mjs`, `modal-restore.mjs` e `modal-reappear.mjs` são
  novos.

### 1. Processo: a narrativa do proprietário

- **O processo**: os projetos nascem de uma epifania; quando ela se mostra promissora, a ideia entra em análise e
  desenvolvimento. A introdução é a frase pedida, sem alteração:
  > Os projetos da Olwtelet Productions nascem de uma epifania. Quando ela se mostra promissora, a ideia entra em
  > análise e desenvolvimento.
- **Etapas**: três, uma para cada momento que a frase nomeia.
  - A condição ("quando ela se mostra promissora") não é uma etapa: aparece no texto e no diagrama da análise.
  - Os textos só reafirmam a frase e citam os tipos de projeto que Estúdio já nomeia (software, jogos e aplicações
    web).
  - Não há método, equipe, cliente nem resultado.

  | Etapa | Texto | Rótulos do diagrama |
  |---|---|---|
  | 01 Epifania | Todo projeto começa com uma epifania, uma ideia que surge de repente. Nem toda epifania vira projeto. | Ideia, Epifania, Projeto |
  | 02 Análise | Quando a epifania se mostra promissora, a ideia entra em análise antes de seguir para o desenvolvimento. | Epifania, Promissora, Análise |
  | 03 Desenvolvimento | Depois da análise, a ideia é desenvolvida e se torna software, jogo ou aplicação web. | Software, Jogo, Web |

- **Título da página**: "DA IDEIA AO REFINAMENTO." citava as etapas antigas. Agora é "DA EPIFANIA AO PROJETO.", com a
  mesma construção e quase o mesmo comprimento (23 caracteres; antes, 24).
- **Descrição para buscadores e compartilhamento**: a frase da introdução. Antes listava as quatro etapas.
- **Diagramas** (`src/components/about/ProcessDiagrams.tsx`): o mesmo sistema dos anteriores.
  - Grade de construção de 40 unidades e linhas de 1 px.
  - Os pontos do site.
  - Três rótulos mono à esquerda, que entram no desenho a 25, 50 e 75 % da altura.
  - As cores da página.

  O símbolo continua passando de esboço a objeto pronto:

  | Etapa | O que o diagrama mostra |
  |---|---|
  | 01 Epifania | entre ideias apagadas, uma irrompe (um ponto com raios); ao lado, o símbolo só esboçado |
  | 02 Análise | a epifania chega a uma decisão (losango). O caminho promissor segue até o símbolo, agora contornado e medido, com cotas de altura e largura. O outro caminho para: tracejado, com um traço de fim |
  | 03 Desenvolvimento | o símbolo pronto (faces na cor do papel, barra transversal cheia) e o que a ideia vira: uma janela de terminal, um tabuleiro e uma janela de navegador |

- **Quebras de linha**:
  - **Etapas**: uma palavra de uma letra ("a", "e", "o", "é") fica presa à seguinte por espaço inseguível, então
    nenhuma linha termina nela.
  - **Introdução**: ali isso não funciona. A revelação divide o texto palavra por palavra (SplitType) e troca o espaço
    inseguível por um comum, então as linhas mudariam no fim da animação. Por isso a medida da introdução passou de
    16 em para 15 em (`processSteps.module.css`). De 360 px para cima continuam cinco linhas, nenhuma terminando em
    "a" ou "e" (em 320 px, ver abaixo).
  - **Revisão**: em 16 em, de 600 a 2560 px, duas linhas terminavam em "a" e "e" (achado da revisão abaixo). Com as
    fontes ainda carregando, a revelação mostrava outras quebras e reorganizava as linhas no fim.
- **Sem mudança**: tipografia, cores, animações (revelação das palavras, FadeIn das etapas, linhas), grade de colunas e
  o resto do CSS de Processo. Estúdio não usa nenhum desses arquivos.
- **Código e conteúdo**:
  - `scripts/brand/build-content.mjs`, gerado de novo. Em `src/content/`, só o registro de Processo em `pages.json`
    mudou;
  - `ProcessDiagrams.tsx` e `types.ts` (os três tipos de diagrama);
  - a medida da introdução e comentários em `processSteps.module.css` e `ProcessSteps.tsx`.
- **Medido** com `process-narrative.mjs`, de 320 a 2560 px. Celulares e 768 px rodam em contexto móvel com DPR 2.

  | Largura | Título | Introdução (linhas) | Etapas 01 · 02 · 03 (linhas) | Altura da página (antes → depois) |
  |---|---|---|---|---|
  | 320 px | DA / EPIFANIA AO / PROJETO. | 7 (antes 6) | 4 · 4 · 3 | 2947 → 2643 px |
  | 360 px | DA EPIFANIA / AO PROJETO. | 5 (antes 5) | 3 · 3 · 3 | 2932 → 2576 px |
  | 390 px | DA EPIFANIA / AO PROJETO. | 5 (antes 4) | 3 · 3 · 2 | 2949 → 2618 px |
  | 414 px | DA EPIFANIA / AO PROJETO. | 5 (antes 4) | 3 · 3 · 2 | 2992 → 2643 px |
  | 768 px | DA EPIFANIA AO PROJETO. | 5 (antes 4) | 3 · 3 · 2 | 3430 → 2974 px |
  | 1024 px | DA EPIFANIA AO PROJETO. | 5 (antes 4) | 3 · 3 · 2 | 3174 → 2932 px |
  | 1280 px | DA EPIFANIA AO PROJETO. | 5 (antes 4) | 3 · 3 · 2 | 3532 → 3232 px |
  | 1440 px | DA EPIFANIA AO / PROJETO. | 5 (antes 4) | 3 · 3 · 2 | 4109 → 3731 px |
  | 1920 px | DA EPIFANIA AO / PROJETO. | 5 (antes 4) | 3 · 3 · 2 | 5064 → 4592 px |
  | 2560 px | DA EPIFANIA AO / PROJETO. | 5 (antes 4) | 3 · 3 · 2 | 5490 → 5005 px |

  - **Bordas**: em todas as larguras, nenhum texto passa da janela, o título de cada etapa cabe numa linha (inclusive
    "Desenvolvimento" em 320 px) e os rótulos ficam à esquerda do desenho.
  - **A frase do proprietário** é uma linha mais longa que a antiga em 320 px e de 390 px para cima (em 360 px, cinco
    linhas nas duas). A página ficou mais curta porque passou de quatro para três etapas.
  - **Introdução de 360 px para cima**: "Os projetos da Olwtelet / Productions nascem de uma / epifania. Quando ela se
    mostra / promissora, a ideia entra em / análise e desenvolvimento."
  - **Introdução em 320 px**: a coluna é que limita, e a frase não pode ter espaço inseguível. Uma linha termina em
    "e" ("em análise e / desenvolvimento.").
  - **Em 300 px**, abaixo da faixa pedida: a página de Processo tinha 311 px de largura por causa de "REFINAMENTO." e
    agora tem 300 px (`narrow-widths.mjs`).
  - **Capturas**:
    - `segunda-rodada/processo/`: título e etapas em cada largura, no build final;
    - pranchas de antes e depois: `processo-titulo-390-antes-depois.jpg`, `processo-titulo-1440-antes-depois.jpg`,
      `processo-etapas-390-antes-depois.jpg` e `processo-etapas-1440-antes-depois.jpg`.

### 2. Fechar o contato logo depois de Voltar

- **Defeito**: Estúdio → contato → Política de privacidade → Voltar → X ou Esc. Com o fechamento até cerca de 0,6 s
  depois de Voltar, o modal esmaecia sobre a página perto do topo, e ela depois saltava para a posição anterior.
- **Causa**: a disputa era entre a remontagem da página e a restauração da posição.
  - **Remontagem**: a política tinha substituído Estúdio. No Voltar, o Next restaura a entrada `/contact` do
    histórico e monta Estúdio de novo sob o modal reaberto, sem buscar a página no servidor (nenhuma requisição RSC).
    Só o ícone e imagens da página são pedidos de novo: a sequência do símbolo, o rodapé, a capa de Veil.
  - **Atraso de 500 ms**: as páginas Sobre montam o conteúdo 500 ms depois de montar a página
    (`<Delay delay={500}>` em `src/app/about/[uid]/page.tsx`, herdado da réplica). Nesse meio segundo, Estúdio tinha só
    cabeçalho, seletor e margens, sem nenhuma seção. A altura medida foi de 1068 px em 1440 × 900, num diagnóstico
    quadro a quadro.
  - **Posição presa**: o modal pedia a cada quadro a posição guardada no registro `/contact` (1200 px). A página curta
    só permitia 168 px em 1440 × 900 e 164 px em 390 × 844.
  - **Salto**: as seções entravam cerca de 0,5 s depois de Voltar. A página passava por 272 px (216 no celular) e
    chegava a 1200 entre 0,59 e 0,67 s. Os tempos do "antes" contam de um ouvinte de `popstate` instalado depois do
    carregamento, que roda depois de o app tratar o Voltar. Um fechamento antes disso mostrava, através do modal esmaecendo, a página no
    alto e depois o salto. Fora dos travamentos, fechamentos a 0,67 s ou mais já encontravam a página no lugar.
  - **Prazo só no tempo**: a manutenção da posição tinha um prazo de 1,5 s, contado só no tempo. Em duas medições o
    navegador ficou sem desenhar quadros justamente quando o prazo venceu:
    - num caso, de antes de 0,7 s até 2,0 s depois de Voltar;
    - no outro, de Voltar até 14,4 s depois (celular).

    A manutenção acabou no primeiro quadro depois do prazo, sem repor a posição, e a página terminou em 272 px e em
    212 px.
- **Correção** (`src/components/ui/Delay.tsx`, `src/components/contact/underContact.ts`, `ContactModal.tsx`):
  - **A página volta inteira**: quando uma página Sobre monta de novo sob o modal reaberto pelo histórico, o conteúdo
    entra no primeiro quadro, sem os 500 ms (`Delay`, opção `immediateUnderContact`).
    - A condição é exata: a URL já é `/contact` e o registro guarda uma posição (`isRestoringUnderContact`).
    - Em qualquer outra montagem o atraso continua.
    - No servidor e num carregamento direto a condição é falsa, então a hidratação vê o mesmo primeiro desenho de
      antes.
  - **O mesmo no Avançar**: se a página montou pela própria URL há menos de 500 ms e um Voltar ou Avançar traz de
    volta um registro `/contact` aberto sobre ela, o atraso termina nesse momento (achado da revisão abaixo).
  - **A posição volta atrás do modal**: a página já tem a altura certa quando o modal pede a posição, então ela vai a
    1200 px no primeiro quadro, ainda coberta.
    - O SplitType da página remontada também move a rolagem: repõe com `window.scrollTo` a posição que leu ao dividir
      o texto.
    - Medido no Voltar, no build final, durante a checagem desta documentação: (0, 0) cinco vezes, entre cerca de 22 e
      56 ms depois do evento de histórico. Em seguida a manutenção pede 1200 (48 a 60 ms), e depois vem (0, 1200).
    - Na revisão, no build intermediário `Wy7mFxd7u35IZdb0dnA--`, as mesmas chamadas caíam entre 12 e 31 ms.
    - Nenhuma chamada de rolagem do roteador foi vista.
  - **Manutenção que não expira sem quadros**: além de 1,5 s, a manutenção exige 45 quadros desenhados antes de
    acabar. Num navegador normal, 1,5 s já passam de 45 quadros, e nada muda. Ela continua parando na primeira ação do
    visitante e quando a URL vai para outra página. Nas medições finais o navegador não travou, então esse caminho não
    chegou a ser exercitado.
- **O que não mudou**: o esmaecimento do fechamento, o fechamento nativo do diálogo, a liberação da rolagem, a volta
  do foco, a proteção contra o clique duplo no X e a navegação única. Não há espera nova nem camada sobre a página.
- **Custo**: o modal reaparece um pouco mais tarde depois do Voltar, porque a página remontada agora monta as seções
  no próprio Voltar, e não 500 ms depois (medido abaixo, "Reaparecimento do modal").
- **Medido** com `modal-restore.mjs`, no build final. Estúdio está rolado até 1200 px e há um registro por quadro, do
  Voltar até 2,5 s depois do fechamento.
  - **Referência dos tempos**:
    - **Depois**: os tempos contam do próprio evento de histórico, por um ouvinte de `popstate` registrado no início
      do documento, antes do app. O fechamento é agendado a partir dele.
    - **Antes**: o script ainda contava de um ouvinte instalado depois do carregamento, que roda só depois de o app
      tratar o Voltar.
    - **Quanto isso pesa**: no build final, esse tratamento (remontar a página e reabrir o modal) leva de 62 a 78 ms
      em Estúdio (`appHandledBackMs`).
  - **Colunas da tabela**:
    - "Fechou após Voltar" é o tempo entre essa referência e o X ou Esc. No "depois", os fechamentos chegaram de 7 a
      44 ms depois do previsto. A exceção é o toque do celular a "150 ms", que chegou em 269 ms; a segunda tarefa longa
      daquela execução já tinha terminado aos 121 ms;
    - "Fora do lugar" conta os quadros, do X ou Esc em diante, em que a página não está a 2 px ou menos de 1200,
      inclusive com o modal ainda opaco;
    - "Esmaecimento" vai do X ou Esc até o diálogo fechar.

  | Caso | Fechou após Voltar (ms), antes | Fechou após Voltar (ms), depois | Fora do lugar, antes | Fora do lugar, depois | Esmaecimento (ms), antes → depois | Posição final, antes → depois |
  |---|---|---|---|---|---|---|
  | 1440 px, X, ~150 ms | 148 | 189 | 51 de 324 quadros (168, 272) | 0 de 431 | 468 → 333 | 1200 → 1200 |
  | 1440 px, X, ~300 ms | 318 | 325 | 23 de 254 (168, 272) | 0 de 447 | 376 → 338 | 1200 → 1200 |
  | 1440 px, X, ~700 ms | 698 | 709 | 80 de 80 (272, 274), travamento | 0 de 452 | 1682 → 331 | **272** → 1200 |
  | 1440 px, Esc, ~150 ms | 150 | 160 | 53 de 280 (168, 272) | 0 de 431 | 453 → 330 | 1200 → 1200 |
  | 1440 px, Esc, ~300 ms | 291 | 307 | 28 de 299 (168, 272) | 0 de 447 | 402 → 328 | 1200 → 1200 |
  | 1440 px, Esc, ~700 ms | 745 | 710 | 0 de 321 | 0 de 451 | 379 → 333 | 1200 → 1200 |
  | 390 px, X (toque), ~150 ms | 14509, travamento | 269 | 328 de 328 (212, 216) | 0 de 451 | 371 → 344 | **212** → 1200 |
  | 390 px, X (toque), ~300 ms | 371 | 344 | 11 de 297 (164, 216) | 0 de 450 | 395 → 332 | 1200 → 1200 |
  | 390 px, X (toque), ~700 ms | 839 | 724 | 0 de 335 | 0 de 450 | 388 → 331 | 1200 → 1200 |
  | 390 px, Esc, ~150 ms | 152 | 170 | 57 de 319 (164, 216) | 0 de 433 | 332 → 333 | 1200 → 1200 |
  | Processo, 1440 px, X, ~150 ms | 218 | 157 | 39 de 316 (168, 272, 1244) | 0 de 393 | 378 → 320 | 1200 → 1200 |
  | Veil, 1440 px, X, ~150 ms (900 px) | 199 | 161 | 0 de 319 | 0 de 446 | 351 → 325 | 900 → 900 |

  - **Linhas com "travamento"**: são as duas medições do "antes" em que o navegador ficou sem desenhar quadros. Não
    servem de comparação para o atraso nominal: o toque do celular só foi atendido 14,5 s depois do Voltar. Mostram o
    problema do prazo só no tempo.
  - **Tarefas longas no build final** (50 ms ou mais, contadas do evento de histórico): em Estúdio, a própria tarefa
    do Voltar (62 a 79 ms) e, em 7 dos 10 casos, uma segunda logo depois (51 a 71 ms). Nenhuma outra.
  - **Depois**:
    - a página já está na posição guardada no primeiro quadro depois do Voltar, ainda sob o modal. Em Estúdio, o
      primeiro `requestAnimationFrame` roda entre 75 e 84 ms depois do evento, logo após a tarefa do Voltar. Nos 7
      casos com uma segunda tarefa longa, ele roda 4 a 13 ms depois do início dela, e não depois dela;
    - ela fica lá;
    - a página de projeto (Veil) não usa o atraso e já estava certa antes.
  - **Esmaecimento**: ficou igual ou mais curto (320–344 ms; antes 332–468 ms, fora dos travamentos). O conteúdo não
    monta mais no meio dele, e não há espera nova.
  - **Estado final nos 12 casos da tabela**:
    - a URL é a da página;
    - o diálogo saiu do DOM e a rolagem foi liberada (`overflow` vazio);
    - o elemento no centro da tela é da página;
    - houve um registro `/contact` e uma volta.
  - **Foco**: o mesmo do build anterior. No fluxo pela política, o modal reaberto não tem quem o abriu, e o foco fica
    no documento.
  - **Avançar menos de 500 ms depois de Estúdio montar** (`forwardSoon`). Fluxo: Processo → Estúdio em 1200 → contato
    → Esc → Voltar → Avançar → Avançar até `/contact` 100, 150 (celular) ou 250 ms depois → X ou Esc 150 ms
    depois.
    - **Antes desta correção**: a revisão mediu, no build intermediário `Wy7mFxd7u35IZdb0dnA--`, 35, 37, 14 e 29
      quadros fora do lugar durante o esmaecimento (desktop X 100 ms, Esc 100 ms, Esc 250 ms, celular X 150 ms).
    - **No build final**: sob o modal ainda opaco, a página passa por 272–276 px (217 no celular) e chega a 1200 entre
      112 e 168 ms depois do Avançar. O X ou Esc veio depois disso (163 a 206 ms), com a página em 1200 px. Nenhum
      quadro fora do lugar até o diálogo sair.
    - **Depois de o diálogo sair**: há uma acomodação de 1 a 4 px por um ou dois quadros. Em dois casos ela passa de
      2 px (1196 px), por isso a contagem dá 1 quadro. É a mesma acomodação do percurso Voltar → rolar → Avançar,
      anterior a esta rodada.
  - **O visitante rola logo depois de fechar** (cerca de 0,37 s após o X):
    - a roda de 600 px leva a página de 1200 a 1800;
    - no celular, um arrasto de 400 px, com a inércia do toque, a leva a 1822.

    Em nenhum dos dois a manutenção puxa a página de volta.
  - **Outros percursos**:
    - **contato aberto direto + X**: vai para `/`;
    - **aberto sobre Estúdio em 900 px + X**: 0 quadros fora do lugar, e o foco volta ao "Contato";
    - **dois registros `/contact`**: 0 quadros fora do lugar;
    - **Voltar → rolar → Avançar → X**: a página fica em 1200 px e, por dois quadros, oscila 1 a 2 px, como antes;
    - **clique duplo no X**: uma navegação, sem reabrir.
  - **Reaparecimento do modal** (`modal-reappear.mjs`, no mesmo build, 4 execuções por caso). Mede o tempo do evento
    de histórico até o primeiro quadro apresentado pelo navegador que já não é a política. Compara dois caminhos:
    - **atual**: as seções montam no Voltar;
    - **atraso de 500 ms**: como antes desta rodada. Para isso, o registro da posição é apagado antes de ir à política.

    | Página e tela | Atual (ms) | Com o atraso de 500 ms (ms) |
    |---|---|---|
    | Estúdio, 1440 px | 172, 223, 177, 234 | 71, 56, 96, 145 |
    | Estúdio, 390 px | 167, 143, 120, 125 | 32, 31, 30, 31 |
    | Processo, 1440 px | 112, 101, 111, 112 | 54, 62, 84, 63 |
    | Processo, 390 px | 87, 83, 78, 103 | 30, 37, 26, 33 |

    - **O custo**: o modal reaparece cerca de 0,1 s mais tarde em Estúdio e cerca de 0,05 s mais tarde em Processo.
      É o tempo de montar as seções.
    - **No caminho com atraso**, em Estúdio, essa mesma montagem acontece entre 0,53 e 0,58 s, com o modal aberto
      (tarefas longas de 50 a 87 ms em 7 das 8 execuções). É ela que causava o salto.
    - **Alternativa descartada**: montar as seções um quadro depois do modal faria o modal aparecer antes. Mas a
      montagem cairia durante a animação de entrada dele. As duas tarefas longas somam, em Estúdio, de 0,12 a 0,15 s
      na execução da tabela (`modal-restore.mjs`) e de 0,14 a 0,20 s nas de `modal-reappear.mjs`, com o screencast
      ligado. É uma estimativa: essa variante não foi medida.
    - **Fora do escopo**: diminuir a montagem em si (as partículas e a sequência do símbolo de Estúdio) mexeria em
      componentes aprovados.
  - **Tira de quadros**: `modal-fechar-apos-voltar-antes-depois.jpg`. São os quadros que o navegador apresentou
    (screencast) de 100 ms antes a 1,5 s depois do X.
    - **Quando foi o X**: 177 ms (1440 px) e 193 ms (390 px) depois do evento de histórico, no "depois"; 0,308 s e
      0,184 s depois do registro tardio, no "antes".
    - **Depois**: até o primeiro quadro novo, o quadro ainda é o da política: em −100 ms nos dois tamanhos, e ainda em
      +0 ms a 1440 px. Depois aparece o modal, e a página surge já em 1200 px quando ele some.
    - **Antes, 390 px**: o fundo fica vazio, perto do topo, até o conteúdo surgir em +700 ms.
    - **Antes, 1440 px**: a gravação começou depois do Voltar, então de −100 a +100 ms o quadro ainda é o da política.
      Em +500 e +700 ms a página aparece vazia, e o conteúdo surge em +1000 ms.
- **Regressão do rodapé e dos contatos** (`narrow-widths.mjs`, de 300 a 2560 px), comparada com a execução final da
  rodada anterior:
  - **Iguais**:
    - as medidas de Estúdio e da política (larguras, linhas do rodapé, cópia do e-mail, contatos);
    - as 37 capturas dessas duas páginas, idênticas pixel a pixel;
    - as medidas das linhas do rodapé de Processo em todas as larguras, e a captura dele em 320 px.
  - **Capturas do rodapé de Processo**: de 340 a 1440 px, diferem 1 a 2 px em parte dos elementos. A página ficou mais
    curta, e o rodapé, com 100svh de altura, começa noutra fração de pixel (por exemplo, 2155,516 px em 390 px). Em
    300 px a diferença é real e esperada: a página deixou de ter 311 px de largura.

### Revisão independente da segunda rodada

Quatro revisores somente leitura trabalharam no site servido e no código: navegação, conteúdo, visual, e evidências
contra a documentação. Cada um teve um verificador adversarial, que tentou reproduzir os achados do zero.
- **13 achados**: 11 confirmados e 2 rejeitados.
  - **Rejeitados**: uma sugestão de cobrir mais casos, que todos passavam; e a pasta de evidências ainda não criada
    quando a revisão rodou.
- **No código**:
  - **Avançar menos de 500 ms depois de Estúdio montar**: o mesmo salto ainda acontecia, porque o atraso só olhava a
    URL ao montar. O `Delay` agora também termina no Voltar ou Avançar que traz um registro `/contact` sobre a página.
    Medido acima;
  - **Introdução**: linhas terminando em "a" e "e" de 600 a 2560 px. Medida de 15 em, descrita no item 1.
- **Nas medições**:
  - os números de Processo vinham de um build anterior aos espaços inseguíveis; tudo foi medido de novo no build
    final;
  - a gravação de quadros começava depois do Voltar; agora começa antes, e um momento sem quadro apresentado fica
    marcado "sem quadro".
- **Em textos e comentários**:
  - as duas medições com travamento, separadas das comparações;
  - o "antes" foi medido com uma versão anterior do script;
  - a janela do defeito vai até cerca de 0,6 s, e não 0,3 s;
  - a frase sobre os quadros sem desenho estava contraditória;
  - uma afirmação sobre a rolagem do roteador não tinha base nos dados;
  - o item 5 da rodada anterior ainda descrevia a manutenção antiga;
  - faltavam a seção desta rodada e os scripts novos no README.

  Tudo foi corrigido.

**Checagem da documentação**: três verificadores somente leitura conferiram esta seção contra as evidências, o código
e o site servido, cada um seguido de um verificador adversarial.
- **16 divergências**, todas confirmadas.
- **Duas eram de medição**:
  - os tempos do modal contavam de um ouvinte de `popstate` que roda depois de o app tratar o Voltar. No build
    final, esse atraso foi de 62 a 78 ms depois do evento em Estúdio, 57 ms em Processo e 32 ms no Veil, na execução da
    tabela; nas medições dos verificadores, de 67 a 155 ms;
  - a própria tarefa do Voltar ficava fora do registro de tarefas longas.

  O script passou a contar do evento de histórico e a agendar o fechamento a partir dele. A medição do modal foi
  refeita no mesmo build com `modal-restore.mjs`. A coluna "depois" da tabela e os números do "depois" do item 2
  medidos com esse script são dessa execução. O reaparecimento do modal foi medido depois, numa execução própria de
  `modal-reappear.mjs`.
- **As outras 14 eram frases**:
  - faixas de largura que faltavam;
  - a versão do script de Processo no "antes";
  - as requisições na remontagem;
  - os tempos do SplitType no build final;
  - a faixa de tempos do "Depois";
  - a descrição da tira de quadros;
  - os travamentos fora da frase sobre 0,67 s;
  - casos fora de "todos os casos";
  - o fluxo do Avançar;
  - a linha do README;
  - a chave do `index.json`;
  - a conversão para segundos no item 5 da rodada anterior.

  Todas foram corrigidas.
- **Custo da correção**: ao conferir de novo a tira de quadros, ficou visível que o modal demorava mais a reaparecer.
  Esse custo foi medido em "Reaparecimento do modal" (item 2).
- **Última conferência**, só do bloco medido reescrito: 7 apontamentos, 6 confirmados e corrigidos (o momento do
  primeiro quadro, a causa do toque tardio, as somas das tarefas longas, a faixa do atraso do app, a origem dos números
  e o horário do lint) e 1 rejeitado.

## Aplicações do logo

Prancha: `docs/evidence/olwtelet/aplicacoes-do-logo.jpg`.

| Uso | Arquivo |
|---|---|
| Header | `src/components/brand/OlwteletMark.tsx` (42 px no celular, 58 px a partir de 1024 px) |
| Rodapé | `OlwteletMark` + `public/brand/footer-mark-{porcelain,signal}.png` (com contorno escuro, legível em fundo claro) |
| Favicon / ícones | `src/app/favicon.ico` (16/32/48), `src/app/icon.svg`, `src/app/apple-icon.png`, `public/brand/icon-{192,512}.png`, `icon-maskable-512.png` |
| PNG transparentes | `public/brand/olwtelet-mark-{white,black}[-{512,256,128,64}].png` (alpha da luminância do anexo, recorte óptico de 3 %) |
| SVG | `public/brand/olwtelet-mark{,-white,-black}.svg` |
| Compartilhamento | `public/brand/og.png`, `og-filmes-hd-online-gratis.jpg`, `og-veil.jpg` |
| Loader / intro / partículas | `public/assets/intro/**`, `public/assets/models/olwtelet-mark.glb`, `public/assets/images/particle.jpg` (gerado) |
| 404 | `public/brand/404.jpg` |

## Verificação

### Segunda rodada (build `_kmMjqBIsp2D5eFvDbNj_`)

O build servido agora é `_kmMjqBIsp2D5eFvDbNj_` (`.next/BUILD_ID` de 18/11/2026, 14:58:45 de Brasília), com a nova
narrativa de Processo e a correção do fechamento logo depois de Voltar.
- **Verificações direcionadas**, como pedido, todas nesse build e descritas na seção da segunda rodada:
  - `process-narrative.mjs`: Processo de 320 a 2560 px;
  - `modal-restore.mjs`: o fluxo do modal, os percursos de Voltar/Avançar, o contato direto e o clique duplo. A
    execução da tabela é a segunda, com os tempos contados do evento de histórico;
  - `modal-reappear.mjs`: quanto o modal demora a reaparecer depois do Voltar, com e sem o atraso de 500 ms;
  - `narrow-widths.mjs`: regressão do rodapé e dos contatos.
- **Bateria completa** (`verify-olwtelet.mjs`): não foi repetida, porque nenhuma regressão apareceu. Por isso:
  - a verificação completa abaixo continua sendo a do build `2ScPNEWZjIwoLexHOGa25`;
  - `docs/evidence/olwtelet/captures/` e a prancha `entrega.jpg` são desse build e mostram o Processo anterior
    ("DA IDEIA AO REFINAMENTO.", quatro etapas). O Processo atual está em `segunda-rodada/processo/`.
- **Código** (18/11, 16:13, no código final, depois dos últimos scripts):
  - `npm run typecheck`: sem erros;
  - `npm run lint`: 0 erros e os mesmos 103 avisos (50 em `src/`, 53 em `scripts/`). Nenhum nos scripts de
    `scripts/brand/owner-checks/`, inclusive os três novos (`process-narrative.mjs`, `modal-restore.mjs`,
    `modal-reappear.mjs`);
  - nenhum arquivo de `src/` é mais novo que `.next/BUILD_ID`.

### Rodada do proprietário (build `2ScPNEWZjIwoLexHOGa25`)

É o build final da rodada do proprietário, com as correções das três revisões e as do rodapé e dos contatos de Estúdio
abaixo de 360 px (item 7). Substitui as verificações dos builds anteriores:
- `H3iNmqV6aAhdjJIj1ioOM`, da rodada passada;
- `P8C65N6TJlkS5tbYPfqyw`, verificado antes do item 7;
- os intermediários desta rodada.

#### Build verificado

| | |
|---|---|
| `BUILD_ID` local | `2ScPNEWZjIwoLexHOGa25` (`.next/BUILD_ID`, gravado em 17/11/2026 23:36:39 de Brasília, 02:36:39 UTC de 18/11) |
| Execução principal | 18/11/2026, 00:00:58–00:17:24 de Brasília (`verify-report.json`) |
| Resultado | **verificado**: `complete: true`, 0 falhas |
| Arquivos carregados pelo navegador | 31 arquivos `/_next/static/**`, 31 idênticos ao build local (SHA-256), listados um a um em `build.staticFiles.files`; nenhum ausente, ilegível ou com erro |
| Documentos e respostas | 88 documentos HTML e 1001 respostas RSC, todos com o campo `"b"` = `2ScPNEWZjIwoLexHOGa25` |
| Capturas | 223 de 223 ligadas ao documento HTML de que vieram, com o mesmo ID |
| `BUILD_ID` no fim | o mesmo id e a mesma data do arquivo do início: nenhum build novo durante a execução |

Como a identificação é feita (`scripts/brand/verify-olwtelet.mjs`, detalhes em `scripts/brand/README.md`):
- o navegador carrega o site servido em `http://localhost:3000`;
- o script calcula o SHA-256 de cada arquivo `/_next/static/**` recebido e compara com o mesmo arquivo em
  `.next/static/`;
- lê o campo `"b"` dos dados de flight no corpo de cada documento HTML e de cada resposta RSC. Não depende de
  `self.__next_f`, que o Next esvazia após a hidratação. Por isso o `buildId` antigo saía nulo;
- cada captura registra hora, URL, documento de origem e build.

Execuções complementares no mesmo build, ambas verificadas, completas, com 0 falhas e 31/31 arquivos estáticos
idênticos. Cobrem todas as seções, não só a lista:
- **9 tamanhos extras** (`verify-report-tamanhos-extras.json`, 18/11, 00:17–00:47): 412 capturas, 159 documentos e
  1764 respostas RSC;
- **requisições externas bloqueadas**, como se as fontes da Adobe não carregassem
  (`verify-report-sem-fontes-externas.json`, 18/11, 00:47–01:03): 223 capturas, 88 documentos e 959 respostas RSC.

O número de respostas RSC varia entre execuções do mesmo roteiro; todas trazem o build verificado.

**Onde cada execução rodou**:
- **Numa janela própria, aberta pelo Explorer, fora da sessão do assistente**: as três execuções acima e, das
  verificações da rodada do proprietário, `review-fixes.mjs`, `grid-flicker.mjs` e `contact-hover.mjs`.
- **Dentro da sessão**: `owner-states.mjs`, a execução de `review2-fixes.mjs` usada nas evidências e
  `narrow-widths.mjs`.
- **Por que `owner-states.mjs` roda dentro da sessão**: ele grava vídeos, e o codificador de vídeo do Playwright
  (`ffmpeg-1013`) só existe na cópia de `AppData\Local` que o app de desktop vê. Na janela aberta pelo Explorer, a
  gravação falhou duas vezes ("Executable doesn't exist"). A pasta `ms-playwright` foi listada dos dois lados para
  confirmar. As outras verificações não gravam vídeo.

Interrupções e builds descartados; nenhum resultado parcial foi aproveitado:
- **15:48 de 17/11, num build intermediário**: a janela do servidor (`start-production.cmd`) foi fechada, e não por
  esta sessão.
- **18:50 de 17/11, no build `P8C65N6TJlkS5tbYPfqyw`**: o computador reiniciou no meio dos tamanhos extras.
- **Depois do item 7, dois builds descartados antes do final**:
  - `_Tz3ttFaiSCMIqvCPcTMl`: a primeira tentativa, com pontos de quebra em todos os contatos;
  - `_TvHf72rQcaM8H8Lt9Gk4`: com a quebra forçada no e-mail. A verificação completa dele foi parada no meio, quando a
    revisão do item 7 encontrou o problema ao copiar o endereço.

Depois das verificações, às 06:20 de 18/11, o computador reiniciou de novo. Nenhuma medição estava em andamento; só a
conferência final desta documentação, que é somente leitura, foi retomada.

Depois de cada interrupção, o servidor foi reaberto pelo `start-production.cmd`, com o mesmo build (conferido pelo
`"b"` do HTML servido), e as medições interrompidas foram refeitas por inteiro. A cada build novo, o servidor foi
parado, o build gerado e o servidor reaberto do mesmo jeito, e todas as verificações foram refeitas.

Na primeira execução dos tamanhos extras com todas as seções, num build intermediário, a execução parou em 375×667.
Em celulares de até cerca de 670 px de altura, um dos cinco cliques de teste "em célula vazia" da home caía no botão
"Filtrar". O painel de filtros abria e cobria o botão grade/lista. O defeito era do verificador, não do site.

Agora o clique de teste pula pontos que caem sobre um controle e registra isso (`checks.probeClicks`):
- nas execuções principal e sem fontes externas, nenhum ponto caiu sobre um controle;
- nos tamanhos extras, o ponto (50 %, 10 %) caiu sobre o "Filtrar" e foi pulado nos cinco celulares baixos (375×667,
  360×640, 375×548, 390×664 e 320×568).

**Capturas**:
- `docs/evidence/olwtelet/captures/` tem 70 arquivos, todos dessas três execuções do build final.
- `captures-index.json` dá, para cada arquivo, a captura de origem, hora, URL, documento de origem e build.
- As capturas de builds anteriores foram removidas, não reetiquetadas.
- A prancha `entrega.jpg` e as aplicações do logo (`aplicacoes-do-logo.jpg`, recortes do header e da intro) foram
  refeitas a partir da execução principal.
- As capturas antes/depois, os vídeos e as medições da rodada do proprietário ficam em
  `docs/evidence/olwtelet/rodada-proprietario/`. O `index.json` dessa pasta dá o build de cada lado:
  - itens 1 a 6: antes `H3iNmqV6aAhdjJIj1ioOM`, depois `2ScPNEWZjIwoLexHOGa25`;
  - item 7 (`larguras_estreitas`): antes `P8C65N6TJlkS5tbYPfqyw`, depois `2ScPNEWZjIwoLexHOGa25`.

#### Lista

Medido pelo verificador em cada largura, com a lista aberta e depois parada no fim da rolagem: estouro horizontal,
palavras partidas entre linhas, sobreposição de glifos, texto a menos de 6 px dos controles fixos, distância entre
título e contagem e reticências (medidas em largura sem arredondamento).

| Largura | Título × contagem | Rolagem da lista | Endereço |
|---|---|---|---|
| 360×800 | empilhados, 35 px | 0 | inteiro, linha própria |
| 390×844 | empilhados, 35 px | 0 | inteiro, linha própria |
| 768×1024 | empilhados, 35 px | 0 | inteiro |
| 1440×900 | lado a lado, 234 px | 0 | inteiro |
| 1920×1080 | lado a lado, 174 px | 0 | inteiro |
| extras: 1024 / 1280 / 1366 | lado a lado, 81 / 133 / 40 px | 0 | inteiro |
| extras: 900 | empilhados, 35 px | 0 | inteiro |
| extras: 375×667, 360×640, 375×548, 390×664, 320×568 | empilhados, 35 px | 79 a 175 px (só onde o conteúdo é mais alto que a tela) | inteiro |

Resultados da lista:
- **Em todas as larguras**:
  - 0 px de estouro horizontal, nenhuma palavra partida e nenhuma sobreposição;
  - em repouso, nenhum texto sob o botão grade/lista, o rótulo "SOM", o header ou os botões. Onde a lista cabe na
    tela, ela não rola;
  - endereço completo, sem reticências; nas 5 larguras principais, também sem as fontes da Adobe.
- **Celulares baixos** (altura até 667 px): em repouso, a navegação inferior flutua sobre as últimas linhas, como no
  resto do site. Rolando até o fim, elas saem de baixo dela.
- **Links**: Filmes HD Online Grátis → `/projects/filmes-hd-online-gratis`; Veil → `/projects/veil`.
- **Filtros**:
  - Web deixa só Filmes HD Online Grátis; "Todos" volta aos 2 projetos, sem parâmetro na URL;
  - `?zone=jogo` deixa só Veil, no grupo "Em desenvolvimento";
  - `?zone=jogo&feature=cinema` mostra o estado vazio, e "Ver todos os projetos" volta aos 2 projetos, sem parâmetro;
  - em cada passo, a lista está de fato aberta.

#### Demais verificações

- **Código**:
  - `npm run typecheck` (18/11, 06:40, no código final): sem erros;
  - `npm run lint` (18/11, 06:40, no código final): 0 erros e 103 avisos. São 50 das regras de React Hooks em `src/` (a réplica tinha 61) e 53 em
    `scripts/`: variáveis e expressões não usadas e 2 `export default` anônimos, os mesmos 53 da réplica. Os
    scripts novos desta rodada (`scripts/brand/owner-checks/`) não têm avisos;
  - `next build`: 17 rotas.
- **Rodada do proprietário** (`scripts/brand/owner-checks/`, no mesmo build), medida nas seções acima:
  - `owner-states.mjs`: CTA, som, Processo, Estúdio, modal e vídeos do grid;
  - `grid-flicker.mjs`: cintilação das linhas;
  - `contact-hover.mjs`: cards do contato;
  - `review-fixes.mjs`: as 15 correções da primeira revisão;
  - `review2-fixes.mjs`: as correções de comportamento da revisão final e da verificação final;
  - `narrow-widths.mjs`: rodapé e contatos de Estúdio de 300 a 2560 px, com e sem as fontes da Adobe (item 7).

  Exceto `narrow-widths.mjs`, que mede justamente o que mudou, todas deram o mesmo resultado no build anterior
  (`P8C65N6TJlkS5tbYPfqyw`), conferido caso a caso. As diferenças são:
  - o nível do sinal (RMS, conforme o trecho da trilha);
  - tempos: o relógio do cabeçalho e a posição das imagens em movimento;
  - o conteúdo do parágrafo do e-mail do rodapé, descrito na introdução da rodada.

  As medições dos cards do contato ficaram idênticas. Nas linhas do grid, os valores do arraste lento de 1 px (os da
  tabela do item 6) ficaram idênticos. Só variou a cauda de inércia depois de soltar, que depende do tempo de cada
  quadro.
- **Nível gráfico nas medições do grid**:
  - Numa medição intermediária, um jogo aberto no computador ocupava cerca de 49 % da GPU. O PerformanceMonitor da
    página caiu para o nível gráfico baixo, sem pós-processamento, em todos os seis casos. As linhas também ficaram
    estáveis nesse nível, mas o caminho de renderização era outro, então a medição foi descartada.
  - Os scripts ganharam a opção de teste `--pin-high`, que devolve o nível alto e registra cada queda (`env.pin`).
  - Na medição final, com a GPU livre, a opção não precisou agir: 0 quedas e 0 reposições, tanto nas linhas
    (`medicoes/grid-cintilacao-depois.json`, `env.pin`) quanto nos vídeos (`grid-*` em
    `medicoes/estados-depois.json`).
  - As capturas da execução principal também são do nível alto: a home mostra a curvatura da distorção.
- **Execução principal** (`verify-olwtelet.mjs`, todas as seções nas 5 larguras): 0 falhas.
  - Em todas as 223 capturas, os controles flutuantes ficam a pelo menos 4 px uns dos outros: header, "Filtrar",
    seletor Estúdio | Processo, botão grade/lista, navegação inferior, "SOM" e, no contato, botões e link de
    privacidade.
  - Intro sem o mascote antigo.
  - Dos cinco cliques de teste no grid, nenhum levou a outra página além dos dois projetos. Em 768, 390 e 360 px, o
    ponto (88 %, 20 %) cai sobre o card do Veil e o abre.
  - Case com link externo; Veil sem link.
  - Sobre (Estúdio e Processo) conferido.
  - Contato com erro visível no envio sem integração (503).
  - URLs antigas em 404 com título "Página não encontrada".
  - Únicas requisições externas: Adobe Fonts.
- **Revisões independentes da rodada anterior** (lista no celular e identificação do build; revisores somente
  leitura, 2 verificadores adversariais por achado). A revisão da rodada do proprietário está na seção dela.
  - **Primeira**: 4 revisores, 14 achados. Os 12 com ao menos um voto foram corrigidos e medidos de novo: faixas de
    largura, separação no header em 1024–1439 px, rolagem vazia, divisórias, distância do "SOM", botão do estado
    vazio, e três pontos do verificador.
  - **Final**: 3 revisores, 12 achados. Os 11 com voto foram corrigidos:
    - os 5 controles fixos nos celulares descritos em "O que mudou";
    - o resto da rolagem vazia;
    - o endereço longo em 768–1023 px;
    - no verificador, a checagem de lista aberta e a lista de arquivos com SHA-256;
    - duas frases deste documento.

    O rejeitado pedia que a curadoria das capturas morasse no repositório. Ela continua rastreável pelo
    `captures-index.json`, que liga cada JPG à captura e ao relatório de origem.
- **Rodada de transformação**: busca de resíduo e revisão adversarial de 4 revisores e 4 verificadores. Nenhum texto
  visível, conteúdo, arquivo público ou chunk do build cita o site antigo. A única ocorrência é `phantomjs` na lista
  de robôs do próprio Next. Em `src/`, restam 5 linhas de comentário com notas da reprodução.

### Disponibilidade local

O servidor de produção (`scripts/start-production.cmd`, `next start -p 3000`) serve o build `_kmMjqBIsp2D5eFvDbNj_`
em http://localhost:3000. O HTML servido traz o mesmo `"b"` que `.next/BUILD_ID`.

## Pendências de publicação (decisão do proprietário)

Registradas à parte: não fazem parte desta verificação e precisam de decisão antes de publicar.

1. **Origem pública**: defina `NEXT_PUBLIC_SITE_URL`. Na Vercel, `VERCEL_PROJECT_PRODUCTION_URL` é usado como
   alternativa. Sem ela não há canonical, `og:image` absoluta, URL no JSON-LD nem itens no sitemap. Nenhum domínio
   foi inventado.
2. **Envio do formulário**: defina `CONTACT_WEBHOOK_URL`. Sem ela, o envio responde 503 e o formulário mostra o erro com
   `olwtelet@outlook.com`.
3. **Fontes**: mantidas para preservar a tipografia.
   - Helvetica Now (`public/fonts`, arquivos herdados da réplica).
   - O kit Adobe Fonts `gtx3zug` (ballinger-mono), padrão de `NEXT_PUBLIC_TYPEKIT_KIT`. O kit pertence à conta do
     site reproduzido e é restrito por domínio; num domínio da Olwtelet ele provavelmente não carrega.
   - É preciso licenciar fontes próprias (kit Adobe da Olwtelet, Helvetica Now) ou trocar por alternativas de licença
     aberta. Os rótulos do atlas do grid usam ballinger-mono e também precisariam ser regerados.
4. **Sons** (`public/assets/sounds/*.mp3`): mantidos para preservar o áudio, mas são a identidade sonora do site
   reproduzido e incluem trilhas com licença Artlist em nome dele.
   - Desde a rodada de 17/11/2026 o som começa ligado, a pedido do proprietário. Isso torna mais urgente substituí-los
     por áudio próprio (ou licenciado em nome da Olwtelet) antes da publicação.
   - As trilhas tocam com ganho unitário, como na réplica (`APPLY_CLIP_VOLUMES = false` em
     `src/components/providers/audioEngine.ts`). O volume final pode ser ajustado com o áudio novo.
5. **Análise**: o aviso de cookies e as opções de consentimento só aparecem com `NEXT_PUBLIC_GA_ID`.
6. **Fotografia do criador**: nenhum retrato foi fornecido. O painel de partículas mostra o símbolo; um retrato
   autorizado (mapas de profundidade e cor de 256 px) pode substituí-lo.
