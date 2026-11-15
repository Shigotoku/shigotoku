
/**
 * MediToku Slide Studio v3
 * Independent implementation
 * Google Drive folder URL support
 */

const MT = {
  PROP_TEMPLATE: 'MT_TEMPLATE_ID',
  PROP_OUTPUT: 'MT_OUTPUT_FOLDER',
  PROP_MEDIA: 'MT_MEDIA_FOLDER',
  MAX_SLIDES: 40,
  PROP_PRESETS: 'MT_SLIDE_PRESETS_V2',
  MAX_IMAGE_BYTES: 8 * 1024 * 1024
};


// ========================================
// Webアプリ
// ========================================



function doGet() {
  const t = HtmlService.createTemplateFromFile('Index');
  const props = PropertiesService.getUserProperties();

  const workspaceId = props.getProperty(MT33.WORKSPACE_ROOT) || '';
  const projectRootId = props.getProperty(MT33.PROJECT_ROOT) || '';
  const styleRootId = props.getProperty(MT41.STYLE_ROOT) || '';

  t.initialWorkspaceHtml = mt516FastWorkspaceHtml_(workspaceId, projectRootId, styleRootId);
  t.initialStyleHtml = '<div class="treeItem"><span class="name">スタイルを読み込み中…</span></div>';
  t.initialProjectHtml = '<div class="treeItem"><span class="name">プロジェクトを読み込み中…</span></div>';
  t.initialProjectOptions = '<option value="">読み込み中…</option>';
  t.initialStyleOptions = '<option value="">読み込み中…</option>';

  return t.evaluate()
    .setTitle('MediToku Slide Studio')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function mt516FastWorkspaceHtml_(workspaceId, projectRootId, styleRootId) {
  const rows = [];

  if (workspaceId) {
    rows.push(
      '<a class="treeItem" href="https://drive.google.com/drive/folders/' + mt515Esc_(workspaceId) + '" target="_blank">' +
      '<span>▾</span><span class="name">MediToku Slide Studio</span><span class="ext">↗</span></a>'
    );
  } else {
    rows.push('<div class="treeItem"><span class="name">Driveを準備しています…</span></div>');
  }

  if (projectRootId) {
    rows.push(
      '<a class="treeItem treeIndent" href="https://drive.google.com/drive/folders/' + mt515Esc_(projectRootId) + '" target="_blank">' +
      '<span>▸</span><span class="name">01_プロジェクト</span><span class="ext">↗</span></a>'
    );
  } else {
    rows.push('<div class="treeItem treeIndent"><span>▸</span><span class="name">01_プロジェクト</span></div>');
  }

  // These are shown immediately as labels; the async bootstrap replaces them with links.
  rows.push('<div class="treeItem treeIndent"><span>▸</span><span class="name">02_共通テンプレート</span></div>');
  rows.push('<div class="treeItem treeIndent"><span>▸</span><span class="name">03_共通素材</span></div>');
  rows.push('<div class="treeItem treeIndent"><span>▸</span><span class="name">04_お手本スライド</span></div>');

  if (styleRootId) {
    rows.push(
      '<a class="treeItem treeIndent" href="https://drive.google.com/drive/folders/' + mt515Esc_(styleRootId) + '" target="_blank">' +
      '<span>▸</span><span class="name">05_スタイル</span><span class="ext">↗</span></a>'
    );
  } else {
    rows.push('<div class="treeItem treeIndent"><span>▸</span><span class="name">05_スタイル</span></div>');
  }

  return rows.join('');
}


function mt515Esc_(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function mt515WorkspaceHtml_(nav) {
  if (!nav || !nav.workspace) {
    return '<div class="treeItem"><span class="name">Drive情報を取得できません</span></div>';
  }

  const rows = [];
  const add = (name, f, indent) => {
    if (!f || !f.url) return;
    rows.push(
      '<a class="treeItem' + (indent ? ' treeIndent' : '') + '" href="' +
      mt515Esc_(f.url) + '" target="_blank">' +
      '<span>' + (indent ? '▸' : '▾') + '</span>' +
      '<span class="name">' + mt515Esc_(name) + '</span>' +
      '<span class="ext">↗</span></a>'
    );
  };

  add(nav.workspace.name || 'MediToku Slide Studio', nav.workspace, false);
  add('01_プロジェクト', nav.projectRoot, true);
  add('02_共通テンプレート', nav.templateRoot, true);
  add('03_共通素材', nav.assetRoot, true);
  add('04_お手本スライド', nav.referenceRoot, true);
  add('05_スタイル', nav.styleRoot, true);

  return rows.join('');
}

function mt515StyleHtml_(styles, activeStyle) {
  if (!styles || !styles.length) {
    return '<div class="treeItem"><span class="name">スタイル未作成</span></div>';
  }

  return styles.map(s => {
    const icon = s.kind === 'company' ? '◆' : (s.kind === 'usecase' ? '▹' : '●');
    const active = activeStyle && activeStyle.id === s.id ? ' active' : '';
    return '<div class="treeItem' + active + '" data-style="' + mt515Esc_(s.id) + '">' +
      '<span>' + icon + '</span>' +
      '<span class="name">' + mt515Esc_(s.name) + '</span>' +
      (s.url ? '<a class="ext" href="' + mt515Esc_(s.url) + '" target="_blank">↗</a>' : '') +
      '</div>';
  }).join('');
}

function mt515ProjectHtml_(projects, activeProject) {
  if (!projects || !projects.length) {
    return '<div class="treeItem"><span class="name">まだありません</span></div>';
  }

  return projects.slice(0, 14).map(p => {
    const active = activeProject && activeProject.id === p.id ? ' active' : '';
    return '<div class="treeItem' + active + '" data-project="' + mt515Esc_(p.id) + '">' +
      '<span>▸</span>' +
      '<span class="name">' + mt515Esc_(p.name) + '</span>' +
      (p.url ? '<a class="ext" href="' + mt515Esc_(p.url) + '" target="_blank">↗</a>' : '') +
      '</div>';
  }).join('');
}

function mt515ProjectOptions_(projects, activeProject) {
  let out = '<option value="">選択してください</option>';
  (projects || []).forEach(p => {
    const selected = activeProject && activeProject.id === p.id ? ' selected' : '';
    out += '<option value="' + mt515Esc_(p.id) + '"' + selected + '>' + mt515Esc_(p.name) + '</option>';
  });
  return out;
}

function mt515StyleOptions_(styles, activeStyle) {
  let out = '<option value="">スタイルを選択</option>';
  (styles || []).forEach(s => {
    const selected = activeStyle && activeStyle.id === s.id ? ' selected' : '';
    out += '<option value="' + mt515Esc_(s.id) + '"' + selected + '>' + mt515Esc_(s.name) + '</option>';
  });
  return out;
}


// ========================================
// 初期設定の取得
// ========================================

function getAppConfig() {

  const p = PropertiesService.getUserProperties();

  return {
    templateId:
      p.getProperty(MT.PROP_TEMPLATE) || '',

    outputFolder:
      p.getProperty(MT.PROP_OUTPUT) || '',

    mediaFolder:
      p.getProperty(MT.PROP_MEDIA) || '',

    email:
      Session.getActiveUser().getEmail() || ''
  };
}


// ========================================
// 初期設定の保存
// ========================================

function saveAppConfig(config) {

  config = config || {};

  const p = PropertiesService.getUserProperties();

  // テンプレート
  const t = parseDriveId_(config.templateId);

  if (!t) {
    throw new Error(
      'テンプレートのURLまたはIDを入力してください。'
    );
  }

  const templateFile = DriveApp.getFileById(t);

  if (
    templateFile.getMimeType() !==
    'application/vnd.google-apps.presentation'
  ) {
    throw new Error(
      'Google Slides形式のテンプレートを指定してください。'
    );
  }

  // 出力先フォルダ
  const outputInput =
    String(config.outputFolder || '').trim();

  const o = parseDriveId_(outputInput);

  if (outputInput && !o) {
    throw new Error(
      '出力先フォルダのURLまたはIDが不正です。'
    );
  }

  // 切り抜き画像保存フォルダ
  const mediaInput =
    String(config.mediaFolder || '').trim();

  const m = parseDriveId_(mediaInput);

  if (mediaInput && !m) {
    throw new Error(
      '画像保存フォルダのURLまたはIDが不正です。'
    );
  }

  // フォルダが存在し、アクセスできることを確認
  if (o) {
    try {
      DriveApp.getFolderById(o).getName();
    } catch (e) {
      throw new Error(
        '出力先フォルダにアクセスできません。' +
        'Google DriveのURLとアクセス権限を確認してください。'
      );
    }
  }

  if (m) {
    try {
      DriveApp.getFolderById(m).getName();
    } catch (e) {
      throw new Error(
        '画像保存フォルダにアクセスできません。' +
        'Google DriveのURLとアクセス権限を確認してください。'
      );
    }
  }

  // 確認が成功した場合のみ保存
  p.setProperties({
    [MT.PROP_TEMPLATE]: t,
    [MT.PROP_OUTPUT]: o,
    [MT.PROP_MEDIA]: m
  });

  return getAppConfig();
}


// ========================================
// Google Drive URL / ID 解析
// ========================================

function parseDriveId_(value) {

  const input = String(value || '').trim();

  if (!input) return '';

  let match;

  // Google DriveフォルダURL
  // https://drive.google.com/drive/u/0/folders/XXXX
  match = input.match(
    /\/folders\/([a-zA-Z0-9_-]+)/
  );

  if (match) return match[1];

  // Google Slides / Docsなど
  match = input.match(
    /\/d\/([a-zA-Z0-9_-]+)/
  );

  if (match) return match[1];

  // id=形式
  match = input.match(
    /[?&]id=([a-zA-Z0-9_-]+)/
  );

  if (match) return match[1];

  // IDのみ
  if (/^[a-zA-Z0-9_-]{15,}$/.test(input)) {
    return input;
  }

  return '';
}


// ========================================
// プリセット管理
// ========================================

function getSlidePresets() {

  const raw = PropertiesService
    .getUserProperties()
    .getProperty(MT.PROP_PRESETS);

  return raw ? JSON.parse(raw) : {};
}


function saveSlidePreset(name, options) {

  name = String(name || '')
    .trim()
    .slice(0, 60);

  if (!name) {
    throw new Error(
      'プリセット名を入力してください。'
    );
  }

  const clean = validateOptions_(options);

  const all = getSlidePresets();

  if (
    Object.keys(all).length >= 20 &&
    !Object.prototype.hasOwnProperty.call(all, name)
  ) {
    throw new Error(
      'プリセットは最大20件です。'
    );
  }

  all[name] = clean;

  PropertiesService
    .getUserProperties()
    .setProperty(
      MT.PROP_PRESETS,
      JSON.stringify(all)
    );

  return all;
}


function deleteSlidePreset(name) {

  const all = getSlidePresets();

  delete all[String(name || '')];

  PropertiesService
    .getUserProperties()
    .setProperty(
      MT.PROP_PRESETS,
      JSON.stringify(all)
    );

  return all;
}


// ========================================
// スライド作成条件の検証
// ========================================

function validateOptions_(x) {

  x = x || {};

  const n = Number(x.slideCount);

  if (
    !Number.isInteger(n) ||
    n < 1 ||
    n > MT.MAX_SLIDES
  ) {
    throw new Error(
      '枚数は1〜40の整数で指定してください。'
    );
  }

  const allowed = (v, list, field) => {

    v = String(v || '');

    if (!list.includes(v)) {
      throw new Error(
        field + 'が不正です。'
      );
    }

    return v;
  };

  return {

    slideCount: n,

    purpose: allowed(
      x.purpose,
      [
        'sales',
        'report',
        'product',
        'internal',
        'training',
        'custom'
      ],
      '用途'
    ),

    audience:
      String(x.audience || '').slice(0, 160),

    density: allowed(
      x.density,
      ['minimal', 'standard', 'detailed'],
      '文章量'
    ),

    tone: allowed(
      x.tone,
      ['factual', 'formal', 'friendly'],
      '文体'
    ),

    evidence: allowed(
      x.evidence,
      ['strict', 'standard'],
      '根拠'
    ),

    visuals: allowed(
      x.visuals,
      [
        'source_only',
        'source_preferred',
        'text_only'
      ],
      '画像方針'
    ),

    includeCover: !!x.includeCover,

    includeClosing: !!x.includeClosing,

    mustInclude:
      String(x.mustInclude || '').slice(0, 2000),

    mustExclude:
      String(x.mustExclude || '').slice(0, 2000),

    extra:
      String(x.extra || '').slice(0, 3000)
  };
}


// ========================================
// サンプルテンプレート作成
// ========================================

function makeStarterTemplate() {

  const p = SlidesApp.create(
    'MediToku Slide Studio テンプレート（原本）'
  );

  const first = p.getSlides()[0];

  const specs = [

    [
      'cover',
      '{{TITLE}}',
      '{{SUBTITLE}}'
    ],

    [
      'statement',
      '{{TITLE}}',
      '{{MESSAGE}}'
    ],

    [
      'evidence',
      '{{TITLE}}',
      '{{BODY}}',
      '{{IMAGE_1}}'
    ],

    [
      'two_column',
      '{{TITLE}}',
      '{{LEFT}}',
      '{{RIGHT}}'
    ],

    [
      'closing',
      '{{TITLE}}',
      '{{MESSAGE}}'
    ]

  ];

  const w = p.getPageWidth();
  const h = p.getPageHeight();

  specs.forEach((s, i) => {

    const slide = p.appendSlide(
      SlidesApp.PredefinedLayout.BLANK
    );

    slide.getBackground().setSolidFill('#FFFFFF');

    const tag = slide.insertTextBox(
      '[[LAYOUT:' + s[0] + ']]',
      8, 8, 125, 13
    );

    tag.getText()
      .getTextStyle()
      .setFontSize(5)
      .setForegroundColor('#999999');

    const bar = slide.insertShape(
      SlidesApp.ShapeType.RECTANGLE,
      0,
      h - 6,
      w,
      6
    );

    bar.getFill().setSolidFill('#176B86');
    bar.getBorder().setTransparent();

    const brand = slide.insertTextBox(
      'MediToku',
      w - 110,
      18,
      100,
      20
    );

    brand.getText()
      .getTextStyle()
      .setFontFamily('Arial')
      .setFontSize(13)
      .setBold(true)
      .setForegroundColor('#176B86');

    const title = slide.insertTextBox(
      s[1],
      36,
      i === 0 ? 150 : 50,
      w - 72,
      80
    );

    title.getText()
      .getTextStyle()
      .setFontFamily('Noto Sans JP')
      .setFontSize(i === 0 ? 32 : 25)
      .setBold(true)
      .setForegroundColor('#183449');

    if (s[0] === 'evidence') {

      addBox_(
        slide,
        s[2],
        36,
        145,
        w * 0.37,
        240,
        15
      );

      addBox_(
        slide,
        s[3],
        w * 0.44,
        145,
        w * 0.49,
        240,
        12
      );

    } else if (s[0] === 'two_column') {

      addBox_(
        slide,
        s[2],
        36,
        145,
        w * 0.42,
        245,
        17
      );

      addBox_(
        slide,
        s[3],
        w * 0.52,
        145,
        w * 0.42,
        245,
        17
      );

    } else {

      addBox_(
        slide,
        s[2],
        36,
        i === 0 ? 258 : 155,
        w - 72,
        195,
        i === 0 ? 18 : 21
      );
    }

    if (i !== 0) {

      const foot = slide.insertTextBox(
        '{{SOURCE}}',
        36,
        h - 30,
        w - 72,
        17
      );

      foot.getText()
        .getTextStyle()
        .setFontSize(9)
        .setForegroundColor('#64748B');
    }

  });

  first.remove();

  PropertiesService
    .getUserProperties()
    .setProperty(
      MT.PROP_TEMPLATE,
      p.getId()
    );

  return {
    url: p.getUrl(),
    id: p.getId()
  };
}


// ========================================
// テキストボックス
// ========================================

function addBox_(
  slide,
  text,
  x,
  y,
  w,
  h,
  font
) {

  const sh = slide.insertTextBox(
    text,
    x,
    y,
    w,
    h
  );

  sh.getText()
    .getTextStyle()
    .setFontFamily('Noto Sans JP')
    .setFontSize(font)
    .setForegroundColor('#243B53');

  return sh;
}


// ========================================
// スライドJSONの検証
// ========================================

function validateDeck_(deck) {

  if (
    !deck ||
    typeof deck !== 'object' ||
    Array.isArray(deck)
  ) {
    throw new Error(
      'JSONオブジェクトを入力してください。'
    );
  }

  if (
    !Array.isArray(deck.slides) ||
    !deck.slides.length ||
    deck.slides.length > MT.MAX_SLIDES
  ) {
    throw new Error(
      'slidesは1〜40枚の配列にしてください。'
    );
  }

  const allowed = [
    'cover',
    'statement',
    'evidence',
    'two_column',
    'closing'
  ];

  deck.slides.forEach((s, i) => {

    if (
      !s ||
      !allowed.includes(s.layout)
    ) {
      throw new Error(
        (i + 1) + '枚目: 不明なlayout'
      );
    }

    if (!String(s.title || '').trim()) {
      throw new Error(
        (i + 1) + '枚目: titleが空です'
      );
    }

  });

  return deck;
}



// ========================================
// 長時間処理の進捗表示
// ========================================

function mt33ProgressKey_(jobId) {
  return 'MT33_PROGRESS_' + String(jobId || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 80);
}

function mt33SetProgress_(jobId, percent, message, state) {
  if (!jobId) return;
  const payload = {
    percent: Math.max(0, Math.min(100, Number(percent) || 0)),
    message: String(message || ''),
    state: String(state || 'running'),
    updatedAt: Date.now()
  };
  CacheService.getUserCache().put(
    mt33ProgressKey_(jobId),
    JSON.stringify(payload),
    600
  );
}

function mt33GetProgress(jobId) {
  if (!jobId) return null;
  const raw = CacheService.getUserCache().get(mt33ProgressKey_(jobId));
  return raw ? JSON.parse(raw) : null;
}

// ========================================
// Google Slides生成
// ========================================

function createDeck(payload) {

  payload = payload || {};
  const jobId = String(payload.jobId || '');

  try {
    mt33SetProgress_(jobId, 3, '構成データを確認しています…', 'running');

    const deck = validateDeck_(payload.deck);

    if (payload.options) {

      const opt = validateOptions_(payload.options);

      if (deck.slides.length !== opt.slideCount) {
        throw new Error(
          '指定枚数とJSONの枚数が一致しません。'
        );
      }

      if (
        opt.includeCover &&
        deck.slides[0].layout !== 'cover'
      ) {
        throw new Error(
          '表紙を含む設定です。1枚目をcoverにしてください。'
        );
      }

      if (
        opt.includeClosing &&
        deck.slides[deck.slides.length - 1].layout
          !== 'closing'
      ) {
        throw new Error(
          '締めを含む設定です。最終ページをclosingにしてください。'
        );
      }
    }

    mt33SetProgress_(jobId, 10, 'ひな形と保存先を確認しています…', 'running');

    const cfg = getAppConfig();
    const style = payload.styleId ? mt41GetEffectiveStyle_(payload.styleId) : null;
    const templateId = style && style.templateId ? style.templateId : cfg.templateId;

    if (!templateId) {
      throw new Error(
        '先にテンプレートを設定してください。'
      );
    }

    const src = DriveApp.getFileById(
      templateId
    );

    const title =
      String(deck.title || '資料').slice(0, 100)
      + ' - '
      + Utilities.formatDate(
          new Date(),
          Session.getScriptTimeZone(),
          'yyyyMMdd-HHmm'
        );

    const activeProject = mt33GetActiveProjectSafe_();
    const destinationFolderId = activeProject
      ? activeProject.slides
      : cfg.outputFolder;

    mt33SetProgress_(jobId, 18, 'ひな形をコピーしています…', 'running');

    const copy = destinationFolderId
      ? src.makeCopy(
          title,
          DriveApp.getFolderById(destinationFolderId)
        )
      : src.makeCopy(title);

    try {

      mt33SetProgress_(jobId, 27, 'Google Slidesを準備しています…', 'running');

      const p = SlidesApp.openById(
        copy.getId()
      );

      const seeds = {};

      p.getSlides().forEach(sl => {

        const txt = sl.getPageElements()
          .filter(
            e =>
              e.getPageElementType() ===
              SlidesApp.PageElementType.SHAPE
          )
          .map(
            e => e.asShape().getText().asString()
          )
          .join('\n');

        const m = txt.match(
          /\[\[LAYOUT:([a-z_]+)\]\]/
        );

        if (m) {
          seeds[m[1]] = sl;
        }

      });

      deck.slides.forEach((item, i) => {

        const pct = 30 + Math.round(((i + 1) / deck.slides.length) * 48);
        mt33SetProgress_(
          jobId,
          pct,
          (i + 1) + ' / ' + deck.slides.length + ' 枚目を作成しています…',
          'running'
        );

        if (!seeds[item.layout]) {

          throw new Error(
            'テンプレート内に [[LAYOUT:'
            + item.layout
            + ']] がありません。'
          );
        }

        const sl = seeds[item.layout].duplicate();

        sl.move(i);

        removeLayoutMarker_(sl);

        const values = {

          TITLE: item.title,

          SUBTITLE: item.subtitle || '',

          MESSAGE: item.message || '',

          BODY: item.body || '',

          LEFT: item.left || '',

          RIGHT: item.right || '',

          SOURCE: formatSource_(item)

        };

        Object.keys(values).forEach(k => {

          sl.replaceAllText(
            '{{' + k + '}}',
            String(values[k]).slice(0, 2400)
          );

        });

        insertImages_(
          sl,
          item.images || {}
        );

        clearResidualTags_(sl);

        if (item.source) {

          try {

            sl.getNotesPage()
              .getSpeakerNotesShape()
              .getText()
              .setText(
                '出典: ' + formatSource_(item)
              );

          } catch (e) {}

        }

      });

      mt33SetProgress_(jobId, 82, '不要なテンプレートページを整理しています…', 'running');

      Object.keys(seeds).forEach(k => {
        seeds[k].remove();
      });

      p.saveAndClose();

      mt33SetProgress_(jobId, 90, 'Google Slidesを保存しています…', 'running');

      const baseline = mt3SaveBaseline_(
        SlidesApp.openById(copy.getId())
      );

      mt33SetProgress_(jobId, 100, '完成しました。', 'done');

      return {

        id: copy.getId(),

        url:
          'https://docs.google.com/presentation/d/'
          + copy.getId()
          + '/edit',

        count: deck.slides.length,

        baselineFileId: baseline.fileId

      };

    } catch (e) {

      copy.setTrashed(true);
      throw e;

    }

  } catch (e) {
    mt33SetProgress_(jobId, 100, String(e && e.message ? e.message : e), 'error');
    throw e;
  }
}

// ========================================
// レイアウトマーカー削除
// ========================================

function removeLayoutMarker_(slide) {

  slide.getPageElements().forEach(e => {

    if (
      e.getPageElementType() ===
      SlidesApp.PageElementType.SHAPE
    ) {

      const text = e.asShape()
        .getText()
        .asString()
        .trim();

      if (/^\[\[LAYOUT:/.test(text)) {
        e.remove();
      }

    }

  });
}


// ========================================
// 出典の整形
// ========================================

function formatSource_(s) {

  const src = s.source || {};

  return [

    src.file || '',

    src.page ? 'p.' + src.page : '',

    src.note || ''

  ]
    .filter(Boolean)
    .join(' / ')
    .slice(0, 260);
}


// ========================================
// 画像の挿入
// ========================================

function insertImages_(slide, images) {

  Object.keys(images).forEach(key => {

    if (!/^IMAGE_[1-3]$/.test(key)) {
      return;
    }

    const id = parseDriveId_(
      images[key]
    );

    if (!id) {
      throw new Error(
        key + ' のDrive画像IDが不正です。'
      );
    }

    const f = DriveApp.getFileById(id);

    if (
      !/^image\/(png|jpeg|gif)$/.test(
        f.getMimeType()
      )
    ) {
      throw new Error(
        '画像はPNG/JPEG/GIFを指定してください。'
      );
    }

    const boxes = slide.getPageElements()
      .filter(e => {

        return (
          e.getPageElementType() ===
          SlidesApp.PageElementType.SHAPE
        ) &&
        e.asShape()
          .getText()
          .asString()
          .includes('{{' + key + '}}');

      });

    boxes.forEach(box => {

      const rect = {

        left: box.getLeft(),

        top: box.getTop(),

        width: box.getWidth(),

        height: box.getHeight()

      };

      box.remove();

      slide.insertImage(
        f.getBlob(),
        rect.left,
        rect.top,
        rect.width,
        rect.height
      );

    });

  });
}


// ========================================
// 未使用プレースホルダ削除
// ========================================

function clearResidualTags_(slide) {

  slide.getPageElements().forEach(e => {

    if (
      e.getPageElementType() ===
      SlidesApp.PageElementType.SHAPE
    ) {

      const t = e.asShape().getText();

      const current = t.asString();

      if (
        current.match(
          /\{\{[A-Z_0-9]+\}\}/g
        )
      ) {

        t.setText(
          current.replace(
            /\{\{[A-Z_0-9]+\}\}/g,
            ''
          )
        );

      }

    }

  });
}


// ========================================
// PDF切り抜き画像の保存
// ========================================

function uploadCrop(dataUrl, name) {

  const m = String(dataUrl || '').match(
    /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/=]+)$/
  );

  if (!m) {
    throw new Error(
      'PNG/JPEG画像のみアップロード可能です。'
    );
  }

  const bytes = Utilities.base64Decode(
    m[2]
  );

  if (bytes.length > MT.MAX_IMAGE_BYTES) {
    throw new Error(
      '画像サイズは8MB以下にしてください。'
    );
  }

  const blob = Utilities.newBlob(

    bytes,

    'image/' + m[1],

    String(name || 'crop')
      .replace(
        /[^\w.\-ぁ-んァ-ヶ一-龥]/g,
        '_'
      )
      .slice(0, 80)

    + '.'
    + (
        m[1] === 'jpeg'
        ? 'jpg'
        : 'png'
      )

  );

  const cfg = getAppConfig();
  const activeProject = mt33GetActiveProjectSafe_();
  const destinationFolderId = activeProject
    ? activeProject.images
    : cfg.mediaFolder;

  let f;

  if (destinationFolderId) {
    f = DriveApp
      .getFolderById(destinationFolderId)
      .createFile(blob);
  } else {
    f = DriveApp.createFile(blob);
  }

  return {

    id: f.getId(),

    name: f.getName(),

    url: f.getUrl()

  };

}
/**
 * MediToku Slide Studio v3 — first-party design profile and review workflow.
 * Does not call an AI endpoint and contains no third-party slide-generator code.
 * Profiles live in the signed-in user's UserProperties or explicitly selected Drive JSON.
 */
const MT3 = {
  PROFILE: 'MT_DESIGN_PROFILE_V3', BASELINES: 'MT_BASELINE_INDEX_V3',
  MAX_REFERENCES: 5, MAX_BASELINES: 20, PROFILE_VERSION: 1,
  PPTX_MIME: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
};
function mt3SafeText_(x, max) { return String(x == null ? '' : x).slice(0, max || 500); }
function mt3Color_(color) {
  try { return color.asRgbColor().asHexString().toUpperCase(); } catch (e) { return ''; }
}
function mt3Counter_(arr) {
  const map = {};
  arr.filter(Boolean).forEach(v => map[v] = (map[v] || 0) + 1);
  return Object.keys(map).sort((a,b) => map[b] - map[a])[0] || '';
}
function mt3GetShapeText_(element) {
  try { return element.getPageElementType() === SlidesApp.PageElementType.SHAPE ? element.asShape().getText().asString() : ''; }
  catch (e) { return ''; }
}
function mt3Snapshot_(presentation) {
  const slides = presentation.getSlides().map(slide => {
    const elements = slide.getPageElements().map(element => {
      const item = {kind:String(element.getPageElementType()),x:Math.round(element.getLeft()),y:Math.round(element.getTop()),w:Math.round(element.getWidth()),h:Math.round(element.getHeight())};
      const txt = mt3GetShapeText_(element);
      if (txt) {
        item.text = mt3SafeText_(txt, 3000);
        try { const st = element.asShape().getText().getTextStyle(); item.font=st.getFontFamily()||''; item.size=st.getFontSize()||0; item.color=mt3Color_(st.getForegroundColor()); } catch(e) {}
      }
      return item;
    });
    return {id:slide.getObjectId(),elements:elements};
  });
  return {version:1,deckId:presentation.getId(),capturedAt:new Date().toISOString(),pageWidth:presentation.getPageWidth(),pageHeight:presentation.getPageHeight(),slides:slides};
}
function mt3ProfileFromSnapshots_(snapshots) {
  const fonts=[],colors=[],sizes=[],titles=[],bodyLengths=[];
  snapshots.forEach(snap => (snap.slides||[]).forEach(sl => {
    const texts=sl.elements.filter(x=>x.text && !/^\[\[LAYOUT:/.test(x.text) && !/^MediToku$/.test(x.text));
    texts.forEach(x=>{if(x.font)fonts.push(x.font);if(x.color)colors.push(x.color);if(x.size)sizes.push(x.size)});
    const ordered=texts.slice().sort((a,b)=>a.y-b.y || a.x-b.x);
    if(ordered.length)titles.push(ordered[0].text.trim().length);
    ordered.slice(1).forEach(x=>bodyLengths.push(x.text.trim().length));
  }));
  const median=a=>a.length?a.slice().sort((x,y)=>x-y)[Math.floor(a.length/2)]:0;
  return {version:MT3.PROFILE_VERSION,kind:'personal',name:'My Design DNA',font:mt3Counter_(fonts),textColor:mt3Counter_(colors),typicalFontSize:median(sizes),medianTitleLength:median(titles),medianBodyLength:median(bodyLengths),preferredTemplateId:'',rules:[],sourceDecks:snapshots.map(x=>x.deckId).slice(0,MT3.MAX_REFERENCES),updatedAt:new Date().toISOString()};
}
function getDesignProfile() {
  const v=PropertiesService.getUserProperties().getProperty(MT3.PROFILE);
  return v?JSON.parse(v):{version:1,kind:'personal',name:'My Design DNA',font:'',textColor:'',typicalFontSize:0,medianTitleLength:0,medianBodyLength:0,preferredTemplateId:'',rules:[],sourceDecks:[]};
}
function learnFromReferenceDecks(urls) {
  if(!Array.isArray(urls) || !urls.length || urls.length>MT3.MAX_REFERENCES)throw Error('参考スライドは1〜5件指定してください。');
  const ids=Array.from(new Set(urls.map(parseDriveId_)));
  if(ids.some(x=>!x))throw Error('Google SlidesのURLまたはIDを指定してください。');
  const snaps=ids.map(id=>mt3Snapshot_(SlidesApp.openById(id)));
  const prior=getDesignProfile(), p=mt3ProfileFromSnapshots_(snaps);
  p.rules=(prior.rules||[]).slice(0,15);p.preferredTemplateId=prior.preferredTemplateId||'';
  PropertiesService.getUserProperties().setProperty(MT3.PROFILE,JSON.stringify(p));
  return p;
}
function setProfileRule(rule) {
  const p=getDesignProfile(); const s=mt3SafeText_(rule,180).trim();if(!s)throw Error('ルールを入力してください。');
  if((p.rules||[]).length>=15)throw Error('ルールは最大15件です。');
  p.rules=(p.rules||[]).concat(s);p.updatedAt=new Date().toISOString();
  PropertiesService.getUserProperties().setProperty(MT3.PROFILE,JSON.stringify(p));return p;
}
function removeProfileRule(index) {
  const p=getDesignProfile(),i=Number(index);if(!Number.isInteger(i)||i<0||i>=p.rules.length)throw Error('ルールがありません。');
  p.rules.splice(i,1);p.updatedAt=new Date().toISOString();
  PropertiesService.getUserProperties().setProperty(MT3.PROFILE,JSON.stringify(p));return p;
}
function mt3BaselineIndex_() {
  const s=PropertiesService.getUserProperties().getProperty(MT3.BASELINES);
  return s?JSON.parse(s):{};
}
function mt3SaveBaseline_(presentation) {
  const snapshot=mt3Snapshot_(presentation);
  const folderId=mt33SystemFolder_().getId();
  const filename='MediToku_baseline_'+presentation.getId()+'.json';
  const blob=Utilities.newBlob(JSON.stringify(snapshot),'application/json',filename);
  const file=folderId?DriveApp.getFolderById(folderId).createFile(blob):DriveApp.createFile(blob);
  const idx=mt3BaselineIndex_();idx[presentation.getId()]={fileId:file.getId(),capturedAt:snapshot.capturedAt};
  const keys=Object.keys(idx).sort((a,b)=>idx[b].capturedAt.localeCompare(idx[a].capturedAt));
  keys.slice(MT3.MAX_BASELINES).forEach(k=>delete idx[k]);
  PropertiesService.getUserProperties().setProperty(MT3.BASELINES,JSON.stringify(idx));
  return {fileId:file.getId()};
}
function previewEditedDeckLearning(presentationUrl) {
  const id=parseDriveId_(presentationUrl),idx=mt3BaselineIndex_();
  if(!id||!idx[id])throw Error('このユーザーのStudio生成資料が見つかりません。生成後のGoogle Slides URLを指定してください。');
  const baseline=JSON.parse(DriveApp.getFileById(idx[id].fileId).getBlob().getDataAsString('UTF-8'));
  const current=mt3Snapshot_(SlidesApp.openById(id));
  const firstTitle=sl=>(sl.elements.filter(x=>x.text && x.text.trim() && x.text.trim()!=='MediToku' && !/^\[\[LAYOUT:/.test(x.text)).sort((a,b)=>a.y-b.y || a.x-b.x)[0]||{}).text||'';
  const changes=[];
  baseline.slides.forEach((old,i)=>{
    const now=current.slides[i];if(!now){changes.push({slide:i+1,type:'removed',before:firstTitle(old),after:''});return;}
    const before=firstTitle(old),after=firstTitle(now);
    if(before!==after)changes.push({slide:i+1,type:'title',before:mt3SafeText_(before,160),after:mt3SafeText_(after,160)});
    const oldText=old.elements.map(x=>x.text||'').join('\n'),newText=now.elements.map(x=>x.text||'').join('\n');
    if(oldText!==newText && before===after)changes.push({slide:i+1,type:'body',before:'本文が変更されました',after:'本文の編集を検出'});
    const sig=es=>es.map(x=>[x.x,x.y,x.w,x.h,x.font||'',x.size||0,x.color||''].join(':')).join('|');
    if(sig(old.elements)!==sig(now.elements))changes.push({slide:i+1,type:'layout',before:'元の配置',after:'配置・書式の変更を検出'});
  });
  if(current.slides.length>baseline.slides.length)changes.push({slide:0,type:'added',before:'',after:(current.slides.length-baseline.slides.length)+'枚追加'});
  const candidate=mt3ProfileFromSnapshots_([current]);
  return {deckId:id,changes:changes.slice(0,100),candidate:candidate,notice:'変更内容はまだ学習されません。「反映する」を押すと、統計的なデザイン設定のみ更新されます。本文や機密情報をプロフィールに保存しません。'};
}
function approveEditedDeckLearning(presentationUrl) {
  const preview=previewEditedDeckLearning(presentationUrl),prev=getDesignProfile(),next=preview.candidate;
  next.rules=(prev.rules||[]).slice(0,15);next.preferredTemplateId=prev.preferredTemplateId||'';
  next.sourceDecks=Array.from(new Set((prev.sourceDecks||[]).concat(preview.deckId))).slice(-MT3.MAX_REFERENCES);
  PropertiesService.getUserProperties().setProperty(MT3.PROFILE,JSON.stringify(next));
  return {profile:next,changeCount:preview.changes.length};
}
function exportDesignProfile() {
  const p=getDesignProfile(),name='MediToku_Design_DNA.json';
  const f=mt33SystemFolder_().createFile(Utilities.newBlob(JSON.stringify(p,null,2),'application/json',name));
  return {url:f.getUrl(),id:f.getId()};
}
function importDesignProfile(url) {
  const id=parseDriveId_(url);if(!id)throw Error('プロフィールJSONのDriveファイルURLを入力してください。');
  const file=DriveApp.getFileById(id);if(file.getSize()>100000)throw Error('プロフィールファイルが大きすぎます。');
  const p=JSON.parse(file.getBlob().getDataAsString('UTF-8'));
  if(!p||p.version!==1||typeof p.name!=='string'||!Array.isArray(p.rules))throw Error('プロフィール形式が不正です。');
  const clean={version:1,kind:'imported',name:mt3SafeText_(p.name,60),font:mt3SafeText_(p.font,60),textColor:/^#[0-9A-Fa-f]{6}$/.test(p.textColor||'')?p.textColor:'',typicalFontSize:Number(p.typicalFontSize)||0,medianTitleLength:Number(p.medianTitleLength)||0,medianBodyLength:Number(p.medianBodyLength)||0,preferredTemplateId:'',rules:p.rules.slice(0,15).map(x=>mt3SafeText_(x,180)),sourceDecks:[],updatedAt:new Date().toISOString()};
  PropertiesService.getUserProperties().setProperty(MT3.PROFILE,JSON.stringify(clean));return clean;
}
function exportPptx(presentationUrl) {
  const id=parseDriveId_(presentationUrl);if(!id)throw Error('Google Slides URLを入力してください。');
  const source=DriveApp.getFileById(id);
  if(source.getMimeType()!=='application/vnd.google-apps.presentation')throw Error('Google Slides形式のみ出力できます。');
  const endpoint='https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(id)+'/export?mimeType='+encodeURIComponent(MT3.PPTX_MIME);
  const response=UrlFetchApp.fetch(endpoint,{headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken()},muteHttpExceptions:true});
  if(response.getResponseCode()!==200)throw Error('PowerPoint変換エラー HTTP '+response.getResponseCode()+' : '+response.getContentText().slice(0,250));
  const blob=response.getBlob().setName(source.getName().replace(/[\\/:*?"<>|]/g,'_')+'.pptx');
  const parents=source.getParents();const folder=parents.hasNext()?parents.next():null;const f=folder?folder.createFile(blob):DriveApp.createFile(blob);
  return {id:f.getId(),name:f.getName(),url:f.getUrl(),size:f.getSize()};
}
/**
 * MediToku Slide Studio v3.3
 * Project / reference / preference management.
 */
const MT33 = {
  WORKSPACE_ROOT: 'MTW_ROOT_V32',
  PROJECT_ROOT: 'MT33_PROJECT_ROOT',
  ACTIVE_PROJECT: 'MT33_ACTIVE_PROJECT',
  REFERENCES: 'MT33_REFERENCES_V1',
  PREFS: 'MT33_PREFS_V1',
  MAX_PROJECTS: 150,
  MAX_REFERENCES: 30,
  MAX_SOURCE_BYTES: 8 * 1024 * 1024
};

function mt33WorkspaceRoot_() {
  const props = PropertiesService.getUserProperties();
  const saved = props.getProperty(MT33.WORKSPACE_ROOT);

  if (saved) {
    try {
      const f = DriveApp.getFolderById(saved);
      f.getName();
      return f;
    } catch (e) {}
  }

  const matches = DriveApp.getRootFolder()
    .getFoldersByName('MediToku Slide Studio');

  const root = matches.hasNext()
    ? matches.next()
    : DriveApp.getRootFolder().createFolder('MediToku Slide Studio');

  props.setProperty(MT33.WORKSPACE_ROOT, root.getId());
  return root;
}

function mt33EnsureChild_(parent, name) {
  const matches = parent.getFoldersByName(name);
  return matches.hasNext() ? matches.next() : parent.createFolder(name);
}

function mt33ProjectRoot_() {
  const props = PropertiesService.getUserProperties();
  const saved = props.getProperty(MT33.PROJECT_ROOT);

  if (saved) {
    try {
      const f = DriveApp.getFolderById(saved);
      f.getName();
      return f;
    } catch (e) {}
  }

  const folder = mt33EnsureChild_(mt33WorkspaceRoot_(), '01_プロジェクト');
  props.setProperty(MT33.PROJECT_ROOT, folder.getId());
  return folder;
}

function mt33CommonTemplateRoot_() {
  return mt33EnsureChild_(mt33WorkspaceRoot_(), '02_共通テンプレート');
}

function mt33CommonAssetRoot_() {
  return mt33EnsureChild_(mt33WorkspaceRoot_(), '03_共通素材');
}

function mt33ReferenceRoot_() {
  return mt33EnsureChild_(mt33WorkspaceRoot_(), '04_お手本スライド');
}

function mt33SystemFolder_() {
  return mt33EnsureChild_(mt33WorkspaceRoot_(), '99_システムデータ');
}

function mt33ListTemplates() {
  const folder = mt33CommonTemplateRoot_();
  const it = folder.getFilesByType('application/vnd.google-apps.presentation');
  const out = [];

  while (it.hasNext() && out.length < 80) {
    const f = it.next();
    out.push({ id: f.getId(), name: f.getName(), url: f.getUrl() });
  }

  return out.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
}

function mt33SelectTemplate(id) {
  const clean = parseDriveId_(id);
  if (!clean) throw new Error('ひな形を選択してください。');

  const f = DriveApp.getFileById(clean);
  if (f.getMimeType() !== 'application/vnd.google-apps.presentation') {
    throw new Error('Google Slides形式のひな形を選択してください。');
  }

  const c = getAppConfig();
  saveAppConfig({
    templateId: clean,
    outputFolder: c.outputFolder,
    mediaFolder: c.mediaFolder
  });

  return { id: f.getId(), name: f.getName(), url: f.getUrl() };
}

function mt33ProjectFromFolder_(folder) {
  const child = name => {
    const it = folder.getFoldersByName(name);
    if (!it.hasNext()) {
      throw new Error('プロジェクト内に「' + name + '」がありません。');
    }
    return it.next();
  };

  const source = child('01_元資料');
  const slides = child('02_完成スライド');
  const images = child('03_画像・図表');

  return {
    id: folder.getId(),
    name: folder.getName(),
    url: folder.getUrl(),
    source: source.getId(),
    sourceName: source.getName(),
    sourceUrl: source.getUrl(),
    slides: slides.getId(),
    slidesName: slides.getName(),
    slidesUrl: slides.getUrl(),
    images: images.getId(),
    imagesName: images.getName(),
    imagesUrl: images.getUrl()
  };
}

function mt33GetProject_(id) {
  const clean = parseDriveId_(id);
  if (!clean) throw new Error('プロジェクトを選択してください。');

  const folder = DriveApp.getFolderById(clean);
  const root = mt33ProjectRoot_();
  const parents = folder.getParents();
  let ok = false;

  while (parents.hasNext()) {
    if (parents.next().getId() === root.getId()) ok = true;
  }

  if (!ok) {
    throw new Error('MediToku Slide Studioのプロジェクトを選択してください。');
  }

  return mt33ProjectFromFolder_(folder);
}

function mt33CreateProject(name) {
  const clean = String(name || '')
    .trim()
    .replace(/[\/\\\r\n\x00-\x1f]/g, '_')
    .slice(0, 70);

  if (!clean) throw new Error('プロジェクト名を入力してください。');

  const prefix = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    'yyyyMMdd_HHmm'
  );

  const folder = mt33ProjectRoot_().createFolder(prefix + '_' + clean);
  folder.createFolder('01_元資料');
  folder.createFolder('02_完成スライド');
  folder.createFolder('03_画像・図表');

  const project = mt33ProjectFromFolder_(folder);
  mt33SetActiveProject(project.id);
  return project;
}

function mt33ListProjects() {
  const it = mt33ProjectRoot_().getFolders();
  const out = [];

  while (it.hasNext() && out.length < MT33.MAX_PROJECTS) {
    try {
      out.push(mt33ProjectFromFolder_(it.next()));
    } catch (e) {}
  }

  return out.sort((a, b) => b.name.localeCompare(a.name, 'ja'));
}

function mt33SetActiveProject(id) {
  const props = PropertiesService.getUserProperties();

  if (!id) {
    props.deleteProperty(MT33.ACTIVE_PROJECT);
    return null;
  }

  const p = mt33GetProject_(id);
  props.setProperty(MT33.ACTIVE_PROJECT, p.id);
  return p;
}

function mt33GetActiveProjectSafe_() {
  const props = PropertiesService.getUserProperties();
  const id = props.getProperty(MT33.ACTIVE_PROJECT);
  if (!id) return null;

  try {
    return mt33GetProject_(id);
  } catch (e) {
    props.deleteProperty(MT33.ACTIVE_PROJECT);
    return null;
  }
}

function mt33GetActiveProject() {
  return mt33GetActiveProjectSafe_();
}

function mt33ListSources(projectId) {
  const p = mt33GetProject_(projectId);
  const it = DriveApp.getFolderById(p.source).getFiles();
  const out = [];

  while (it.hasNext() && out.length < 120) {
    const f = it.next();
    out.push({
      id: f.getId(),
      name: f.getName(),
      mime: f.getMimeType(),
      size: f.getSize(),
      url: f.getUrl()
    });
  }

  return out.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
}

function mt33UploadSource(projectId, name, mime, base64) {
  const p = mt33GetProject_(projectId);
  const cleanName = String(name || '')
    .replace(/[\/\\\r\n]/g, '_')
    .slice(0, 120);

  const allowed = [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/gif',
    'text/plain'
  ];

  if (!cleanName || !allowed.includes(String(mime || ''))) {
    throw new Error('PDF・PNG・JPEG・GIF・TXTに対応しています。');
  }

  const bytes = Utilities.base64Decode(base64);
  if (bytes.length > MT33.MAX_SOURCE_BYTES) {
    throw new Error('1ファイル8MBまでです。');
  }

  const blob = Utilities.newBlob(bytes, mime, cleanName);
  const f = DriveApp.getFolderById(p.source).createFile(blob);

  return { id: f.getId(), name: f.getName(), url: f.getUrl() };
}

function mt33CopySourceFromDrive(projectId, url) {
  const p = mt33GetProject_(projectId);
  const id = parseDriveId_(url);
  if (!id) throw new Error('Google DriveのファイルURLまたはIDを入力してください。');

  const source = DriveApp.getFileById(id);
  const copy = source.makeCopy(source.getName(), DriveApp.getFolderById(p.source));
  return { id: copy.getId(), name: copy.getName(), url: copy.getUrl() };
}

function mt33ReadPdf(projectId, fileId) {
  const p = mt33GetProject_(projectId);
  const f = DriveApp.getFileById(parseDriveId_(fileId));
  const parents = f.getParents();
  let ok = false;

  while (parents.hasNext()) {
    if (parents.next().getId() === p.source) ok = true;
  }

  if (!ok || f.getMimeType() !== 'application/pdf') {
    throw new Error('このプロジェクトのPDFを選択してください。');
  }

  if (f.getSize() > MT33.MAX_SOURCE_BYTES) {
    throw new Error('ブラウザ読み込みは8MBまでです。');
  }

  return {
    name: f.getName(),
    base64: Utilities.base64Encode(f.getBlob().getBytes())
  };
}

function mt33RefMeta_() {
  const raw = PropertiesService.getUserProperties().getProperty(MT33.REFERENCES);
  return raw ? JSON.parse(raw) : {};
}

function mt33AnalyzeRef_(id) {
  const p = SlidesApp.openById(id);
  const fonts = {};
  const colors = {};
  const titles = [];
  let blocks = 0;
  let chars = 0;

  p.getSlides().slice(0, 40).forEach(slide => {
    const texts = [];

    slide.getPageElements().forEach(element => {
      if (element.getPageElementType() !== SlidesApp.PageElementType.SHAPE) return;

      try {
        const text = element.asShape().getText();
        const s = text.asString().trim();
        if (!s || /^\[\[LAYOUT:/.test(s)) return;

        texts.push({ s: s, y: element.getTop() });
        blocks++;
        chars += s.length;

        const style = text.getTextStyle();
        const font = style.getFontFamily();
        if (font) fonts[font] = (fonts[font] || 0) + 1;

        try {
          const color = style.getForegroundColor();
          if (color && color.getColorType() === SlidesApp.ColorType.RGB) {
            const hex = color.asRgbColor().asHexString();
            colors[hex] = (colors[hex] || 0) + 1;
          }
        } catch (e) {}
      } catch (e) {}
    });

    texts.sort((a, b) => a.y - b.y);
    if (texts.length) titles.push(texts[0].s.length);
  });

  const top = obj => Object.keys(obj).sort((a, b) => obj[b] - obj[a])[0] || '';
  const median = arr => arr.length
    ? arr.slice().sort((a, b) => a - b)[Math.floor(arr.length / 2)]
    : 0;

  return {
    slides: p.getSlides().length,
    font: top(fonts),
    color: top(colors),
    avgTextChars: blocks ? Math.round(chars / blocks) : 0,
    medianTitleLength: median(titles)
  };
}

function mt33RegisterReference(url, reason, kinds, copyToLibrary) {
  const id = parseDriveId_(url);
  if (!id) throw new Error('Google SlidesのURLまたはIDを入力してください。');

  const source = DriveApp.getFileById(id);
  if (source.getMimeType() !== 'application/vnd.google-apps.presentation') {
    throw new Error('Google Slides形式を指定してください。');
  }

  const allowed = ['design', 'writing', 'structure', 'charts', 'motion'];
  const selectedKinds = Array.isArray(kinds)
    ? kinds.filter(x => allowed.includes(x))
    : [];

  if (!selectedKinds.length) {
    throw new Error('何をお手本にするか1つ以上選択してください。');
  }

  const file = copyToLibrary
    ? source.makeCopy(source.getName(), mt33ReferenceRoot_())
    : source;

  const meta = mt33RefMeta_();
  const analysis = mt33AnalyzeRef_(file.getId());

  meta[file.getId()] = {
    reason: String(reason || '').slice(0, 300),
    kinds: selectedKinds,
    analysis: analysis,
    registeredAt: new Date().toISOString()
  };

  PropertiesService.getUserProperties()
    .setProperty(MT33.REFERENCES, JSON.stringify(meta));

  return {
    id: file.getId(),
    name: file.getName(),
    url: file.getUrl(),
    reason: meta[file.getId()].reason,
    kinds: selectedKinds,
    analysis: analysis
  };
}

function mt33ListReferences() {
  const root = mt33ReferenceRoot_();
  const meta = mt33RefMeta_();
  const seen = {};
  const out = [];

  const collect = folder => {
    const it = folder.getFilesByType('application/vnd.google-apps.presentation');

    while (it.hasNext() && out.length < MT33.MAX_REFERENCES) {
      const f = it.next();
      if (seen[f.getId()]) continue;
      seen[f.getId()] = true;

      const m = meta[f.getId()] || {};

      out.push({
        id: f.getId(),
        name: f.getName(),
        url: f.getUrl(),
        reason: m.reason || '',
        kinds: m.kinds || ['design', 'writing', 'structure'],
        analysis: m.analysis || null
      });
    }
  };

  collect(root);
  const subs = root.getFolders();
  while (subs.hasNext() && out.length < MT33.MAX_REFERENCES) {
    collect(subs.next());
  }

  return out.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
}

function mt33GetPrefs() {
  const raw = PropertiesService.getUserProperties().getProperty(MT33.PREFS);
  return raw ? JSON.parse(raw) : { animation: 'subtle' };
}

function mt33SavePrefs(prefs) {
  const animation = String((prefs || {}).animation || 'subtle');
  if (!['none', 'subtle', 'rich'].includes(animation)) {
    throw new Error('アニメーション設定が不正です。');
  }

  const value = { animation: animation };
  PropertiesService.getUserProperties()
    .setProperty(MT33.PREFS, JSON.stringify(value));

  return value;
}

function mt33BuildPromptContext(ids, animation) {
  const selected = Array.isArray(ids) ? ids.slice(0, 3) : [];
  const refs = mt33ListReferences().filter(r => selected.includes(r.id));
  const mode = ['none', 'subtle', 'rich'].includes(animation)
    ? animation
    : 'subtle';

  const guide = {
    none: 'アニメーションなし。PDF・印刷でも全情報が伝わる静止レイアウトを優先。',
    subtle: 'アニメーションは控えめ。業務フロー・比較など理解に役立つ箇所だけ段階表示を想定し、多用しない。',
    rich: 'プレゼン向けに動きを積極的に検討。ただし派手さより理解を優先し、不要な演出は避ける。'
  }[mode];

  const meta = mt33RefMeta_();
  let changed = false;

  const summary = refs.map(r => {
    let analysis = r.analysis;

    if (!analysis) {
      analysis = mt33AnalyzeRef_(r.id);
      if (!meta[r.id]) meta[r.id] = {};
      meta[r.id].reason = meta[r.id].reason || r.reason || '';
      meta[r.id].kinds = meta[r.id].kinds || r.kinds || ['design', 'writing', 'structure'];
      meta[r.id].analysis = analysis;
      meta[r.id].registeredAt = meta[r.id].registeredAt || new Date().toISOString();
      changed = true;
    }

    return {
      name: r.name,
      reason: r.reason,
      kinds: r.kinds,
      font: analysis.font || '',
      color: analysis.color || '',
      avgTextChars: analysis.avgTextChars || 0,
      medianTitleLength: analysis.medianTitleLength || 0,
      slides: analysis.slides || 0
    };
  });

  if (changed) {
    PropertiesService.getUserProperties()
      .setProperty(MT33.REFERENCES, JSON.stringify(meta));
  }

  return {
    animation: mode,
    prefix:
      '【今回のお手本スライド】\n' +
      JSON.stringify(summary, null, 2) +
      '\n\n【アニメーション方針】\n' +
      guide +
      '\n\nお手本はユーザーが良いと判断した完成資料です。' +
      '会社テンプレートの必須ルールを守り、該当する特徴だけを参考にしてください。' +
      'お手本の内容・数値・固有名詞は今回の元資料へ流用しないでください。' +
      '実際のアニメーション付与はGoogle Slides / PowerPointで最終調整するため、' +
      '静止状態でも意味が通じる構成にしてください。'
  };
}

function mt33WorkspaceSummary() {
  const workspace = mt33WorkspaceRoot_();
  const projectRoot = mt33ProjectRoot_();
  const templateRoot = mt33CommonTemplateRoot_();
  const assetRoot = mt33CommonAssetRoot_();
  const referenceRoot = mt33ReferenceRoot_();
  const cfg = getAppConfig();

  const fileInfo = id => {
    if (!id) return null;
    try {
      const f = DriveApp.getFileById(id);
      return { id: f.getId(), name: f.getName(), url: f.getUrl() };
    } catch (e) {
      return null;
    }
  };

  return {
    workspace: { id: workspace.getId(), name: workspace.getName(), url: workspace.getUrl() },
    projectRoot: { id: projectRoot.getId(), name: projectRoot.getName(), url: projectRoot.getUrl() },
    templateRoot: { id: templateRoot.getId(), name: templateRoot.getName(), url: templateRoot.getUrl() },
    assetRoot: { id: assetRoot.getId(), name: assetRoot.getName(), url: assetRoot.getUrl() },
    referenceRoot: { id: referenceRoot.getId(), name: referenceRoot.getName(), url: referenceRoot.getUrl() },
    template: fileInfo(cfg.templateId),
    activeProject: mt33GetActiveProjectSafe_()
  };
}


/**
 * MediToku Slide Studio v4.0
 * Compact SaaS UI support endpoints.
 */
function mt40ListCompletedSlides(projectId) {
  const p = mt33GetProject_(projectId);
  const folder = DriveApp.getFolderById(p.slides);
  const it = folder.getFilesByType('application/vnd.google-apps.presentation');
  const out = [];

  while (it.hasNext() && out.length < 80) {
    const f = it.next();
    out.push({
      id: f.getId(),
      name: f.getName(),
      url: f.getUrl(),
      previewUrl: 'https://docs.google.com/presentation/d/' + f.getId() + '/embed?start=false&loop=false&delayms=3000',
      updatedAt: f.getLastUpdated().toISOString(),
      createdAt: f.getDateCreated().toISOString()
    });
  }

  return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function mt40GetNavigationData() {
  const s = mt33WorkspaceSummary();
  const projects = mt33ListProjects().slice(0, 30);
  return {
    workspace: s.workspace,
    projectRoot: s.projectRoot,
    templateRoot: s.templateRoot,
    assetRoot: s.assetRoot,
    referenceRoot: s.referenceRoot,
    activeProject: s.activeProject,
    projects: projects
  };
}

function mt40GetProjectState(projectId) {
  const p = mt33GetProject_(projectId);
  return {
    project: p,
    sources: mt33ListSources(projectId),
    slides: mt40ListCompletedSlides(projectId)
  };
}

/**
 * MediToku Slide Studio v4.1
 * Multi-style workspace: company / personal / use-case styles.
 */
const MT41 = {
  STYLE_ROOT: 'MT41_STYLE_ROOT',
  ACTIVE_STYLE: 'MT41_ACTIVE_STYLE',
  META_FILE: '_style.json',
  MAX_STYLES: 50,
  MAX_STYLE_REFS: 10
};

function mt41StyleRoot_() {
  const props = PropertiesService.getUserProperties();
  const saved = props.getProperty(MT41.STYLE_ROOT);
  if (saved) {
    try {
      const f = DriveApp.getFolderById(saved);
      f.getName();
      return f;
    } catch (e) {}
  }
  const root = mt33EnsureChild_(mt33WorkspaceRoot_(), '05_スタイル');
  props.setProperty(MT41.STYLE_ROOT, root.getId());
  return root;
}

function mt41StyleChildren_(folder) {
  return {
    templates: mt33EnsureChild_(folder, '01_テンプレート'),
    refs: mt33EnsureChild_(folder, '02_お手本'),
    assets: mt33EnsureChild_(folder, '03_素材')
  };
}

function mt41DefaultMeta_(name, kind) {
  return {
    version: 1,
    name: String(name || 'スタイル').slice(0, 80),
    kind: kind || 'personal',
    baseStyleId: '',
    description: '',
    purpose: 'sales',
    audience: '',
    animation: 'subtle',
    templateId: '',
    rules: [],
    referenceNotes: {},
    referenceSummaries: {},
    updatedAt: new Date().toISOString()
  };
}

function mt41ReadMeta_(folder) {
  const it = folder.getFilesByName(MT41.META_FILE);
  if (!it.hasNext()) return mt41DefaultMeta_(folder.getName(), 'personal');
  try {
    const meta = JSON.parse(it.next().getBlob().getDataAsString('UTF-8'));
    const base = mt41DefaultMeta_(folder.getName(), meta.kind || 'personal');
    return Object.assign(base, meta, {
      name: String(meta.name || folder.getName()).slice(0, 80),
      rules: Array.isArray(meta.rules) ? meta.rules.slice(0, 30).map(x => String(x).slice(0, 240)) : [],
      referenceNotes: meta.referenceNotes && typeof meta.referenceNotes === 'object' ? meta.referenceNotes : {},
      referenceSummaries: meta.referenceSummaries && typeof meta.referenceSummaries === 'object' ? meta.referenceSummaries : {}
    });
  } catch (e) {
    return mt41DefaultMeta_(folder.getName(), 'personal');
  }
}

function mt41WriteMeta_(folder, meta) {
  meta = Object.assign(mt41DefaultMeta_(folder.getName(), meta.kind || 'personal'), meta || {});
  meta.name = String(meta.name || folder.getName()).slice(0, 80);
  meta.rules = Array.isArray(meta.rules) ? meta.rules.slice(0, 30).map(x => String(x).slice(0, 240)) : [];
  meta.updatedAt = new Date().toISOString();
  const body = JSON.stringify(meta, null, 2);
  const it = folder.getFilesByName(MT41.META_FILE);
  if (it.hasNext()) it.next().setContent(body);
  else folder.createFile(MT41.META_FILE, body, MimeType.PLAIN_TEXT);
  return meta;
}

function mt41StyleFromFolder_(folder, syncRefs) {
  const child = mt41StyleChildren_(folder);
  let meta = mt41ReadMeta_(folder);
  if (syncRefs) meta = mt41SyncStyleRefs_(folder, meta);
  return {
    id: folder.getId(),
    name: meta.name || folder.getName(),
    kind: meta.kind || 'personal',
    baseStyleId: meta.baseStyleId || '',
    description: meta.description || '',
    purpose: meta.purpose || 'sales',
    audience: meta.audience || '',
    animation: meta.animation || 'subtle',
    templateId: meta.templateId || '',
    rules: meta.rules || [],
    url: folder.getUrl(),
    templateFolderId: child.templates.getId(),
    templateFolderUrl: child.templates.getUrl(),
    referenceFolderId: child.refs.getId(),
    referenceFolderUrl: child.refs.getUrl(),
    assetFolderId: child.assets.getId(),
    assetFolderUrl: child.assets.getUrl(),
    referenceSummaries: meta.referenceSummaries || {},
    updatedAt: meta.updatedAt || ''
  };
}

function mt41StarterDefinitions_() {
  return [
    {
      name: '会社公式', kind: 'company', purpose: 'sales', audience: '会社の顧客・取引先', animation: 'subtle',
      description: '会社のブランド、テンプレート、正式な表現を優先するスタイル。',
      rules: ['会社のブランドルールとテンプレートを最優先する。']
    },
    {
      name: '自分スタイル', kind: 'personal', purpose: 'custom', audience: '', animation: 'subtle',
      description: '自分が良いと思った完成資料から育てる個人スタイル。',
      rules: ['登録したお手本と個人Design DNAを優先する。']
    },
    {
      name: 'VC・投資家向け', kind: 'usecase', purpose: 'custom', audience: 'VC・投資家', animation: 'subtle',
      description: '市場、成長性、KPI、競争優位、資金使途を重視するスタイル。',
      rules: ['市場・成長性・KPI・競争優位・資金使途を明確にする。', '数値は元資料の根拠があるものだけを使用する。']
    },
    {
      name: '医療機関営業', kind: 'usecase', purpose: 'sales', audience: '医療機関の経営者', animation: 'subtle',
      description: '導入効果、費用、運用フロー、実画面を重視する営業スタイル。',
      rules: ['導入効果・費用・運用フロー・実画面を重視する。']
    }
  ];
}

function mt41EnsureStarterStyles_() {
  const root = mt41StyleRoot_();
  const starter = mt41StarterDefinitions_();

  // v4.1.1:
  // 「05_スタイル」に何か1フォルダでも存在すると初期スタイル作成を
  // 全部スキップしていた問題を修正。各標準スタイルを個別に確認する。
  starter.forEach(s => {
    const existing = root.getFoldersByName(s.name);
    if (existing.hasNext()) {
      const f = existing.next();
      mt41StyleChildren_(f);
      const metaFiles = f.getFilesByName(MT41.META_FILE);
      if (!metaFiles.hasNext()) {
        mt41WriteMeta_(f, Object.assign(mt41DefaultMeta_(s.name, s.kind), s));
      }
      return;
    }

    const f = root.createFolder(s.name);
    mt41StyleChildren_(f);
    mt41WriteMeta_(f, Object.assign(mt41DefaultMeta_(s.name, s.kind), s));
  });
}

function mt41ListStyles() {
  mt41EnsureStarterStyles_();
  const it = mt41StyleRoot_().getFolders();
  const out = [];
  while (it.hasNext() && out.length < MT41.MAX_STYLES) {
    const f = it.next();
    try { out.push(mt41StyleFromFolder_(f, false)); } catch (e) {}
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
}

function mt41GetStyle_(id, syncRefs) {
  const clean = parseDriveId_(id);
  if (!clean) throw new Error('スタイルを選択してください。');
  const f = DriveApp.getFolderById(clean);
  const parents = f.getParents();
  let ok = false;
  const rootId = mt41StyleRoot_().getId();
  while (parents.hasNext()) if (parents.next().getId() === rootId) ok = true;
  if (!ok) throw new Error('MediToku Slide Studioのスタイルを選択してください。');
  return mt41StyleFromFolder_(f, !!syncRefs);
}

function mt41GetEffectiveStyle_(id, seen) {
  const style = mt41GetStyle_(id, true);
  const visited = seen || {};
  if (visited[style.id]) throw new Error('スタイルの継承が循環しています。');
  visited[style.id] = true;

  let base = null;
  if (style.baseStyleId) {
    try { base = mt41GetEffectiveStyle_(style.baseStyleId, visited); } catch (e) { base = null; }
  }

  const merged = Object.assign({}, base || {}, style);
  merged.rules = Array.from(new Set([].concat(base && base.rules || [], style.rules || []))).slice(0, 40);
  merged.referenceSummaries = Object.assign({}, base && base.referenceSummaries || {}, style.referenceSummaries || {});
  merged.templateId = style.templateId || (base && base.templateId) || '';
  merged.purpose = style.purpose || (base && base.purpose) || 'sales';
  merged.audience = style.audience || (base && base.audience) || '';
  merged.animation = style.animation || (base && base.animation) || 'subtle';
  merged.chain = [].concat(base && base.chain || [], [{id: style.id, name: style.name}]);
  return merged;
}

function mt41CreateStyle(name, baseStyleId) {
  const clean = String(name || '').trim().replace(/[\/\\\r\n\x00-\x1f]/g, '_').slice(0, 70);
  if (!clean) throw new Error('スタイル名を入力してください。');
  const root = mt41StyleRoot_();
  const existing = root.getFoldersByName(clean);
  if (existing.hasNext()) throw new Error('同じ名前のスタイルがあります。');
  const f = root.createFolder(clean);
  mt41StyleChildren_(f);
  const meta = mt41DefaultMeta_(clean, 'personal');
  if (baseStyleId) {
    const base = mt41GetStyle_(baseStyleId, false);
    meta.baseStyleId = base.id;
    meta.purpose = base.purpose;
    meta.audience = base.audience;
    meta.animation = base.animation;
    meta.templateId = base.templateId;
  }
  mt41WriteMeta_(f, meta);
  PropertiesService.getUserProperties().setProperty(MT41.ACTIVE_STYLE, f.getId());
  return mt41GetStyle_(f.getId(), false);
}

function mt41SaveStyle(style) {
  style = style || {};
  const current = mt41GetStyle_(style.id, false);
  const folder = DriveApp.getFolderById(current.id);
  const meta = mt41ReadMeta_(folder);
  const newName = String(style.name || meta.name || folder.getName()).trim().replace(/[\/\\\r\n\x00-\x1f]/g, '_').slice(0, 70);
  if (newName && newName !== folder.getName()) folder.setName(newName);
  meta.name = newName || meta.name;
  meta.kind = ['company','personal','usecase'].includes(style.kind) ? style.kind : meta.kind;
  meta.baseStyleId = style.baseStyleId && style.baseStyleId !== current.id ? parseDriveId_(style.baseStyleId) : '';
  meta.description = String(style.description || '').slice(0, 500);
  meta.purpose = String(style.purpose || meta.purpose || 'sales').slice(0, 30);
  meta.audience = String(style.audience || '').slice(0, 180);
  meta.animation = ['none','subtle','rich'].includes(style.animation) ? style.animation : 'subtle';
  meta.templateId = style.templateId ? parseDriveId_(style.templateId) : '';
  meta.rules = Array.isArray(style.rules) ? style.rules.slice(0, 30) : String(style.rules || '').split(/\r?\n/).map(x=>x.trim()).filter(Boolean).slice(0,30);
  mt41WriteMeta_(folder, meta);
  return mt41GetEffectiveStyle_(current.id);
}

function mt41SetActiveStyle(id) {
  const props = PropertiesService.getUserProperties();
  if (!id) {
    props.deleteProperty(MT41.ACTIVE_STYLE);
    return null;
  }
  const style = mt41GetEffectiveStyle_(id);
  props.setProperty(MT41.ACTIVE_STYLE, style.id);
  return style;
}

function mt41GetActiveStyle() {
  const props = PropertiesService.getUserProperties();
  const id = props.getProperty(MT41.ACTIVE_STYLE);

  if (id) {
    try { return mt41GetEffectiveStyle_(id); } catch (e) {}
  }

  // 初回は「会社公式」を既定スタイルとして選択する。
  mt41EnsureStarterStyles_();
  const root = mt41StyleRoot_();
  const it = root.getFoldersByName('会社公式');

  if (it.hasNext()) {
    try {
      const style = mt41GetEffectiveStyle_(it.next().getId());
      props.setProperty(MT41.ACTIVE_STYLE, style.id);
      return style;
    } catch (e) {}
  }

  return null;
}

function mt41ListStyleTemplates(styleId) {
  const style = mt41GetStyle_(styleId, false);
  const result = [];
  const seen = {};
  const collect = (folder, source) => {
    const it = folder.getFilesByType('application/vnd.google-apps.presentation');
    while (it.hasNext() && result.length < 80) {
      const f = it.next();
      if (seen[f.getId()]) continue;
      seen[f.getId()] = true;
      result.push({id:f.getId(),name:f.getName(),url:f.getUrl(),source:source});
    }
  };
  collect(DriveApp.getFolderById(style.templateFolderId), 'style');
  collect(mt33CommonTemplateRoot_(), 'common');
  return result.sort((a,b)=>a.name.localeCompare(b.name,'ja'));
}

function mt41SyncStyleRefs_(folder, meta) {
  const child = mt41StyleChildren_(folder);
  const it = child.refs.getFilesByType('application/vnd.google-apps.presentation');
  const summaries = meta.referenceSummaries || {};
  const keep = {};
  let count = 0;

  while (it.hasNext() && count < MT41.MAX_STYLE_REFS) {
    const f = it.next();
    const id = f.getId();
    const updatedAt = f.getLastUpdated().toISOString();
    const old = summaries[id];
    if (!old || old.updatedAt !== updatedAt) {
      let analysis = {};
      try { analysis = mt33AnalyzeRef_(id); } catch (e) {}
      summaries[id] = {
        name: f.getName(),
        url: f.getUrl(),
        updatedAt: updatedAt,
        reason: (meta.referenceNotes || {})[id] || '',
        analysis: analysis
      };
    }
    keep[id] = summaries[id];
    count++;
  }

  meta.referenceSummaries = keep;
  mt41WriteMeta_(folder, meta);
  return meta;
}

function mt41ListStyleReferences(styleId) {
  const style = mt41GetStyle_(styleId, true);
  const arr = Object.keys(style.referenceSummaries || {}).map(id => {
    const x = style.referenceSummaries[id];
    return {id:id,name:x.name,url:x.url,reason:x.reason||'',analysis:x.analysis||{}};
  });
  return arr.sort((a,b)=>a.name.localeCompare(b.name,'ja'));
}

function mt41AddReference(styleId, slideUrl, reason) {
  const style = mt41GetStyle_(styleId, false);
  const id = parseDriveId_(slideUrl);
  if (!id) throw new Error('Google SlidesのURLを入力してください。');
  const src = DriveApp.getFileById(id);
  if (src.getMimeType() !== 'application/vnd.google-apps.presentation') throw new Error('Google Slides形式を選択してください。');
  const dest = DriveApp.getFolderById(style.referenceFolderId);
  const copy = src.makeCopy(src.getName(), dest);
  const folder = DriveApp.getFolderById(style.id);
  const meta = mt41ReadMeta_(folder);
  meta.referenceNotes = meta.referenceNotes || {};
  meta.referenceNotes[copy.getId()] = String(reason || '').slice(0, 300);
  mt41WriteMeta_(folder, meta);
  mt41SyncStyleRefs_(folder, meta);
  return {id:copy.getId(),name:copy.getName(),url:copy.getUrl()};
}

function mt41BuildStyleContext(styleId) {
  if (!styleId) return {style:null,prefix:''};
  const style = mt41GetEffectiveStyle_(styleId);
  const refs = Object.keys(style.referenceSummaries || {}).slice(0, MT41.MAX_STYLE_REFS).map(id => {
    const x = style.referenceSummaries[id] || {};
    return {
      name: x.name || '',
      reason: x.reason || '',
      font: x.analysis && x.analysis.font || '',
      color: x.analysis && x.analysis.color || '',
      avgTextChars: x.analysis && x.analysis.avgTextChars || 0,
      medianTitleLength: x.analysis && x.analysis.medianTitleLength || 0,
      slides: x.analysis && x.analysis.slides || 0
    };
  });
  const chain = (style.chain || []).map(x=>x.name).join(' + ');
  const prefix =
    '【今回のスタイル】\n' +
    'スタイル: ' + style.name + '\n' +
    (chain ? '継承: ' + chain + '\n' : '') +
    (style.description ? '目的: ' + style.description + '\n' : '') +
    (style.rules && style.rules.length ? 'ルール:\n- ' + style.rules.join('\n- ') + '\n' : '') +
    (refs.length ? '承認済みお手本の傾向:\n' + JSON.stringify(refs, null, 2) + '\n' : '') +
    '会社・個人・用途別のスタイルは、今回の元資料の事実より優先してはいけません。お手本の固有名詞・数値・内容は流用しないでください。';
  return {style:style,prefix:prefix};
}

function mt41GetNavigationData() {
  return {
    styleRoot: {id:mt41StyleRoot_().getId(),name:mt41StyleRoot_().getName(),url:mt41StyleRoot_().getUrl()},
    styles: mt41ListStyles(),
    activeStyle: mt41GetActiveStyle()
  };
}


/**
 * MediToku Slide Studio v4.2
 * UI/UX reliability + slide thumbnail preview support.
 */
function mt42GetSidebarData() {
  const result = {
    workspace: null,
    projectRoot: null,
    templateRoot: null,
    assetRoot: null,
    referenceRoot: null,
    styleRoot: null,
    projects: [],
    styles: [],
    activeProject: null,
    activeStyle: null,
    errors: []
  };

  try {
    const nav = mt40GetNavigationData();
    result.workspace = nav.workspace || null;
    result.projectRoot = nav.projectRoot || null;
    result.templateRoot = nav.templateRoot || null;
    result.assetRoot = nav.assetRoot || null;
    result.referenceRoot = nav.referenceRoot || null;
    result.projects = nav.projects || [];
    result.activeProject = nav.activeProject || null;
  } catch (e) {
    result.errors.push('Drive: ' + e.message);
  }

  try {
    const styleNav = mt41GetNavigationData();
    result.styleRoot = styleNav.styleRoot || null;
    result.styles = styleNav.styles || [];
    result.activeStyle = styleNav.activeStyle || null;
  } catch (e) {
    result.errors.push('Styles: ' + e.message);
  }

  return result;
}

function mt42GetPresentationSlides(fileId, maxSlides) {
  const id = parseDriveId_(fileId);
  if (!id) throw new Error('Google Slidesを選択してください。');

  const f = DriveApp.getFileById(id);
  if (f.getMimeType() !== 'application/vnd.google-apps.presentation') {
    throw new Error('Google Slides形式のファイルではありません。');
  }

  const p = SlidesApp.openById(id);
  const slides = p.getSlides();
  const limit = Math.min(Math.max(Number(maxSlides) || 40, 1), 80);

  return slides.slice(0, limit).map((s, i) => {
    const pageId = s.getObjectId();
    return {
      index: i + 1,
      objectId: pageId,
      thumbnailUrl:
        'https://docs.google.com/presentation/d/' +
        encodeURIComponent(id) +
        '/export/png?pageid=' +
        encodeURIComponent(pageId)
    };
  });
}


/**
 * v4.3 compatibility helpers retained by v5.
 */
function mt43ReadTextSource(projectId, fileId) {
  const p = mt33GetProject_(projectId);
  const id = parseDriveId_(fileId);
  if (!id) throw new Error('TXTファイルを選択してください。');

  const f = DriveApp.getFileById(id);
  const parents = f.getParents();
  let valid = false;

  while (parents.hasNext()) {
    if (parents.next().getId() === p.source) valid = true;
  }

  if (!valid) throw new Error('このプロジェクトの元資料ではありません。');

  const mime = f.getMimeType();
  if (mime !== 'text/plain' && mime !== 'text/csv') {
    throw new Error('TXT / CSV形式のファイルを選択してください。');
  }

  if (f.getSize() > 2 * 1024 * 1024) {
    throw new Error('テキスト解析は2MBまでです。');
  }

  return {
    id: f.getId(),
    name: f.getName(),
    text: f.getBlob().getDataAsString('UTF-8').slice(0, 180000)
  };
}

function mt43HealthCheck() {
  const checks = [];
  const add = (name, fn) => {
    try {
      const detail = fn();
      checks.push({ ok: true, name: name, detail: String(detail || 'OK') });
    } catch (e) {
      checks.push({ ok: false, name: name, detail: e.message || String(e) });
    }
  };

  add('作業フォルダ', () => mt33WorkspaceRoot_().getName());
  add('プロジェクト', () => mt33ProjectRoot_().getName());
  add('共通テンプレート', () => mt33CommonTemplateRoot_().getName());
  add('お手本', () => mt33ReferenceRoot_().getName());
  add('スタイル', () => mt41StyleRoot_().getName());
  add('使用中ひな形', () => {
    const cfg = getAppConfig();
    if (!cfg.templateId) return '未設定';
    return DriveApp.getFileById(cfg.templateId).getName();
  });

  return {
    ok: checks.every(x => x.ok),
    checks: checks,
    at: new Date().toISOString()
  };
}


/**
 * MediToku Slide Studio v5.0
 * Future-proof platform boundary / capability layer.
 *
 * IMPORTANT:
 * - Current runtime remains Google Apps Script for the beta.
 * - Subscription tier (Google AI Pro / Workspace edition) is NOT inferred.
 * - Product logic should branch on capabilities, not plan names.
 * - Non-idempotent operations are protected by request IDs.
 */
const MT5 = {
  APP_VERSION: '5.0.0',
  SCHEMA_VERSION: 5,
  PROP_SCHEMA_VERSION: 'MT5_SCHEMA_VERSION',
  PROP_REQUEST_PREFIX: 'MT5_REQUEST_',
  REQUEST_TTL_MS: 30 * 60 * 1000,
  CACHE_SECONDS: 600
};

function mt5EnsureSchema_() {
  const props = PropertiesService.getUserProperties();
  const current = Number(props.getProperty(MT5.PROP_SCHEMA_VERSION) || 0);

  // Migrations must be additive and non-destructive.
  if (current < 5) {
    props.setProperty(MT5.PROP_SCHEMA_VERSION, String(MT5.SCHEMA_VERSION));
  }

  return MT5.SCHEMA_VERSION;
}

function mt5RequestKey_(requestId) {
  const raw = String(requestId || '').trim();
  if (!raw) throw new Error('requestId is required.');
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw);
  const hex = bytes.map(b => ('0' + ((b + 256) % 256).toString(16)).slice(-2)).join('');
  return MT5.PROP_REQUEST_PREFIX + hex.slice(0, 32);
}

function mt5ReadRequest_(requestId) {
  const key = mt5RequestKey_(requestId);
  const raw = PropertiesService.getUserProperties().getProperty(key);
  if (!raw) return null;

  try {
    const v = JSON.parse(raw);
    if (Date.now() - Number(v.at || 0) > MT5.REQUEST_TTL_MS) {
      PropertiesService.getUserProperties().deleteProperty(key);
      return null;
    }
    return v;
  } catch (e) {
    PropertiesService.getUserProperties().deleteProperty(key);
    return null;
  }
}

function mt5WriteRequest_(requestId, value) {
  const key = mt5RequestKey_(requestId);
  PropertiesService.getUserProperties().setProperty(
    key,
    JSON.stringify(Object.assign({ at: Date.now() }, value))
  );
}

function mt5DeleteRequest_(requestId) {
  PropertiesService.getUserProperties().deleteProperty(mt5RequestKey_(requestId));
}

function mt5ClassifyError_(err) {
  const message = String(err && err.message || err || '');
  const lower = message.toLowerCase();

  let code = 'UNKNOWN';
  let retryable = false;

  if (/too many|quota|limit exceeded|rate|service invoked too many/i.test(message)) {
    code = 'QUOTA_OR_RATE_LIMIT';
    retryable = true;
  } else if (/internal error|backend error|temporar|try again|service unavailable/i.test(message)) {
    code = 'TRANSIENT_GOOGLE_ERROR';
    retryable = true;
  } else if (/authorization|permission|access denied|insufficient/i.test(message)) {
    code = 'AUTH_OR_PERMISSION';
  } else if (/not found|does not exist|invalid id|無効|見つかりません/i.test(message)) {
    code = 'NOT_FOUND';
  } else if (/maximum execution|exceeded maximum execution time/i.test(message)) {
    code = 'EXECUTION_TIMEOUT';
  }

  return { code, retryable, message };
}

/**
 * Retry only read-only/idempotent operations.
 * Never wrap file creation or copy operations with this helper.
 */
function mt5WithRetry_(fn, options) {
  options = options || {};
  const attempts = Math.max(1, Math.min(Number(options.attempts || 3), 4));
  const baseMs = Math.max(100, Number(options.baseMs || 250));
  let last;

  for (let i = 0; i < attempts; i++) {
    try {
      return fn();
    } catch (e) {
      last = e;
      const info = mt5ClassifyError_(e);
      if (!info.retryable || i === attempts - 1) throw e;
      Utilities.sleep(baseMs * Math.pow(2, i));
    }
  }
  throw last;
}

function mt5GetCapabilities() {
  mt5EnsureSchema_();

  const email = Session.getActiveUser().getEmail() || '';
  const accountClass =
    !email ? 'unknown' :
    /@gmail\.com$/i.test(email) ? 'consumer_google' :
    'managed_or_custom_domain';

  return {
    appVersion: MT5.APP_VERSION,
    schemaVersion: MT5.SCHEMA_VERSION,
    runtime: 'google_apps_script',
    account: {
      emailVisible: !!email,
      accountClass: accountClass,
      // Google does not expose a dependable API for the app to determine
      // whether this user has Google AI Pro or which Workspace SKU they own.
      workspaceSkuDetection: 'not_available_in_current_runtime',
      googleAiProDetection: 'not_available_in_public_api'
    },
    capabilities: {
      driveCore: { available: true, mode: 'DriveApp', stableInterface: false },
      slidesCore: { available: true, mode: 'SlidesApp', stableInterface: false },
      googlePicker: { available: false, mode: 'planned_cloud_saas' },
      driveFileScope: { available: false, mode: 'planned_cloud_saas' },
      sharedDrive: { available: false, mode: 'not_guaranteed_in_gas_beta' },
      appDataFolder: { available: false, mode: 'planned_drive_api' },
      geminiGeneration: { available: true, mode: 'manual_handoff' },
      geminiSlidesNative: { available: false, mode: 'not_detected' },
      cloudRunEngine: { available: false, mode: 'planned' },
      organizationManagement: { available: false, mode: 'planned_gcp_control_plane' }
    },
    guidance: {
      decisionModel: 'capability_first_not_plan_name',
      currentBeta: 'Apps Script',
      commercialTarget: 'Cloud Run + OAuth + Drive API + Slides API + Picker'
    }
  };
}

function mt5GetSidebarCached_() {
  const cache = CacheService.getUserCache();
  const key = 'mt5_sidebar_v1';
  const cached = cache.get(key);

  if (cached) {
    try { return JSON.parse(cached); } catch (e) {}
  }

  const value = mt42GetSidebarData();
  try { cache.put(key, JSON.stringify(value), MT5.CACHE_SECONDS); } catch (e) {}
  return value;
}

function mt5InvalidateCaches_() {
  try { CacheService.getUserCache().remove('mt5_sidebar_v1'); } catch (e) {}
}

function mt5Bootstrap() {
  mt5EnsureSchema_();

  const warnings = [];
  const safe = (name, fn, fallback) => {
    try {
      return mt5WithRetry_(fn, { attempts: 3, baseMs: 200 });
    } catch (e) {
      const info = mt5ClassifyError_(e);
      warnings.push({ area: name, code: info.code, message: info.message });
      return fallback;
    }
  };

  return {
    version: MT5.APP_VERSION,
    schemaVersion: MT5.SCHEMA_VERSION,
    capabilities: mt5GetCapabilities(),
    sidebar: safe('navigation', () => mt5GetSidebarCached_(), null),
    config: safe('config', () => getAppConfig(), { templateId: '', outputFolder: '', mediaFolder: '' }),
    templates: safe('templates', () => mt33ListTemplates(), []),
    prefs: safe('preferences', () => mt33GetPrefs(), { animation: 'subtle' }),
    references: safe('references', () => mt33ListReferences(), []),
    warnings: warnings
  };
}

function mt5CreateProject(name, requestId) {
  const lock = LockService.getUserLock();
  lock.waitLock(10000);

  try {
    const previous = mt5ReadRequest_(requestId);
    if (previous && previous.status === 'done') return previous.result;
    if (previous && previous.status === 'running') {
      throw new Error('同じプロジェクト作成処理が進行中です。少し待ってください。');
    }
    mt5WriteRequest_(requestId, { status: 'running', operation: 'create_project' });
  } finally {
    lock.releaseLock();
  }

  try {
    const result = mt33CreateProject(name);
    mt5WriteRequest_(requestId, { status: 'done', operation: 'create_project', result: result });
    mt5InvalidateCaches_();
    return result;
  } catch (e) {
    mt5DeleteRequest_(requestId);
    throw e;
  }
}

function mt5CreateDeck(payload) {
  payload = payload || {};
  const requestId = String(payload.requestId || '').trim();

  const lock = LockService.getUserLock();
  lock.waitLock(10000);

  try {
    const previous = mt5ReadRequest_(requestId);
    if (previous && previous.status === 'done') return previous.result;
    if (previous && previous.status === 'running') {
      throw new Error('同じスライド生成処理が進行中です。二重生成を防止しました。');
    }
    mt5WriteRequest_(requestId, { status: 'running', operation: 'create_deck' });
  } finally {
    lock.releaseLock();
  }

  try {
    const result = createDeck(payload);
    mt5WriteRequest_(requestId, { status: 'done', operation: 'create_deck', result: result });
    return result;
  } catch (e) {
    mt5DeleteRequest_(requestId);
    throw e;
  }
}

function mt5HealthCheck() {
  const base = mt43HealthCheck();
  const caps = mt5GetCapabilities();

  base.checks.push({
    ok: true,
    name: 'アプリバージョン',
    detail: 'v' + MT5.APP_VERSION + ' / schema ' + MT5.SCHEMA_VERSION
  });

  base.checks.push({
    ok: true,
    name: 'Google連携方式',
    detail: '現在: Apps Script / 商用版: Drive API + Slides API + Pickerへ移行予定'
  });

  base.checks.push({
    ok: true,
    name: 'AI連携',
    detail: '現在: Gemini手動連携。Google AI Pro / Workspace SKUは自動判定しません。'
  });

  base.capabilities = caps;
  base.ok = base.checks.every(x => x.ok);
  return base;
}
