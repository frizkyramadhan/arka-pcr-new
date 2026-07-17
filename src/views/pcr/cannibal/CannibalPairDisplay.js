/**
 * @deprecated Gunakan CannibalTransferDisplay — wrapper kompatibilitas print/legacy.
 */
import CannibalTransferDisplay from 'src/views/pcr/cannibal/CannibalTransferDisplay'

const CannibalPairDisplay = ({ pairs = [], compact = false, print = false }) => (
  <CannibalTransferDisplay pairs={pairs} compact={compact} print={print} />
)

export default CannibalPairDisplay
