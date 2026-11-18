// Olwtelet Productions: writes the site's content files (src/content/*.json) from src/content/brand.ts.
//   node scripts/brand/build-content.mjs
// Shapes are the ones the components already read (Prismic-like slices), so the editorial system is unchanged; the
// facts and texts are the owner's (brief of 2026-11-16 and the owner's sites). Re-run after editing brand.ts or the
// texts below. The Phantom snapshot these files replaced stays in git history (tag phantom-replica-checkpoint).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { BRAND, PROJECTS, KINDS, CATEGORIES, STATUS_LABEL } from '../../src/content/brand.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(path.join(ROOT, 'package.json'));
const sharp = require('sharp');
const P = (...p) => path.join(ROOT, ...p);
const out = (f, obj) => {
  fs.writeFileSync(P('src/content', f), JSON.stringify(obj) + '\n');
  console.log('[content]', f, fs.statSync(P('src/content', f)).size, 'bytes');
};
const NOW = '2026-11-16T00:00:00+0000';
const meta = { generator: 'scripts/brand/build-content.mjs', source: 'src/content/brand.ts', note: 'Olwtelet Productions content (pt-BR).' };

// ------------------------------------------------------------------------------------------------ rich-text helpers
/** paragraphs; `links` = [[substring, href]] turned into hyperlink spans (offsets computed, never hand-written) */
function para(text, links = [], type = 'paragraph') {
  const spans = [];
  for (const [sub, href] of links) {
    const start = text.indexOf(sub);
    if (start < 0) throw new Error(`link text not found: ${sub}`);
    spans.push({ start, end: start + sub.length, type: 'hyperlink', data: { link_type: 'Web', url: href, ...(href.startsWith('http') ? { target: '_blank' } : {}) } });
  }
  return { type, text, spans, direction: 'ltr' };
}
const strongPrefix = (text, prefix, type = 'list-item') => ({ type, text, spans: [{ start: 0, end: prefix.length, type: 'strong' }], direction: 'ltr' });
const img = (url, width, height, alt) => ({ dimensions: { width, height }, alt, copyright: null, url, id: path.basename(url).replace(/\W+/g, '-'), edit: { x: 0, y: 0, zoom: 1, background: 'transparent' } });
const media = (url, width, height) => ({ link_type: 'Media', kind: 'image', id: path.basename(url), url, name: path.basename(url), width: String(width), height: String(height) });
async function dims(publicPath) {
  const m = await sharp(P('public', publicPath)).metadata();
  return [m.width, m.height];
}
async function imgOf(publicPath, alt) {
  const [w, h] = await dims(publicPath);
  return img(publicPath, w, h, alt);
}

// ------------------------------------------------------------------------------------------------ projects
const OWNER_CLIENT = { uid: 'olwtelet', id: 'olwtelet', name: BRAND.name, logo: null, display_order: null, disable_filter: true, hide_from_about_page: true };
const kindRef = (k) => ({ id: `kind-${k}`, type: 'case_study_zone', uid: k, data: { zone_name: KINDS[k] }, link_type: 'Document', isBroken: false });
const catRef = (c) => ({ feature: { id: `cat-${c}`, type: 'case_study_feature', uid: c, data: { feature_name: CATEGORIES[c] }, link_type: 'Document', isBroken: false } });
const ownerRef = { client: { id: 'olwtelet', type: 'client', uid: 'olwtelet', data: { client_name: BRAND.name, client_logo: {} }, link_type: 'Document', isBroken: false } };

const CASE = '/projects/filmes-hd-online-gratis';
const caseMedia = async (file, alt) => {
  const u = `${CASE}/${file}.jpg`;
  const [w, h] = await dims(u);
  return { source: media(u, w, h), alt, type: 'image' };
};
const mediaSlice = (id, items) => ({ variation: 'default', version: 'initial', items: [], primary: { Media: items }, id: `case_study_media$${id}`, slice_type: 'case_study_media', slice_label: null });
const copySlice = (id, label, paragraphs) => ({ variation: 'twoColumnsAuto', version: 'initial', items: [], primary: { label, description: paragraphs.map((t) => para(t)) }, id: `copy_section$${id}`, slice_type: 'copy_section', slice_label: null });

