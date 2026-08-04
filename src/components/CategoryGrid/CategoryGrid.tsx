import styles from './CategoryGrid.module.scss'

// Numbered award-category grid (01–NN), sharp bordered cells.
export function CategoryGrid({ categories }: { categories: string[] }) {
  return (
    <ul className={styles.grid}>
      {categories.map((name, i) => (
        <li key={name} className={styles.cell}>
          <span className={styles.num}>{String(i + 1).padStart(2, '0')}</span>
          <span className={styles.name}>{name}</span>
        </li>
      ))}
    </ul>
  )
}
