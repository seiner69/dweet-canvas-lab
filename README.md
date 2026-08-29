# Dweet Canvas Lab

Dweet Canvas Lab is a single-page browser workbench for experimenting with compact generative-art snippets. It runs Dwitter-style Canvas code and p5.js sketches, previews animation immediately, exports GIFs, and packs or decodes the UTF-16 form commonly used for character-limited JavaScript experiments.

The interface is in Chinese; code-specific terms such as Dweet, p5.js, GIF, and UTF-16 remain unchanged.

## Highlights

- Runs Dwitter-compatible snippets with the usual `c`, `x`, `t`, `S`, `C`, `T`, and `R` aliases
- Detects p5.js-style sketches and switches to a p5 canvas automatically
- Controls background fill, clearing, playback, time reset, output width, frame count, and delay
- Estimates animation periods to produce smoother GIF loops
- Packs source into UTF-16, reports the 140-character budget, verifies round trips, and decodes packed snippets
- Ships as one HTML file with no build step

## Requirements

- A current Chromium, Firefox, or Safari browser
- Internet access for the pinned p5.js and gifenc CDN dependencies
- Python 3 only if you prefer serving the page over HTTP

## Run

You can open `index.html` directly. A local HTTP server is more consistent across browser security policies:

```bash
python -m http.server 8000
```

Then open `http://127.0.0.1:8000`.

Paste a trusted snippet into the code editor and select **运行**. The default example demonstrates the p5.js path. Dwitter-style Canvas snippets execute without p5.js-specific setup.

## Validate

A basic manual smoke test is:

1. Open the page and confirm the default sketch produces visible pixels.
2. Replace the code with `x.fillRect(0,0,100,100)` and confirm the Dwitter mode label appears.
3. Select **压缩**, then **反解**, and confirm the status reports `反解一致`.
4. Resize below 980 pixels and confirm the page becomes vertically scrollable.
5. Export a short, low-resolution GIF and confirm the file is created.

## Structure

```text
index.html              UI, Canvas runner, p5.js bridge, GIF export, and UTF-16 tools
THIRD_PARTY_NOTICES.md  External runtime dependencies and their licenses
README.md               Usage, validation, and safety notes
```

## Security and limitations

- The runner intentionally evaluates pasted JavaScript with `new Function`. Run only code you trust: a snippet can access the page, browser storage, and network APIs available to the page.
- p5.js and gifenc load from pinned jsDelivr URLs at runtime. The page is not fully offline and inherits CDN availability and supply-chain risk.
- Period detection is heuristic. Complex stateful or non-periodic sketches may need manual frame and delay settings.
- GIF export is CPU- and memory-intensive at high resolution or frame counts.
- UTF-16 packing uses legacy browser `escape`/`unescape` behavior for compatibility with the compact wrapper format.
- No automated cross-browser suite is included; the publication copy is checked with a Chromium smoke test.

## Provenance

The original Codex-assisted tool was created and refined on 2026-06-09. This is a clean publication copy of the completed HTML tool. Experimental screenshots, generated previews, helper scripts, temporary outputs, and the original task history are excluded.

The original source did not include an open-source license, so none has been added here.
