import { weatherInfo, travelTips } from '../data/okinawa'
import styles from './Overview.module.css'

export default function Overview() {
  return (
    <section className={styles.section}>
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <span className={styles.badge}>2026 年 9–10 月 · 孕期友善親子 8 天</span>
          <h1 className={styles.title}>沖繩家庭之旅</h1>
          <p className={styles.subtitle}>
            夫婦二人 × 1 歲半寶寶 · 媽媽懷孕約 4 個月 · 8 天 7 夜
          </p>
          <p className={styles.desc}>
            沖繩飛行約 1.5 小時，節奏可慢。本行程以推車、空調室內與短訪為主，
            避開洞穴、長坡與離島船班，讓寶寶午睡與媽媽體力都能跟上。
          </p>
        </div>
        <div className={styles.heroVisual}>
          <div className={styles.wave} />
          <span className={styles.emoji}>🏝️</span>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <h3>🌡️ 9–10 月天氣</h3>
          <dl className={styles.weatherList}>
            <div><dt>氣溫</dt><dd>{weatherInfo.temp.high} / {weatherInfo.temp.low}</dd></div>
            <div><dt>濕度</dt><dd>{weatherInfo.humidity}</dd></div>
            <div><dt>降雨</dt><dd>{weatherInfo.rainDays}</dd></div>
            <div><dt>颱風</dt><dd>{weatherInfo.typhoon}</dd></div>
            <div><dt>穿著</dt><dd>{weatherInfo.clothing}</dd></div>
            <div><dt>防曬</dt><dd>{weatherInfo.uv}</dd></div>
          </dl>
        </div>

        <div className={styles.card}>
          <h3>📋 行前速查</h3>
          <ul className={styles.checklist}>
            <li>✅ 護照有效期限（寶寶也需要護照）</li>
            <li>✅ 國際駕照 + 本國駕照 + 日文翻譯件</li>
            <li>✅ 兒童安全座椅（租車時加購）</li>
            <li>✅ 旅遊保險（含醫療；孕期請確認海外就醫條款）</li>
            <li>✅ 日幣現金 + 信用卡</li>
            <li>✅ 出發前確認颱風動態</li>
            <li>✅ 產檢摘要／常用藥清單（備用）</li>
          </ul>
        </div>
      </div>

      <h2 className={styles.sectionTitle}>帶幼兒旅行小撇步</h2>
      <div className={styles.tipsGrid}>
        {travelTips.map((tip) => (
          <div key={tip.title} className={styles.tipCard}>
            <span className={styles.tipIcon}>{tip.icon}</span>
            <h4>{tip.title}</h4>
            <p>{tip.content}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