async function filmesData(p) {
  const [hw, hh] = await dims(`${CASE}/d-home.jpg`);
  return {
    launch_date: null,
    title: p.title,
    clients: [ownerRef],
    features: p.categories.map(catRef),
    zone: kindRef(p.kind),
    service: null,
    status: p.status,
    status_label: STATUS_LABEL[p.status],
    work_grid: [{ priority: 1, title: p.title, hide_from_work_grid: false }],
    theme: [{ primary_color: p.theme.primaryColor, secondary_color: p.theme.secondaryColor }],
    hero: [
      {
        title_scaling: null,
        media_type: 'image',
        media: media(`${CASE}/d-home.jpg`, hw, hh),
        alternate_media: { link_type: 'Any' },
        summary: [para(p.summary)],
        media_overscale: false,
        alt_tag: 'Página inicial do Filmes HD Online Grátis com a sessão em destaque (captura de novembro de 2026)',
      },
    ],
    about: [
      {
        description: [
          para('Filmes HD Online Grátis é o primeiro projeto publicado da Olwtelet Productions. O site organiza uma programação de cinema: como ele mesmo descreve, cada sessão é escolhida por quem assistiu ao filme e tem o motivo da escolha registrado.'),
          para('A exibição acontece ao vivo, em uma sala do Discord. O site não hospeda filmes: ele apresenta a programação, os textos e as informações de cada sessão, e leva quem quiser participar até a sala.'),
        ],
      },
    ],
    awards: [],
    live_experience: [{ url: { link_type: 'Web', url: p.url, target: '_blank' }, label: p.urlLabel }],
    slices: [
      mediaSlice('programacao', [await caseMedia('d-programacao', 'Programação em modo de cenas, com sessões exibidas e a navegação por arraste')]),
      copySlice('programacao', 'Programação', [
        'A página inicial é a própria programação. Cada sessão ocupa a tela com a data, o horário e a sala, e a navegação acontece arrastando o conteúdo, rolando entre as sessões ou indo direto a um filme pelo menu.',
        'A programação também pode ser vista em outros modos e acompanhada por RSS.',
      ]),
      mediaSlice('sessao', [await caseMedia('d-sessao', 'Página de uma sessão: imagem do filme, data da próxima sessão e título')]),
      mediaSlice('ficha-leituras', [
        await caseMedia('d-sessao-18', 'Ficha técnica do filme, em blocos'),
        await caseMedia('d-sessao-50', 'Leituras: notas curtas sobre cenas do filme'),
      ]),
      copySlice('sessao', 'Cada sessão', [
        'Cada sessão tem uma página própria, com sinopse, ficha técnica, elenco, galeria, trailer e uma série de leituras curtas sobre cenas do filme.',
        'A ficha da sessão reúne data, horário, sala, classificação etária e gêneros.',
      ]),
      mediaSlice('na-sala', [await caseMedia('d-sessao-70', 'Bloco "Na sala": dia, horário, sala no Discord e combinados da sessão')]),
      copySlice('na-sala', 'Na sala', [
        'O bloco final de cada sessão explica como participar: o dia e o horário, a sala no Discord e os combinados para assistir junto, como chegar alguns minutos antes, manter o microfone mudo e não dar spoiler no chat.',
      ]),
      mediaSlice('mobile', [
        await caseMedia('m-home', 'Versão para celular: sessão em destaque'),
        await caseMedia('m-sessao-70', 'Versão para celular: bloco "Na sala"'),
      ]),
      mediaSlice('rodape', [await caseMedia('d-sessao-86', 'Rodapé com a programação por RSS, a navegação e os contatos')]),
      copySlice('capturas', 'Sobre as imagens', [
        'As imagens desta página são capturas do site publicado, feitas em novembro de 2026. A programação que aparece nelas muda a cada sessão.',
      ]),
    ],
    meta_title: null,
    meta_description: p.summary,
    meta_image: img('/brand/og-filmes-hd-online-gratis.jpg', 1200, 630, 'Filmes HD Online Grátis'),
  };
}

async function veilData(p) {
  const hero = '/projects/veil/veil-apresentacao.jpg';
  const [w, h] = await dims(hero);
  return {
    launch_date: null,
    title: p.title,
    clients: [ownerRef],
    features: p.categories.map(catRef),
    zone: kindRef(p.kind),
    service: null,
    status: p.status,
    status_label: STATUS_LABEL[p.status],
    work_grid: [{ priority: 2, title: p.title, hide_from_work_grid: false }],
    theme: [{ primary_color: p.theme.primaryColor, secondary_color: p.theme.secondaryColor }],
    hero: [
      {
        title_scaling: null,
        media_type: 'image',
        media: media(hero, w, h),
        alternate_media: { link_type: 'Any' },
        summary: [para(p.summary)],
        media_overscale: false,
        alt_tag: 'Composição tipográfica de apresentação do Veil (não é uma captura do jogo)',
      },
    ],
    about: [
      {
        description: [
          para('Veil é o projeto em desenvolvimento da Olwtelet Productions: um jogo de estratégia para navegador inspirado no xadrez.'),
          para('Esta página é uma apresentação do projeto. Ainda não há versão pública, e a imagem acima é uma composição gráfica, não uma captura do jogo.'),
        ],
      },
    ],
    awards: [],
    live_experience: [],
    slices: [],
    meta_title: null,
    meta_description: p.summary,
    meta_image: img('/brand/og-veil.jpg', 1200, 630, 'Veil'),
  };
}

