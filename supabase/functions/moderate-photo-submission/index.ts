// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing required environment configuration")
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

serve(async (req) => {
  try {
    const { photoIds, action, galleryId } = await req.json()

    if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "photoIds array required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    if (!action || !['approve', 'reject'].includes(action)) {
      return new Response(
        JSON.stringify({ error: "action must be 'approve' or 'reject'" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    const status = action === 'approve' ? 'approved' : 'rejected'

    // Update photo statuses
    const { data: updatedPhotos, error: updateError } = await supabase
      .from('gallery_photos')
      .update({ status })
      .in('id', photoIds)
      .select('id, uploaded_by_user_id, gallery_id, galleries!inner(name)')

    if (updateError) {
      throw updateError
    }

    // Get uploader emails and send notifications
    const uploaderIds = [...new Set(updatedPhotos.map((p: any) => p.uploaded_by_user_id))]
    
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email')
      .in('id', uploaderIds)

    if (usersError) {
      console.error('Error fetching users:', usersError)
    }

    const userEmailMap = new Map((users || []).map((u: any) => [u.id, u.email]))

    // Send emails to uploaders
    for (const photo of updatedPhotos) {
      const uploaderEmail = userEmailMap.get(photo.uploaded_by_user_id)
      if (!uploaderEmail) continue

      const galleryName = (photo as any).galleries?.name || 'Gallery'
      const subject = action === 'approve'
        ? `Your photo was approved - ${galleryName}`
        : `Your photo was not approved - ${galleryName}`
      const title = action === 'approve' ? 'Photo Approved' : 'Photo Not Approved'
      const body = action === 'approve'
        ? `Your photo has been approved and added to ${galleryName}.`
        : `Your photo was not approved for ${galleryName}. Please review the team's media guidelines and try again.`
      const galleryLink = action === 'approve'
        ? `${supabaseUrl.replace('/rest/v1', '')}/portal/photos/gallery/${photo.gallery_id}`
        : undefined

      const { data: org } = await supabase
        .from('galleries')
        .select('org_id')
        .eq('id', photo.gallery_id)
        .single()

      try {
        await supabase.from("notification_jobs").insert({
          org_id: org?.org_id,
          user_id: photo.uploaded_by_user_id,
          email: uploaderEmail,
          type: "photo_moderation",
          payload: {
            subject,
            title,
            body,
            gallery_link: galleryLink,
          },
          status: "queued",
        })
      } catch (emailError) {
        console.error(`Failed to queue email for ${uploaderEmail}:`, emailError)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        updated: updatedPhotos.length,
        emailsSent: uploaderIds.length,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("Error in moderate-photo-submission:", error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
