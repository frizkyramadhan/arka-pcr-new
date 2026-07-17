import menuConfig from '../menuConfig'

/**
 * Menu navigasi horizontal — struktur & rute sama dengan vertical.
 * Section title tidak ditampilkan di layout horizontal.
 */
const navigation = () => menuConfig.filter(item => !item.sectionTitle)

export default navigation
