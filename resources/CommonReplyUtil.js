export function getUserId(e) {
  const fullId = String(e.user_id)
  if (fullId.includes(':_')) return fullId.split(':_')[1]
  if (fullId.includes(':')) return fullId.split(':')[1]
  return fullId
}

export function isQQBot(e) {
  return (e.bot?.adapter?.name || e.platform || '未知') === 'QQBot'
}
