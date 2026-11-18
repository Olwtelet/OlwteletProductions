# scripts/brand

Geradores e verificação da identidade Olwtelet Productions.

| Script | O que faz |
|---|---|
| `build-brand-assets.mjs [tarefa…]` | Gera os arquivos de marca e mídia a partir de `assets-src/` e `src/content/brand*.ts`. Tarefas: `sprite logo icons og notfound footer intro particles sequence team cases veil atlas` (sem argumento: todas; `sprite` gera `public/assets/images/particle.jpg`). Usa Chrome (Playwright) com as fontes do próprio site para os textos e `sharp` para os rasters. Registra as fontes efetivamente usadas em `assets-src/brand/last-build.json`. |
| `build-content.mjs` | Escreve `src/content/{projects,home,pages,settings,taxonomies,page-themes}.json` a partir de `src/content/brand.ts`. |
| `verify-olwtelet.mjs` | Captura e confere o site em execução (padrão `http://localhost:3000`) em 1440×900, 1920×1080, 768×1024, 390×844 e 360×800. Tamanhos extras só quando pedidos em `--viewports` (`d1024 d1280 d1366 t900 m375s m360s m375se m390s m320`; os três últimos são celulares com as barras do navegador e 320 px). `--block-external` simula as fontes da Adobe indisponíveis. Identifica o build servido (ver abaixo), sai com código 1 em qualquer falha e marca `complete: false` se a execução parar no meio. Na home, clica em cinco pontos do grid e exige que nenhum leve a outra página além dos dois projetos. Um ponto que cai sobre um controle é pulado e registrado em `checks.probeClicks`: em celulares de até cerca de 670 px de altura, (50 %, 10 %) é o botão "Filtrar". |

## Identificação do build verificado

`verify-olwtelet.mjs` liga o build local (`.next/BUILD_ID`) ao que o navegador realmente recebeu, sem depender de
`self.__next_f` (o Next esvazia esse array após a hidratação):

- calcula o SHA-256 de cada resposta `/_next/static/**` e compara com o mesmo arquivo em `.next/static/`. Qualquer
  arquivo diferente, ausente localmente, ilegível ou com erro (4xx/5xx, falha de rede) reprova o build;
- lê o campo `"b"` dos dados de flight no documento HTML de cada carregamento de página e em cada resposta RSC;
- cada captura registra hora, URL, o documento HTML de origem e o build lido nele (`captures[].buildId`,
  `buildIdFrom: "document"`, `documentUrl`);
- relê `.next/BUILD_ID` (id e data do arquivo) no fim da execução: se mudou, o build não é verificado;
- `report.build.staticFiles.files` lista cada arquivo carregado com o SHA-256 recebido e o local.

Em cada captura, o script também confere que os controles flutuantes não se tocam (pelo menos 4 px entre eles):
- links e botões do header, "Filtrar" e o seletor Estúdio | Processo;
- o botão grade/lista, a navegação inferior e o rótulo "SOM";
- no contato, os botões de e-mail e LinkedIn e o link da política de privacidade.

Na lista, falha se a lista não estiver de fato aberta.

O resultado fica em `report.build` (`result`, `verifiedAt`, `localBuildId`, `localBuildIdModified`, `pageBuildIds`,
`responseBuildIds`, `staticFiles`).

## Símbolo: anexo × vetor

O anexo do proprietário (`assets-src/brand/olwtelet-logo-source.png`, 1024×1024, desenho branco sobre preto) é a fonte
da marca. O site https://olwtelet.vercel.app/ publica um traçado vetorial do mesmo desenho (`favicon.svg`, sete
polígonos). Comparação feita em 16/11/2026, com o vetor rasterizado na caixa do desenho do anexo (pixels com
luminância > 24, caixa 639×800):

- proporção: anexo 0,7987 · vetor 0,7991;
- interseção sobre união (limiar 128): **0,9946** (420 px só no anexo, 875 px só no vetor, todos na borda
  anti-serrilhada).

Como o vetor reproduz a geometria do anexo, ele é usado nas aplicações vetoriais e nos renders
(`src/content/brand-mark.ts`, sem escala nem suavização); os PNGs transparentes saem do próprio anexo (alpha =
luminância, piso de ruído ≤ 6 removido, recorte óptico com 3 % da altura de margem).
