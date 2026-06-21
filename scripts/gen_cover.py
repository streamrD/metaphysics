from PIL import Image, ImageDraw, ImageFont

REG  = '/System/Library/Fonts/Supplemental/Georgia.ttf'
ITAL = '/System/Library/Fonts/Supplemental/Georgia Italic.ttf'

def spaced_width(text, font, spacing):
    w = 0
    for ch in text:
        bbox = font.getbbox(ch)
        w += (bbox[2] - bbox[0]) + spacing
    return w - spacing

def spaced_text(d, pos, text, font, fill, spacing):
    x, y = pos
    for ch in text:
        d.text((x, y), ch, font=font, fill=fill)
        bbox = font.getbbox(ch)
        x += (bbox[2] - bbox[0]) + spacing

def text_at_captop(d, x, ytop, text, font, fill):
    """Draw text so the top of its ink lands at ytop."""
    bbox = d.textbbox((0, 0), text, font=font)
    d.text((x, ytop - bbox[1]), text, font=font, fill=fill)

def make_cover(out, bg, header2, title_lines, quote_lines, *,
               gold, muted, dark, quote_col, cream=None,
               title_top, divider_y, quote_top, footer=None, footer_col=None):
    img = Image.new('RGB', (1080, 1080), bg)
    d = ImageDraw.Draw(img)

    f_hdr   = ImageFont.truetype(REG, 22)
    f_title = ImageFont.truetype(REG, 112)
    f_titlei= ImageFont.truetype(ITAL, 112)
    f_quote = ImageFont.truetype(ITAL, 33)
    f_foot  = ImageFont.truetype(REG, 20)

    # Headers (letter-spaced caps), ink tops at y=94 and y=127
    spaced_text(d, (105, 94 - ImageFont.truetype(REG,22).getbbox('A')[1]-0), 'A COLLECTION OF METAPHYSICAL ESSAYS', f_hdr, gold, 4)
    spaced_text(d, (105, 127 - f_hdr.getbbox('E')[1]), header2, f_hdr, muted, 4)

    # Title lines: (text, italic?) tuples; ink top of first line at title_top, leading 114
    ty = title_top
    for text, italic in title_lines:
        f = f_titlei if italic else f_title
        text_at_captop(d, 105, ty, text, f, dark if cream is None else cream)
        ty += 114

    # Divider: lines + diamond centered at divider_y
    line_col = tuple((c + b) // 2 for c, b in zip(gold, bg))
    d.line([(105, divider_y), (235, divider_y)], fill=line_col, width=2)
    d.polygon([(255, divider_y-9), (264, divider_y), (255, divider_y+9), (246, divider_y)], fill=gold)
    d.line([(275, divider_y), (405, divider_y)], fill=line_col, width=2)

    # Quote lines, ink top of first at quote_top, leading 51
    qy = quote_top
    for line in quote_lines:
        text_at_captop(d, 105, qy, line, f_quote, quote_col)
        qy += 51

    # Author, ink top at y=980
    spaced_text(d, (105, 980 - f_hdr.getbbox('T')[1]), 'TODD STABLEY', f_hdr, muted, 4)

    # Footer (rollover only): right-aligned lines, bottom line's ink top at 974
    if footer:
        for i, line in enumerate(footer):
            wline = d.textlength(line, font=f_foot)
            bbox = d.textbbox((0,0), line, font=f_foot)
            ytop = 974 - 30 * (len(footer) - 1 - i)
            d.text((974 - wline, ytop - bbox[1]), line, font=f_foot, fill=footer_col)

    img.save(out)
    print('wrote', out)

GRAY      = (239, 239, 237)
GOLD      = (184, 150, 12)
MUTED     = (138, 122, 90)
DARK      = (42, 37, 32)
QUOTE     = (74, 64, 48)

# Dark rollover palette (essay 7 measured)
D_GOLD  = (200, 168, 74)
D_MUTED = (168, 152, 120)
D_CREAM = (240, 235, 224)
D_QUOTE = (212, 200, 168)

APPRENTICE_BG = (42, 34, 24)   # dark brown — matches the Unity deck
PASSENGERS_BG = (140, 58, 26)  # rust — same as essay 3's deck/hover slide


def gen_apprentice():
    folder = '/Users/tcs16/Desktop/Personal/Projects/metaphysics-git/public/slides/11-apprentice'
    import os; os.makedirs(folder, exist_ok=True)

    title = [('The', False), ('Apprentice', True)]
    quote = ['We all choose our path.', 'But others step in to help.']
    header2 = 'ESSAY 11 · THE APPRENTICE'

    make_cover(f'{folder}/essay11_slide_01_gray.png', GRAY, header2, title, quote,
        gold=GOLD, muted=MUTED, dark=DARK, quote_col=QUOTE,
        title_top=371, divider_y=788, quote_top=845)

    make_cover(f'{folder}/essay11_cover_rollover.png', APPRENTICE_BG, header2, title, quote,
        gold=D_GOLD, muted=D_MUTED, dark=None, cream=D_CREAM, quote_col=D_QUOTE,
        title_top=352, divider_y=750, quote_top=807,
        footer=['metaphysics.up.railway.app'],
        footer_col=D_GOLD)


def gen_passengers():
    folder = '/Users/tcs16/Desktop/Personal/Projects/metaphysics-git/public/slides/12-passengers'
    import os; os.makedirs(folder, exist_ok=True)

    # Single-line title sits lower; divider/quote raised to balance the whitespace.
    title = [('Passengers', False)]
    quote = ['This is what happens to rugged individualism',
             'after the frontier has closed.']
    header2 = 'ESSAY 12 · PASSENGERS'

    make_cover(f'{folder}/essay12_slide_01_gray.png', GRAY, header2, title, quote,
        gold=GOLD, muted=MUTED, dark=DARK, quote_col=QUOTE,
        title_top=440, divider_y=740, quote_top=797)

    make_cover(f'{folder}/essay12_cover_rollover.png', PASSENGERS_BG, header2, title, quote,
        gold=D_GOLD, muted=D_MUTED, dark=None, cream=D_CREAM, quote_col=D_QUOTE,
        title_top=421, divider_y=702, quote_top=759,
        footer=['metaphysics.up.railway.app'],
        footer_col=D_GOLD)


if __name__ == '__main__':
    gen_passengers()
