// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const resendApiKey = Deno.env.get("RESEND_API_KEY") || ""
const fromEmail = Deno.env.get("NOTIFICATIONS_FROM_EMAIL") || "notifications@youthsports.team"

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing required environment configuration")
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function sendEmail(to: string, subject: string, html: string) {
  if (!resendApiKey || !fromEmail) {
    console.warn("Email not configured (RESEND_API_KEY / NOTIFICATIONS_FROM_EMAIL) - skipping email")
    return
  }

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to,
      subject,
      html,
    }),
  })

  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`Resend error: ${resp.status} ${text}`)
  }
}

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

      const html = action === 'approve'
        ? `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Photo Approved</h2>
            <p>Your photo has been approved and added to <strong>${galleryName}</strong>.</p>
            <p><a href="${supabaseUrl.replace('/rest/v1', '')}/portal/photos/gallery/${photo.gallery_id}">View Gallery</a></p>
          </div>
        `
        : `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Photo Not Approved</h2>
            <p>Your photo was not approved for <strong>${galleryName}</strong>. Please review the team's media guidelines and try again.</p>
          </div>
        `

      try {
        await sendEmail(uploaderEmail, subject, html)
      } catch (emailError) {
        console.error(`Failed to send email to ${uploaderEmail}:`, emailError)
        // Continue processing other photos even if one email fails
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
