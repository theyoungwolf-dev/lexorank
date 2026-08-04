# Lexorank Demo Widget

An embeddable, self-isolating demo of `@theyoungwolf/lexorank`. One file, no build
step, no bundler. The library is fetched from a CDN at runtime, so **this widget
does not need rebuilding when a new version of the library ships**.

[See it running →](https://lexorank.theyoungwolf.dev)

## Embed it

```html
<lexorank-demo></lexorank-demo>
<script type="module" src="https://lexorank.theyoungwolf.dev/widget.js"></script>
```

That is the whole snippet. `type="module"` is deferred by default, so it never
blocks rendering, and the element renders wherever you place the tag rather than
wherever the script happens to sit.

_Served from a domain I control, so updates are live on deploy_

## Version pinning

By default the widget loads `@theyoungwolf/lexorank@^0.1` - patch and minor
releases flow through automatically. Override it per-instance:

```html
<!-- pin exactly -->
<lexorank-demo lib="https://esm.sh/@theyoungwolf/lexorank@0.1.1"></lexorank-demo>

<!-- follow a future major -->
<lexorank-demo lib="https://esm.sh/@theyoungwolf/lexorank@^1"></lexorank-demo>
```

Widen the range and the demo picks up new releases on its own. Narrow it before a
major version lands, so an API change can't break the embed on someone else's site.

## Theming

The defaults stand alone - the two-line embed above needs no styling. When you do
want to match a host design, set custom properties on the element. They inherit
through the shadow boundary, so they reach the internals:

```html
<lexorank-demo style="--lexorank-accent:#0EA5E9; --lexorank-bg:transparent"></lexorank-demo>
```

```jsx
<lexorank-demo
  style={{
    "--lexorank-accent": "var(--brand)",
    "--lexorank-surface": "var(--card)",
    "--lexorank-radius": "6px",
  }}
/>
```

| Property                 | Default      | Controls                         |
| ------------------------ | ------------ | -------------------------------- |
| `--lexorank-accent`      | `#534AB7`    | Buttons, rank chips, focus rings |
| `--lexorank-accent-soft` | `#EEEDFE`    | Rank chip background             |
| `--lexorank-accent-line` | `#CECBF6`    | Card hover border                |
| `--lexorank-bg`          | `#F7F7FB`    | Outer background                 |
| `--lexorank-surface`     | `#fff`       | Cards and panels                 |
| `--lexorank-text`        | `#1C1B22`    | Body text                        |
| `--lexorank-muted`       | `#6B6880`    | Labels and captions              |
| `--lexorank-border`      | `#E4E3EC`    | All borders                      |
| `--lexorank-positive`    | `#1D9E75`    | The "rank strings" counter       |
| `--lexorank-negative`    | `#A32D2D`    | The "integer positions" counter  |
| `--lexorank-font`        | system stack | UI typeface                      |
| `--lexorank-mono`        | system mono  | Rank strings and the call log    |
| `--lexorank-radius`      | `14px`       | Outer corner radius              |
| `--lexorank-padding`     | `18px`       | Outer padding                    |
| `--lexorank-list-height` | `336px`      | Height of the scrolling board    |

Setting `padding` or `background` directly on the element instead will not work
the way you expect: those apply to the host box, outside the widget's own shell,
and cannot reach anything inside the shadow root. Use the properties above.

## Bounded height

The board scrolls inside a fixed region, so the widget never grows past roughly
**660px** no matter how many cards accumulate - measured stable from 25 cards
through 625. Embedding it does not put your page layout at the mercy of whatever
a visitor clicks.

The clipped edges are faded rather than hard-cut, and the fade appears only on the
side that actually has more content. The scrollbar is thin and unobtrusive, and
hidden entirely when the list fits.

Change the cap with a custom property:

```html
<lexorank-demo style="--lexorank-list-height:240px"></lexorank-demo>
```

Dragging works inside the scroll region: hold a card near the top or bottom edge
and the list scrolls to follow.

## Isolation

Everything renders in a shadow root. Host-page CSS cannot reach in and the
widget's styles cannot leak out - verified against a host page that sets
`div{border:3px dashed red}` and `button{background:lime}`.

One subtlety worth knowing if you fork this: rules in the host page that match
the **host element itself** beat `:host` rules regardless of specificity, so a
global reset such as `*{margin:0;padding:0}` (Tailwind preflight, most CSS
resets) will strip padding declared on `:host`. The widget therefore keeps
`:host` to `display:block` only and applies the whole visual shell - padding,
border, radius, background, typography - to an inner `.root` element inside the
shadow root, where outer CSS genuinely cannot reach.

Layout responds via `@container`, not `@media`, so it adapts to the width of the
slot it is placed in rather than the width of the browser window. Dropping it into
a narrow sidebar works without configuration.

## If the CDN is unreachable

The widget shows a short message with a link to the package instead of an empty
box, and the host page is unaffected.

## Local development

```sh
npx serve .          # or: python3 -m http.server
```

`index.html` is the public demo page and loads the library from the CDN.
`test.html` applies deliberately hostile host styles, so it doubles as the
isolation test.

## What it demonstrates

| Interaction           | Point                                                |
| --------------------- | ---------------------------------------------------- |
| Drag a card           | One row written, whatever the list size              |
| Rows-written counters | The same move under integer positions                |
| Drop 20 at the top    | The minor growing - the documented limitation        |
| Rebalance             | Depth cleared, order preserved                       |
| Calls log             | The exact `rankBetween(prev, next)` behind each move |

## Notes on the approach

This follows the classic embeddable-widget pattern - a small snippet, isolated,
async, no assumptions about the host page - with three parts modernised:

- **Shadow DOM instead of an injected `<style>` tag.** Real isolation in both
  directions. Older write-ups of this pattern skip it for browser-support reasons
  that no longer apply.
- **A custom element instead of a command queue.** Configuration lives in HTML
  attributes, so there's no `w[o].q` buffer and no ordering hazard between the
  loader snippet and its config block.
- **Native ESM instead of a bundler.** No webpack, no Babel, no build output to
  keep in sync. The file you edit is the file that ships.
