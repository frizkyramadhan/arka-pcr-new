/**
 * Extract plain text from a React node (e.g. Typography children) for document title.
 */
export function getReactNodeText(node) {
  if (node == null || typeof node === 'boolean') return ''

  if (typeof node === 'string' || typeof node === 'number') {
    return String(node)
  }

  if (Array.isArray(node)) {
    return node.map(getReactNodeText).join('')
  }

  if (node.props?.children != null) {
    return getReactNodeText(node.props.children)
  }

  return ''
}