async function buildProjects() {
  const projects = [];
  let i = 0;
  for (const p of PROJECTS) {
    const data = p.uid === 'veil' ? await veilData(p) : await filmesData(p);
    projects.push({
      uid: p.uid,
      id: p.id,
      type: 'project',
      route: `/projects/${p.uid}`,
      url: `/projects/${p.uid}`,
      inSitemap: true,
      cmsOrderIndex: i++,
      first_publication_date: NOW,
      last_publication_date: NOW,
      tags: [],
      lang: 'pt-br',
      alternate_languages: [],
      title: p.title,
      launch_date: null,
      status: p.status,
      clients: [OWNER_CLIENT],
      features: p.categories.map((c) => ({ uid: c, id: `cat-${c}`, feature_name: CATEGORIES[c] })),
      zone: { uid: p.kind, id: `kind-${p.kind}`, zone_name: KINDS[p.kind] },
      service: null,
      workGrid: { priority: i, hide_from_work_grid: false, title: p.title, mediatype: 'image', media_url: null, cell_blur: { link_type: 'Media' }, entries: 1 },
      theme: { ...p.theme, pageThemesEntry: p.theme, pageThemesMatchesField: true, effective: p.theme, effectiveSource: 'src/content/brand.ts' },
      slicesSummary: data.slices.map((s) => s.slice_type),
      meta: { meta_title: data.meta_title, meta_description: data.meta_description, meta_image: data.meta_image },
      seo: null,
      relatedProjects: [],
      grid: { inBlueprint: true, blueprintIndex: i - 1, atlas: null, listYear: null, listIndexInYear: null },
      data,
    });
  }
  out('projects.json', { $meta: { ...meta, count: projects.length }, projects });
}

// ------------------------------------------------------------------------------------------------ seo records
const seo = (title, description, canonical, image = BRAND.assets.ogImage, robots = null) => ({
  title,
  description,
  canonical,
  robots,
  googlebot: null,
  og: { title, description, site_name: BRAND.name, image },
  twitter: { card: 'summary_large_image', title, description, image },
  icons: [],
  otherMeta: [],
  headRobots: robots,
});
const T = (s) => `${s} · ${BRAND.name}`;

// ------------------------------------------------------------------------------------------------ home
function buildHome() {
  out('home.json', {
    route: '/',
    $meta: meta,
    seo: seo(`${BRAND.name} — Software, jogos e experiências digitais`, BRAND.description, '/'),
    document: { data: {} },
    screenReaderText: {
      h1: [`${BRAND.name}: software, jogos e experiências digitais.`],
      p: [
        `Espaço de criação independente de ${BRAND.creator.name} (${BRAND.creator.pseudonym}), em ${BRAND.location.city}.`,
        'Projeto publicado: Filmes HD Online Grátis, curadoria cinematográfica com sessões ao vivo no Discord. Em desenvolvimento: Veil, jogo de estratégia para navegador inspirado no xadrez.',
      ],
    },
    workGridConfig: {},
    gridContent: { count: PROJECTS.length, order: PROJECTS.map((p) => p.uid), docs: [] },
    gridTiles: {},
    listView: {},
    filters: {},
  });
}

