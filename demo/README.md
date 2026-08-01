# lexorank demo widget

An embeddable, self-isolating demo of `@theyoungwolf/lexorank`. One file, no build
step, no bundler. The library is fetched from a CDN at runtime, so **this widget
does not need rebuilding when a new version of the library ships**.

## Embed it

```html
<lexorank-demo></lexorank-demo>
<script type="module" src="https://cdn.jsdelivr.net/gh/theyoungwolf-dev/lexorank@main/demo/widget.js"></script>
```

That is the whole snippet. `type="module"` is deferred by default, so it never
blocks rendering, and the element renders wherever you place the tag rather than
wherever the script happens to sit.

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
<lexorank-demo style="--list-max:240px"></lexorank-demo>
```

Dragging works inside the scroll region: hold a card near the top or bottom edge
and the list scrolls to follow.

## Isolation

Everything renders in a shadow root. Host-page CSS cannot reach in and the
widget's styles cannot leak out - verified against a host page that sets
`div{border:3px dashed red}` and `button{background:lime}`.

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

`index.html` points the widget at a local copy of the library and applies hostile
host styles, so it doubles as the isolation test.

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
