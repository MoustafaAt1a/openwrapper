/**
 * GooFilterProvider
 *
 * Injects a hidden zero-pixel SVG containing reusable goo (metaball) filters.
 * Mount once in the root layout. All goo components reference these filters
 * via CSS `filter: url(#goo-filter)`.
 *
 * Two filter strengths:
 * - `#goo-filter`: Standard gooey merge (stdDeviation=10, high contrast)
 * - `#goo-filter-light`: Subtle goo for smaller elements (stdDeviation=5)
 */
export function GooFilterProvider() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none fixed size-0 overflow-hidden"
      style={{ position: "absolute", width: 0, height: 0 }}
    >
      <defs>
        {/* Standard goo — for tabs, FABs, loaders */}
        <filter id="goo-filter">
          <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -9"
            result="goo"
          />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>

        {/* Light goo — for small elements, reactions, popovers */}
        <filter id="goo-filter-light">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
            result="goo"
          />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
      </defs>
    </svg>
  )
}