// ------------------------------------------------------------------------------------------------ about
let sectionN = 0;
const cols = (subText, description, { pageTitle = false, cta = null, id } = {}) => ({
  variation: 'default',
  version: 'initial',
  items: [],
  primary: {
    about_section_id: `section-${++sectionN}`,
    page_title: pageTitle,
    include_section_line_above: true,
    sub_text: subText,
    intro_inline_svg: {},
    description,
    cta_link: cta ? { link_type: 'Web', url: cta.href, text: cta.text } : { link_type: 'Any' },
    image: {},
    video: { link_type: 'Any' },
    video_blending: false,
  },
  id: `about_columns$${id}`,
  slice_type: 'about_columns',
  slice_label: null,
});
const row = (id, number, title, description, { link = null, image = {} } = {}) => ({
  variation: 'aboutColumns4ColumnZone',
  version: 'initial',
  items: [],
  primary: {
    about_section_id: null,
    linked_zone: { link_type: 'Document' },
    row_number: number,
    row_icon: null,
    zone_title: title,
    zone_description: description,
    zone_link_text: link ? link.text : null,
    cta_href: link ? link.href : null,
    list_items: [],
    list_image: image,
    list_video: { link_type: 'Any' },
    list_video_blending: false,
  },
  id: `about_columns$${id}`,
  slice_type: 'about_columns',
  slice_label: null,
});
const carousel = (id, items) => ({ variation: 'default', version: 'initial', items: items.map((image) => ({ image, video_url: null })), primary: { about_section_id: `section-${++sectionN}` }, id: `about_scrolling_carousel$${id}`, slice_type: 'about_scrolling_carousel', slice_label: null });
// Processo steps (src/components/about/ProcessSteps.tsx): a lead and the steps, each with a diagram of its own
// (src/components/about/ProcessDiagrams.tsx) and three labels taken word for word from its text.
// A one-letter word ("a", "e", "o", "é") is kept with the next one (no-break space), so a line of a step's text never
// ends on it ("…promissora, a / ideia…"). Step texts only: the lead is split word by word for its reveal (SplitType turns
// a no-break space into a plain one during the animation, and the lines would change when it ends); its measure
// (processSteps.module.css, .Lead) keeps its lines off one-letter words instead.
const keepShortWords = (text) => text.replace(/(^|\s)([aeoéAEOÉ]) /g, '$1$2\u00A0');
const processSteps = (id, subText, lead, steps) => ({
  variation: 'default',
  version: 'initial',
  items: steps.map(([step_number, title, description, diagram, labels]) => ({ step_number, title, description: keepShortWords(description), diagram, labels })),
  primary: { about_section_id: `section-${++sectionN}`, sub_text: subText, description: lead },
  id: `about_process_steps$${id}`,
  slice_type: 'about_process_steps',
  slice_label: null,
});

// short name: the department list of the particle panel is set in a large size and clips long names
const DEPARTMENT = { id: 'olwtelet-productions', uid: 'olwtelet-productions', type: 'department', data: { department_name: BRAND.shortName } };
const CREATOR = {
  id: 'isaac-rodrigues',
  uid: 'isaac-rodrigues',
  type: 'employee',
  data: {
    employee_name: `${BRAND.creator.name} (${BRAND.creator.pseudonym})`,
    department: { id: DEPARTMENT.id, type: 'department', uid: DEPARTMENT.uid, link_type: 'Document', isBroken: false },
    job_title: `${BRAND.creator.shortRole} · ${BRAND.creator.role}`,
    // the particle canvas shows the Olwtelet mark (no portrait: none was provided)
    depth_map_image_link: { link_type: 'Web', url: '/assets/about/team/olwtelet-depth-256.webp' },
    texture_image_link: { link_type: 'Web', url: '/assets/about/team/olwtelet-colour-256.webp' },
    particle_params: [{ face_scale_z: 1.0, offset_z: -0.2, face_size: 0.9 }],
  },
};

