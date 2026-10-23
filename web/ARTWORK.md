# Reading illustrations

The web reader uses a small family of brass, ivory and forest-green illustrations. The original Markdown and images in `src/assets/` remain intact for mdBook; the web content generator maps the four section images to this family before localization. Both reading worlds and their static fallbacks receive the same mapping.

| Source image | Web asset | Meaning |
| --- | --- | --- |
| `semantic-view.png` | `art/semantic-view.webp` | A prism: one input, different interpretations. |
| `design-by-meaning-rust.png` | `art/capability-crab.webp` | The existing Rust crab and capability blocks. |
| `concepts.png` | `art/concepts.webp` | Connected mechanisms and their tools. |
| `insights.png` | `art/insights.webp` | Reading closely and finding connections. |

The prism, mechanisms and book/lens images were redrawn for the web reader on 2026-10-23 using the existing images as subject references and the accepted crab as a material reference. Their saved masters are transparent 1254 × 1254 PNGs; runtime WebP versions are 512 × 512. The generation tool did not expose an exact output-size control. These are not native 4K assets.

Keep complete objects and transparent margins. Check both PNG and WebP on the actual day and night backgrounds, at their rendered size and at full resolution. The PNG masters are not runtime page dependencies. Do not regenerate the official ALUX mark, change chapter meaning, add text to decorative illustrations, or replace technical diagrams without checking their content.

For a future replacement, add the asset here, update the single mapping in `scripts/reader-presentation.ts`, and check all four reading combinations: magic book, magic scroll, real day and real night. Preserve original alt text where its meaning still applies; otherwise update and localize it deliberately.
