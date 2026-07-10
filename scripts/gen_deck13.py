"""'A Diminished World' (essay 13) deck v3 — reading pages + callouts + literary flourishes."""
from PIL import Image, ImageDraw, ImageFont
import math, os

FONTS = '/Users/tcs16/Library/Fonts'
COR_IT  = f'{FONTS}/CormorantGaramond-Italic.ttf'
COR_MIT = f'{FONTS}/CormorantGaramond-MediumItalic.ttf'
COR_M   = f'{FONTS}/CormorantGaramond-Medium.ttf'
EBG_REG = f'{FONTS}/EBGaramond-Regular.ttf'
EBG_MED = f'{FONTS}/EBGaramond-Medium.ttf'

BG      = (45, 50, 44)     # #2D322C ashen moss-grey
HEAD    = (234, 230, 220)  # bright cream (callouts / lead-in)
BODY    = (223, 219, 208)  # reading text
SUPPORT = (198, 195, 184)  # cover support
LABEL   = (139, 145, 137)  # muted grey-green caps
GOLD    = (200, 168, 74)
RULE    = (120, 126, 116)

def blend(a, b, t):  # t=1 -> a
    return tuple(int(a[i]*t + b[i]*(1-t)) for i in range(3))
QGOLD = blend(GOLD, BG, 0.5)   # soft decorative quote-mark gold

W = H = 1080
TOTAL = 10
HEADER = 'A DIMINISHED WORLD'

def vignette(bg):
    img = Image.new('RGB', (W, H), bg); px = img.load()
    cx, cy = W*0.5, H*0.42; maxd = math.hypot(cx, cy)
    for y in range(H):
        for x in range(W):
            d = math.hypot(x-cx, y-cy)/maxd
            px[x, y] = tuple(int(c*(1.0 - 0.15*d*d)) for c in bg)
    return img

def spaced(d, pos, text, font, fill, sp):
    x, y = pos
    for ch in text:
        d.text((x, y), ch, font=font, fill=fill)
        b = font.getbbox(ch); x += (b[2]-b[0]) + sp
    return x

def spaced_w(text, font, sp):
    x = 0
    for ch in text:
        b = font.getbbox(ch); x += (b[2]-b[0]) + sp
    return x - sp

def wrap_plain(text, font, maxw, draw):
    out = []
    for para in text.split('\n'):
        words = para.split(); cur = ''
        for w in words:
            t = (cur+' '+w).strip()
            if draw.textlength(t, font=font) <= maxw: cur = t
            else:
                if cur: out.append(cur)
                cur = w
        out.append(cur)
    return out

def top_bar(d, idx):
    f = ImageFont.truetype(EBG_MED, 21)
    spaced(d, (100, 60), f'{idx:02d} / {TOTAL:02d}', f, LABEL, 6)
    hw = spaced_w(HEADER, f, 6)
    spaced(d, (980-hw, 60), HEADER, f, LABEL, 6)

def diamond(d, cx, cy, r, fill):
    d.polygon([(cx, cy-r), (cx+r, cy), (cx, cy+r), (cx-r, cy)], fill=fill)

def draw_asterism(d, cx, cy, fill, r=5):
    diamond(d, cx, cy - 9, r, fill)          # top
    diamond(d, cx - 14, cy + 8, r, fill)     # bottom-left
    diamond(d, cx + 14, cy + 8, r, fill)     # bottom-right

def draw_divider(d, cx, cy):
    diamond(d, cx, cy, 8, GOLD)
    lc = blend(GOLD, BG, 0.5)
    d.line([(cx-120, cy), (cx-24, cy)], fill=lc, width=2)
    d.line([(cx+24, cy), (cx+120, cy)], fill=lc, width=2)

# ---------- mixed-run text engine ----------
def tok_font(style, S):
    if style == 'caps':     return ImageFont.truetype(EBG_MED, int(S*0.84)), max(2, int(S*0.055))
    if style == 'capsital': return ImageFont.truetype(COR_IT, int(S*0.96)), max(2, int(S*0.055))
    return ImageFont.truetype(EBG_REG, S), 0