async function buildAbout() {
  const studioCarousel = [
    await imgOf(`${CASE}/d-home-drag.jpg`, 'Filmes HD Online Grátis: sessão em destaque'),
    await imgOf(`${CASE}/d-sessao-18.jpg`, 'Filmes HD Online Grátis: ficha técnica'),
    await imgOf('/projects/veil/veil-apresentacao.jpg', 'Veil: composição de apresentação'),
    await imgOf(`${CASE}/d-programacao.jpg`, 'Filmes HD Online Grátis: programação'),
    await imgOf(`${CASE}/d-sessao-50.jpg`, 'Filmes HD Online Grátis: leituras'),
    await imgOf(`${CASE}/d-sobre.jpg`, 'Filmes HD Online Grátis: página Sobre'),
  ];
  sectionN = 0;
  const studio = [
    cols('Estúdio', 'SOFTWARE, JOGOS E EXPERIÊNCIAS DIGITAIS.', { pageTitle: true, id: 'studio-title' }),
    carousel('studio', studioCarousel),
    cols('Sobre', `A ${BRAND.name} é o espaço de criação independente de ${BRAND.creator.name}. A partir de ${BRAND.location.city}, reúne projetos próprios de software, jogos e aplicações web, com atenção à arquitetura, à interface e ao comportamento de cada experiência.`, { id: 'studio-sobre' }),
    cols('Projetos', 'O primeiro projeto publicado é Filmes HD Online Grátis, uma curadoria cinematográfica com programação de sessões ao vivo no Discord. Também está em desenvolvimento Veil, um jogo de estratégia inspirado no xadrez. A proposta é construir um catálogo autoral, projeto por projeto.', { id: 'studio-projetos' }),
    row('studio-filmes', '01', 'Filmes HD Online Grátis', 'Publicado.\n\nCuradoria cinematográfica independente com programação, textos sobre os filmes e sessões ao vivo no Discord.', {
      link: { text: 'Ver o projeto', href: '/projects/filmes-hd-online-gratis' },
      image: await imgOf(`${CASE}/d-home.jpg`, 'Filmes HD Online Grátis'),
    }),
    row('studio-veil', '02', 'Veil', 'Em desenvolvimento.\n\nJogo de estratégia para navegador inspirado no xadrez. Ainda sem versão pública.', {
      link: { text: 'Ver a apresentação', href: '/projects/veil' },
      image: await imgOf('/projects/veil/veil-apresentacao.jpg', 'Veil: composição de apresentação'),
    }),
    cols('Criador', `Por trás da ${BRAND.name} está ${BRAND.creator.name}, desenvolvedor de software em ${BRAND.location.city} que assina como ${BRAND.creator.pseudonym}. Estuda ${BRAND.creator.studies} e trabalha com ${BRAND.creator.work}, com interesse em ${BRAND.creator.interests[0]}, ${BRAND.creator.interests[1]} e ${BRAND.creator.interests[2]}.`, { id: 'studio-criador' }),
    { variation: 'default', version: 'initial', items: [], primary: { departments: [{ department: { id: DEPARTMENT.id, type: 'department', uid: DEPARTMENT.uid, link_type: 'Document', isBroken: false } }] }, id: 'team_section$olwtelet', slice_type: 'team_section', slice_label: null },
    row('studio-base', null, BRAND.location.label, null),
    {
      variation: 'default',
      version: 'initial',
      items: [],
      primary: {
        office: [
          {
            name: BRAND.name,
            logo: img(BRAND.assets.markWhiteSvg, 782, 978, BRAND.name),
            address: [para(`${BRAND.location.city}, ${BRAND.location.region}\n${BRAND.location.country}`)],
            contact: [
              para(`${BRAND.contact.email.toUpperCase()}\nGITHUB.COM/OLWTELET\nLINKEDIN.COM/IN/OLWTELET\nOLWTELET.VERCEL.APP`, [
                [BRAND.contact.email.toUpperCase(), `mailto:${BRAND.contact.email}`],
                ['GITHUB.COM/OLWTELET', BRAND.links.github.href],
                ['LINKEDIN.COM/IN/OLWTELET', BRAND.links.linkedin.href],
                ['OLWTELET.VERCEL.APP', BRAND.links.site.href],
              ]),
            ],
            image: {},
          },
        ],
      },
      id: 'about_where_we_are$olwtelet',
      slice_type: 'about_where_we_are',
      slice_label: null,
    },
    cols('Contato', `Para conversar sobre um projeto, uma parceria ou o Veil, escreva para ${BRAND.contact.email}.`, { cta: { text: 'Vamos conversar', href: '/contact' }, id: 'studio-contato' }),
  ];

  sectionN = 0;
  const processCarousel = [
    await imgOf(`${CASE}/d-sessao.jpg`, 'Filmes HD Online Grátis: página de sessão'),
    await imgOf(`${CASE}/d-sessao-70.jpg`, 'Filmes HD Online Grátis: bloco "Na sala"'),
    await imgOf('/projects/veil/veil-apresentacao.jpg', 'Veil: composição de apresentação'),
    await imgOf(`${CASE}/d-sessao-86.jpg`, 'Filmes HD Online Grátis: rodapé com RSS'),
    await imgOf(`${CASE}/d-home.jpg`, 'Filmes HD Online Grátis: página inicial'),
  ];
  // The owner's process (round of 2026-11-18): projects are born from an epiphany; when it proves promising, the idea
  // goes into analysis and development. The lead is the owner's sentence; the steps follow it, one per moment it
  // names (epiphany, analysis, development), and the step texts only restate it, with the kinds of project the Estúdio
  // page already names (software, games, web applications). Labels are words of each text; no team, results, clients
  // or methodology claimed.
  const PROCESS_LEAD = `Os projetos da ${BRAND.name} nascem de uma epifania. Quando ela se mostra promissora, a ideia entra em análise e desenvolvimento.`;
  const process = [
    cols('Processo', 'DA EPIFANIA AO PROJETO.', { pageTitle: true, id: 'process-title' }),
    carousel('process', processCarousel),
    processSteps('process', 'Etapas', PROCESS_LEAD, [
      ['01', 'Epifania', 'Todo projeto começa com uma epifania, uma ideia que surge de repente. Nem toda epifania vira projeto.', 'epifania', ['Ideia', 'Epifania', 'Projeto']],
      ['02', 'Análise', 'Quando a epifania se mostra promissora, a ideia entra em análise antes de seguir para o desenvolvimento.', 'analise', ['Epifania', 'Promissora', 'Análise']],
      ['03', 'Desenvolvimento', 'Depois da análise, a ideia é desenvolvida e se torna software, jogo ou aplicação web.', 'desenvolvimento', ['Software', 'Jogo', 'Web']],
    ]),
    cols('Contato', `Para conversar sobre um projeto, uma parceria ou o Veil, escreva para ${BRAND.contact.email}.`, { cta: { text: 'Vamos conversar', href: '/contact' }, id: 'process-contato' }),
  ];
  const record = (route, uid, slices, title, description) => ({
    route,
    kind: 'about',
    inSitemap: true,
    httpStatus: 200,
    seo: seo(T(title), description, route),
    rscDocument: { customType: 'about', uid, slices, slicesSummary: slices.map((s) => s.slice_type), context: { additionalPageData: [] }, derived: {} },
    cmsDocument: null,
    sections: [],
    components: [],
  });
  return [
    record('/about/studio', 'studio', studio, 'Estúdio', `${BRAND.name}: espaço de criação independente de ${BRAND.creator.name}, em ${BRAND.location.city}. Projetos próprios de software, jogos e aplicações web.`),
    record('/about/process', 'process', process, 'Processo', PROCESS_LEAD),
  ];
}

