import styles from './BoardMemberCard.module.scss'

// Faithful board card: a stepped colored frame SVG behind, the photo clipped to the
// matching stepped mask on top (leaving the colored border), role/name in the notch.
export function BoardMemberCard({
  name,
  role,
  photo,
  clip,
  frames,
}: {
  name: string
  role: string
  photo: string
  clip: string
  frames: string[]
}) {
  return (
    <figure className={styles.card}>
      {frames.map((f) => (
        <img key={f} className={styles.frame} src={f} alt="" aria-hidden="true" />
      ))}
      <img
        className={styles.photo}
        src={photo}
        alt={name}
        loading="lazy"
        style={{ WebkitMaskImage: `url(${clip})`, maskImage: `url(${clip})` }}
      />
      <figcaption className={styles.caption}>
        <span className={styles.role}>{role}</span>
        <span className={styles.name}>{name}</span>
      </figcaption>
    </figure>
  )
}