def tok_width(word, style, S):
    font, tr = tok_font(style, S)
    if tr:  # tracked caps
        x = 0
        for ch in word:
            b = font.getbbox(ch); x += (b[2]-b[0]) + tr
        return x - tr
    return font.getlength(word)

def build_tokens(runs):
    toks = []
    for text, style in runs:
        for w in text.split():
            toks.append((w, style))
    return toks

def layout(tokens, S, maxw):
    spacew = ImageFont.truetype(EBG_REG, S).getlength(' ')
    lines, cur, curw = [], [], 0
    for word, style in tokens:
        w = tok_width(word, style, S)
        add = w + (spacew if cur else 0)
        if cur and curw + add > maxw:
            lines.append(cur); cur, curw = [], 0; add = w
        cur.append((word, style, w)); curw += add
    if cur: lines.append(cur)
    return lines, spacew

def draw_token(d, x, baseline, word, style, S, fill):
    font, tr = tok_font(style, S)
    asc = font.getmetrics()[0]
    ytop = baseline - asc
    if tr:
        for ch in word:
            d.text((x, ytop), ch, font=font, fill=fill)
            b = font.getbbox(ch); x += (b[2]-b[0]) + tr
    else:
        d.text((x, ytop), word, font=font, fill=fill)

def style_fill(style):
    return HEAD if style in ('caps', 'capsital') else BODY

# ---------- cover ----------
def render_cover(title, support, idx):
    img = vignette(BG); d = ImageDraw.Draw(img)
    top_bar(d, idx)
    fl = ImageFont.truetype(EBG_MED, 21)
    spaced(d, (100, 372), 'A COLLECTION OF METAPHYSICAL ESSAYS', fl, LABEL, 5)
    ft = ImageFont.truetype(COR_MIT, 132); ty = 452
    for ln in wrap_plain(title, ft, 900, d):
        d.text((98, ty), ln, font=ft, fill=HEAD); ty += 128
    ry = ty + 20; x = 104
    while x < 366:
        d.line([(x, ry), (x+7, ry)], fill=GOLD, width=3); x += 15
    fs = ImageFont.truetype(EBG_REG, 33); sy = ry + 48
    for ln in wrap_plain(support, fs, 780, d):
        d.text((100, sy), ln, font=fs, fill=SUPPORT); sy += 44
    return img

# ---------- drop-cap helpers ----------
def wrap_variable(words, font, width_fn, draw):
    lines, cur = [], ''
    for w in words:
        t = (cur+' '+w).strip()
        if draw.textlength(t, font=font) <= width_fn(len(lines)):
            cur = t
        else:
            if cur: lines.append(cur)
            cur = w
    if cur: lines.append(cur)
    return lines

def dropcap_metrics(initial, bf, L):
    # True 2-line drop cap: ink spans from line-1 cap-top to line-2 baseline.
    A = bf.getmetrics()[0]
    y0 = bf.getbbox('H')[1]           # body cap-top offset within its line
    target_h = (A + L) - y0
    D = int(target_h / 0.7)
    b = ImageFont.truetype(COR_M, D).getbbox(initial)
    D = max(10, int(D * target_h / (b[3]-b[1])))
    b = ImageFont.truetype(COR_M, D).getbbox(initial)
    return D, (b[2]-b[0]), b        # size, ink width, bbox