// ------------------------------------------------------------------------------------------------ contact
function buildContact() {
  const data = {
    step_1_title: 'Olá! Que bom ter você por aqui.',
    step_1_project_enquiry_eyebrow: 'Projetos e parcerias',
    step_1_project_enquiry_description: 'Quero conversar sobre um projeto ou uma parceria.',
    step_1_project_bg_video: null,
    step_1_project_bg_image: '/brand/footer-mark-porcelain.png',
    step_1_veil_enquiry_eyebrow: 'Veil',
    step_1_veil_enquiry_description: 'Quero saber mais sobre o Veil.',
    step_1_veil_bg_video: null,
    step_1_veil_bg_image: '/projects/veil/veil-apresentacao.jpg',
    step_1_veil_href: `mailto:${BRAND.contact.email}?subject=Veil`,
    step_1_partnerships_enquiry_eyebrow: 'Outros assuntos',
    step_1_partnerships_enquiry_desc: 'Só quero dizer olá.',
    step_1_partnerships_email: BRAND.contact.email,
    step_1_partnerships_whatsapp: null,
    step_1_partnerships_linkedin: BRAND.links.linkedin.href,
    step_1_partnerships_bg_video: null,
    step_2_title: 'Conte um pouco sobre a sua ideia.',
    step_2_slider_title: 'Em que ponto está a conversa?',
    step_2_slider: [{ slider_option: 'Quero apenas conversar.' }, { slider_option: 'Tenho algumas ideias.' }, { slider_option: 'Tenho algo bem definido.' }],
    step_2_full_name_placeholder: 'Nome completo*',
    step_2_email_placeholder: 'E-mail*',
    step_2_company_placeholder: 'Empresa ou projeto',
    step_2_send_note_placeholder: 'Escreva uma mensagem.',
    step_2_input_5_placeholder_1: 'Escreva uma mensagem.',
    step_2_input_5_placeholder_2: 'Conte as ideias, mesmo que ainda estejam soltas.',
    step_2_input_5_placeholder_3: 'Descreva o que você tem em mente, com o detalhe que quiser.',
    step_2_input_6_placeholder_1: 'Se quiser, anexe um arquivo de referência (PDF, DOC ou DOCX).',
    step_2_input_6_placeholder_2: 'Se quiser, anexe um arquivo de referência (PDF, DOC ou DOCX).',
    step_2_help_message_placeholder: 'Sobre o que você quer conversar?',
    step_2_callouts_placeholder: null,
    step_2_upload_label: 'Se quiser, anexe um arquivo de referência (PDF, DOC ou DOCX).',
    step_2_selection_label: 'Se fizer sentido, escolha os assuntos da conversa.',
    step_2_selection_options: ['Projeto web', 'Jogo', 'Software', 'Parceria', 'Veil', 'Filmes HD Online Grátis', 'Outro assunto'].map((s) => ({ selection_option: s })),
    step_3_success_message: [{ type: 'heading1', text: 'Mensagem enviada.\nObrigado pelo contato.', spans: [{ start: 0, end: 17, type: 'strong' }], direction: 'ltr' }],
    step_3_next_steps: [
      { message: 'Sua mensagem foi enviada.' },
      { message: 'Se houver retorno, ele será feito pelo e-mail que você informou.' },
      { message: `Se precisar complementar alguma informação, escreva para ${BRAND.contact.email}.` },
    ],
  };
  const doc = { id: 'contato', uid: 'contato', url: '/contact', type: 'lets_talk', tags: [], lang: 'pt-br', data };
  return {
    route: '/contact',
    kind: 'contact',
    inSitemap: true,
    httpStatus: 200,
    seo: seo(T('Contato'), `Fale com a ${BRAND.name}: projetos e parcerias, o Veil ou outros assuntos.`, '/contact'),
    rscDocument: { doc },
    cmsDocument: { doc },
    sections: [],
    components: [],
  };
}

