import styles from './BoardMemberCard.module.scss'

// Real board photo with role + name overlaid bottom-right (matches the Figma landing).
export function BoardMemberCard({
  name,
  role,
  photo,
}: {
  name: string
  role: string
  photo: string
}) {
  return (
    <figure className={styles.card}>
      <img src={photo} alt={name} className={styles.photo} width={256} height={318} loading="lazy" />
      <figcaption className={styles.caption}>
        <span className={styles.role}>{role}</span>
        <span className={styles.name}>{name}</span>
      </figcaption>
    </figure>
  )
}
