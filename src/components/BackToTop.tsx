import { useEffect, useState } from 'react'
import styles from './BackToTop.module.css'

const SHOW_AFTER = 360

export default function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > SHOW_AFTER)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!visible) return null

  return (
    <button
      type="button"
      className={styles.btn}
      aria-label="回到最上面"
      title="回到最上面"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
    >
      <span aria-hidden>↑</span>
      <em>頂部</em>
    </button>
  )
}
