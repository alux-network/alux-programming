# Reading illustrations

The web reader uses a small family of brass, ivory and forest-green illustrations. The original Markdown and images in `src/assets/` remain intact for mdBook; the web content generator maps the four section images to this family before localization. Both reading worlds and their static fallbacks receive the same mapping.

| Source image | Web asset | Meaning |
| --- | --- | --- |
| `semantic-view.png` | `art/semantic-view.webp` | A prism: one input, different interpretations. |
| `design-by-meaning-rust.png` | `art/capability-crab.webp` | The existing Rust crab and capability blocks. |
| `concepts.png` | `art/concepts.webp` | Connected mechanisms and their tools. |
| `insights.png` | `art/insights.webp` | Reading closely and finding connections. |

The prism, mechanisms and book/lens images were redrawn for the web reader on 2026-10-23 using the existing images as subject references and the accepted crab as a material reference. Their saved masters are transparent 1254 × 1254 PNGs; all four runtime section illustrations are 512 × 512 WebP. The generation tool did not expose an exact output-size control. These are not native 4K assets.

Keep complete objects and transparent margins. Check both PNG and WebP on the actual day and night backgrounds, at their rendered size and at full resolution. Unused PNG masters are kept outside the Git/public tree in the local visual asset library (`07_视觉设计/20261023_ALUX网页素材`), with verified identical copies before removal. Original mdBook assets in `src/assets/` remain unchanged. Do not regenerate the official ALUX mark, change chapter meaning, add text to decorative illustrations, or replace technical diagrams without checking their content.

Size runtime assets for their rendered use, including high-density screens. The official marks are 256 × 239 WebP (62–72 CSS pixels); the ribbon is 256 × 704 WebP (85 CSS-pixel background width); section illustrations are at most 140 CSS pixels tall. These have more than 2× resolution at their current display sizes. Verify both a 3840 × 2160 viewport at DPR 1 and a 1920 × 1080 viewport at DPR 2 when changing them. Preserve full subjects, aspect ratios and alpha; do not reduce the forest, wizard or full-width surfaces to icon sizes. The forest stays at its native 1672 × 941 and the standing wizard at 1024 × 1536; a 4K display does not make these native 4K artwork. New native high-resolution sources would be needed for pixel-for-pixel full-screen 4K detail. Do not upscale and label them native 4K.

Removing masters reduces the current checkout and static build, not blobs retained in earlier Git commits. Do not rewrite shared history to remove those blobs without explicit authorization.

For a future replacement, add the asset here, update the single mapping in `scripts/reader-presentation.ts`, and check all four reading combinations: magic book, magic scroll, real day and real night. Preserve original alt text where its meaning still applies; otherwise update and localize it deliberately.