// ------------------------------------------------------------------------------------------------ privacy policy
function legalSection(variation, content) {
  return { slice_type: 'copy_section', variation, text: '', components: [{ name: `copy_section ${variation}`, props: { content } }] };
}
function buildPrivacy() {
  const email = BRAND.contact.email;
  const sections = [
    legalSection('title', { label: 'SOBRE', title: 'Política de privacidade' }),
    legalSection('default', {
      label: 'QUEM É RESPONSÁVEL',
      description: [
        para(`Este site apresenta a ${BRAND.name}, espaço de criação independente de ${BRAND.creator.name} (${BRAND.creator.pseudonym}), em ${BRAND.location.label}. Para qualquer assunto sobre privacidade e dados pessoais, escreva para ${email}.`, [[email, `mailto:${email}`]]),
      ],
    }),
    legalSection('default', {
      label: 'DADOS QUE VOCÊ ENVIA',
      description: [
        para('O formulário de contato pede nome e e-mail e aceita, se você quiser, empresa ou projeto, uma mensagem, o ponto em que está a conversa, assuntos de interesse e um arquivo (PDF, DOC ou DOCX, até 2 MB). Junto com o formulário segue a lista das páginas de projeto que você abriu nesta visita.'),
        para(`O envio passa por um serviço de integração configurado pela ${BRAND.name}, que entrega a mensagem para resposta. Esses dados servem apenas para responder ao seu contato, não são usados para publicidade e ficam guardados só pelo tempo necessário para isso. Quando o envio não está disponível, o site avisa e indica o e-mail.`),
      ],
    }),
    legalSection('default', {
      label: 'ARMAZENAMENTO NO NAVEGADOR',
      description: [
        para('O site guarda no seu navegador apenas:'),
        strongPrefix('Páginas de projeto visitadas: registradas no armazenamento da sessão (sessionStorage) e apagadas quando a aba é fechada.', 'Páginas de projeto visitadas:'),
        strongPrefix('Escolha sobre cookies de análise: guardada no armazenamento local (localStorage), apenas quando a análise de tráfego está ativa.', 'Escolha sobre cookies de análise:'),
        strongPrefix('Preferência de som: quando você liga ou desliga o som do site, a escolha fica no armazenamento local (localStorage) para as próximas visitas.', 'Preferência de som:'),
      ],
    }),
    legalSection('default', {
      label: 'FONTES',
      description: [para('Parte das fontes de texto do site é carregada do serviço Adobe Fonts, que recebe dados técnicos da visita, como endereço IP e navegador.')],
    }),
    legalSection('default', {
      label: 'ANÁLISE DE TRÁFEGO',
      description: [
        para('Ferramentas de análise (Google Analytics) só são carregadas quando estão configuradas no site. Nesse caso, a ferramenta começa com o armazenamento de análise e de publicidade desativado, um aviso pede o seu consentimento e cookies de análise só são gravados se você aceitar. Sem configuração, nenhuma ferramenta de análise é carregada e o aviso não aparece.'),
      ],
    }),
    legalSection('twoColumnsManual', {
      label: 'SUA ESCOLHA',
      columns: [
        {
          left_column: [para('Quando a análise de tráfego está ativa, você pode mudar ou retirar a sua escolha sobre cookies de análise a qualquer momento.')],
          right_column: [para('As opções aparecem aqui quando a análise está ativa.')],
        },
      ],
      cta: { type: 'consent' },
    }),
    legalSection('default', {
      label: 'HOSPEDAGEM',
      description: [para('Como qualquer site, este é servido por um provedor de hospedagem, que pode registrar dados técnicos de acesso, como endereço IP e navegador, para operar e proteger o serviço.')],
    }),
    legalSection('default', {
      label: 'SEUS DIREITOS',
      description: [
        para(`Pela Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você pode pedir confirmação do tratamento, acesso, correção ou exclusão dos seus dados pessoais e retirar um consentimento dado. Basta escrever para ${email}.`, [[email, `mailto:${email}`]]),
      ],
    }),
    legalSection('default', {
      label: 'ATUALIZAÇÕES',
      description: [para('Esta política acompanha o site e pode mudar quando ele mudar. A versão em vigor é sempre a publicada nesta página. Última revisão: novembro de 2026.')],
    }),
  ];
  return {
    route: '/privacy-policy',
    kind: 'page',
    inSitemap: true,
    httpStatus: 200,
    seo: seo(T('Política de privacidade'), `Como a ${BRAND.name} trata os dados de quem visita o site e usa o formulário de contato.`, '/privacy-policy'),
    rscDocument: null,
    cmsDocument: null,
    sections,
    components: [],
  };
}

