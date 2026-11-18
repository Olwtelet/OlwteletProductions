# scripts/brand/owner-checks

Verificações da rodada de ajustes pedida pelo proprietário (17/11/2026). Rodam contra o servidor local
(`http://localhost:3000`, só requisições GET), no Chrome com as configurações normais: nenhuma flag de autoplay, nenhuma
mudança de configuração do navegador.

| Script | O que faz |
|---|---|
| `owner-states.mjs <saída> [seções]` | Grava os estados que falharam. Seções: `cta,sound,process,studio,contact,modal,grid`. Gera capturas PNG, vídeos (webm) e `states.json`. |
| `grid-flicker.mjs <saída> [configurações]` | Mede a cintilação das linhas do grid em movimento. |
| `contact-hover.mjs <saída>` | Confere os cards do contato em 390, 768, 1024, 1280, 1440, 1920 e 2560 px. Com mouse: hover e foco por teclado. Com toque (390 e 768): toque real em cada card, com a ação do card cancelada para medir a mesma etapa. Em 768 px roda das duas formas. |
| `review-fixes.mjs <saída>` | Confere as correções feitas depois da revisão independente da rodada (acento do título, folga do "Ver todos os projetos" sobre a navegação, primeiro toque no botão de som, filtro do contato, cores de Processo, cards no toque, Enter no header, foco e rolagem na volta do modal). Gera `review-fixes.json` e capturas do fim da página de projeto. |
| `review2-fixes.mjs <saída>` | Confere as correções da revisão final, com estes casos:<br>• som numa rede lenta simulada pelo DevTools (troca de página com a trilha carregando, desligar e religar);<br>• política e 404 abertas direto;<br>• Espaço mantido no botão de som;<br>• clique e toque duplo no X;<br>• dois registros `/contact` no histórico;<br>• fechar logo após Voltar;<br>• Tab e troca de etapa pelo teclado no contato;<br>• "Ver todos os projetos" focado por Tab.<br>Gera `review2-fixes.json` e capturas `cta-tab-*.png`. Nos fechamentos (`quickClose`, `forwardThenClose`), `steps` dá cada mudança de posição como [quadro depois do fechamento, scrollY]. |
| `narrow-widths.mjs <saída> [--block-external]` | Confere as correções de 320 px, de 300 a 2560 px. Com `--block-external`, roda sem as fontes da Adobe (a ballinger-mono dos contatos de Estúdio). No rodapé (Estúdio, Processo, política): a menor distância horizontal entre uma linha do bloco da direita (e-mail, site) e uma do bloco da esquerda na mesma altura (negativa = sobreposição), e o texto que sai ao copiar o e-mail. Em Estúdio: a coluna de contatos e suas linhas. Em todas: a largura do documento e o que passa da largura da janela (caixas e linhas de texto fora de áreas recortadas). Gera `narrow.json` e capturas de cada bloco: sem os elementos fixos e com a imagem central sorteada mascarada, para comparar duas execuções pixel a pixel. |

## `owner-states.mjs`

O que cada seção registra:
- `cta`: fonte, quebra de linha e corte do "Ver todos os projetos" nas páginas de projeto.
- `sound`: primeira visita, primeiro clique, navegação, desligar, recarregar com a escolha salva e religar, pelo mouse e
  pelo teclado.
- `modal`: as passagens contato → política, X, Esc, X duas vezes, Voltar/Avançar, Enter dentro do modal sobre a home e
  acesso direto.
- `grid`: arraste lento, rápido e soltura, em DPR 1 e 2, 2560 px e celular.

O som é observado sem mudar o comportamento:
- um script de inicialização conta os AudioContexts e as faixas longas em execução;
- um AnalyserNode ligado à saída mede o nível real do sinal (RMS), não só o rótulo.

## `grid-flicker.mjs`

Configurações: `d1440x1, d1440x2, w2560x1, t768x2, m390x2, d1440r`. A última carrega em 1680×1050 e depois reduz a janela.

O script arrasta o grid em passos de 1 px e captura cada passo após dois quadros. Numa região de células vazias, calcula:
- `dE`: o salto médio da energia de luminância entre quadros;
- `peak_cv`: a variação do brilho de pico das linhas;
- o número de linhas visíveis.

Também registra o nível gráfico e se os render targets acompanham o canvas, pelos hooks de `window.__WG_DEBUG__`.

### `--pin-high` (só para teste)

Vale para `grid-flicker.mjs` e para a seção `grid` de `owner-states.mjs`.

Quando outro programa ocupa a GPU (um jogo aberto, por exemplo), o PerformanceMonitor da página cai para o nível
gráfico baixo, sem pós-processamento. As linhas passam então a ser medidas num caminho de renderização diferente do da
linha de base.

Com a opção, o script devolve o nível alto pela store de `__WG_DEBUG__` antes de cada quadro capturado. Ele também
registra cada queda e cada reposição: `env.pin` no `flicker.json`, `grid-*` no `states.json`.
