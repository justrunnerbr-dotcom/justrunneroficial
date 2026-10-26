import { getAdminSupabase } from '@/lib/admin-client'

export async function getIgConfig(): Promise<{ igUserId: string; accessToken: string }> {
  const db = getAdminSupabase()
  const { data } = await db.from('ig_config').select('ig_user_id, access_token').eq('id', 1).single()
  if (!data?.access_token || !data?.ig_user_id) {
    throw new Error('Instagram não conectado ainda — vá em /admin/instagram e clique em "Conectar Instagram"')
  }
  return { igUserId: data.ig_user_id, accessToken: data.access_token }
}
