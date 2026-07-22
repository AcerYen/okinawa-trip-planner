const DEFAULT_TOP_OFFSET = 76
const DEFAULT_BOTTOM_OFFSET = 20

/** 元素是否已在可視區內（扣掉頂部 sticky 列） */
export function isFullyVisible(
  el: HTMLElement,
  topOffset = DEFAULT_TOP_OFFSET,
  bottomOffset = DEFAULT_BOTTOM_OFFSET
): boolean {
  const rect = el.getBoundingClientRect()
  return (
    rect.top >= topOffset &&
    rect.bottom <= window.innerHeight - bottomOffset
  )
}

/**
 * 將元素完整捲入可視區：能放得下則置中，過高則對齊頂部並保留 header 間距。
 */
export function scrollFullyIntoView(
  el: HTMLElement,
  topOffset = DEFAULT_TOP_OFFSET,
  bottomOffset = DEFAULT_BOTTOM_OFFSET
) {
  if (isFullyVisible(el, topOffset, bottomOffset)) return

  const rect = el.getBoundingClientRect()
  const viewportH = window.innerHeight
  const available = viewportH - topOffset - bottomOffset

  let delta: number
  if (rect.height <= available) {
    const idealTop = topOffset + (available - rect.height) / 2
    delta = rect.top - idealTop
  } else {
    delta = rect.top - topOffset
  }

  window.scrollTo({
    top: Math.max(0, window.scrollY + delta),
    behavior: 'smooth',
  })
}

/** 等 DOM 排版穩定後再捲動（篩選／換日後） */
export function scrollAfterLayout(fn: () => void): () => void {
  let cancelled = false
  let timer: number | undefined

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      timer = window.setTimeout(() => {
        if (!cancelled) fn()
      }, 60)
    })
  })

  return () => {
    cancelled = true
    if (timer != null) window.clearTimeout(timer)
  }
}