def render_dropcap(slide, idx):
    img = vignette(BG); d = ImageDraw.Draw(img)
    top_bar(d, idx)
    text = slide['text']; initial = text[0]; rest = text[1:]
    words = rest.split(); cta = slide.get('cta'); GUT = 10
    S = 46
    while S >= 34:
        L = int(S*1.5); bf = ImageFont.truetype(EBG_REG, S)
        _, ink_w, _ = dropcap_metrics(initial, bf, L)
        indent = ink_w + GUT
        lines = wrap_variable(words, bf, lambda i: (850-indent) if i < 2 else 850, d)
        if L*len(lines) <= 640: break
        S -= 2
    L = int(S*1.5); bf = ImageFont.truetype(EBG_REG, S); A = bf.getmetrics()[0]
    D, ink_w, cb = dropcap_metrics(initial, bf, L); indent = ink_w + GUT
    tail = slide.get('tail'); tail_block = 56 if tail else 0
    cta_block = (58 + 30) if cta else 0
    block_h = L*len(lines) + tail_block + cta_block
    top = int((H - block_h)/2) - 10
    # drop cap: left ink at x=100, baseline on the 2nd line
    capf = ImageFont.truetype(COR_M, D)
    d.text((100 - cb[0], (top + A + L) - cb[3]), initial, font=capf, fill=HEAD)
    for i, ln in enumerate(lines):
        x = 100 + indent if i < 2 else 100
        d.text((x, top + i*L), ln, font=bf, fill=BODY)
    y_after = top + L*len(lines)
    if tail:
        right = max((100 + indent if i < 2 else 100) + bf.getlength(ln)
                    for i, ln in enumerate(lines))
        draw_asterism(d, int((100 + right)/2), y_after + 26, GOLD)
        y_after += tail_block
    if cta:
        spaced(d, (100, y_after + 42), cta, ImageFont.truetype(EBG_MED, 22), GOLD, 4)
    return img