function buildNotFound() {
  return {
    route: '/this-page-does-not-exist',
    kind: 'not-found',
    inSitemap: false,
    httpStatus: 404,
    seo: { ...seo(T('Página não encontrada'), 'Página não encontrada', null, null, 'noindex'), og: {}, twitter: {} },
    rscDocument: null,
    cmsDocument: null,
    sections: [],
    components: [],
  };
}

async function buildPages() {
  const pages = [...(await buildAbout()), buildContact(), buildPrivacy(), buildNotFound()];
  out('pages.json', { $meta: { ...meta, count: pages.length }, pages });
}

// ------------------------------------------------------------------------------------------------ settings / taxonomies / themes
function buildSettings() {
  const privacy = 'SAIBA MAIS NA POLÍTICA DE PRIVACIDADE';
  const main = `ESTE SITE USA COOKIES DE ANÁLISE APENAS SE VOCÊ ACEITAR. ${privacy}.`;
  out('settings.json', {
    $meta: { ...meta, note: 'Only header, tagline and cookieBanner are read; brand facts live in src/content/brand.ts.' },
    header: {
      data: {
        logo: img(BRAND.assets.markWhiteSvg, 782, 978, BRAND.name),
        short_description: BRAND.tagline,
        contact_cta_text: 'Vamos conversar',
        contact_cta_link: { link_type: 'Web', url: `mailto:${BRAND.contact.email}` },
      },
    },
    tagline: { text: BRAND.tagline },
    cookieBanner: {
      data: {
        description: main,
        accept_text: 'Aceitar',
        decline_text: 'Recusar',
        main_text: [{ type: 'paragraph', text: main, spans: [{ start: main.indexOf(privacy) + 'SAIBA MAIS NA '.length, end: main.indexOf(privacy) + privacy.length, type: 'hyperlink', data: { link_type: 'Document', type: 'page', uid: 'privacy-policy', url: '/privacy-policy', isBroken: false } }], direction: 'ltr' }],
      },
    },
  });
}
function buildTaxonomies() {
  const item = (uid, name, extra = {}) => ({ uid, id: uid, name, display_order: null, disable_filter: false, doc: {}, ...extra });
  out('taxonomies.json', {
    $meta: meta,
    zones: { customType: 'case_study_zone', fields: ['zone_name'], items: Object.entries(KINDS).map(([u, n]) => item(u, n)) },
    features: { customType: 'case_study_feature', fields: ['feature_name'], items: Object.entries(CATEGORIES).map(([u, n]) => item(u, n)) },
    services: { customType: 'case_study_service', fields: ['service_name'], items: [] },
    clients: { customType: 'client', fields: ['client_name'], items: [item('olwtelet', BRAND.name, { disable_filter: true, hide_from_about_page: true })] },
    filterPanelOrder: {},
    departments: { customType: 'department', items: [DEPARTMENT] },
    employees: { customType: 'employee', items: [CREATOR] },
    awardRecognitions: { customType: 'award_recognition', items: [] },
  });
}
function buildThemes() {
  const map = {
    '/': { primaryColor: '#FFFFFF', secondaryColor: '#000000' },
    '/about': { primaryColor: '#FFFFFF', secondaryColor: '#202020' },
    '/about/studio': { primaryColor: '#FFFFFF', secondaryColor: '#202020' },
    '/about/process': { primaryColor: '#000000', secondaryColor: '#DFDFDF' },
    '/[uid]': { primaryColor: '#FFFFFF', secondaryColor: '#202020' },
  };
  for (const p of PROJECTS) map[`/projects/${p.uid}`] = { ...p.theme };
  out('page-themes.json', {
    $meta: meta,
    defaults: { initial: { primaryColor: '#000000', secondaryColor: '#DFDFDF' }, fallback: { primaryColor: '#FFFFFF', secondaryColor: '#202020' } },
    map,
  });
}

await buildProjects();
buildHome();
await buildPages();
buildSettings();
buildTaxonomies();
buildThemes();
