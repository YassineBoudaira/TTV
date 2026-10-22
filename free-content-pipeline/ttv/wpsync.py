"""Read posts from a WordPress site (REST API, RSS fallback) and save them as articles + images."""
import hashlib, html, io, json, re, urllib.error, urllib.parse, urllib.request
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from PIL import Image
from . import state

UA = {"User-Agent": "Mozilla/5.0 (compatible; content-pipeline/1.0)"}


def http_get(url, timeout=40):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
        return r.read()


class _Extract(HTMLParser):
    BLOCK = {"p", "h1", "h2", "h3", "h4", "h5", "h6", "li", "br", "div", "tr", "blockquote", "figure"}
    SKIP = {"script", "style", "noscript", "iframe", "form", "button", "svg"}

    def __init__(self):
        super().__init__()
        self.parts, self.imgs, self.skip = [], [], 0

    def handle_starttag(self, tag, attrs):
        if tag in self.SKIP:
            self.skip += 1
        if tag in self.BLOCK:
            self.parts.append("\n")
        if tag == "img":
            a = dict(attrs)
            for k in ("data-src", "data-lazy-src", "src"):
                if a.get(k) and not a[k].startswith("data:"):
                    self.imgs.append(a[k]); break

    def handle_endtag(self, tag):
        if tag in self.SKIP and self.skip:
            self.skip -= 1
        if tag in self.BLOCK:
            self.parts.append("\n")

    def handle_data(self, data):
        if not self.skip:
            self.parts.append(data)


def html_to_text(h):
    p = _Extract()
    p.feed(h)
    text = html.unescape("".join(p.parts))
    lines = [re.sub(r"\s+", " ", l).strip() for l in text.split("\n")]
    return "\n".join(l for l in lines if l), p.imgs


def _plain(h):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", h or ""))).strip()


def fetch_rest(base):
    posts, page = [], 1
    while page <= 40:
        url = f"{base}/wp-json/wp/v2/posts?per_page=50&page={page}&_embed=1&orderby=date&order=desc"
        try:
            batch = json.loads(http_get(url))
        except urllib.error.HTTPError as e:
            if e.code == 400 and page > 1:   # WordPress answers 400 past the last page
                break
            raise
        if not batch:
            break
        for p in batch:
            feat = ""
            try:
                feat = p["_embedded"]["wp:featuredmedia"][0]["source_url"]
            except Exception:
                pass
            posts.append({"id": str(p["id"]), "slug": p.get("slug", ""), "link": p.get("link", ""),
                          "modified": p.get("modified_gmt") or p.get("modified", ""), "date": p.get("date_gmt") or p.get("date", ""),
                          "title": _plain(p["title"]["rendered"]), "content": p["content"]["rendered"],
                          "featured": feat})
        page += 1
    return posts


def fetch_feed(base):
    ns = {"c": "http://purl.org/rss/1.0/modules/content/"}
    posts, page = [], 1
    while page <= 20:
        try:
            root = ET.fromstring(http_get(f"{base}/feed/?paged={page}"))
        except Exception:
            break
        items = root.findall("./channel/item")
        if not items:
            break
        for it in items:
            link = (it.findtext("link") or "").strip()
            slug = link.rstrip("/").split("/")[-1]
            body = it.findtext("c:encoded", namespaces=ns) or it.findtext("description") or ""
            posts.append({"id": slug, "slug": slug, "link": link, "modified": it.findtext("pubDate") or "", "date": it.findtext("pubDate") or "",
                          "title": _plain(it.findtext("title") or ""), "content": body, "featured": ""})
        page += 1
    return posts


def normalize(p):
    """Add the readable text, the images found in the text and a hash of the content (used to detect edits)."""
    p["text"], p["imgs"] = html_to_text(p["content"])
    p["hash"] = state.content_hash(p["title"], p["text"])
    p["slug_safe"] = safe_slug(p)
    return p


def safe_slug(p):
    return re.sub(r"[^A-Za-z0-9\u0600-\u06FF_-]+", "-", p["slug"]).strip("-")[:80] or f"post-{p['id']}"


def fetch_posts(base):
    base = base.rstrip("/")
    try:
        posts = fetch_rest(base)
        if posts:
            print(f"[ok] {len(posts)} posts read from the WordPress REST API")
            return [normalize(p) for p in posts]
    except Exception as e:
        print(f"[i] REST API not available ({type(e).__name__}) -> trying the RSS feed")
    posts = fetch_feed(base)
    print(f"[ok] {len(posts)} posts read from the RSS feed" if posts else "[!] no posts found")
    return [normalize(p) for p in posts]


def download_images(urls, link, folder, max_images):
    folder.mkdir(parents=True, exist_ok=True)
    seen, n = set(), 0
    for u in urls:
        if n >= max_images:
            break
        u = urllib.parse.urljoin(link, u)
        try:
            data = http_get(u)
            im = Image.open(io.BytesIO(data))
            if im.width < 500 or im.height < 300:
                continue
            h = hashlib.md5(data).hexdigest()
            if h in seen:
                continue
            seen.add(h)
            im = im.convert("RGB")
            im.thumbnail((2560, 2560))
            n += 1
            im.save(folder / f"{n:02d}.jpg", quality=90)
        except Exception:
            continue
    return n


def save_post(p, root, max_images=8, refresh_images=False):
    """Write articles/<slug>.md (+ .json with the link) and download the post's images to media/<slug>/."""
    slug = p.get("slug_safe") or safe_slug(p)
    (root / "articles").mkdir(exist_ok=True)
    path = root / "articles" / f"{slug}.md"
    path.write_text(f"# {p['title']}\n\n{p['text']}\n", encoding="utf-8")
    (root / "articles" / f"{slug}.json").write_text(
        json.dumps({"link": p["link"], "id": p["id"], "title": p["title"], "date": p.get("date", "")}, ensure_ascii=False), encoding="utf-8")
    folder = root / "media" / slug
    if refresh_images or not folder.exists() or not any(folder.iterdir()):
        urls = ([p["featured"]] if p["featured"] else []) + p["imgs"]
        n = download_images(urls, p["link"] or "", folder, max_images)
    else:
        n = len(list(folder.iterdir()))
    return path, n