# ---------- reading page (runs or plain), optional center + diamond + cta ----------
def render_reading(slide, idx):
    if slide.get('dropcap'):
        return render_dropcap(slide, idx)
    img = vignette(BG); d = ImageDraw.Draw(img)
    top_bar(d, idx)
    runs = slide.get('runs') or [(slide['text'], 'body')]
    tokens = build_tokens(runs)
    center = slide.get('center'); cta = slide.get('cta')
    orn = slide.get('diamond'); tail = slide.get('tail')
    maxw = 720 if center else 850
    S = 46
    while S >= 34:
        lines, spacew = layout(tokens, S, maxw)
        leading = int(S*1.5)
        if leading * len(lines) <= 660: break
        S -= 2
    leading = int(S*1.5)
    body_asc = ImageFont.truetype(EBG_REG, S).getmetrics()[0]
    orn_block = 74 if orn else 0
    tail_block = 56 if tail else 0
    cta_block = (58 + 30) if cta else 0
    block_h = orn_block + leading * len(lines) + tail_block + cta_block
    y = int((H - block_h) / 2) - 10
    if orn:
        draw_divider(d, W//2, y + 20); y += orn_block
    maxlw = 0
    for line in lines:
        linew = sum(w for _, _, w in line) + spacew*(len(line)-1)
        maxlw = max(maxlw, linew)
        x = (W - linew)//2 if center else 100
        baseline = y + body_asc
        for i, (word, style, w) in enumerate(line):
            draw_token(d, x, baseline, word, style, S, style_fill(style))
            x += w + spacew
        y += leading
    if tail:
        cx = W//2 if center else int(100 + maxlw/2)
        draw_asterism(d, cx, y + 26, GOLD); y += tail_block
    if cta:
        y += 42
        fc = ImageFont.truetype(EBG_MED, 22)
        spaced(d, (100, y), cta, fc, GOLD, 4)
    return img

# ---------- callout, optional big quote glyph ----------
def fit_headline(head, draw, maxw, max_lines, start=72, floor=48):
    size = start
    while size >= floor:
        f = ImageFont.truetype(COR_MIT, size)
        lines = wrap_plain(head, f, maxw, draw)
        if len(lines) <= max_lines: return f, lines, size
        size -= 2
    f = ImageFont.truetype(COR_MIT, floor)
    return f, wrap_plain(head, f, maxw, draw), floor

def render_callout(head, idx, ornament=None):
    img = vignette(BG); d = ImageDraw.Draw(img)
    top_bar(d, idx)
    fh, hlines, hsize = fit_headline(head, d, 880, 4)
    hlead = int(hsize*1.14)
    div_block = 64 if ornament == 'divider' else 0
    block_h = div_block + hlead*len(hlines)
    top = int((H - block_h)/2) - 20
    y = top
    block_w = max(d.textlength(ln, font=fh) for ln in hlines)
    cx = int(98 + block_w/2)
    if ornament == 'divider':
        draw_divider(d, cx, y + 16); y += div_block
    for ln in hlines:
        d.text((98, y), ln, font=fh, fill=HEAD); y += hlead
    return img

# lead-in runs for the intro paragraph: caps + italic-caps title + body
INTRO_RUNS = [
    ('In', 'body'),
    ('THE LORD OF THE RINGS,', 'capsital'),
    ('Sauron, the Dark Lord of Mordor, seeks not wealth, comfort, or even conquest for its own '
     'sake, but absolute dominion. Nothing in Middle-earth is permitted to exist except in service '
     'to his will. Under his shadow, kingdoms fall, peoples are enslaved, and the land itself bears '
     'the scars of his ambition.', 'body'),
]

SLIDES = [
 dict(k='cover', title='A Diminished\nWorld', support='A forest is timber. A mountain is ore.'),
 dict(k='read', runs=INTRO_RUNS),
 dict(k='read', tail='asterism', text='Ancient forests shrink. Places of beauty and memory become wastelands. Travelers who enter Fangorn Forest find themselves in one of the last great remnants of a woodland that had once stretched across much of Middle-earth. As Elrond recalls at the Council of Rivendell, there was a time when “a squirrel could travel from the Shire to Dunland without ever touching the ground.”'),
 dict(k='read', dropcap=True, text='But what was once ordinary has become legendary. Where others found wonder, a darker mind saw only fuel for its ambition. A forest is timber. A mountain is ore. Nothing of value apart from its usefulness. This is the essence of the extractive mindset.'),
 dict(k='read', text='Tolkien imagined evil not only as armies and rings of power but as a way of seeing the world.', center=True, diamond=True),
 dict(k='read', dropcap=True, text='Ecological loss rarely arrives all at once. It comes one clearing, one road, one mine, one justification at a time, until the survivors remember abundance only as legend.'),
 dict(k='read', tail='asterism', text='Our forests, rivers, national parks and public lands occupy a critical place in our cultural imagination. They are not simply recreational spaces or economic assets. They are repositories of memory, biodiversity, beauty, and identity. They remind us that there are parts of the world whose greatest value lies precisely in remaining more than raw material.'),
 dict(k='call', head='An extractive mindset asks what can be removed. A stewardship mindset asks what can endure.', ornament='divider'),
 dict(k='call', head='Do we belong to the natural world, or does it belong to us?', ornament='divider'),
 dict(k='read', dropcap=True, text='How we answer that question will determine whether future generations inherit a living world—or merely stories of the one we lost.',
      cta='READ THE ESSAY ONLINE   →   LINK IN BIO'),
]

OUT = '/Users/tcs16/Desktop/Personal/Projects/metaphysics-git/public/slides/13-diminished'
os.makedirs(OUT, exist_ok=True)
for old in os.listdir(OUT):
    if old.startswith('essay13_slide_') and old.endswith('.png'):
        os.remove(os.path.join(OUT, old))

for i, s in enumerate(SLIDES, start=1):
    if s['k'] == 'cover':
        img = render_cover(s['title'], s['support'], i)
    elif s['k'] == 'read':
        img = render_reading(s, i)
    else:
        img = render_callout(s['head'], i, ornament=s.get('ornament'))
    img.save(f'{OUT}/essay13_slide_{i:02d}.png')
    print(f'wrote essay13_slide_{i:02d}.png ({s["k"]})')
print('done')
