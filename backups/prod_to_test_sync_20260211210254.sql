drop trigger if exists "trg_auto_create_athlete_gallery" on "public"."athletes";

drop trigger if exists "trg_create_athlete_gallery" on "public"."athletes";

drop trigger if exists "trg_delete_athlete_gallery" on "public"."athletes";

drop trigger if exists "trg_auto_create_event_gallery" on "public"."events";

drop trigger if exists "trg_create_event_gallery" on "public"."events";

drop trigger if exists "trg_delete_event_gallery" on "public"."events";

drop trigger if exists "trg_populate_fan_feed_on_follow" on "public"."fan_org_follows";

drop trigger if exists "trigger_validate_feature_parent" on "public"."feature_entitlements";

drop trigger if exists "trg_prevent_system_gallery_delete" on "public"."galleries";

drop trigger if exists "trg_auto_create_org_gallery" on "public"."organizations";

drop trigger if exists "trg_delete_org_gallery" on "public"."organizations";

drop trigger if exists "ticketed_events_program_refresh" on "public"."programs";

drop trigger if exists "trg_create_program_gallery" on "public"."programs";

drop trigger if exists "trg_delete_program_gallery" on "public"."programs";

drop trigger if exists "trg_auto_create_season_gallery" on "public"."seasons";

drop trigger if exists "trg_delete_season_gallery" on "public"."seasons";

drop trigger if exists "trg_auto_create_team_gallery" on "public"."teams";

drop trigger if exists "trg_create_team_gallery" on "public"."teams";

drop trigger if exists "trg_delete_team_gallery" on "public"."teams";

drop trigger if exists "ticketed_events_search_tsv" on "public"."ticketed_events";

drop trigger if exists "trg_auto_create_travel_plan_gallery" on "public"."travel_plans";

drop trigger if exists "trg_create_travel_gallery" on "public"."travel_plans";

drop trigger if exists "trg_delete_travel_gallery" on "public"."travel_plans";

drop trigger if exists "trg_delete_travel_plan_gallery" on "public"."travel_plans";

drop trigger if exists "trigger_video_comment_count" on "public"."video_comments";

drop trigger if exists "trigger_video_bookmark_count" on "public"."video_favorites";

drop trigger if exists "trigger_video_share_count" on "public"."video_shares";

drop trigger if exists "trigger_videos_search_vector" on "public"."videos";

drop trigger if exists "trigger_log_feature_flag_changes" on "public"."feature_flags";

drop policy "Admins can manage events" on "public"."events";

drop policy "Fans can view public events by org" on "public"."events";

drop policy "fans_can_view_public_events" on "public"."events";

drop policy "Users can view their own calendar cache" on "public"."fan_calendar_cache";

drop policy "Users can manage their own bookmarks" on "public"."fan_event_bookmarks";

drop policy "Users can update their own feed read status" on "public"."fan_feed";

drop policy "Users can view their own feed" on "public"."fan_feed";

drop policy "Users can manage their own follows" on "public"."fan_org_follows";

drop policy "feature_deps_all_service" on "public"."feature_dependencies";

drop policy "feature_deps_select" on "public"."feature_dependencies";

drop policy "gallery_photo_bookmarks_delete_own" on "public"."gallery_photo_bookmarks";

drop policy "gallery_photo_bookmarks_insert_own" on "public"."gallery_photo_bookmarks";

drop policy "gallery_photo_bookmarks_select_own" on "public"."gallery_photo_bookmarks";

drop policy "Authenticated users can delete photo tags" on "public"."gallery_photo_tags";

drop policy "Authenticated users can insert photo tags" on "public"."gallery_photo_tags";

drop policy "Authenticated users can view photo tags" on "public"."gallery_photo_tags";

drop policy "gallery_zip_downloads_insert_own" on "public"."gallery_zip_downloads";

drop policy "gallery_zip_downloads_select_own" on "public"."gallery_zip_downloads";

drop policy "org_storage_usage_insert_policy" on "public"."org_storage_usage";

drop policy "Org admins can view audit logs" on "public"."org_user_audit_log";

drop policy "Authenticated users can view public organizations" on "public"."organizations";

drop policy "Org admins can view org purchases" on "public"."purchases";

drop policy "Users can view their own purchases" on "public"."purchases";

drop policy "seasons__org_delete" on "public"."seasons";

drop policy "seasons__org_insert" on "public"."seasons";

drop policy "seasons__org_select" on "public"."seasons";

drop policy "seasons__org_update" on "public"."seasons";

drop policy "Only service role can delete ticket orders" on "public"."ticket_orders";

drop policy "Only service role can insert ticket orders" on "public"."ticket_orders";

drop policy "Only service role can update ticket orders" on "public"."ticket_orders";

drop policy "Users can view ticket orders for their org" on "public"."ticket_orders";

drop policy "Users can manage their own reservations" on "public"."ticket_reservations";

drop policy "Users can manage their own notification preferences" on "public"."user_notification_preferences";

drop policy "video_favorites_delete" on "public"."video_favorites";

drop policy "video_favorites_insert" on "public"."video_favorites";

drop policy "video_favorites_select" on "public"."video_favorites";

drop policy "video_shares_delete_own" on "public"."video_shares";

drop policy "video_shares_insert" on "public"."video_shares";

drop policy "video_shares_select_org_admin" on "public"."video_shares";

drop policy "video_shares_select_own" on "public"."video_shares";

drop policy "video_shares_update_own" on "public"."video_shares";

drop policy "galleries_insert_policy" on "public"."galleries";

drop policy "galleries_select_policy" on "public"."galleries";

drop policy "gallery_albums_select_policy" on "public"."gallery_albums";

drop policy "gallery_downloads_insert_policy" on "public"."gallery_downloads";

drop policy "gallery_photo_tags_select_policy" on "public"."gallery_photo_tags";

drop policy "gallery_photos_select_policy" on "public"."gallery_photos";

drop policy "video_note_targets_select_policy" on "public"."video_note_targets";

drop policy "video_notes_insert_policy" on "public"."video_notes";

drop policy "video_notes_select_policy" on "public"."video_notes";

drop policy "videos_insert_policy" on "public"."videos";

drop policy "videos_update_policy" on "public"."videos";

revoke delete on table "public"."_index_backup" from "anon";

revoke insert on table "public"."_index_backup" from "anon";

revoke references on table "public"."_index_backup" from "anon";

revoke select on table "public"."_index_backup" from "anon";

revoke trigger on table "public"."_index_backup" from "anon";

revoke truncate on table "public"."_index_backup" from "anon";

revoke update on table "public"."_index_backup" from "anon";

revoke delete on table "public"."_index_backup" from "authenticated";

revoke insert on table "public"."_index_backup" from "authenticated";

revoke references on table "public"."_index_backup" from "authenticated";

revoke select on table "public"."_index_backup" from "authenticated";

revoke trigger on table "public"."_index_backup" from "authenticated";

revoke truncate on table "public"."_index_backup" from "authenticated";

revoke update on table "public"."_index_backup" from "authenticated";

revoke delete on table "public"."_index_backup" from "service_role";

revoke insert on table "public"."_index_backup" from "service_role";

revoke references on table "public"."_index_backup" from "service_role";

revoke select on table "public"."_index_backup" from "service_role";

revoke trigger on table "public"."_index_backup" from "service_role";

revoke truncate on table "public"."_index_backup" from "service_role";

revoke update on table "public"."_index_backup" from "service_role";

revoke delete on table "public"."_policy_consolidation_log" from "anon";

revoke insert on table "public"."_policy_consolidation_log" from "anon";

revoke references on table "public"."_policy_consolidation_log" from "anon";

revoke select on table "public"."_policy_consolidation_log" from "anon";

revoke trigger on table "public"."_policy_consolidation_log" from "anon";

revoke truncate on table "public"."_policy_consolidation_log" from "anon";

revoke update on table "public"."_policy_consolidation_log" from "anon";

revoke delete on table "public"."_policy_consolidation_log" from "authenticated";

revoke insert on table "public"."_policy_consolidation_log" from "authenticated";

revoke references on table "public"."_policy_consolidation_log" from "authenticated";

revoke select on table "public"."_policy_consolidation_log" from "authenticated";

revoke trigger on table "public"."_policy_consolidation_log" from "authenticated";

revoke truncate on table "public"."_policy_consolidation_log" from "authenticated";

revoke update on table "public"."_policy_consolidation_log" from "authenticated";

revoke delete on table "public"."_policy_consolidation_log" from "service_role";

revoke insert on table "public"."_policy_consolidation_log" from "service_role";

revoke references on table "public"."_policy_consolidation_log" from "service_role";

revoke select on table "public"."_policy_consolidation_log" from "service_role";

revoke trigger on table "public"."_policy_consolidation_log" from "service_role";

revoke truncate on table "public"."_policy_consolidation_log" from "service_role";

revoke update on table "public"."_policy_consolidation_log" from "service_role";

revoke delete on table "public"."_rls_policy_backup" from "anon";

revoke insert on table "public"."_rls_policy_backup" from "anon";

revoke references on table "public"."_rls_policy_backup" from "anon";

revoke select on table "public"."_rls_policy_backup" from "anon";

revoke trigger on table "public"."_rls_policy_backup" from "anon";

revoke truncate on table "public"."_rls_policy_backup" from "anon";

revoke update on table "public"."_rls_policy_backup" from "anon";

revoke delete on table "public"."_rls_policy_backup" from "authenticated";

revoke insert on table "public"."_rls_policy_backup" from "authenticated";

revoke references on table "public"."_rls_policy_backup" from "authenticated";

revoke select on table "public"."_rls_policy_backup" from "authenticated";

revoke trigger on table "public"."_rls_policy_backup" from "authenticated";

revoke truncate on table "public"."_rls_policy_backup" from "authenticated";

revoke update on table "public"."_rls_policy_backup" from "authenticated";

revoke delete on table "public"."_rls_policy_backup" from "service_role";

revoke insert on table "public"."_rls_policy_backup" from "service_role";

revoke references on table "public"."_rls_policy_backup" from "service_role";

revoke select on table "public"."_rls_policy_backup" from "service_role";

revoke trigger on table "public"."_rls_policy_backup" from "service_role";

revoke truncate on table "public"."_rls_policy_backup" from "service_role";

revoke update on table "public"."_rls_policy_backup" from "service_role";

revoke delete on table "public"."_rls_validation_results" from "anon";

revoke insert on table "public"."_rls_validation_results" from "anon";

revoke references on table "public"."_rls_validation_results" from "anon";

revoke select on table "public"."_rls_validation_results" from "anon";

revoke trigger on table "public"."_rls_validation_results" from "anon";

revoke truncate on table "public"."_rls_validation_results" from "anon";

revoke update on table "public"."_rls_validation_results" from "anon";

revoke delete on table "public"."_rls_validation_results" from "authenticated";

revoke insert on table "public"."_rls_validation_results" from "authenticated";

revoke references on table "public"."_rls_validation_results" from "authenticated";

revoke select on table "public"."_rls_validation_results" from "authenticated";

revoke trigger on table "public"."_rls_validation_results" from "authenticated";

revoke truncate on table "public"."_rls_validation_results" from "authenticated";

revoke update on table "public"."_rls_validation_results" from "authenticated";

revoke delete on table "public"."_rls_validation_results" from "service_role";

revoke insert on table "public"."_rls_validation_results" from "service_role";

revoke references on table "public"."_rls_validation_results" from "service_role";

revoke select on table "public"."_rls_validation_results" from "service_role";

revoke trigger on table "public"."_rls_validation_results" from "service_role";

revoke truncate on table "public"."_rls_validation_results" from "service_role";

revoke update on table "public"."_rls_validation_results" from "service_role";

revoke delete on table "public"."announcements" from "authenticated";

revoke insert on table "public"."announcements" from "authenticated";

revoke references on table "public"."announcements" from "authenticated";

revoke select on table "public"."announcements" from "authenticated";

revoke update on table "public"."announcements" from "authenticated";

revoke delete on table "public"."announcements" from "service_role";

revoke insert on table "public"."announcements" from "service_role";

revoke references on table "public"."announcements" from "service_role";

revoke select on table "public"."announcements" from "service_role";

revoke trigger on table "public"."announcements" from "service_role";

revoke truncate on table "public"."announcements" from "service_role";

revoke update on table "public"."announcements" from "service_role";

revoke delete on table "public"."athlete_guardians" from "authenticated";

revoke insert on table "public"."athlete_guardians" from "authenticated";

revoke references on table "public"."athlete_guardians" from "authenticated";

revoke select on table "public"."athlete_guardians" from "authenticated";

revoke update on table "public"."athlete_guardians" from "authenticated";

revoke delete on table "public"."athlete_guardians" from "service_role";

revoke insert on table "public"."athlete_guardians" from "service_role";

revoke references on table "public"."athlete_guardians" from "service_role";

revoke select on table "public"."athlete_guardians" from "service_role";

revoke trigger on table "public"."athlete_guardians" from "service_role";

revoke truncate on table "public"."athlete_guardians" from "service_role";

revoke update on table "public"."athlete_guardians" from "service_role";

revoke delete on table "public"."athlete_imports" from "authenticated";

revoke insert on table "public"."athlete_imports" from "authenticated";

revoke references on table "public"."athlete_imports" from "authenticated";

revoke select on table "public"."athlete_imports" from "authenticated";

revoke update on table "public"."athlete_imports" from "authenticated";

revoke delete on table "public"."athlete_imports" from "service_role";

revoke insert on table "public"."athlete_imports" from "service_role";

revoke references on table "public"."athlete_imports" from "service_role";

revoke select on table "public"."athlete_imports" from "service_role";

revoke trigger on table "public"."athlete_imports" from "service_role";

revoke truncate on table "public"."athlete_imports" from "service_role";

revoke update on table "public"."athlete_imports" from "service_role";

revoke delete on table "public"."athlete_medical_private" from "anon";

revoke insert on table "public"."athlete_medical_private" from "anon";

revoke references on table "public"."athlete_medical_private" from "anon";

revoke select on table "public"."athlete_medical_private" from "anon";

revoke trigger on table "public"."athlete_medical_private" from "anon";

revoke truncate on table "public"."athlete_medical_private" from "anon";

revoke update on table "public"."athlete_medical_private" from "anon";

revoke delete on table "public"."athlete_medical_private" from "authenticated";

revoke insert on table "public"."athlete_medical_private" from "authenticated";

revoke references on table "public"."athlete_medical_private" from "authenticated";

revoke select on table "public"."athlete_medical_private" from "authenticated";

revoke trigger on table "public"."athlete_medical_private" from "authenticated";

revoke truncate on table "public"."athlete_medical_private" from "authenticated";

revoke update on table "public"."athlete_medical_private" from "authenticated";

revoke delete on table "public"."athlete_medical_private" from "service_role";

revoke insert on table "public"."athlete_medical_private" from "service_role";

revoke references on table "public"."athlete_medical_private" from "service_role";

revoke select on table "public"."athlete_medical_private" from "service_role";

revoke trigger on table "public"."athlete_medical_private" from "service_role";

revoke truncate on table "public"."athlete_medical_private" from "service_role";

revoke update on table "public"."athlete_medical_private" from "service_role";

revoke delete on table "public"."athlete_sport_profiles" from "anon";

revoke insert on table "public"."athlete_sport_profiles" from "anon";

revoke references on table "public"."athlete_sport_profiles" from "anon";

revoke select on table "public"."athlete_sport_profiles" from "anon";

revoke trigger on table "public"."athlete_sport_profiles" from "anon";

revoke truncate on table "public"."athlete_sport_profiles" from "anon";

revoke update on table "public"."athlete_sport_profiles" from "anon";

revoke delete on table "public"."athlete_sport_profiles" from "authenticated";

revoke insert on table "public"."athlete_sport_profiles" from "authenticated";

revoke references on table "public"."athlete_sport_profiles" from "authenticated";

revoke select on table "public"."athlete_sport_profiles" from "authenticated";

revoke trigger on table "public"."athlete_sport_profiles" from "authenticated";

revoke truncate on table "public"."athlete_sport_profiles" from "authenticated";

revoke update on table "public"."athlete_sport_profiles" from "authenticated";

revoke delete on table "public"."athlete_sport_profiles" from "service_role";

revoke insert on table "public"."athlete_sport_profiles" from "service_role";

revoke references on table "public"."athlete_sport_profiles" from "service_role";

revoke select on table "public"."athlete_sport_profiles" from "service_role";

revoke trigger on table "public"."athlete_sport_profiles" from "service_role";

revoke truncate on table "public"."athlete_sport_profiles" from "service_role";

revoke update on table "public"."athlete_sport_profiles" from "service_role";

revoke delete on table "public"."athlete_sports" from "authenticated";

revoke insert on table "public"."athlete_sports" from "authenticated";

revoke references on table "public"."athlete_sports" from "authenticated";

revoke select on table "public"."athlete_sports" from "authenticated";

revoke trigger on table "public"."athlete_sports" from "authenticated";

revoke truncate on table "public"."athlete_sports" from "authenticated";

revoke update on table "public"."athlete_sports" from "authenticated";

revoke delete on table "public"."athlete_sports" from "service_role";

revoke insert on table "public"."athlete_sports" from "service_role";

revoke references on table "public"."athlete_sports" from "service_role";

revoke select on table "public"."athlete_sports" from "service_role";

revoke trigger on table "public"."athlete_sports" from "service_role";

revoke truncate on table "public"."athlete_sports" from "service_role";

revoke update on table "public"."athlete_sports" from "service_role";

revoke delete on table "public"."athletes" from "authenticated";

revoke insert on table "public"."athletes" from "authenticated";

revoke references on table "public"."athletes" from "authenticated";

revoke select on table "public"."athletes" from "authenticated";

revoke trigger on table "public"."athletes" from "authenticated";

revoke truncate on table "public"."athletes" from "authenticated";

revoke update on table "public"."athletes" from "authenticated";

revoke delete on table "public"."athletes" from "service_role";

revoke insert on table "public"."athletes" from "service_role";

revoke references on table "public"."athletes" from "service_role";

revoke select on table "public"."athletes" from "service_role";

revoke trigger on table "public"."athletes" from "service_role";

revoke truncate on table "public"."athletes" from "service_role";

revoke update on table "public"."athletes" from "service_role";

revoke delete on table "public"."attendance" from "authenticated";

revoke insert on table "public"."attendance" from "authenticated";

revoke references on table "public"."attendance" from "authenticated";

revoke select on table "public"."attendance" from "authenticated";

revoke update on table "public"."attendance" from "authenticated";

revoke delete on table "public"."attendance" from "service_role";

revoke insert on table "public"."attendance" from "service_role";

revoke references on table "public"."attendance" from "service_role";

revoke select on table "public"."attendance" from "service_role";

revoke trigger on table "public"."attendance" from "service_role";

revoke truncate on table "public"."attendance" from "service_role";

revoke update on table "public"."attendance" from "service_role";

revoke delete on table "public"."attendance_settings" from "authenticated";

revoke insert on table "public"."attendance_settings" from "authenticated";

revoke references on table "public"."attendance_settings" from "authenticated";

revoke select on table "public"."attendance_settings" from "authenticated";

revoke update on table "public"."attendance_settings" from "authenticated";

revoke delete on table "public"."attendance_settings" from "service_role";

revoke insert on table "public"."attendance_settings" from "service_role";

revoke references on table "public"."attendance_settings" from "service_role";

revoke select on table "public"."attendance_settings" from "service_role";

revoke trigger on table "public"."attendance_settings" from "service_role";

revoke truncate on table "public"."attendance_settings" from "service_role";

revoke update on table "public"."attendance_settings" from "service_role";

revoke delete on table "public"."audit_logs_old" from "authenticated";

revoke insert on table "public"."audit_logs_old" from "authenticated";

revoke references on table "public"."audit_logs_old" from "authenticated";

revoke select on table "public"."audit_logs_old" from "authenticated";

revoke trigger on table "public"."audit_logs_old" from "authenticated";

revoke truncate on table "public"."audit_logs_old" from "authenticated";

revoke update on table "public"."audit_logs_old" from "authenticated";

revoke delete on table "public"."audit_logs_old" from "service_role";

revoke insert on table "public"."audit_logs_old" from "service_role";

revoke references on table "public"."audit_logs_old" from "service_role";

revoke select on table "public"."audit_logs_old" from "service_role";

revoke trigger on table "public"."audit_logs_old" from "service_role";

revoke truncate on table "public"."audit_logs_old" from "service_role";

revoke update on table "public"."audit_logs_old" from "service_role";

revoke delete on table "public"."billing_events" from "anon";

revoke insert on table "public"."billing_events" from "anon";

revoke references on table "public"."billing_events" from "anon";

revoke select on table "public"."billing_events" from "anon";

revoke trigger on table "public"."billing_events" from "anon";

revoke truncate on table "public"."billing_events" from "anon";

revoke update on table "public"."billing_events" from "anon";

revoke delete on table "public"."billing_events" from "authenticated";

revoke insert on table "public"."billing_events" from "authenticated";

revoke references on table "public"."billing_events" from "authenticated";

revoke select on table "public"."billing_events" from "authenticated";

revoke trigger on table "public"."billing_events" from "authenticated";

revoke truncate on table "public"."billing_events" from "authenticated";

revoke update on table "public"."billing_events" from "authenticated";

revoke delete on table "public"."billing_events" from "service_role";

revoke insert on table "public"."billing_events" from "service_role";

revoke references on table "public"."billing_events" from "service_role";

revoke select on table "public"."billing_events" from "service_role";

revoke trigger on table "public"."billing_events" from "service_role";

revoke truncate on table "public"."billing_events" from "service_role";

revoke update on table "public"."billing_events" from "service_role";

revoke delete on table "public"."charges" from "anon";

revoke insert on table "public"."charges" from "anon";

revoke references on table "public"."charges" from "anon";

revoke select on table "public"."charges" from "anon";

revoke trigger on table "public"."charges" from "anon";

revoke truncate on table "public"."charges" from "anon";

revoke update on table "public"."charges" from "anon";

revoke delete on table "public"."charges" from "authenticated";

revoke insert on table "public"."charges" from "authenticated";

revoke references on table "public"."charges" from "authenticated";

revoke select on table "public"."charges" from "authenticated";

revoke trigger on table "public"."charges" from "authenticated";

revoke truncate on table "public"."charges" from "authenticated";

revoke update on table "public"."charges" from "authenticated";

revoke delete on table "public"."charges" from "service_role";

revoke insert on table "public"."charges" from "service_role";

revoke references on table "public"."charges" from "service_role";

revoke select on table "public"."charges" from "service_role";

revoke trigger on table "public"."charges" from "service_role";

revoke truncate on table "public"."charges" from "service_role";

revoke update on table "public"."charges" from "service_role";

revoke delete on table "public"."checkout_session_items" from "anon";

revoke insert on table "public"."checkout_session_items" from "anon";

revoke references on table "public"."checkout_session_items" from "anon";

revoke select on table "public"."checkout_session_items" from "anon";

revoke trigger on table "public"."checkout_session_items" from "anon";

revoke truncate on table "public"."checkout_session_items" from "anon";

revoke update on table "public"."checkout_session_items" from "anon";

revoke delete on table "public"."checkout_session_items" from "authenticated";

revoke insert on table "public"."checkout_session_items" from "authenticated";

revoke references on table "public"."checkout_session_items" from "authenticated";

revoke select on table "public"."checkout_session_items" from "authenticated";

revoke trigger on table "public"."checkout_session_items" from "authenticated";

revoke truncate on table "public"."checkout_session_items" from "authenticated";

revoke update on table "public"."checkout_session_items" from "authenticated";

revoke delete on table "public"."checkout_session_items" from "service_role";

revoke insert on table "public"."checkout_session_items" from "service_role";

revoke references on table "public"."checkout_session_items" from "service_role";

revoke select on table "public"."checkout_session_items" from "service_role";

revoke trigger on table "public"."checkout_session_items" from "service_role";

revoke truncate on table "public"."checkout_session_items" from "service_role";

revoke update on table "public"."checkout_session_items" from "service_role";

revoke delete on table "public"."checkout_sessions" from "anon";

revoke insert on table "public"."checkout_sessions" from "anon";

revoke references on table "public"."checkout_sessions" from "anon";

revoke select on table "public"."checkout_sessions" from "anon";

revoke trigger on table "public"."checkout_sessions" from "anon";

revoke truncate on table "public"."checkout_sessions" from "anon";

revoke update on table "public"."checkout_sessions" from "anon";

revoke delete on table "public"."checkout_sessions" from "authenticated";

revoke insert on table "public"."checkout_sessions" from "authenticated";

revoke references on table "public"."checkout_sessions" from "authenticated";

revoke select on table "public"."checkout_sessions" from "authenticated";

revoke trigger on table "public"."checkout_sessions" from "authenticated";

revoke truncate on table "public"."checkout_sessions" from "authenticated";

revoke update on table "public"."checkout_sessions" from "authenticated";

revoke delete on table "public"."checkout_sessions" from "service_role";

revoke insert on table "public"."checkout_sessions" from "service_role";

revoke references on table "public"."checkout_sessions" from "service_role";

revoke select on table "public"."checkout_sessions" from "service_role";

revoke trigger on table "public"."checkout_sessions" from "service_role";

revoke truncate on table "public"."checkout_sessions" from "service_role";

revoke update on table "public"."checkout_sessions" from "service_role";

revoke delete on table "public"."child_claim_tokens" from "authenticated";

revoke insert on table "public"."child_claim_tokens" from "authenticated";

revoke references on table "public"."child_claim_tokens" from "authenticated";

revoke select on table "public"."child_claim_tokens" from "authenticated";

revoke trigger on table "public"."child_claim_tokens" from "authenticated";

revoke truncate on table "public"."child_claim_tokens" from "authenticated";

revoke update on table "public"."child_claim_tokens" from "authenticated";

revoke delete on table "public"."child_claim_tokens" from "service_role";

revoke insert on table "public"."child_claim_tokens" from "service_role";

revoke references on table "public"."child_claim_tokens" from "service_role";

revoke select on table "public"."child_claim_tokens" from "service_role";

revoke trigger on table "public"."child_claim_tokens" from "service_role";

revoke truncate on table "public"."child_claim_tokens" from "service_role";

revoke update on table "public"."child_claim_tokens" from "service_role";

revoke delete on table "public"."discount_codes" from "anon";

revoke insert on table "public"."discount_codes" from "anon";

revoke references on table "public"."discount_codes" from "anon";

revoke select on table "public"."discount_codes" from "anon";

revoke trigger on table "public"."discount_codes" from "anon";

revoke truncate on table "public"."discount_codes" from "anon";

revoke update on table "public"."discount_codes" from "anon";

revoke delete on table "public"."discount_codes" from "authenticated";

revoke insert on table "public"."discount_codes" from "authenticated";

revoke references on table "public"."discount_codes" from "authenticated";

revoke select on table "public"."discount_codes" from "authenticated";

revoke trigger on table "public"."discount_codes" from "authenticated";

revoke truncate on table "public"."discount_codes" from "authenticated";

revoke update on table "public"."discount_codes" from "authenticated";

revoke delete on table "public"."discount_codes" from "service_role";

revoke insert on table "public"."discount_codes" from "service_role";

revoke references on table "public"."discount_codes" from "service_role";

revoke select on table "public"."discount_codes" from "service_role";

revoke trigger on table "public"."discount_codes" from "service_role";

revoke truncate on table "public"."discount_codes" from "service_role";

revoke update on table "public"."discount_codes" from "service_role";

revoke delete on table "public"."discount_redemptions" from "anon";

revoke insert on table "public"."discount_redemptions" from "anon";

revoke references on table "public"."discount_redemptions" from "anon";

revoke select on table "public"."discount_redemptions" from "anon";

revoke trigger on table "public"."discount_redemptions" from "anon";

revoke truncate on table "public"."discount_redemptions" from "anon";

revoke update on table "public"."discount_redemptions" from "anon";

revoke delete on table "public"."discount_redemptions" from "authenticated";

revoke insert on table "public"."discount_redemptions" from "authenticated";

revoke references on table "public"."discount_redemptions" from "authenticated";

revoke select on table "public"."discount_redemptions" from "authenticated";

revoke trigger on table "public"."discount_redemptions" from "authenticated";

revoke truncate on table "public"."discount_redemptions" from "authenticated";

revoke update on table "public"."discount_redemptions" from "authenticated";

revoke delete on table "public"."discount_redemptions" from "service_role";

revoke insert on table "public"."discount_redemptions" from "service_role";

revoke references on table "public"."discount_redemptions" from "service_role";

revoke select on table "public"."discount_redemptions" from "service_role";

revoke trigger on table "public"."discount_redemptions" from "service_role";

revoke truncate on table "public"."discount_redemptions" from "service_role";

revoke update on table "public"."discount_redemptions" from "service_role";

revoke delete on table "public"."discovery_errors" from "anon";

revoke insert on table "public"."discovery_errors" from "anon";

revoke references on table "public"."discovery_errors" from "anon";

revoke select on table "public"."discovery_errors" from "anon";

revoke trigger on table "public"."discovery_errors" from "anon";

revoke truncate on table "public"."discovery_errors" from "anon";

revoke update on table "public"."discovery_errors" from "anon";

revoke delete on table "public"."discovery_errors" from "authenticated";

revoke insert on table "public"."discovery_errors" from "authenticated";

revoke references on table "public"."discovery_errors" from "authenticated";

revoke select on table "public"."discovery_errors" from "authenticated";

revoke trigger on table "public"."discovery_errors" from "authenticated";

revoke truncate on table "public"."discovery_errors" from "authenticated";

revoke update on table "public"."discovery_errors" from "authenticated";

revoke delete on table "public"."discovery_errors" from "service_role";

revoke insert on table "public"."discovery_errors" from "service_role";

revoke references on table "public"."discovery_errors" from "service_role";

revoke select on table "public"."discovery_errors" from "service_role";

revoke trigger on table "public"."discovery_errors" from "service_role";

revoke truncate on table "public"."discovery_errors" from "service_role";

revoke update on table "public"."discovery_errors" from "service_role";

revoke delete on table "public"."entitlement_overrides" from "anon";

revoke insert on table "public"."entitlement_overrides" from "anon";

revoke references on table "public"."entitlement_overrides" from "anon";

revoke select on table "public"."entitlement_overrides" from "anon";

revoke trigger on table "public"."entitlement_overrides" from "anon";

revoke truncate on table "public"."entitlement_overrides" from "anon";

revoke update on table "public"."entitlement_overrides" from "anon";

revoke delete on table "public"."entitlement_overrides" from "authenticated";

revoke insert on table "public"."entitlement_overrides" from "authenticated";

revoke references on table "public"."entitlement_overrides" from "authenticated";

revoke select on table "public"."entitlement_overrides" from "authenticated";

revoke trigger on table "public"."entitlement_overrides" from "authenticated";

revoke truncate on table "public"."entitlement_overrides" from "authenticated";

revoke update on table "public"."entitlement_overrides" from "authenticated";

revoke delete on table "public"."entitlement_overrides" from "service_role";

revoke insert on table "public"."entitlement_overrides" from "service_role";

revoke references on table "public"."entitlement_overrides" from "service_role";

revoke select on table "public"."entitlement_overrides" from "service_role";

revoke trigger on table "public"."entitlement_overrides" from "service_role";

revoke truncate on table "public"."entitlement_overrides" from "service_role";

revoke update on table "public"."entitlement_overrides" from "service_role";

revoke delete on table "public"."event_attendance" from "authenticated";

revoke insert on table "public"."event_attendance" from "authenticated";

revoke references on table "public"."event_attendance" from "authenticated";

revoke select on table "public"."event_attendance" from "authenticated";

revoke update on table "public"."event_attendance" from "authenticated";

revoke delete on table "public"."event_attendance" from "service_role";

revoke insert on table "public"."event_attendance" from "service_role";

revoke references on table "public"."event_attendance" from "service_role";

revoke select on table "public"."event_attendance" from "service_role";

revoke trigger on table "public"."event_attendance" from "service_role";

revoke truncate on table "public"."event_attendance" from "service_role";

revoke update on table "public"."event_attendance" from "service_role";

revoke delete on table "public"."event_change_history" from "authenticated";

revoke insert on table "public"."event_change_history" from "authenticated";

revoke references on table "public"."event_change_history" from "authenticated";

revoke select on table "public"."event_change_history" from "authenticated";

revoke update on table "public"."event_change_history" from "authenticated";

revoke delete on table "public"."event_change_history" from "service_role";

revoke insert on table "public"."event_change_history" from "service_role";

revoke references on table "public"."event_change_history" from "service_role";

revoke select on table "public"."event_change_history" from "service_role";

revoke trigger on table "public"."event_change_history" from "service_role";

revoke truncate on table "public"."event_change_history" from "service_role";

revoke update on table "public"."event_change_history" from "service_role";

revoke delete on table "public"."event_general_rsvps" from "authenticated";

revoke insert on table "public"."event_general_rsvps" from "authenticated";

revoke references on table "public"."event_general_rsvps" from "authenticated";

revoke select on table "public"."event_general_rsvps" from "authenticated";

revoke update on table "public"."event_general_rsvps" from "authenticated";

revoke delete on table "public"."event_general_rsvps" from "service_role";

revoke insert on table "public"."event_general_rsvps" from "service_role";

revoke references on table "public"."event_general_rsvps" from "service_role";

revoke select on table "public"."event_general_rsvps" from "service_role";

revoke trigger on table "public"."event_general_rsvps" from "service_role";

revoke truncate on table "public"."event_general_rsvps" from "service_role";

revoke update on table "public"."event_general_rsvps" from "service_role";

revoke delete on table "public"."event_locations" from "authenticated";

revoke insert on table "public"."event_locations" from "authenticated";

revoke references on table "public"."event_locations" from "authenticated";

revoke select on table "public"."event_locations" from "authenticated";

revoke update on table "public"."event_locations" from "authenticated";

revoke delete on table "public"."event_locations" from "service_role";

revoke insert on table "public"."event_locations" from "service_role";

revoke references on table "public"."event_locations" from "service_role";

revoke select on table "public"."event_locations" from "service_role";

revoke trigger on table "public"."event_locations" from "service_role";

revoke truncate on table "public"."event_locations" from "service_role";

revoke update on table "public"."event_locations" from "service_role";

revoke delete on table "public"."event_logs" from "authenticated";

revoke insert on table "public"."event_logs" from "authenticated";

revoke references on table "public"."event_logs" from "authenticated";

revoke select on table "public"."event_logs" from "authenticated";

revoke trigger on table "public"."event_logs" from "authenticated";

revoke truncate on table "public"."event_logs" from "authenticated";

revoke update on table "public"."event_logs" from "authenticated";

revoke delete on table "public"."event_logs" from "service_role";

revoke insert on table "public"."event_logs" from "service_role";

revoke references on table "public"."event_logs" from "service_role";

revoke select on table "public"."event_logs" from "service_role";

revoke trigger on table "public"."event_logs" from "service_role";

revoke truncate on table "public"."event_logs" from "service_role";

revoke update on table "public"."event_logs" from "service_role";

revoke delete on table "public"."event_logs_archive" from "authenticated";

revoke insert on table "public"."event_logs_archive" from "authenticated";

revoke references on table "public"."event_logs_archive" from "authenticated";

revoke select on table "public"."event_logs_archive" from "authenticated";

revoke trigger on table "public"."event_logs_archive" from "authenticated";

revoke truncate on table "public"."event_logs_archive" from "authenticated";

revoke update on table "public"."event_logs_archive" from "authenticated";

revoke delete on table "public"."event_logs_archive" from "service_role";

revoke insert on table "public"."event_logs_archive" from "service_role";

revoke references on table "public"."event_logs_archive" from "service_role";

revoke select on table "public"."event_logs_archive" from "service_role";

revoke trigger on table "public"."event_logs_archive" from "service_role";

revoke truncate on table "public"."event_logs_archive" from "service_role";

revoke update on table "public"."event_logs_archive" from "service_role";

revoke delete on table "public"."event_rsvps" from "authenticated";

revoke insert on table "public"."event_rsvps" from "authenticated";

revoke references on table "public"."event_rsvps" from "authenticated";

revoke select on table "public"."event_rsvps" from "authenticated";

revoke update on table "public"."event_rsvps" from "authenticated";

revoke delete on table "public"."event_rsvps" from "service_role";

revoke insert on table "public"."event_rsvps" from "service_role";

revoke references on table "public"."event_rsvps" from "service_role";

revoke select on table "public"."event_rsvps" from "service_role";

revoke trigger on table "public"."event_rsvps" from "service_role";

revoke truncate on table "public"."event_rsvps" from "service_role";

revoke update on table "public"."event_rsvps" from "service_role";

revoke delete on table "public"."events" from "authenticated";

revoke insert on table "public"."events" from "authenticated";

revoke references on table "public"."events" from "authenticated";

revoke select on table "public"."events" from "authenticated";

revoke update on table "public"."events" from "authenticated";

revoke delete on table "public"."events" from "service_role";

revoke insert on table "public"."events" from "service_role";

revoke references on table "public"."events" from "service_role";

revoke select on table "public"."events" from "service_role";

revoke trigger on table "public"."events" from "service_role";

revoke truncate on table "public"."events" from "service_role";

revoke update on table "public"."events" from "service_role";

revoke delete on table "public"."families" from "authenticated";

revoke insert on table "public"."families" from "authenticated";

revoke references on table "public"."families" from "authenticated";

revoke select on table "public"."families" from "authenticated";

revoke update on table "public"."families" from "authenticated";

revoke delete on table "public"."families" from "service_role";

revoke insert on table "public"."families" from "service_role";

revoke references on table "public"."families" from "service_role";

revoke select on table "public"."families" from "service_role";

revoke trigger on table "public"."families" from "service_role";

revoke truncate on table "public"."families" from "service_role";

revoke update on table "public"."families" from "service_role";

revoke delete on table "public"."family_members" from "authenticated";

revoke insert on table "public"."family_members" from "authenticated";

revoke references on table "public"."family_members" from "authenticated";

revoke select on table "public"."family_members" from "authenticated";

revoke update on table "public"."family_members" from "authenticated";

revoke delete on table "public"."family_members" from "service_role";

revoke insert on table "public"."family_members" from "service_role";

revoke references on table "public"."family_members" from "service_role";

revoke select on table "public"."family_members" from "service_role";

revoke trigger on table "public"."family_members" from "service_role";

revoke truncate on table "public"."family_members" from "service_role";

revoke update on table "public"."family_members" from "service_role";

revoke delete on table "public"."fan_calendar_cache" from "anon";

revoke insert on table "public"."fan_calendar_cache" from "anon";

revoke references on table "public"."fan_calendar_cache" from "anon";

revoke select on table "public"."fan_calendar_cache" from "anon";

revoke trigger on table "public"."fan_calendar_cache" from "anon";

revoke truncate on table "public"."fan_calendar_cache" from "anon";

revoke update on table "public"."fan_calendar_cache" from "anon";

revoke delete on table "public"."fan_calendar_cache" from "authenticated";

revoke insert on table "public"."fan_calendar_cache" from "authenticated";

revoke references on table "public"."fan_calendar_cache" from "authenticated";

revoke select on table "public"."fan_calendar_cache" from "authenticated";

revoke trigger on table "public"."fan_calendar_cache" from "authenticated";

revoke truncate on table "public"."fan_calendar_cache" from "authenticated";

revoke update on table "public"."fan_calendar_cache" from "authenticated";

revoke delete on table "public"."fan_calendar_cache" from "service_role";

revoke insert on table "public"."fan_calendar_cache" from "service_role";

revoke references on table "public"."fan_calendar_cache" from "service_role";

revoke select on table "public"."fan_calendar_cache" from "service_role";

revoke trigger on table "public"."fan_calendar_cache" from "service_role";

revoke truncate on table "public"."fan_calendar_cache" from "service_role";

revoke update on table "public"."fan_calendar_cache" from "service_role";

revoke delete on table "public"."fan_event_bookmarks" from "anon";

revoke insert on table "public"."fan_event_bookmarks" from "anon";

revoke references on table "public"."fan_event_bookmarks" from "anon";

revoke select on table "public"."fan_event_bookmarks" from "anon";

revoke trigger on table "public"."fan_event_bookmarks" from "anon";

revoke truncate on table "public"."fan_event_bookmarks" from "anon";

revoke update on table "public"."fan_event_bookmarks" from "anon";

revoke delete on table "public"."fan_event_bookmarks" from "authenticated";

revoke insert on table "public"."fan_event_bookmarks" from "authenticated";

revoke references on table "public"."fan_event_bookmarks" from "authenticated";

revoke select on table "public"."fan_event_bookmarks" from "authenticated";

revoke trigger on table "public"."fan_event_bookmarks" from "authenticated";

revoke truncate on table "public"."fan_event_bookmarks" from "authenticated";

revoke update on table "public"."fan_event_bookmarks" from "authenticated";

revoke delete on table "public"."fan_event_bookmarks" from "service_role";

revoke insert on table "public"."fan_event_bookmarks" from "service_role";

revoke references on table "public"."fan_event_bookmarks" from "service_role";

revoke select on table "public"."fan_event_bookmarks" from "service_role";

revoke trigger on table "public"."fan_event_bookmarks" from "service_role";

revoke truncate on table "public"."fan_event_bookmarks" from "service_role";

revoke update on table "public"."fan_event_bookmarks" from "service_role";

revoke delete on table "public"."fan_feed" from "anon";

revoke insert on table "public"."fan_feed" from "anon";

revoke references on table "public"."fan_feed" from "anon";

revoke select on table "public"."fan_feed" from "anon";

revoke trigger on table "public"."fan_feed" from "anon";

revoke truncate on table "public"."fan_feed" from "anon";

revoke update on table "public"."fan_feed" from "anon";

revoke delete on table "public"."fan_feed" from "authenticated";

revoke insert on table "public"."fan_feed" from "authenticated";

revoke references on table "public"."fan_feed" from "authenticated";

revoke select on table "public"."fan_feed" from "authenticated";

revoke trigger on table "public"."fan_feed" from "authenticated";

revoke truncate on table "public"."fan_feed" from "authenticated";

revoke update on table "public"."fan_feed" from "authenticated";

revoke delete on table "public"."fan_feed" from "service_role";

revoke insert on table "public"."fan_feed" from "service_role";

revoke references on table "public"."fan_feed" from "service_role";

revoke select on table "public"."fan_feed" from "service_role";

revoke trigger on table "public"."fan_feed" from "service_role";

revoke truncate on table "public"."fan_feed" from "service_role";

revoke update on table "public"."fan_feed" from "service_role";

revoke delete on table "public"."fan_org_follows" from "anon";

revoke insert on table "public"."fan_org_follows" from "anon";

revoke references on table "public"."fan_org_follows" from "anon";

revoke select on table "public"."fan_org_follows" from "anon";

revoke trigger on table "public"."fan_org_follows" from "anon";

revoke truncate on table "public"."fan_org_follows" from "anon";

revoke update on table "public"."fan_org_follows" from "anon";

revoke delete on table "public"."fan_org_follows" from "authenticated";

revoke insert on table "public"."fan_org_follows" from "authenticated";

revoke references on table "public"."fan_org_follows" from "authenticated";

revoke select on table "public"."fan_org_follows" from "authenticated";

revoke trigger on table "public"."fan_org_follows" from "authenticated";

revoke truncate on table "public"."fan_org_follows" from "authenticated";

revoke update on table "public"."fan_org_follows" from "authenticated";

revoke delete on table "public"."fan_org_follows" from "service_role";

revoke insert on table "public"."fan_org_follows" from "service_role";

revoke references on table "public"."fan_org_follows" from "service_role";

revoke select on table "public"."fan_org_follows" from "service_role";

revoke trigger on table "public"."fan_org_follows" from "service_role";

revoke truncate on table "public"."fan_org_follows" from "service_role";

revoke update on table "public"."fan_org_follows" from "service_role";

revoke delete on table "public"."feature_dependencies" from "anon";

revoke insert on table "public"."feature_dependencies" from "anon";

revoke references on table "public"."feature_dependencies" from "anon";

revoke select on table "public"."feature_dependencies" from "anon";

revoke trigger on table "public"."feature_dependencies" from "anon";

revoke truncate on table "public"."feature_dependencies" from "anon";

revoke update on table "public"."feature_dependencies" from "anon";

revoke delete on table "public"."feature_dependencies" from "authenticated";

revoke insert on table "public"."feature_dependencies" from "authenticated";

revoke references on table "public"."feature_dependencies" from "authenticated";

revoke select on table "public"."feature_dependencies" from "authenticated";

revoke trigger on table "public"."feature_dependencies" from "authenticated";

revoke truncate on table "public"."feature_dependencies" from "authenticated";

revoke update on table "public"."feature_dependencies" from "authenticated";

revoke delete on table "public"."feature_dependencies" from "service_role";

revoke insert on table "public"."feature_dependencies" from "service_role";

revoke references on table "public"."feature_dependencies" from "service_role";

revoke select on table "public"."feature_dependencies" from "service_role";

revoke trigger on table "public"."feature_dependencies" from "service_role";

revoke truncate on table "public"."feature_dependencies" from "service_role";

revoke update on table "public"."feature_dependencies" from "service_role";

revoke delete on table "public"."feature_dependency_cycles" from "anon";

revoke insert on table "public"."feature_dependency_cycles" from "anon";

revoke references on table "public"."feature_dependency_cycles" from "anon";

revoke select on table "public"."feature_dependency_cycles" from "anon";

revoke trigger on table "public"."feature_dependency_cycles" from "anon";

revoke truncate on table "public"."feature_dependency_cycles" from "anon";

revoke update on table "public"."feature_dependency_cycles" from "anon";

revoke delete on table "public"."feature_dependency_cycles" from "authenticated";

revoke insert on table "public"."feature_dependency_cycles" from "authenticated";

revoke references on table "public"."feature_dependency_cycles" from "authenticated";

revoke select on table "public"."feature_dependency_cycles" from "authenticated";

revoke trigger on table "public"."feature_dependency_cycles" from "authenticated";

revoke truncate on table "public"."feature_dependency_cycles" from "authenticated";

revoke update on table "public"."feature_dependency_cycles" from "authenticated";

revoke delete on table "public"."feature_dependency_cycles" from "service_role";

revoke insert on table "public"."feature_dependency_cycles" from "service_role";

revoke references on table "public"."feature_dependency_cycles" from "service_role";

revoke select on table "public"."feature_dependency_cycles" from "service_role";

revoke trigger on table "public"."feature_dependency_cycles" from "service_role";

revoke truncate on table "public"."feature_dependency_cycles" from "service_role";

revoke update on table "public"."feature_dependency_cycles" from "service_role";

revoke delete on table "public"."feature_discovery_cache" from "anon";

revoke insert on table "public"."feature_discovery_cache" from "anon";

revoke references on table "public"."feature_discovery_cache" from "anon";

revoke select on table "public"."feature_discovery_cache" from "anon";

revoke trigger on table "public"."feature_discovery_cache" from "anon";

revoke truncate on table "public"."feature_discovery_cache" from "anon";

revoke update on table "public"."feature_discovery_cache" from "anon";

revoke delete on table "public"."feature_discovery_cache" from "authenticated";

revoke insert on table "public"."feature_discovery_cache" from "authenticated";

revoke references on table "public"."feature_discovery_cache" from "authenticated";

revoke select on table "public"."feature_discovery_cache" from "authenticated";

revoke trigger on table "public"."feature_discovery_cache" from "authenticated";

revoke truncate on table "public"."feature_discovery_cache" from "authenticated";

revoke update on table "public"."feature_discovery_cache" from "authenticated";

revoke delete on table "public"."feature_discovery_cache" from "service_role";

revoke insert on table "public"."feature_discovery_cache" from "service_role";

revoke references on table "public"."feature_discovery_cache" from "service_role";

revoke select on table "public"."feature_discovery_cache" from "service_role";

revoke trigger on table "public"."feature_discovery_cache" from "service_role";

revoke truncate on table "public"."feature_discovery_cache" from "service_role";

revoke update on table "public"."feature_discovery_cache" from "service_role";

revoke delete on table "public"."feature_discovery_corrections" from "anon";

revoke insert on table "public"."feature_discovery_corrections" from "anon";

revoke references on table "public"."feature_discovery_corrections" from "anon";

revoke select on table "public"."feature_discovery_corrections" from "anon";

revoke trigger on table "public"."feature_discovery_corrections" from "anon";

revoke truncate on table "public"."feature_discovery_corrections" from "anon";

revoke update on table "public"."feature_discovery_corrections" from "anon";

revoke delete on table "public"."feature_discovery_corrections" from "authenticated";

revoke insert on table "public"."feature_discovery_corrections" from "authenticated";

revoke references on table "public"."feature_discovery_corrections" from "authenticated";

revoke select on table "public"."feature_discovery_corrections" from "authenticated";

revoke trigger on table "public"."feature_discovery_corrections" from "authenticated";

revoke truncate on table "public"."feature_discovery_corrections" from "authenticated";

revoke update on table "public"."feature_discovery_corrections" from "authenticated";

revoke delete on table "public"."feature_discovery_corrections" from "service_role";

revoke insert on table "public"."feature_discovery_corrections" from "service_role";

revoke references on table "public"."feature_discovery_corrections" from "service_role";

revoke select on table "public"."feature_discovery_corrections" from "service_role";

revoke trigger on table "public"."feature_discovery_corrections" from "service_role";

revoke truncate on table "public"."feature_discovery_corrections" from "service_role";

revoke update on table "public"."feature_discovery_corrections" from "service_role";

revoke delete on table "public"."feature_discovery_hints" from "anon";

revoke insert on table "public"."feature_discovery_hints" from "anon";

revoke references on table "public"."feature_discovery_hints" from "anon";

revoke select on table "public"."feature_discovery_hints" from "anon";

revoke trigger on table "public"."feature_discovery_hints" from "anon";

revoke truncate on table "public"."feature_discovery_hints" from "anon";

revoke update on table "public"."feature_discovery_hints" from "anon";

revoke delete on table "public"."feature_discovery_hints" from "authenticated";

revoke insert on table "public"."feature_discovery_hints" from "authenticated";

revoke references on table "public"."feature_discovery_hints" from "authenticated";

revoke select on table "public"."feature_discovery_hints" from "authenticated";

revoke trigger on table "public"."feature_discovery_hints" from "authenticated";

revoke truncate on table "public"."feature_discovery_hints" from "authenticated";

revoke update on table "public"."feature_discovery_hints" from "authenticated";

revoke delete on table "public"."feature_discovery_hints" from "service_role";

revoke insert on table "public"."feature_discovery_hints" from "service_role";

revoke references on table "public"."feature_discovery_hints" from "service_role";

revoke select on table "public"."feature_discovery_hints" from "service_role";

revoke trigger on table "public"."feature_discovery_hints" from "service_role";

revoke truncate on table "public"."feature_discovery_hints" from "service_role";

revoke update on table "public"."feature_discovery_hints" from "service_role";

revoke delete on table "public"."feature_entitlements" from "anon";

revoke insert on table "public"."feature_entitlements" from "anon";

revoke references on table "public"."feature_entitlements" from "anon";

revoke select on table "public"."feature_entitlements" from "anon";

revoke trigger on table "public"."feature_entitlements" from "anon";

revoke truncate on table "public"."feature_entitlements" from "anon";

revoke update on table "public"."feature_entitlements" from "anon";

revoke delete on table "public"."feature_entitlements" from "authenticated";

revoke insert on table "public"."feature_entitlements" from "authenticated";

revoke references on table "public"."feature_entitlements" from "authenticated";

revoke select on table "public"."feature_entitlements" from "authenticated";

revoke trigger on table "public"."feature_entitlements" from "authenticated";

revoke truncate on table "public"."feature_entitlements" from "authenticated";

revoke update on table "public"."feature_entitlements" from "authenticated";

revoke delete on table "public"."feature_entitlements" from "service_role";

revoke insert on table "public"."feature_entitlements" from "service_role";

revoke references on table "public"."feature_entitlements" from "service_role";

revoke select on table "public"."feature_entitlements" from "service_role";

revoke trigger on table "public"."feature_entitlements" from "service_role";

revoke truncate on table "public"."feature_entitlements" from "service_role";

revoke update on table "public"."feature_entitlements" from "service_role";

revoke delete on table "public"."feature_flag_audit_log" from "anon";

revoke insert on table "public"."feature_flag_audit_log" from "anon";

revoke references on table "public"."feature_flag_audit_log" from "anon";

revoke select on table "public"."feature_flag_audit_log" from "anon";

revoke trigger on table "public"."feature_flag_audit_log" from "anon";

revoke truncate on table "public"."feature_flag_audit_log" from "anon";

revoke update on table "public"."feature_flag_audit_log" from "anon";

revoke delete on table "public"."feature_flag_audit_log" from "authenticated";

revoke insert on table "public"."feature_flag_audit_log" from "authenticated";

revoke references on table "public"."feature_flag_audit_log" from "authenticated";

revoke select on table "public"."feature_flag_audit_log" from "authenticated";

revoke trigger on table "public"."feature_flag_audit_log" from "authenticated";

revoke truncate on table "public"."feature_flag_audit_log" from "authenticated";

revoke update on table "public"."feature_flag_audit_log" from "authenticated";

revoke delete on table "public"."feature_flag_audit_log" from "service_role";

revoke insert on table "public"."feature_flag_audit_log" from "service_role";

revoke references on table "public"."feature_flag_audit_log" from "service_role";

revoke select on table "public"."feature_flag_audit_log" from "service_role";

revoke trigger on table "public"."feature_flag_audit_log" from "service_role";

revoke truncate on table "public"."feature_flag_audit_log" from "service_role";

revoke update on table "public"."feature_flag_audit_log" from "service_role";

revoke delete on table "public"."feature_flag_org_overrides" from "anon";

revoke insert on table "public"."feature_flag_org_overrides" from "anon";

revoke references on table "public"."feature_flag_org_overrides" from "anon";

revoke select on table "public"."feature_flag_org_overrides" from "anon";

revoke trigger on table "public"."feature_flag_org_overrides" from "anon";

revoke truncate on table "public"."feature_flag_org_overrides" from "anon";

revoke update on table "public"."feature_flag_org_overrides" from "anon";

revoke delete on table "public"."feature_flag_org_overrides" from "authenticated";

revoke insert on table "public"."feature_flag_org_overrides" from "authenticated";

revoke references on table "public"."feature_flag_org_overrides" from "authenticated";

revoke select on table "public"."feature_flag_org_overrides" from "authenticated";

revoke trigger on table "public"."feature_flag_org_overrides" from "authenticated";

revoke truncate on table "public"."feature_flag_org_overrides" from "authenticated";

revoke update on table "public"."feature_flag_org_overrides" from "authenticated";

revoke delete on table "public"."feature_flag_org_overrides" from "service_role";

revoke insert on table "public"."feature_flag_org_overrides" from "service_role";

revoke references on table "public"."feature_flag_org_overrides" from "service_role";

revoke select on table "public"."feature_flag_org_overrides" from "service_role";

revoke trigger on table "public"."feature_flag_org_overrides" from "service_role";

revoke truncate on table "public"."feature_flag_org_overrides" from "service_role";

revoke update on table "public"."feature_flag_org_overrides" from "service_role";

revoke delete on table "public"."feature_flag_platform_defaults" from "anon";

revoke insert on table "public"."feature_flag_platform_defaults" from "anon";

revoke references on table "public"."feature_flag_platform_defaults" from "anon";

revoke select on table "public"."feature_flag_platform_defaults" from "anon";

revoke trigger on table "public"."feature_flag_platform_defaults" from "anon";

revoke truncate on table "public"."feature_flag_platform_defaults" from "anon";

revoke update on table "public"."feature_flag_platform_defaults" from "anon";

revoke delete on table "public"."feature_flag_platform_defaults" from "authenticated";

revoke insert on table "public"."feature_flag_platform_defaults" from "authenticated";

revoke references on table "public"."feature_flag_platform_defaults" from "authenticated";

revoke select on table "public"."feature_flag_platform_defaults" from "authenticated";

revoke trigger on table "public"."feature_flag_platform_defaults" from "authenticated";

revoke truncate on table "public"."feature_flag_platform_defaults" from "authenticated";

revoke update on table "public"."feature_flag_platform_defaults" from "authenticated";

revoke delete on table "public"."feature_flag_platform_defaults" from "service_role";

revoke insert on table "public"."feature_flag_platform_defaults" from "service_role";

revoke references on table "public"."feature_flag_platform_defaults" from "service_role";

revoke select on table "public"."feature_flag_platform_defaults" from "service_role";

revoke trigger on table "public"."feature_flag_platform_defaults" from "service_role";

revoke truncate on table "public"."feature_flag_platform_defaults" from "service_role";

revoke update on table "public"."feature_flag_platform_defaults" from "service_role";

revoke delete on table "public"."feature_flag_user_overrides" from "anon";

revoke insert on table "public"."feature_flag_user_overrides" from "anon";

revoke references on table "public"."feature_flag_user_overrides" from "anon";

revoke select on table "public"."feature_flag_user_overrides" from "anon";

revoke trigger on table "public"."feature_flag_user_overrides" from "anon";

revoke truncate on table "public"."feature_flag_user_overrides" from "anon";

revoke update on table "public"."feature_flag_user_overrides" from "anon";

revoke delete on table "public"."feature_flag_user_overrides" from "authenticated";

revoke insert on table "public"."feature_flag_user_overrides" from "authenticated";

revoke references on table "public"."feature_flag_user_overrides" from "authenticated";

revoke select on table "public"."feature_flag_user_overrides" from "authenticated";

revoke trigger on table "public"."feature_flag_user_overrides" from "authenticated";

revoke truncate on table "public"."feature_flag_user_overrides" from "authenticated";

revoke update on table "public"."feature_flag_user_overrides" from "authenticated";

revoke delete on table "public"."feature_flag_user_overrides" from "service_role";

revoke insert on table "public"."feature_flag_user_overrides" from "service_role";

revoke references on table "public"."feature_flag_user_overrides" from "service_role";

revoke select on table "public"."feature_flag_user_overrides" from "service_role";

revoke trigger on table "public"."feature_flag_user_overrides" from "service_role";

revoke truncate on table "public"."feature_flag_user_overrides" from "service_role";

revoke update on table "public"."feature_flag_user_overrides" from "service_role";

revoke delete on table "public"."feature_flags" from "anon";

revoke insert on table "public"."feature_flags" from "anon";

revoke references on table "public"."feature_flags" from "anon";

revoke select on table "public"."feature_flags" from "anon";

revoke trigger on table "public"."feature_flags" from "anon";

revoke truncate on table "public"."feature_flags" from "anon";

revoke update on table "public"."feature_flags" from "anon";

revoke delete on table "public"."feature_flags" from "authenticated";

revoke insert on table "public"."feature_flags" from "authenticated";

revoke references on table "public"."feature_flags" from "authenticated";

revoke select on table "public"."feature_flags" from "authenticated";

revoke trigger on table "public"."feature_flags" from "authenticated";

revoke truncate on table "public"."feature_flags" from "authenticated";

revoke update on table "public"."feature_flags" from "authenticated";

revoke delete on table "public"."feature_flags" from "service_role";

revoke insert on table "public"."feature_flags" from "service_role";

revoke references on table "public"."feature_flags" from "service_role";

revoke select on table "public"."feature_flags" from "service_role";

revoke trigger on table "public"."feature_flags" from "service_role";

revoke truncate on table "public"."feature_flags" from "service_role";

revoke update on table "public"."feature_flags" from "service_role";

revoke delete on table "public"."feature_integration_assignments" from "anon";

revoke insert on table "public"."feature_integration_assignments" from "anon";

revoke references on table "public"."feature_integration_assignments" from "anon";

revoke select on table "public"."feature_integration_assignments" from "anon";

revoke trigger on table "public"."feature_integration_assignments" from "anon";

revoke truncate on table "public"."feature_integration_assignments" from "anon";

revoke update on table "public"."feature_integration_assignments" from "anon";

revoke delete on table "public"."feature_integration_assignments" from "authenticated";

revoke insert on table "public"."feature_integration_assignments" from "authenticated";

revoke references on table "public"."feature_integration_assignments" from "authenticated";

revoke select on table "public"."feature_integration_assignments" from "authenticated";

revoke trigger on table "public"."feature_integration_assignments" from "authenticated";

revoke truncate on table "public"."feature_integration_assignments" from "authenticated";

revoke update on table "public"."feature_integration_assignments" from "authenticated";

revoke delete on table "public"."feature_integration_assignments" from "service_role";

revoke insert on table "public"."feature_integration_assignments" from "service_role";

revoke references on table "public"."feature_integration_assignments" from "service_role";

revoke select on table "public"."feature_integration_assignments" from "service_role";

revoke trigger on table "public"."feature_integration_assignments" from "service_role";

revoke truncate on table "public"."feature_integration_assignments" from "service_role";

revoke update on table "public"."feature_integration_assignments" from "service_role";

revoke references on table "public"."feature_integrations" from "anon";

revoke select on table "public"."feature_integrations" from "anon";

revoke trigger on table "public"."feature_integrations" from "anon";

revoke truncate on table "public"."feature_integrations" from "anon";

revoke references on table "public"."feature_integrations" from "authenticated";

revoke select on table "public"."feature_integrations" from "authenticated";

revoke trigger on table "public"."feature_integrations" from "authenticated";

revoke truncate on table "public"."feature_integrations" from "authenticated";

revoke delete on table "public"."feature_integrations" from "service_role";

revoke insert on table "public"."feature_integrations" from "service_role";

revoke references on table "public"."feature_integrations" from "service_role";

revoke select on table "public"."feature_integrations" from "service_role";

revoke trigger on table "public"."feature_integrations" from "service_role";

revoke truncate on table "public"."feature_integrations" from "service_role";

revoke update on table "public"."feature_integrations" from "service_role";

revoke delete on table "public"."fee_assignments" from "anon";

revoke insert on table "public"."fee_assignments" from "anon";

revoke references on table "public"."fee_assignments" from "anon";

revoke select on table "public"."fee_assignments" from "anon";

revoke trigger on table "public"."fee_assignments" from "anon";

revoke truncate on table "public"."fee_assignments" from "anon";

revoke update on table "public"."fee_assignments" from "anon";

revoke delete on table "public"."fee_assignments" from "authenticated";

revoke insert on table "public"."fee_assignments" from "authenticated";

revoke references on table "public"."fee_assignments" from "authenticated";

revoke select on table "public"."fee_assignments" from "authenticated";

revoke trigger on table "public"."fee_assignments" from "authenticated";

revoke truncate on table "public"."fee_assignments" from "authenticated";

revoke update on table "public"."fee_assignments" from "authenticated";

revoke delete on table "public"."fee_assignments" from "service_role";

revoke insert on table "public"."fee_assignments" from "service_role";

revoke references on table "public"."fee_assignments" from "service_role";

revoke select on table "public"."fee_assignments" from "service_role";

revoke trigger on table "public"."fee_assignments" from "service_role";

revoke truncate on table "public"."fee_assignments" from "service_role";

revoke update on table "public"."fee_assignments" from "service_role";

revoke delete on table "public"."fees" from "anon";

revoke insert on table "public"."fees" from "anon";

revoke references on table "public"."fees" from "anon";

revoke select on table "public"."fees" from "anon";

revoke trigger on table "public"."fees" from "anon";

revoke truncate on table "public"."fees" from "anon";

revoke update on table "public"."fees" from "anon";

revoke delete on table "public"."fees" from "authenticated";

revoke insert on table "public"."fees" from "authenticated";

revoke references on table "public"."fees" from "authenticated";

revoke select on table "public"."fees" from "authenticated";

revoke trigger on table "public"."fees" from "authenticated";

revoke truncate on table "public"."fees" from "authenticated";

revoke update on table "public"."fees" from "authenticated";

revoke delete on table "public"."fees" from "service_role";

revoke insert on table "public"."fees" from "service_role";

revoke references on table "public"."fees" from "service_role";

revoke select on table "public"."fees" from "service_role";

revoke trigger on table "public"."fees" from "service_role";

revoke truncate on table "public"."fees" from "service_role";

revoke update on table "public"."fees" from "service_role";

revoke delete on table "public"."galleries" from "anon";

revoke insert on table "public"."galleries" from "anon";

revoke references on table "public"."galleries" from "anon";

revoke select on table "public"."galleries" from "anon";

revoke trigger on table "public"."galleries" from "anon";

revoke truncate on table "public"."galleries" from "anon";

revoke update on table "public"."galleries" from "anon";

revoke delete on table "public"."galleries" from "authenticated";

revoke insert on table "public"."galleries" from "authenticated";

revoke references on table "public"."galleries" from "authenticated";

revoke select on table "public"."galleries" from "authenticated";

revoke trigger on table "public"."galleries" from "authenticated";

revoke truncate on table "public"."galleries" from "authenticated";

revoke update on table "public"."galleries" from "authenticated";

revoke delete on table "public"."galleries" from "service_role";

revoke insert on table "public"."galleries" from "service_role";

revoke references on table "public"."galleries" from "service_role";

revoke select on table "public"."galleries" from "service_role";

revoke trigger on table "public"."galleries" from "service_role";

revoke truncate on table "public"."galleries" from "service_role";

revoke update on table "public"."galleries" from "service_role";

revoke delete on table "public"."gallery_albums" from "anon";

revoke insert on table "public"."gallery_albums" from "anon";

revoke references on table "public"."gallery_albums" from "anon";

revoke select on table "public"."gallery_albums" from "anon";

revoke trigger on table "public"."gallery_albums" from "anon";

revoke truncate on table "public"."gallery_albums" from "anon";

revoke update on table "public"."gallery_albums" from "anon";

revoke delete on table "public"."gallery_albums" from "authenticated";

revoke insert on table "public"."gallery_albums" from "authenticated";

revoke references on table "public"."gallery_albums" from "authenticated";

revoke select on table "public"."gallery_albums" from "authenticated";

revoke trigger on table "public"."gallery_albums" from "authenticated";

revoke truncate on table "public"."gallery_albums" from "authenticated";

revoke update on table "public"."gallery_albums" from "authenticated";

revoke delete on table "public"."gallery_albums" from "service_role";

revoke insert on table "public"."gallery_albums" from "service_role";

revoke references on table "public"."gallery_albums" from "service_role";

revoke select on table "public"."gallery_albums" from "service_role";

revoke trigger on table "public"."gallery_albums" from "service_role";

revoke truncate on table "public"."gallery_albums" from "service_role";

revoke update on table "public"."gallery_albums" from "service_role";

revoke delete on table "public"."gallery_downloads" from "anon";

revoke insert on table "public"."gallery_downloads" from "anon";

revoke references on table "public"."gallery_downloads" from "anon";

revoke select on table "public"."gallery_downloads" from "anon";

revoke trigger on table "public"."gallery_downloads" from "anon";

revoke truncate on table "public"."gallery_downloads" from "anon";

revoke update on table "public"."gallery_downloads" from "anon";

revoke delete on table "public"."gallery_downloads" from "authenticated";

revoke insert on table "public"."gallery_downloads" from "authenticated";

revoke references on table "public"."gallery_downloads" from "authenticated";

revoke select on table "public"."gallery_downloads" from "authenticated";

revoke trigger on table "public"."gallery_downloads" from "authenticated";

revoke truncate on table "public"."gallery_downloads" from "authenticated";

revoke update on table "public"."gallery_downloads" from "authenticated";

revoke delete on table "public"."gallery_downloads" from "service_role";

revoke insert on table "public"."gallery_downloads" from "service_role";

revoke references on table "public"."gallery_downloads" from "service_role";

revoke select on table "public"."gallery_downloads" from "service_role";

revoke trigger on table "public"."gallery_downloads" from "service_role";

revoke truncate on table "public"."gallery_downloads" from "service_role";

revoke update on table "public"."gallery_downloads" from "service_role";

revoke delete on table "public"."gallery_photo_bookmarks" from "anon";

revoke insert on table "public"."gallery_photo_bookmarks" from "anon";

revoke references on table "public"."gallery_photo_bookmarks" from "anon";

revoke select on table "public"."gallery_photo_bookmarks" from "anon";

revoke trigger on table "public"."gallery_photo_bookmarks" from "anon";

revoke truncate on table "public"."gallery_photo_bookmarks" from "anon";

revoke update on table "public"."gallery_photo_bookmarks" from "anon";

revoke delete on table "public"."gallery_photo_bookmarks" from "authenticated";

revoke insert on table "public"."gallery_photo_bookmarks" from "authenticated";

revoke references on table "public"."gallery_photo_bookmarks" from "authenticated";

revoke select on table "public"."gallery_photo_bookmarks" from "authenticated";

revoke trigger on table "public"."gallery_photo_bookmarks" from "authenticated";

revoke truncate on table "public"."gallery_photo_bookmarks" from "authenticated";

revoke update on table "public"."gallery_photo_bookmarks" from "authenticated";

revoke delete on table "public"."gallery_photo_bookmarks" from "service_role";

revoke insert on table "public"."gallery_photo_bookmarks" from "service_role";

revoke references on table "public"."gallery_photo_bookmarks" from "service_role";

revoke select on table "public"."gallery_photo_bookmarks" from "service_role";

revoke trigger on table "public"."gallery_photo_bookmarks" from "service_role";

revoke truncate on table "public"."gallery_photo_bookmarks" from "service_role";

revoke update on table "public"."gallery_photo_bookmarks" from "service_role";

revoke delete on table "public"."gallery_photo_tags" from "anon";

revoke insert on table "public"."gallery_photo_tags" from "anon";

revoke references on table "public"."gallery_photo_tags" from "anon";

revoke select on table "public"."gallery_photo_tags" from "anon";

revoke trigger on table "public"."gallery_photo_tags" from "anon";

revoke truncate on table "public"."gallery_photo_tags" from "anon";

revoke update on table "public"."gallery_photo_tags" from "anon";

revoke delete on table "public"."gallery_photo_tags" from "authenticated";

revoke insert on table "public"."gallery_photo_tags" from "authenticated";

revoke references on table "public"."gallery_photo_tags" from "authenticated";

revoke select on table "public"."gallery_photo_tags" from "authenticated";

revoke trigger on table "public"."gallery_photo_tags" from "authenticated";

revoke truncate on table "public"."gallery_photo_tags" from "authenticated";

revoke update on table "public"."gallery_photo_tags" from "authenticated";

revoke delete on table "public"."gallery_photo_tags" from "service_role";

revoke insert on table "public"."gallery_photo_tags" from "service_role";

revoke references on table "public"."gallery_photo_tags" from "service_role";

revoke select on table "public"."gallery_photo_tags" from "service_role";

revoke trigger on table "public"."gallery_photo_tags" from "service_role";

revoke truncate on table "public"."gallery_photo_tags" from "service_role";

revoke update on table "public"."gallery_photo_tags" from "service_role";

revoke delete on table "public"."gallery_photos" from "anon";

revoke insert on table "public"."gallery_photos" from "anon";

revoke references on table "public"."gallery_photos" from "anon";

revoke select on table "public"."gallery_photos" from "anon";

revoke trigger on table "public"."gallery_photos" from "anon";

revoke truncate on table "public"."gallery_photos" from "anon";

revoke update on table "public"."gallery_photos" from "anon";

revoke delete on table "public"."gallery_photos" from "authenticated";

revoke insert on table "public"."gallery_photos" from "authenticated";

revoke references on table "public"."gallery_photos" from "authenticated";

revoke select on table "public"."gallery_photos" from "authenticated";

revoke trigger on table "public"."gallery_photos" from "authenticated";

revoke truncate on table "public"."gallery_photos" from "authenticated";

revoke update on table "public"."gallery_photos" from "authenticated";

revoke delete on table "public"."gallery_photos" from "service_role";

revoke insert on table "public"."gallery_photos" from "service_role";

revoke references on table "public"."gallery_photos" from "service_role";

revoke select on table "public"."gallery_photos" from "service_role";

revoke trigger on table "public"."gallery_photos" from "service_role";

revoke truncate on table "public"."gallery_photos" from "service_role";

revoke update on table "public"."gallery_photos" from "service_role";

revoke delete on table "public"."gallery_share_links" from "anon";

revoke insert on table "public"."gallery_share_links" from "anon";

revoke references on table "public"."gallery_share_links" from "anon";

revoke select on table "public"."gallery_share_links" from "anon";

revoke trigger on table "public"."gallery_share_links" from "anon";

revoke truncate on table "public"."gallery_share_links" from "anon";

revoke update on table "public"."gallery_share_links" from "anon";

revoke delete on table "public"."gallery_share_links" from "authenticated";

revoke insert on table "public"."gallery_share_links" from "authenticated";

revoke references on table "public"."gallery_share_links" from "authenticated";

revoke select on table "public"."gallery_share_links" from "authenticated";

revoke trigger on table "public"."gallery_share_links" from "authenticated";

revoke truncate on table "public"."gallery_share_links" from "authenticated";

revoke update on table "public"."gallery_share_links" from "authenticated";

revoke delete on table "public"."gallery_share_links" from "service_role";

revoke insert on table "public"."gallery_share_links" from "service_role";

revoke references on table "public"."gallery_share_links" from "service_role";

revoke select on table "public"."gallery_share_links" from "service_role";

revoke trigger on table "public"."gallery_share_links" from "service_role";

revoke truncate on table "public"."gallery_share_links" from "service_role";

revoke update on table "public"."gallery_share_links" from "service_role";

revoke delete on table "public"."gallery_zip_downloads" from "anon";

revoke insert on table "public"."gallery_zip_downloads" from "anon";

revoke references on table "public"."gallery_zip_downloads" from "anon";

revoke select on table "public"."gallery_zip_downloads" from "anon";

revoke trigger on table "public"."gallery_zip_downloads" from "anon";

revoke truncate on table "public"."gallery_zip_downloads" from "anon";

revoke update on table "public"."gallery_zip_downloads" from "anon";

revoke delete on table "public"."gallery_zip_downloads" from "authenticated";

revoke insert on table "public"."gallery_zip_downloads" from "authenticated";

revoke references on table "public"."gallery_zip_downloads" from "authenticated";

revoke select on table "public"."gallery_zip_downloads" from "authenticated";

revoke trigger on table "public"."gallery_zip_downloads" from "authenticated";

revoke truncate on table "public"."gallery_zip_downloads" from "authenticated";

revoke update on table "public"."gallery_zip_downloads" from "authenticated";

revoke delete on table "public"."gallery_zip_downloads" from "service_role";

revoke insert on table "public"."gallery_zip_downloads" from "service_role";

revoke references on table "public"."gallery_zip_downloads" from "service_role";

revoke select on table "public"."gallery_zip_downloads" from "service_role";

revoke trigger on table "public"."gallery_zip_downloads" from "service_role";

revoke truncate on table "public"."gallery_zip_downloads" from "service_role";

revoke update on table "public"."gallery_zip_downloads" from "service_role";

revoke delete on table "public"."guardian_attachment_requests" from "authenticated";

revoke insert on table "public"."guardian_attachment_requests" from "authenticated";

revoke references on table "public"."guardian_attachment_requests" from "authenticated";

revoke select on table "public"."guardian_attachment_requests" from "authenticated";

revoke trigger on table "public"."guardian_attachment_requests" from "authenticated";

revoke truncate on table "public"."guardian_attachment_requests" from "authenticated";

revoke update on table "public"."guardian_attachment_requests" from "authenticated";

revoke delete on table "public"."guardian_attachment_requests" from "service_role";

revoke insert on table "public"."guardian_attachment_requests" from "service_role";

revoke references on table "public"."guardian_attachment_requests" from "service_role";

revoke select on table "public"."guardian_attachment_requests" from "service_role";

revoke trigger on table "public"."guardian_attachment_requests" from "service_role";

revoke truncate on table "public"."guardian_attachment_requests" from "service_role";

revoke update on table "public"."guardian_attachment_requests" from "service_role";

revoke delete on table "public"."huddle_audit_log" from "anon";

revoke insert on table "public"."huddle_audit_log" from "anon";

revoke references on table "public"."huddle_audit_log" from "anon";

revoke select on table "public"."huddle_audit_log" from "anon";

revoke trigger on table "public"."huddle_audit_log" from "anon";

revoke truncate on table "public"."huddle_audit_log" from "anon";

revoke update on table "public"."huddle_audit_log" from "anon";

revoke delete on table "public"."huddle_audit_log" from "authenticated";

revoke insert on table "public"."huddle_audit_log" from "authenticated";

revoke references on table "public"."huddle_audit_log" from "authenticated";

revoke select on table "public"."huddle_audit_log" from "authenticated";

revoke trigger on table "public"."huddle_audit_log" from "authenticated";

revoke truncate on table "public"."huddle_audit_log" from "authenticated";

revoke update on table "public"."huddle_audit_log" from "authenticated";

revoke delete on table "public"."huddle_audit_log" from "service_role";

revoke insert on table "public"."huddle_audit_log" from "service_role";

revoke references on table "public"."huddle_audit_log" from "service_role";

revoke select on table "public"."huddle_audit_log" from "service_role";

revoke trigger on table "public"."huddle_audit_log" from "service_role";

revoke truncate on table "public"."huddle_audit_log" from "service_role";

revoke update on table "public"."huddle_audit_log" from "service_role";

revoke delete on table "public"."huddle_notification_preferences" from "anon";

revoke insert on table "public"."huddle_notification_preferences" from "anon";

revoke references on table "public"."huddle_notification_preferences" from "anon";

revoke select on table "public"."huddle_notification_preferences" from "anon";

revoke trigger on table "public"."huddle_notification_preferences" from "anon";

revoke truncate on table "public"."huddle_notification_preferences" from "anon";

revoke update on table "public"."huddle_notification_preferences" from "anon";

revoke delete on table "public"."huddle_notification_preferences" from "authenticated";

revoke insert on table "public"."huddle_notification_preferences" from "authenticated";

revoke references on table "public"."huddle_notification_preferences" from "authenticated";

revoke select on table "public"."huddle_notification_preferences" from "authenticated";

revoke trigger on table "public"."huddle_notification_preferences" from "authenticated";

revoke truncate on table "public"."huddle_notification_preferences" from "authenticated";

revoke update on table "public"."huddle_notification_preferences" from "authenticated";

revoke delete on table "public"."huddle_notification_preferences" from "service_role";

revoke insert on table "public"."huddle_notification_preferences" from "service_role";

revoke references on table "public"."huddle_notification_preferences" from "service_role";

revoke select on table "public"."huddle_notification_preferences" from "service_role";

revoke trigger on table "public"."huddle_notification_preferences" from "service_role";

revoke truncate on table "public"."huddle_notification_preferences" from "service_role";

revoke update on table "public"."huddle_notification_preferences" from "service_role";

revoke delete on table "public"."huddle_reports" from "anon";

revoke insert on table "public"."huddle_reports" from "anon";

revoke references on table "public"."huddle_reports" from "anon";

revoke select on table "public"."huddle_reports" from "anon";

revoke trigger on table "public"."huddle_reports" from "anon";

revoke truncate on table "public"."huddle_reports" from "anon";

revoke update on table "public"."huddle_reports" from "anon";

revoke delete on table "public"."huddle_reports" from "authenticated";

revoke insert on table "public"."huddle_reports" from "authenticated";

revoke references on table "public"."huddle_reports" from "authenticated";

revoke select on table "public"."huddle_reports" from "authenticated";

revoke trigger on table "public"."huddle_reports" from "authenticated";

revoke truncate on table "public"."huddle_reports" from "authenticated";

revoke update on table "public"."huddle_reports" from "authenticated";

revoke delete on table "public"."huddle_reports" from "service_role";

revoke insert on table "public"."huddle_reports" from "service_role";

revoke references on table "public"."huddle_reports" from "service_role";

revoke select on table "public"."huddle_reports" from "service_role";

revoke trigger on table "public"."huddle_reports" from "service_role";

revoke truncate on table "public"."huddle_reports" from "service_role";

revoke update on table "public"."huddle_reports" from "service_role";

revoke delete on table "public"."installment_plans" from "anon";

revoke insert on table "public"."installment_plans" from "anon";

revoke references on table "public"."installment_plans" from "anon";

revoke select on table "public"."installment_plans" from "anon";

revoke trigger on table "public"."installment_plans" from "anon";

revoke truncate on table "public"."installment_plans" from "anon";

revoke update on table "public"."installment_plans" from "anon";

revoke delete on table "public"."installment_plans" from "authenticated";

revoke insert on table "public"."installment_plans" from "authenticated";

revoke references on table "public"."installment_plans" from "authenticated";

revoke select on table "public"."installment_plans" from "authenticated";

revoke trigger on table "public"."installment_plans" from "authenticated";

revoke truncate on table "public"."installment_plans" from "authenticated";

revoke update on table "public"."installment_plans" from "authenticated";

revoke delete on table "public"."installment_plans" from "service_role";

revoke insert on table "public"."installment_plans" from "service_role";

revoke references on table "public"."installment_plans" from "service_role";

revoke select on table "public"."installment_plans" from "service_role";

revoke trigger on table "public"."installment_plans" from "service_role";

revoke truncate on table "public"."installment_plans" from "service_role";

revoke update on table "public"."installment_plans" from "service_role";

revoke delete on table "public"."installment_schedules" from "anon";

revoke insert on table "public"."installment_schedules" from "anon";

revoke references on table "public"."installment_schedules" from "anon";

revoke select on table "public"."installment_schedules" from "anon";

revoke trigger on table "public"."installment_schedules" from "anon";

revoke truncate on table "public"."installment_schedules" from "anon";

revoke update on table "public"."installment_schedules" from "anon";

revoke delete on table "public"."installment_schedules" from "authenticated";

revoke insert on table "public"."installment_schedules" from "authenticated";

revoke references on table "public"."installment_schedules" from "authenticated";

revoke select on table "public"."installment_schedules" from "authenticated";

revoke trigger on table "public"."installment_schedules" from "authenticated";

revoke truncate on table "public"."installment_schedules" from "authenticated";

revoke update on table "public"."installment_schedules" from "authenticated";

revoke delete on table "public"."installment_schedules" from "service_role";

revoke insert on table "public"."installment_schedules" from "service_role";

revoke references on table "public"."installment_schedules" from "service_role";

revoke select on table "public"."installment_schedules" from "service_role";

revoke trigger on table "public"."installment_schedules" from "service_role";

revoke truncate on table "public"."installment_schedules" from "service_role";

revoke update on table "public"."installment_schedules" from "service_role";

revoke delete on table "public"."installments" from "anon";

revoke insert on table "public"."installments" from "anon";

revoke references on table "public"."installments" from "anon";

revoke select on table "public"."installments" from "anon";

revoke trigger on table "public"."installments" from "anon";

revoke truncate on table "public"."installments" from "anon";

revoke update on table "public"."installments" from "anon";

revoke delete on table "public"."installments" from "authenticated";

revoke insert on table "public"."installments" from "authenticated";

revoke references on table "public"."installments" from "authenticated";

revoke select on table "public"."installments" from "authenticated";

revoke trigger on table "public"."installments" from "authenticated";

revoke truncate on table "public"."installments" from "authenticated";

revoke update on table "public"."installments" from "authenticated";

revoke delete on table "public"."installments" from "service_role";

revoke insert on table "public"."installments" from "service_role";

revoke references on table "public"."installments" from "service_role";

revoke select on table "public"."installments" from "service_role";

revoke trigger on table "public"."installments" from "service_role";

revoke truncate on table "public"."installments" from "service_role";

revoke update on table "public"."installments" from "service_role";

revoke delete on table "public"."join_links" from "authenticated";

revoke insert on table "public"."join_links" from "authenticated";

revoke references on table "public"."join_links" from "authenticated";

revoke select on table "public"."join_links" from "authenticated";

revoke update on table "public"."join_links" from "authenticated";

revoke delete on table "public"."join_links" from "service_role";

revoke insert on table "public"."join_links" from "service_role";

revoke references on table "public"."join_links" from "service_role";

revoke select on table "public"."join_links" from "service_role";

revoke trigger on table "public"."join_links" from "service_role";

revoke truncate on table "public"."join_links" from "service_role";

revoke update on table "public"."join_links" from "service_role";

revoke delete on table "public"."join_requests" from "authenticated";

revoke insert on table "public"."join_requests" from "authenticated";

revoke references on table "public"."join_requests" from "authenticated";

revoke select on table "public"."join_requests" from "authenticated";

revoke update on table "public"."join_requests" from "authenticated";

revoke delete on table "public"."join_requests" from "service_role";

revoke insert on table "public"."join_requests" from "service_role";

revoke references on table "public"."join_requests" from "service_role";

revoke select on table "public"."join_requests" from "service_role";

revoke trigger on table "public"."join_requests" from "service_role";

revoke truncate on table "public"."join_requests" from "service_role";

revoke update on table "public"."join_requests" from "service_role";

revoke delete on table "public"."levels" from "anon";

revoke insert on table "public"."levels" from "anon";

revoke references on table "public"."levels" from "anon";

revoke select on table "public"."levels" from "anon";

revoke trigger on table "public"."levels" from "anon";

revoke truncate on table "public"."levels" from "anon";

revoke update on table "public"."levels" from "anon";

revoke delete on table "public"."levels" from "authenticated";

revoke insert on table "public"."levels" from "authenticated";

revoke references on table "public"."levels" from "authenticated";

revoke select on table "public"."levels" from "authenticated";

revoke trigger on table "public"."levels" from "authenticated";

revoke truncate on table "public"."levels" from "authenticated";

revoke update on table "public"."levels" from "authenticated";

revoke delete on table "public"."levels" from "service_role";

revoke insert on table "public"."levels" from "service_role";

revoke references on table "public"."levels" from "service_role";

revoke select on table "public"."levels" from "service_role";

revoke trigger on table "public"."levels" from "service_role";

revoke truncate on table "public"."levels" from "service_role";

revoke update on table "public"."levels" from "service_role";

revoke delete on table "public"."license_tiers" from "anon";

revoke insert on table "public"."license_tiers" from "anon";

revoke references on table "public"."license_tiers" from "anon";

revoke select on table "public"."license_tiers" from "anon";

revoke trigger on table "public"."license_tiers" from "anon";

revoke truncate on table "public"."license_tiers" from "anon";

revoke update on table "public"."license_tiers" from "anon";

revoke delete on table "public"."license_tiers" from "authenticated";

revoke insert on table "public"."license_tiers" from "authenticated";

revoke references on table "public"."license_tiers" from "authenticated";

revoke select on table "public"."license_tiers" from "authenticated";

revoke trigger on table "public"."license_tiers" from "authenticated";

revoke truncate on table "public"."license_tiers" from "authenticated";

revoke update on table "public"."license_tiers" from "authenticated";

revoke delete on table "public"."license_tiers" from "service_role";

revoke insert on table "public"."license_tiers" from "service_role";

revoke references on table "public"."license_tiers" from "service_role";

revoke select on table "public"."license_tiers" from "service_role";

revoke trigger on table "public"."license_tiers" from "service_role";

revoke truncate on table "public"."license_tiers" from "service_role";

revoke update on table "public"."license_tiers" from "service_role";

revoke delete on table "public"."messages_archive" from "authenticated";

revoke insert on table "public"."messages_archive" from "authenticated";

revoke references on table "public"."messages_archive" from "authenticated";

revoke select on table "public"."messages_archive" from "authenticated";

revoke update on table "public"."messages_archive" from "authenticated";

revoke delete on table "public"."messages_archive" from "service_role";

revoke insert on table "public"."messages_archive" from "service_role";

revoke references on table "public"."messages_archive" from "service_role";

revoke select on table "public"."messages_archive" from "service_role";

revoke trigger on table "public"."messages_archive" from "service_role";

revoke truncate on table "public"."messages_archive" from "service_role";

revoke update on table "public"."messages_archive" from "service_role";

revoke delete on table "public"."migration_errors" from "anon";

revoke insert on table "public"."migration_errors" from "anon";

revoke references on table "public"."migration_errors" from "anon";

revoke select on table "public"."migration_errors" from "anon";

revoke trigger on table "public"."migration_errors" from "anon";

revoke truncate on table "public"."migration_errors" from "anon";

revoke update on table "public"."migration_errors" from "anon";

revoke delete on table "public"."migration_errors" from "authenticated";

revoke insert on table "public"."migration_errors" from "authenticated";

revoke references on table "public"."migration_errors" from "authenticated";

revoke select on table "public"."migration_errors" from "authenticated";

revoke trigger on table "public"."migration_errors" from "authenticated";

revoke truncate on table "public"."migration_errors" from "authenticated";

revoke update on table "public"."migration_errors" from "authenticated";

revoke delete on table "public"."migration_errors" from "service_role";

revoke insert on table "public"."migration_errors" from "service_role";

revoke references on table "public"."migration_errors" from "service_role";

revoke select on table "public"."migration_errors" from "service_role";

revoke trigger on table "public"."migration_errors" from "service_role";

revoke truncate on table "public"."migration_errors" from "service_role";

revoke update on table "public"."migration_errors" from "service_role";

revoke delete on table "public"."notification_jobs" from "anon";

revoke insert on table "public"."notification_jobs" from "anon";

revoke references on table "public"."notification_jobs" from "anon";

revoke select on table "public"."notification_jobs" from "anon";

revoke trigger on table "public"."notification_jobs" from "anon";

revoke truncate on table "public"."notification_jobs" from "anon";

revoke update on table "public"."notification_jobs" from "anon";

revoke delete on table "public"."notification_jobs" from "authenticated";

revoke insert on table "public"."notification_jobs" from "authenticated";

revoke references on table "public"."notification_jobs" from "authenticated";

revoke select on table "public"."notification_jobs" from "authenticated";

revoke trigger on table "public"."notification_jobs" from "authenticated";

revoke truncate on table "public"."notification_jobs" from "authenticated";

revoke update on table "public"."notification_jobs" from "authenticated";

revoke delete on table "public"."notification_jobs" from "service_role";

revoke insert on table "public"."notification_jobs" from "service_role";

revoke references on table "public"."notification_jobs" from "service_role";

revoke select on table "public"."notification_jobs" from "service_role";

revoke trigger on table "public"."notification_jobs" from "service_role";

revoke truncate on table "public"."notification_jobs" from "service_role";

revoke update on table "public"."notification_jobs" from "service_role";

revoke delete on table "public"."offline_payment_allocations" from "anon";

revoke insert on table "public"."offline_payment_allocations" from "anon";

revoke references on table "public"."offline_payment_allocations" from "anon";

revoke select on table "public"."offline_payment_allocations" from "anon";

revoke trigger on table "public"."offline_payment_allocations" from "anon";

revoke truncate on table "public"."offline_payment_allocations" from "anon";

revoke update on table "public"."offline_payment_allocations" from "anon";

revoke delete on table "public"."offline_payment_allocations" from "authenticated";

revoke insert on table "public"."offline_payment_allocations" from "authenticated";

revoke references on table "public"."offline_payment_allocations" from "authenticated";

revoke select on table "public"."offline_payment_allocations" from "authenticated";

revoke trigger on table "public"."offline_payment_allocations" from "authenticated";

revoke truncate on table "public"."offline_payment_allocations" from "authenticated";

revoke update on table "public"."offline_payment_allocations" from "authenticated";

revoke delete on table "public"."offline_payment_allocations" from "service_role";

revoke insert on table "public"."offline_payment_allocations" from "service_role";

revoke references on table "public"."offline_payment_allocations" from "service_role";

revoke select on table "public"."offline_payment_allocations" from "service_role";

revoke trigger on table "public"."offline_payment_allocations" from "service_role";

revoke truncate on table "public"."offline_payment_allocations" from "service_role";

revoke update on table "public"."offline_payment_allocations" from "service_role";

revoke delete on table "public"."offline_payments" from "anon";

revoke insert on table "public"."offline_payments" from "anon";

revoke references on table "public"."offline_payments" from "anon";

revoke select on table "public"."offline_payments" from "anon";

revoke trigger on table "public"."offline_payments" from "anon";

revoke truncate on table "public"."offline_payments" from "anon";

revoke update on table "public"."offline_payments" from "anon";

revoke delete on table "public"."offline_payments" from "authenticated";

revoke insert on table "public"."offline_payments" from "authenticated";

revoke references on table "public"."offline_payments" from "authenticated";

revoke select on table "public"."offline_payments" from "authenticated";

revoke trigger on table "public"."offline_payments" from "authenticated";

revoke truncate on table "public"."offline_payments" from "authenticated";

revoke update on table "public"."offline_payments" from "authenticated";

revoke delete on table "public"."offline_payments" from "service_role";

revoke insert on table "public"."offline_payments" from "service_role";

revoke references on table "public"."offline_payments" from "service_role";

revoke select on table "public"."offline_payments" from "service_role";

revoke trigger on table "public"."offline_payments" from "service_role";

revoke truncate on table "public"."offline_payments" from "service_role";

revoke update on table "public"."offline_payments" from "service_role";

revoke delete on table "public"."org_licenses" from "anon";

revoke insert on table "public"."org_licenses" from "anon";

revoke references on table "public"."org_licenses" from "anon";

revoke select on table "public"."org_licenses" from "anon";

revoke trigger on table "public"."org_licenses" from "anon";

revoke truncate on table "public"."org_licenses" from "anon";

revoke update on table "public"."org_licenses" from "anon";

revoke delete on table "public"."org_licenses" from "authenticated";

revoke insert on table "public"."org_licenses" from "authenticated";

revoke references on table "public"."org_licenses" from "authenticated";

revoke select on table "public"."org_licenses" from "authenticated";

revoke trigger on table "public"."org_licenses" from "authenticated";

revoke truncate on table "public"."org_licenses" from "authenticated";

revoke update on table "public"."org_licenses" from "authenticated";

revoke delete on table "public"."org_licenses" from "service_role";

revoke insert on table "public"."org_licenses" from "service_role";

revoke references on table "public"."org_licenses" from "service_role";

revoke select on table "public"."org_licenses" from "service_role";

revoke trigger on table "public"."org_licenses" from "service_role";

revoke truncate on table "public"."org_licenses" from "service_role";

revoke update on table "public"."org_licenses" from "service_role";

revoke delete on table "public"."org_payment_policies" from "anon";

revoke insert on table "public"."org_payment_policies" from "anon";

revoke references on table "public"."org_payment_policies" from "anon";

revoke select on table "public"."org_payment_policies" from "anon";

revoke trigger on table "public"."org_payment_policies" from "anon";

revoke truncate on table "public"."org_payment_policies" from "anon";

revoke update on table "public"."org_payment_policies" from "anon";

revoke delete on table "public"."org_payment_policies" from "authenticated";

revoke insert on table "public"."org_payment_policies" from "authenticated";

revoke references on table "public"."org_payment_policies" from "authenticated";

revoke select on table "public"."org_payment_policies" from "authenticated";

revoke trigger on table "public"."org_payment_policies" from "authenticated";

revoke truncate on table "public"."org_payment_policies" from "authenticated";

revoke update on table "public"."org_payment_policies" from "authenticated";

revoke delete on table "public"."org_payment_policies" from "service_role";

revoke insert on table "public"."org_payment_policies" from "service_role";

revoke references on table "public"."org_payment_policies" from "service_role";

revoke select on table "public"."org_payment_policies" from "service_role";

revoke trigger on table "public"."org_payment_policies" from "service_role";

revoke truncate on table "public"."org_payment_policies" from "service_role";

revoke update on table "public"."org_payment_policies" from "service_role";

revoke delete on table "public"."org_slug_history" from "anon";

revoke insert on table "public"."org_slug_history" from "anon";

revoke references on table "public"."org_slug_history" from "anon";

revoke select on table "public"."org_slug_history" from "anon";

revoke trigger on table "public"."org_slug_history" from "anon";

revoke truncate on table "public"."org_slug_history" from "anon";

revoke update on table "public"."org_slug_history" from "anon";

revoke delete on table "public"."org_slug_history" from "authenticated";

revoke insert on table "public"."org_slug_history" from "authenticated";

revoke references on table "public"."org_slug_history" from "authenticated";

revoke select on table "public"."org_slug_history" from "authenticated";

revoke trigger on table "public"."org_slug_history" from "authenticated";

revoke truncate on table "public"."org_slug_history" from "authenticated";

revoke update on table "public"."org_slug_history" from "authenticated";

revoke delete on table "public"."org_slug_history" from "service_role";

revoke insert on table "public"."org_slug_history" from "service_role";

revoke references on table "public"."org_slug_history" from "service_role";

revoke select on table "public"."org_slug_history" from "service_role";

revoke trigger on table "public"."org_slug_history" from "service_role";

revoke truncate on table "public"."org_slug_history" from "service_role";

revoke update on table "public"."org_slug_history" from "service_role";

revoke delete on table "public"."org_sport_profile_settings" from "anon";

revoke insert on table "public"."org_sport_profile_settings" from "anon";

revoke references on table "public"."org_sport_profile_settings" from "anon";

revoke select on table "public"."org_sport_profile_settings" from "anon";

revoke trigger on table "public"."org_sport_profile_settings" from "anon";

revoke truncate on table "public"."org_sport_profile_settings" from "anon";

revoke update on table "public"."org_sport_profile_settings" from "anon";

revoke delete on table "public"."org_sport_profile_settings" from "authenticated";

revoke insert on table "public"."org_sport_profile_settings" from "authenticated";

revoke references on table "public"."org_sport_profile_settings" from "authenticated";

revoke select on table "public"."org_sport_profile_settings" from "authenticated";

revoke trigger on table "public"."org_sport_profile_settings" from "authenticated";

revoke truncate on table "public"."org_sport_profile_settings" from "authenticated";

revoke update on table "public"."org_sport_profile_settings" from "authenticated";

revoke delete on table "public"."org_sport_profile_settings" from "service_role";

revoke insert on table "public"."org_sport_profile_settings" from "service_role";

revoke references on table "public"."org_sport_profile_settings" from "service_role";

revoke select on table "public"."org_sport_profile_settings" from "service_role";

revoke trigger on table "public"."org_sport_profile_settings" from "service_role";

revoke truncate on table "public"."org_sport_profile_settings" from "service_role";

revoke update on table "public"."org_sport_profile_settings" from "service_role";

revoke delete on table "public"."org_storage_usage" from "anon";

revoke insert on table "public"."org_storage_usage" from "anon";

revoke references on table "public"."org_storage_usage" from "anon";

revoke select on table "public"."org_storage_usage" from "anon";

revoke trigger on table "public"."org_storage_usage" from "anon";

revoke truncate on table "public"."org_storage_usage" from "anon";

revoke update on table "public"."org_storage_usage" from "anon";

revoke delete on table "public"."org_storage_usage" from "authenticated";

revoke insert on table "public"."org_storage_usage" from "authenticated";

revoke references on table "public"."org_storage_usage" from "authenticated";

revoke select on table "public"."org_storage_usage" from "authenticated";

revoke trigger on table "public"."org_storage_usage" from "authenticated";

revoke truncate on table "public"."org_storage_usage" from "authenticated";

revoke update on table "public"."org_storage_usage" from "authenticated";

revoke delete on table "public"."org_storage_usage" from "service_role";

revoke insert on table "public"."org_storage_usage" from "service_role";

revoke references on table "public"."org_storage_usage" from "service_role";

revoke select on table "public"."org_storage_usage" from "service_role";

revoke trigger on table "public"."org_storage_usage" from "service_role";

revoke truncate on table "public"."org_storage_usage" from "service_role";

revoke update on table "public"."org_storage_usage" from "service_role";

revoke delete on table "public"."org_user_audit_log" from "anon";

revoke insert on table "public"."org_user_audit_log" from "anon";

revoke references on table "public"."org_user_audit_log" from "anon";

revoke select on table "public"."org_user_audit_log" from "anon";

revoke trigger on table "public"."org_user_audit_log" from "anon";

revoke truncate on table "public"."org_user_audit_log" from "anon";

revoke update on table "public"."org_user_audit_log" from "anon";

revoke delete on table "public"."org_user_audit_log" from "authenticated";

revoke insert on table "public"."org_user_audit_log" from "authenticated";

revoke references on table "public"."org_user_audit_log" from "authenticated";

revoke select on table "public"."org_user_audit_log" from "authenticated";

revoke trigger on table "public"."org_user_audit_log" from "authenticated";

revoke truncate on table "public"."org_user_audit_log" from "authenticated";

revoke update on table "public"."org_user_audit_log" from "authenticated";

revoke delete on table "public"."org_user_audit_log" from "service_role";

revoke insert on table "public"."org_user_audit_log" from "service_role";

revoke references on table "public"."org_user_audit_log" from "service_role";

revoke select on table "public"."org_user_audit_log" from "service_role";

revoke trigger on table "public"."org_user_audit_log" from "service_role";

revoke truncate on table "public"."org_user_audit_log" from "service_role";

revoke update on table "public"."org_user_audit_log" from "service_role";

revoke delete on table "public"."organization_advanced_settings" from "anon";

revoke insert on table "public"."organization_advanced_settings" from "anon";

revoke references on table "public"."organization_advanced_settings" from "anon";

revoke select on table "public"."organization_advanced_settings" from "anon";

revoke trigger on table "public"."organization_advanced_settings" from "anon";

revoke truncate on table "public"."organization_advanced_settings" from "anon";

revoke update on table "public"."organization_advanced_settings" from "anon";

revoke delete on table "public"."organization_advanced_settings" from "authenticated";

revoke insert on table "public"."organization_advanced_settings" from "authenticated";

revoke references on table "public"."organization_advanced_settings" from "authenticated";

revoke select on table "public"."organization_advanced_settings" from "authenticated";

revoke trigger on table "public"."organization_advanced_settings" from "authenticated";

revoke truncate on table "public"."organization_advanced_settings" from "authenticated";

revoke update on table "public"."organization_advanced_settings" from "authenticated";

revoke delete on table "public"."organization_advanced_settings" from "service_role";

revoke insert on table "public"."organization_advanced_settings" from "service_role";

revoke references on table "public"."organization_advanced_settings" from "service_role";

revoke select on table "public"."organization_advanced_settings" from "service_role";

revoke trigger on table "public"."organization_advanced_settings" from "service_role";

revoke truncate on table "public"."organization_advanced_settings" from "service_role";

revoke update on table "public"."organization_advanced_settings" from "service_role";

revoke delete on table "public"."organization_attendance_settings" from "anon";

revoke insert on table "public"."organization_attendance_settings" from "anon";

revoke references on table "public"."organization_attendance_settings" from "anon";

revoke select on table "public"."organization_attendance_settings" from "anon";

revoke trigger on table "public"."organization_attendance_settings" from "anon";

revoke truncate on table "public"."organization_attendance_settings" from "anon";

revoke update on table "public"."organization_attendance_settings" from "anon";

revoke delete on table "public"."organization_attendance_settings" from "authenticated";

revoke insert on table "public"."organization_attendance_settings" from "authenticated";

revoke references on table "public"."organization_attendance_settings" from "authenticated";

revoke select on table "public"."organization_attendance_settings" from "authenticated";

revoke trigger on table "public"."organization_attendance_settings" from "authenticated";

revoke truncate on table "public"."organization_attendance_settings" from "authenticated";

revoke update on table "public"."organization_attendance_settings" from "authenticated";

revoke delete on table "public"."organization_attendance_settings" from "service_role";

revoke insert on table "public"."organization_attendance_settings" from "service_role";

revoke references on table "public"."organization_attendance_settings" from "service_role";

revoke select on table "public"."organization_attendance_settings" from "service_role";

revoke trigger on table "public"."organization_attendance_settings" from "service_role";

revoke truncate on table "public"."organization_attendance_settings" from "service_role";

revoke update on table "public"."organization_attendance_settings" from "service_role";

revoke delete on table "public"."organization_contacts" from "authenticated";

revoke insert on table "public"."organization_contacts" from "authenticated";

revoke references on table "public"."organization_contacts" from "authenticated";

revoke select on table "public"."organization_contacts" from "authenticated";

revoke update on table "public"."organization_contacts" from "authenticated";

revoke delete on table "public"."organization_contacts" from "service_role";

revoke insert on table "public"."organization_contacts" from "service_role";

revoke references on table "public"."organization_contacts" from "service_role";

revoke select on table "public"."organization_contacts" from "service_role";

revoke trigger on table "public"."organization_contacts" from "service_role";

revoke truncate on table "public"."organization_contacts" from "service_role";

revoke update on table "public"."organization_contacts" from "service_role";

revoke delete on table "public"."organization_defaults" from "authenticated";

revoke insert on table "public"."organization_defaults" from "authenticated";

revoke references on table "public"."organization_defaults" from "authenticated";

revoke select on table "public"."organization_defaults" from "authenticated";

revoke update on table "public"."organization_defaults" from "authenticated";

revoke delete on table "public"."organization_defaults" from "service_role";

revoke insert on table "public"."organization_defaults" from "service_role";

revoke references on table "public"."organization_defaults" from "service_role";

revoke select on table "public"."organization_defaults" from "service_role";

revoke trigger on table "public"."organization_defaults" from "service_role";

revoke truncate on table "public"."organization_defaults" from "service_role";

revoke update on table "public"."organization_defaults" from "service_role";

revoke delete on table "public"."organization_invites" from "authenticated";

revoke insert on table "public"."organization_invites" from "authenticated";

revoke references on table "public"."organization_invites" from "authenticated";

revoke select on table "public"."organization_invites" from "authenticated";

revoke update on table "public"."organization_invites" from "authenticated";

revoke delete on table "public"."organization_invites" from "service_role";

revoke insert on table "public"."organization_invites" from "service_role";

revoke references on table "public"."organization_invites" from "service_role";

revoke select on table "public"."organization_invites" from "service_role";

revoke trigger on table "public"."organization_invites" from "service_role";

revoke truncate on table "public"."organization_invites" from "service_role";

revoke update on table "public"."organization_invites" from "service_role";

revoke delete on table "public"."organization_members" from "authenticated";

revoke insert on table "public"."organization_members" from "authenticated";

revoke references on table "public"."organization_members" from "authenticated";

revoke select on table "public"."organization_members" from "authenticated";

revoke trigger on table "public"."organization_members" from "authenticated";

revoke truncate on table "public"."organization_members" from "authenticated";

revoke update on table "public"."organization_members" from "authenticated";

revoke delete on table "public"."organization_members" from "service_role";

revoke insert on table "public"."organization_members" from "service_role";

revoke references on table "public"."organization_members" from "service_role";

revoke select on table "public"."organization_members" from "service_role";

revoke trigger on table "public"."organization_members" from "service_role";

revoke truncate on table "public"."organization_members" from "service_role";

revoke update on table "public"."organization_members" from "service_role";

revoke delete on table "public"."organization_notification_settings" from "authenticated";

revoke insert on table "public"."organization_notification_settings" from "authenticated";

revoke references on table "public"."organization_notification_settings" from "authenticated";

revoke select on table "public"."organization_notification_settings" from "authenticated";

revoke update on table "public"."organization_notification_settings" from "authenticated";

revoke delete on table "public"."organization_notification_settings" from "service_role";

revoke insert on table "public"."organization_notification_settings" from "service_role";

revoke references on table "public"."organization_notification_settings" from "service_role";

revoke select on table "public"."organization_notification_settings" from "service_role";

revoke trigger on table "public"."organization_notification_settings" from "service_role";

revoke truncate on table "public"."organization_notification_settings" from "service_role";

revoke update on table "public"."organization_notification_settings" from "service_role";

revoke delete on table "public"."organization_registration_settings" from "authenticated";

revoke insert on table "public"."organization_registration_settings" from "authenticated";

revoke references on table "public"."organization_registration_settings" from "authenticated";

revoke select on table "public"."organization_registration_settings" from "authenticated";

revoke update on table "public"."organization_registration_settings" from "authenticated";

revoke delete on table "public"."organization_registration_settings" from "service_role";

revoke insert on table "public"."organization_registration_settings" from "service_role";

revoke references on table "public"."organization_registration_settings" from "service_role";

revoke select on table "public"."organization_registration_settings" from "service_role";

revoke trigger on table "public"."organization_registration_settings" from "service_role";

revoke truncate on table "public"."organization_registration_settings" from "service_role";

revoke update on table "public"."organization_registration_settings" from "service_role";

revoke delete on table "public"."organization_settings" from "anon";

revoke insert on table "public"."organization_settings" from "anon";

revoke references on table "public"."organization_settings" from "anon";

revoke select on table "public"."organization_settings" from "anon";

revoke trigger on table "public"."organization_settings" from "anon";

revoke truncate on table "public"."organization_settings" from "anon";

revoke update on table "public"."organization_settings" from "anon";

revoke delete on table "public"."organization_settings" from "authenticated";

revoke insert on table "public"."organization_settings" from "authenticated";

revoke references on table "public"."organization_settings" from "authenticated";

revoke select on table "public"."organization_settings" from "authenticated";

revoke trigger on table "public"."organization_settings" from "authenticated";

revoke truncate on table "public"."organization_settings" from "authenticated";

revoke update on table "public"."organization_settings" from "authenticated";

revoke delete on table "public"."organization_settings" from "service_role";

revoke insert on table "public"."organization_settings" from "service_role";

revoke references on table "public"."organization_settings" from "service_role";

revoke select on table "public"."organization_settings" from "service_role";

revoke trigger on table "public"."organization_settings" from "service_role";

revoke truncate on table "public"."organization_settings" from "service_role";

revoke update on table "public"."organization_settings" from "service_role";

revoke delete on table "public"."organization_sport_customizations" from "anon";

revoke insert on table "public"."organization_sport_customizations" from "anon";

revoke references on table "public"."organization_sport_customizations" from "anon";

revoke select on table "public"."organization_sport_customizations" from "anon";

revoke trigger on table "public"."organization_sport_customizations" from "anon";

revoke truncate on table "public"."organization_sport_customizations" from "anon";

revoke update on table "public"."organization_sport_customizations" from "anon";

revoke delete on table "public"."organization_sport_customizations" from "authenticated";

revoke insert on table "public"."organization_sport_customizations" from "authenticated";

revoke references on table "public"."organization_sport_customizations" from "authenticated";

revoke select on table "public"."organization_sport_customizations" from "authenticated";

revoke trigger on table "public"."organization_sport_customizations" from "authenticated";

revoke truncate on table "public"."organization_sport_customizations" from "authenticated";

revoke update on table "public"."organization_sport_customizations" from "authenticated";

revoke delete on table "public"."organization_sport_customizations" from "service_role";

revoke insert on table "public"."organization_sport_customizations" from "service_role";

revoke references on table "public"."organization_sport_customizations" from "service_role";

revoke select on table "public"."organization_sport_customizations" from "service_role";

revoke trigger on table "public"."organization_sport_customizations" from "service_role";

revoke truncate on table "public"."organization_sport_customizations" from "service_role";

revoke update on table "public"."organization_sport_customizations" from "service_role";

revoke delete on table "public"."organization_sports" from "anon";

revoke insert on table "public"."organization_sports" from "anon";

revoke references on table "public"."organization_sports" from "anon";

revoke select on table "public"."organization_sports" from "anon";

revoke trigger on table "public"."organization_sports" from "anon";

revoke truncate on table "public"."organization_sports" from "anon";

revoke update on table "public"."organization_sports" from "anon";

revoke delete on table "public"."organization_sports" from "authenticated";

revoke insert on table "public"."organization_sports" from "authenticated";

revoke references on table "public"."organization_sports" from "authenticated";

revoke select on table "public"."organization_sports" from "authenticated";

revoke trigger on table "public"."organization_sports" from "authenticated";

revoke truncate on table "public"."organization_sports" from "authenticated";

revoke update on table "public"."organization_sports" from "authenticated";

revoke delete on table "public"."organization_sports" from "service_role";

revoke insert on table "public"."organization_sports" from "service_role";

revoke references on table "public"."organization_sports" from "service_role";

revoke select on table "public"."organization_sports" from "service_role";

revoke trigger on table "public"."organization_sports" from "service_role";

revoke truncate on table "public"."organization_sports" from "service_role";

revoke update on table "public"."organization_sports" from "service_role";

revoke delete on table "public"."organization_travel_contacts" from "anon";

revoke insert on table "public"."organization_travel_contacts" from "anon";

revoke references on table "public"."organization_travel_contacts" from "anon";

revoke select on table "public"."organization_travel_contacts" from "anon";

revoke trigger on table "public"."organization_travel_contacts" from "anon";

revoke truncate on table "public"."organization_travel_contacts" from "anon";

revoke update on table "public"."organization_travel_contacts" from "anon";

revoke delete on table "public"."organization_travel_contacts" from "authenticated";

revoke insert on table "public"."organization_travel_contacts" from "authenticated";

revoke references on table "public"."organization_travel_contacts" from "authenticated";

revoke select on table "public"."organization_travel_contacts" from "authenticated";

revoke trigger on table "public"."organization_travel_contacts" from "authenticated";

revoke truncate on table "public"."organization_travel_contacts" from "authenticated";

revoke update on table "public"."organization_travel_contacts" from "authenticated";

revoke delete on table "public"."organization_travel_contacts" from "service_role";

revoke insert on table "public"."organization_travel_contacts" from "service_role";

revoke references on table "public"."organization_travel_contacts" from "service_role";

revoke select on table "public"."organization_travel_contacts" from "service_role";

revoke trigger on table "public"."organization_travel_contacts" from "service_role";

revoke truncate on table "public"."organization_travel_contacts" from "service_role";

revoke update on table "public"."organization_travel_contacts" from "service_role";

revoke delete on table "public"."organization_visibility_settings" from "authenticated";

revoke insert on table "public"."organization_visibility_settings" from "authenticated";

revoke references on table "public"."organization_visibility_settings" from "authenticated";

revoke select on table "public"."organization_visibility_settings" from "authenticated";

revoke update on table "public"."organization_visibility_settings" from "authenticated";

revoke delete on table "public"."organization_visibility_settings" from "service_role";

revoke insert on table "public"."organization_visibility_settings" from "service_role";

revoke references on table "public"."organization_visibility_settings" from "service_role";

revoke select on table "public"."organization_visibility_settings" from "service_role";

revoke trigger on table "public"."organization_visibility_settings" from "service_role";

revoke truncate on table "public"."organization_visibility_settings" from "service_role";

revoke update on table "public"."organization_visibility_settings" from "service_role";

revoke delete on table "public"."organizations" from "authenticated";

revoke insert on table "public"."organizations" from "authenticated";

revoke references on table "public"."organizations" from "authenticated";

revoke select on table "public"."organizations" from "authenticated";

revoke update on table "public"."organizations" from "authenticated";

revoke delete on table "public"."organizations" from "service_role";

revoke insert on table "public"."organizations" from "service_role";

revoke references on table "public"."organizations" from "service_role";

revoke select on table "public"."organizations" from "service_role";

revoke trigger on table "public"."organizations" from "service_role";

revoke truncate on table "public"."organizations" from "service_role";

revoke update on table "public"."organizations" from "service_role";

revoke delete on table "public"."parent_invites" from "authenticated";

revoke insert on table "public"."parent_invites" from "authenticated";

revoke references on table "public"."parent_invites" from "authenticated";

revoke select on table "public"."parent_invites" from "authenticated";

revoke trigger on table "public"."parent_invites" from "authenticated";

revoke truncate on table "public"."parent_invites" from "authenticated";

revoke update on table "public"."parent_invites" from "authenticated";

revoke delete on table "public"."parent_invites" from "service_role";

revoke insert on table "public"."parent_invites" from "service_role";

revoke references on table "public"."parent_invites" from "service_role";

revoke select on table "public"."parent_invites" from "service_role";

revoke trigger on table "public"."parent_invites" from "service_role";

revoke truncate on table "public"."parent_invites" from "service_role";

revoke update on table "public"."parent_invites" from "service_role";

revoke delete on table "public"."payment_allocations" from "anon";

revoke insert on table "public"."payment_allocations" from "anon";

revoke references on table "public"."payment_allocations" from "anon";

revoke select on table "public"."payment_allocations" from "anon";

revoke trigger on table "public"."payment_allocations" from "anon";

revoke truncate on table "public"."payment_allocations" from "anon";

revoke update on table "public"."payment_allocations" from "anon";

revoke delete on table "public"."payment_allocations" from "authenticated";

revoke insert on table "public"."payment_allocations" from "authenticated";

revoke references on table "public"."payment_allocations" from "authenticated";

revoke select on table "public"."payment_allocations" from "authenticated";

revoke trigger on table "public"."payment_allocations" from "authenticated";

revoke truncate on table "public"."payment_allocations" from "authenticated";

revoke update on table "public"."payment_allocations" from "authenticated";

revoke delete on table "public"."payment_allocations" from "service_role";

revoke insert on table "public"."payment_allocations" from "service_role";

revoke references on table "public"."payment_allocations" from "service_role";

revoke select on table "public"."payment_allocations" from "service_role";

revoke trigger on table "public"."payment_allocations" from "service_role";

revoke truncate on table "public"."payment_allocations" from "service_role";

revoke update on table "public"."payment_allocations" from "service_role";

revoke delete on table "public"."payment_events" from "anon";

revoke insert on table "public"."payment_events" from "anon";

revoke references on table "public"."payment_events" from "anon";

revoke select on table "public"."payment_events" from "anon";

revoke trigger on table "public"."payment_events" from "anon";

revoke truncate on table "public"."payment_events" from "anon";

revoke update on table "public"."payment_events" from "anon";

revoke delete on table "public"."payment_events" from "authenticated";

revoke insert on table "public"."payment_events" from "authenticated";

revoke references on table "public"."payment_events" from "authenticated";

revoke select on table "public"."payment_events" from "authenticated";

revoke trigger on table "public"."payment_events" from "authenticated";

revoke truncate on table "public"."payment_events" from "authenticated";

revoke update on table "public"."payment_events" from "authenticated";

revoke delete on table "public"."payment_events" from "service_role";

revoke insert on table "public"."payment_events" from "service_role";

revoke references on table "public"."payment_events" from "service_role";

revoke select on table "public"."payment_events" from "service_role";

revoke trigger on table "public"."payment_events" from "service_role";

revoke truncate on table "public"."payment_events" from "service_role";

revoke update on table "public"."payment_events" from "service_role";

revoke delete on table "public"."payments" from "anon";

revoke insert on table "public"."payments" from "anon";

revoke references on table "public"."payments" from "anon";

revoke select on table "public"."payments" from "anon";

revoke trigger on table "public"."payments" from "anon";

revoke truncate on table "public"."payments" from "anon";

revoke update on table "public"."payments" from "anon";

revoke delete on table "public"."payments" from "authenticated";

revoke insert on table "public"."payments" from "authenticated";

revoke references on table "public"."payments" from "authenticated";

revoke select on table "public"."payments" from "authenticated";

revoke trigger on table "public"."payments" from "authenticated";

revoke truncate on table "public"."payments" from "authenticated";

revoke update on table "public"."payments" from "authenticated";

revoke delete on table "public"."payments" from "service_role";

revoke insert on table "public"."payments" from "service_role";

revoke references on table "public"."payments" from "service_role";

revoke select on table "public"."payments" from "service_role";

revoke trigger on table "public"."payments" from "service_role";

revoke truncate on table "public"."payments" from "service_role";

revoke update on table "public"."payments" from "service_role";

revoke delete on table "public"."platform_admins" from "authenticated";

revoke insert on table "public"."platform_admins" from "authenticated";

revoke references on table "public"."platform_admins" from "authenticated";

revoke select on table "public"."platform_admins" from "authenticated";

revoke trigger on table "public"."platform_admins" from "authenticated";

revoke update on table "public"."platform_admins" from "authenticated";

revoke delete on table "public"."platform_admins" from "service_role";

revoke insert on table "public"."platform_admins" from "service_role";

revoke references on table "public"."platform_admins" from "service_role";

revoke select on table "public"."platform_admins" from "service_role";

revoke trigger on table "public"."platform_admins" from "service_role";

revoke truncate on table "public"."platform_admins" from "service_role";

revoke update on table "public"."platform_admins" from "service_role";

revoke delete on table "public"."programs" from "anon";

revoke insert on table "public"."programs" from "anon";

revoke references on table "public"."programs" from "anon";

revoke select on table "public"."programs" from "anon";

revoke trigger on table "public"."programs" from "anon";

revoke truncate on table "public"."programs" from "anon";

revoke update on table "public"."programs" from "anon";

revoke delete on table "public"."programs" from "authenticated";

revoke insert on table "public"."programs" from "authenticated";

revoke references on table "public"."programs" from "authenticated";

revoke select on table "public"."programs" from "authenticated";

revoke trigger on table "public"."programs" from "authenticated";

revoke truncate on table "public"."programs" from "authenticated";

revoke update on table "public"."programs" from "authenticated";

revoke delete on table "public"."programs" from "service_role";

revoke insert on table "public"."programs" from "service_role";

revoke references on table "public"."programs" from "service_role";

revoke select on table "public"."programs" from "service_role";

revoke trigger on table "public"."programs" from "service_role";

revoke truncate on table "public"."programs" from "service_role";

revoke update on table "public"."programs" from "service_role";

revoke delete on table "public"."purchases" from "anon";

revoke insert on table "public"."purchases" from "anon";

revoke references on table "public"."purchases" from "anon";

revoke select on table "public"."purchases" from "anon";

revoke trigger on table "public"."purchases" from "anon";

revoke truncate on table "public"."purchases" from "anon";

revoke update on table "public"."purchases" from "anon";

revoke delete on table "public"."purchases" from "authenticated";

revoke insert on table "public"."purchases" from "authenticated";

revoke references on table "public"."purchases" from "authenticated";

revoke select on table "public"."purchases" from "authenticated";

revoke trigger on table "public"."purchases" from "authenticated";

revoke truncate on table "public"."purchases" from "authenticated";

revoke update on table "public"."purchases" from "authenticated";

revoke delete on table "public"."purchases" from "service_role";

revoke insert on table "public"."purchases" from "service_role";

revoke references on table "public"."purchases" from "service_role";

revoke select on table "public"."purchases" from "service_role";

revoke trigger on table "public"."purchases" from "service_role";

revoke truncate on table "public"."purchases" from "service_role";

revoke update on table "public"."purchases" from "service_role";

revoke delete on table "public"."recurring_event_instances" from "anon";

revoke insert on table "public"."recurring_event_instances" from "anon";

revoke references on table "public"."recurring_event_instances" from "anon";

revoke select on table "public"."recurring_event_instances" from "anon";

revoke trigger on table "public"."recurring_event_instances" from "anon";

revoke truncate on table "public"."recurring_event_instances" from "anon";

revoke update on table "public"."recurring_event_instances" from "anon";

revoke delete on table "public"."recurring_event_instances" from "authenticated";

revoke insert on table "public"."recurring_event_instances" from "authenticated";

revoke references on table "public"."recurring_event_instances" from "authenticated";

revoke select on table "public"."recurring_event_instances" from "authenticated";

revoke trigger on table "public"."recurring_event_instances" from "authenticated";

revoke truncate on table "public"."recurring_event_instances" from "authenticated";

revoke update on table "public"."recurring_event_instances" from "authenticated";

revoke delete on table "public"."recurring_event_instances" from "service_role";

revoke insert on table "public"."recurring_event_instances" from "service_role";

revoke references on table "public"."recurring_event_instances" from "service_role";

revoke select on table "public"."recurring_event_instances" from "service_role";

revoke trigger on table "public"."recurring_event_instances" from "service_role";

revoke truncate on table "public"."recurring_event_instances" from "service_role";

revoke update on table "public"."recurring_event_instances" from "service_role";

revoke delete on table "public"."recurring_event_patterns" from "anon";

revoke insert on table "public"."recurring_event_patterns" from "anon";

revoke references on table "public"."recurring_event_patterns" from "anon";

revoke select on table "public"."recurring_event_patterns" from "anon";

revoke trigger on table "public"."recurring_event_patterns" from "anon";

revoke truncate on table "public"."recurring_event_patterns" from "anon";

revoke update on table "public"."recurring_event_patterns" from "anon";

revoke delete on table "public"."recurring_event_patterns" from "authenticated";

revoke insert on table "public"."recurring_event_patterns" from "authenticated";

revoke references on table "public"."recurring_event_patterns" from "authenticated";

revoke select on table "public"."recurring_event_patterns" from "authenticated";

revoke trigger on table "public"."recurring_event_patterns" from "authenticated";

revoke truncate on table "public"."recurring_event_patterns" from "authenticated";

revoke update on table "public"."recurring_event_patterns" from "authenticated";

revoke delete on table "public"."recurring_event_patterns" from "service_role";

revoke insert on table "public"."recurring_event_patterns" from "service_role";

revoke references on table "public"."recurring_event_patterns" from "service_role";

revoke select on table "public"."recurring_event_patterns" from "service_role";

revoke trigger on table "public"."recurring_event_patterns" from "service_role";

revoke truncate on table "public"."recurring_event_patterns" from "service_role";

revoke update on table "public"."recurring_event_patterns" from "service_role";

revoke delete on table "public"."refunds" from "anon";

revoke insert on table "public"."refunds" from "anon";

revoke references on table "public"."refunds" from "anon";

revoke select on table "public"."refunds" from "anon";

revoke trigger on table "public"."refunds" from "anon";

revoke truncate on table "public"."refunds" from "anon";

revoke update on table "public"."refunds" from "anon";

revoke delete on table "public"."refunds" from "authenticated";

revoke insert on table "public"."refunds" from "authenticated";

revoke references on table "public"."refunds" from "authenticated";

revoke select on table "public"."refunds" from "authenticated";

revoke trigger on table "public"."refunds" from "authenticated";

revoke truncate on table "public"."refunds" from "authenticated";

revoke update on table "public"."refunds" from "authenticated";

revoke delete on table "public"."refunds" from "service_role";

revoke insert on table "public"."refunds" from "service_role";

revoke references on table "public"."refunds" from "service_role";

revoke select on table "public"."refunds" from "service_role";

revoke trigger on table "public"."refunds" from "service_role";

revoke truncate on table "public"."refunds" from "service_role";

revoke update on table "public"."refunds" from "service_role";

revoke delete on table "public"."scholarship_awards" from "anon";

revoke insert on table "public"."scholarship_awards" from "anon";

revoke references on table "public"."scholarship_awards" from "anon";

revoke select on table "public"."scholarship_awards" from "anon";

revoke trigger on table "public"."scholarship_awards" from "anon";

revoke truncate on table "public"."scholarship_awards" from "anon";

revoke update on table "public"."scholarship_awards" from "anon";

revoke delete on table "public"."scholarship_awards" from "authenticated";

revoke insert on table "public"."scholarship_awards" from "authenticated";

revoke references on table "public"."scholarship_awards" from "authenticated";

revoke select on table "public"."scholarship_awards" from "authenticated";

revoke trigger on table "public"."scholarship_awards" from "authenticated";

revoke truncate on table "public"."scholarship_awards" from "authenticated";

revoke update on table "public"."scholarship_awards" from "authenticated";

revoke delete on table "public"."scholarship_awards" from "service_role";

revoke insert on table "public"."scholarship_awards" from "service_role";

revoke references on table "public"."scholarship_awards" from "service_role";

revoke select on table "public"."scholarship_awards" from "service_role";

revoke trigger on table "public"."scholarship_awards" from "service_role";

revoke truncate on table "public"."scholarship_awards" from "service_role";

revoke update on table "public"."scholarship_awards" from "service_role";

revoke delete on table "public"."scholarship_programs" from "anon";

revoke insert on table "public"."scholarship_programs" from "anon";

revoke references on table "public"."scholarship_programs" from "anon";

revoke select on table "public"."scholarship_programs" from "anon";

revoke trigger on table "public"."scholarship_programs" from "anon";

revoke truncate on table "public"."scholarship_programs" from "anon";

revoke update on table "public"."scholarship_programs" from "anon";

revoke delete on table "public"."scholarship_programs" from "authenticated";

revoke insert on table "public"."scholarship_programs" from "authenticated";

revoke references on table "public"."scholarship_programs" from "authenticated";

revoke select on table "public"."scholarship_programs" from "authenticated";

revoke trigger on table "public"."scholarship_programs" from "authenticated";

revoke truncate on table "public"."scholarship_programs" from "authenticated";

revoke update on table "public"."scholarship_programs" from "authenticated";

revoke delete on table "public"."scholarship_programs" from "service_role";

revoke insert on table "public"."scholarship_programs" from "service_role";

revoke references on table "public"."scholarship_programs" from "service_role";

revoke select on table "public"."scholarship_programs" from "service_role";

revoke trigger on table "public"."scholarship_programs" from "service_role";

revoke truncate on table "public"."scholarship_programs" from "service_role";

revoke update on table "public"."scholarship_programs" from "service_role";

revoke delete on table "public"."seasons" from "authenticated";

revoke insert on table "public"."seasons" from "authenticated";

revoke references on table "public"."seasons" from "authenticated";

revoke select on table "public"."seasons" from "authenticated";

revoke update on table "public"."seasons" from "authenticated";

revoke delete on table "public"."seasons" from "service_role";

revoke insert on table "public"."seasons" from "service_role";

revoke references on table "public"."seasons" from "service_role";

revoke select on table "public"."seasons" from "service_role";

revoke trigger on table "public"."seasons" from "service_role";

revoke truncate on table "public"."seasons" from "service_role";

revoke update on table "public"."seasons" from "service_role";

revoke delete on table "public"."sport_field_definitions" from "anon";

revoke insert on table "public"."sport_field_definitions" from "anon";

revoke references on table "public"."sport_field_definitions" from "anon";

revoke select on table "public"."sport_field_definitions" from "anon";

revoke trigger on table "public"."sport_field_definitions" from "anon";

revoke truncate on table "public"."sport_field_definitions" from "anon";

revoke update on table "public"."sport_field_definitions" from "anon";

revoke delete on table "public"."sport_field_definitions" from "authenticated";

revoke insert on table "public"."sport_field_definitions" from "authenticated";

revoke references on table "public"."sport_field_definitions" from "authenticated";

revoke select on table "public"."sport_field_definitions" from "authenticated";

revoke trigger on table "public"."sport_field_definitions" from "authenticated";

revoke truncate on table "public"."sport_field_definitions" from "authenticated";

revoke update on table "public"."sport_field_definitions" from "authenticated";

revoke delete on table "public"."sport_field_definitions" from "service_role";

revoke insert on table "public"."sport_field_definitions" from "service_role";

revoke references on table "public"."sport_field_definitions" from "service_role";

revoke select on table "public"."sport_field_definitions" from "service_role";

revoke trigger on table "public"."sport_field_definitions" from "service_role";

revoke truncate on table "public"."sport_field_definitions" from "service_role";

revoke update on table "public"."sport_field_definitions" from "service_role";

revoke delete on table "public"."sports" from "anon";

revoke insert on table "public"."sports" from "anon";

revoke references on table "public"."sports" from "anon";

revoke select on table "public"."sports" from "anon";

revoke trigger on table "public"."sports" from "anon";

revoke truncate on table "public"."sports" from "anon";

revoke update on table "public"."sports" from "anon";

revoke delete on table "public"."sports" from "authenticated";

revoke insert on table "public"."sports" from "authenticated";

revoke references on table "public"."sports" from "authenticated";

revoke select on table "public"."sports" from "authenticated";

revoke trigger on table "public"."sports" from "authenticated";

revoke truncate on table "public"."sports" from "authenticated";

revoke update on table "public"."sports" from "authenticated";

revoke delete on table "public"."sports" from "service_role";

revoke insert on table "public"."sports" from "service_role";

revoke references on table "public"."sports" from "service_role";

revoke select on table "public"."sports" from "service_role";

revoke trigger on table "public"."sports" from "service_role";

revoke truncate on table "public"."sports" from "service_role";

revoke update on table "public"."sports" from "service_role";

revoke delete on table "public"."stream_channel_metadata" from "authenticated";

revoke insert on table "public"."stream_channel_metadata" from "authenticated";

revoke references on table "public"."stream_channel_metadata" from "authenticated";

revoke select on table "public"."stream_channel_metadata" from "authenticated";

revoke update on table "public"."stream_channel_metadata" from "authenticated";

revoke delete on table "public"."stream_channel_metadata" from "service_role";

revoke insert on table "public"."stream_channel_metadata" from "service_role";

revoke references on table "public"."stream_channel_metadata" from "service_role";

revoke select on table "public"."stream_channel_metadata" from "service_role";

revoke trigger on table "public"."stream_channel_metadata" from "service_role";

revoke truncate on table "public"."stream_channel_metadata" from "service_role";

revoke update on table "public"."stream_channel_metadata" from "service_role";

revoke delete on table "public"."stream_channels" from "authenticated";

revoke insert on table "public"."stream_channels" from "authenticated";

revoke references on table "public"."stream_channels" from "authenticated";

revoke select on table "public"."stream_channels" from "authenticated";

revoke update on table "public"."stream_channels" from "authenticated";

revoke delete on table "public"."stream_channels" from "service_role";

revoke insert on table "public"."stream_channels" from "service_role";

revoke references on table "public"."stream_channels" from "service_role";

revoke select on table "public"."stream_channels" from "service_role";

revoke trigger on table "public"."stream_channels" from "service_role";

revoke truncate on table "public"."stream_channels" from "service_role";

revoke update on table "public"."stream_channels" from "service_role";

revoke delete on table "public"."stripe_connect_transactions" from "anon";

revoke insert on table "public"."stripe_connect_transactions" from "anon";

revoke references on table "public"."stripe_connect_transactions" from "anon";

revoke select on table "public"."stripe_connect_transactions" from "anon";

revoke trigger on table "public"."stripe_connect_transactions" from "anon";

revoke truncate on table "public"."stripe_connect_transactions" from "anon";

revoke update on table "public"."stripe_connect_transactions" from "anon";

revoke delete on table "public"."stripe_connect_transactions" from "authenticated";

revoke insert on table "public"."stripe_connect_transactions" from "authenticated";

revoke references on table "public"."stripe_connect_transactions" from "authenticated";

revoke select on table "public"."stripe_connect_transactions" from "authenticated";

revoke trigger on table "public"."stripe_connect_transactions" from "authenticated";

revoke truncate on table "public"."stripe_connect_transactions" from "authenticated";

revoke update on table "public"."stripe_connect_transactions" from "authenticated";

revoke delete on table "public"."stripe_connect_transactions" from "service_role";

revoke insert on table "public"."stripe_connect_transactions" from "service_role";

revoke references on table "public"."stripe_connect_transactions" from "service_role";

revoke select on table "public"."stripe_connect_transactions" from "service_role";

revoke trigger on table "public"."stripe_connect_transactions" from "service_role";

revoke truncate on table "public"."stripe_connect_transactions" from "service_role";

revoke update on table "public"."stripe_connect_transactions" from "service_role";

revoke delete on table "public"."stripe_webhook_receipts" from "anon";

revoke insert on table "public"."stripe_webhook_receipts" from "anon";

revoke references on table "public"."stripe_webhook_receipts" from "anon";

revoke select on table "public"."stripe_webhook_receipts" from "anon";

revoke trigger on table "public"."stripe_webhook_receipts" from "anon";

revoke truncate on table "public"."stripe_webhook_receipts" from "anon";

revoke update on table "public"."stripe_webhook_receipts" from "anon";

revoke delete on table "public"."stripe_webhook_receipts" from "authenticated";

revoke insert on table "public"."stripe_webhook_receipts" from "authenticated";

revoke references on table "public"."stripe_webhook_receipts" from "authenticated";

revoke select on table "public"."stripe_webhook_receipts" from "authenticated";

revoke trigger on table "public"."stripe_webhook_receipts" from "authenticated";

revoke truncate on table "public"."stripe_webhook_receipts" from "authenticated";

revoke update on table "public"."stripe_webhook_receipts" from "authenticated";

revoke delete on table "public"."stripe_webhook_receipts" from "service_role";

revoke insert on table "public"."stripe_webhook_receipts" from "service_role";

revoke references on table "public"."stripe_webhook_receipts" from "service_role";

revoke select on table "public"."stripe_webhook_receipts" from "service_role";

revoke trigger on table "public"."stripe_webhook_receipts" from "service_role";

revoke truncate on table "public"."stripe_webhook_receipts" from "service_role";

revoke update on table "public"."stripe_webhook_receipts" from "service_role";

revoke delete on table "public"."team_memberships" from "authenticated";

revoke insert on table "public"."team_memberships" from "authenticated";

revoke references on table "public"."team_memberships" from "authenticated";

revoke select on table "public"."team_memberships" from "authenticated";

revoke update on table "public"."team_memberships" from "authenticated";

revoke delete on table "public"."team_memberships" from "service_role";

revoke insert on table "public"."team_memberships" from "service_role";

revoke references on table "public"."team_memberships" from "service_role";

revoke select on table "public"."team_memberships" from "service_role";

revoke trigger on table "public"."team_memberships" from "service_role";

revoke truncate on table "public"."team_memberships" from "service_role";

revoke update on table "public"."team_memberships" from "service_role";

revoke delete on table "public"."team_seasons" from "anon";

revoke insert on table "public"."team_seasons" from "anon";

revoke references on table "public"."team_seasons" from "anon";

revoke select on table "public"."team_seasons" from "anon";

revoke trigger on table "public"."team_seasons" from "anon";

revoke truncate on table "public"."team_seasons" from "anon";

revoke update on table "public"."team_seasons" from "anon";

revoke delete on table "public"."team_seasons" from "authenticated";

revoke insert on table "public"."team_seasons" from "authenticated";

revoke references on table "public"."team_seasons" from "authenticated";

revoke select on table "public"."team_seasons" from "authenticated";

revoke trigger on table "public"."team_seasons" from "authenticated";

revoke truncate on table "public"."team_seasons" from "authenticated";

revoke update on table "public"."team_seasons" from "authenticated";

revoke delete on table "public"."team_seasons" from "service_role";

revoke insert on table "public"."team_seasons" from "service_role";

revoke references on table "public"."team_seasons" from "service_role";

revoke select on table "public"."team_seasons" from "service_role";

revoke trigger on table "public"."team_seasons" from "service_role";

revoke truncate on table "public"."team_seasons" from "service_role";

revoke update on table "public"."team_seasons" from "service_role";

revoke delete on table "public"."teams" from "authenticated";

revoke insert on table "public"."teams" from "authenticated";

revoke references on table "public"."teams" from "authenticated";

revoke select on table "public"."teams" from "authenticated";

revoke update on table "public"."teams" from "authenticated";

revoke delete on table "public"."teams" from "service_role";

revoke insert on table "public"."teams" from "service_role";

revoke references on table "public"."teams" from "service_role";

revoke select on table "public"."teams" from "service_role";

revoke trigger on table "public"."teams" from "service_role";

revoke truncate on table "public"."teams" from "service_role";

revoke update on table "public"."teams" from "service_role";

revoke delete on table "public"."ticket_access_links" from "anon";

revoke insert on table "public"."ticket_access_links" from "anon";

revoke references on table "public"."ticket_access_links" from "anon";

revoke select on table "public"."ticket_access_links" from "anon";

revoke trigger on table "public"."ticket_access_links" from "anon";

revoke truncate on table "public"."ticket_access_links" from "anon";

revoke update on table "public"."ticket_access_links" from "anon";

revoke delete on table "public"."ticket_access_links" from "authenticated";

revoke insert on table "public"."ticket_access_links" from "authenticated";

revoke references on table "public"."ticket_access_links" from "authenticated";

revoke select on table "public"."ticket_access_links" from "authenticated";

revoke trigger on table "public"."ticket_access_links" from "authenticated";

revoke truncate on table "public"."ticket_access_links" from "authenticated";

revoke update on table "public"."ticket_access_links" from "authenticated";

revoke delete on table "public"."ticket_access_links" from "service_role";

revoke insert on table "public"."ticket_access_links" from "service_role";

revoke references on table "public"."ticket_access_links" from "service_role";

revoke select on table "public"."ticket_access_links" from "service_role";

revoke trigger on table "public"."ticket_access_links" from "service_role";

revoke truncate on table "public"."ticket_access_links" from "service_role";

revoke update on table "public"."ticket_access_links" from "service_role";

revoke delete on table "public"."ticket_holds" from "anon";

revoke insert on table "public"."ticket_holds" from "anon";

revoke references on table "public"."ticket_holds" from "anon";

revoke select on table "public"."ticket_holds" from "anon";

revoke trigger on table "public"."ticket_holds" from "anon";

revoke truncate on table "public"."ticket_holds" from "anon";

revoke update on table "public"."ticket_holds" from "anon";

revoke delete on table "public"."ticket_holds" from "authenticated";

revoke insert on table "public"."ticket_holds" from "authenticated";

revoke references on table "public"."ticket_holds" from "authenticated";

revoke select on table "public"."ticket_holds" from "authenticated";

revoke trigger on table "public"."ticket_holds" from "authenticated";

revoke truncate on table "public"."ticket_holds" from "authenticated";

revoke update on table "public"."ticket_holds" from "authenticated";

revoke delete on table "public"."ticket_holds" from "service_role";

revoke insert on table "public"."ticket_holds" from "service_role";

revoke references on table "public"."ticket_holds" from "service_role";

revoke select on table "public"."ticket_holds" from "service_role";

revoke trigger on table "public"."ticket_holds" from "service_role";

revoke truncate on table "public"."ticket_holds" from "service_role";

revoke update on table "public"."ticket_holds" from "service_role";

revoke delete on table "public"."ticket_order_items" from "anon";

revoke insert on table "public"."ticket_order_items" from "anon";

revoke references on table "public"."ticket_order_items" from "anon";

revoke select on table "public"."ticket_order_items" from "anon";

revoke trigger on table "public"."ticket_order_items" from "anon";

revoke truncate on table "public"."ticket_order_items" from "anon";

revoke update on table "public"."ticket_order_items" from "anon";

revoke delete on table "public"."ticket_order_items" from "authenticated";

revoke insert on table "public"."ticket_order_items" from "authenticated";

revoke references on table "public"."ticket_order_items" from "authenticated";

revoke select on table "public"."ticket_order_items" from "authenticated";

revoke trigger on table "public"."ticket_order_items" from "authenticated";

revoke truncate on table "public"."ticket_order_items" from "authenticated";

revoke update on table "public"."ticket_order_items" from "authenticated";

revoke delete on table "public"."ticket_order_items" from "service_role";

revoke insert on table "public"."ticket_order_items" from "service_role";

revoke references on table "public"."ticket_order_items" from "service_role";

revoke select on table "public"."ticket_order_items" from "service_role";

revoke trigger on table "public"."ticket_order_items" from "service_role";

revoke truncate on table "public"."ticket_order_items" from "service_role";

revoke update on table "public"."ticket_order_items" from "service_role";

revoke delete on table "public"."ticket_orders" from "anon";

revoke insert on table "public"."ticket_orders" from "anon";

revoke references on table "public"."ticket_orders" from "anon";

revoke select on table "public"."ticket_orders" from "anon";

revoke trigger on table "public"."ticket_orders" from "anon";

revoke truncate on table "public"."ticket_orders" from "anon";

revoke update on table "public"."ticket_orders" from "anon";

revoke delete on table "public"."ticket_orders" from "authenticated";

revoke insert on table "public"."ticket_orders" from "authenticated";

revoke references on table "public"."ticket_orders" from "authenticated";

revoke select on table "public"."ticket_orders" from "authenticated";

revoke trigger on table "public"."ticket_orders" from "authenticated";

revoke truncate on table "public"."ticket_orders" from "authenticated";

revoke update on table "public"."ticket_orders" from "authenticated";

revoke delete on table "public"."ticket_orders" from "service_role";

revoke insert on table "public"."ticket_orders" from "service_role";

revoke references on table "public"."ticket_orders" from "service_role";

revoke select on table "public"."ticket_orders" from "service_role";

revoke trigger on table "public"."ticket_orders" from "service_role";

revoke truncate on table "public"."ticket_orders" from "service_role";

revoke update on table "public"."ticket_orders" from "service_role";

revoke delete on table "public"."ticket_reservations" from "anon";

revoke insert on table "public"."ticket_reservations" from "anon";

revoke references on table "public"."ticket_reservations" from "anon";

revoke select on table "public"."ticket_reservations" from "anon";

revoke trigger on table "public"."ticket_reservations" from "anon";

revoke truncate on table "public"."ticket_reservations" from "anon";

revoke update on table "public"."ticket_reservations" from "anon";

revoke delete on table "public"."ticket_reservations" from "authenticated";

revoke insert on table "public"."ticket_reservations" from "authenticated";

revoke references on table "public"."ticket_reservations" from "authenticated";

revoke select on table "public"."ticket_reservations" from "authenticated";

revoke trigger on table "public"."ticket_reservations" from "authenticated";

revoke truncate on table "public"."ticket_reservations" from "authenticated";

revoke update on table "public"."ticket_reservations" from "authenticated";

revoke delete on table "public"."ticket_reservations" from "service_role";

revoke insert on table "public"."ticket_reservations" from "service_role";

revoke references on table "public"."ticket_reservations" from "service_role";

revoke select on table "public"."ticket_reservations" from "service_role";

revoke trigger on table "public"."ticket_reservations" from "service_role";

revoke truncate on table "public"."ticket_reservations" from "service_role";

revoke update on table "public"."ticket_reservations" from "service_role";

revoke delete on table "public"."ticket_scans" from "anon";

revoke insert on table "public"."ticket_scans" from "anon";

revoke references on table "public"."ticket_scans" from "anon";

revoke select on table "public"."ticket_scans" from "anon";

revoke trigger on table "public"."ticket_scans" from "anon";

revoke truncate on table "public"."ticket_scans" from "anon";

revoke update on table "public"."ticket_scans" from "anon";

revoke delete on table "public"."ticket_scans" from "authenticated";

revoke insert on table "public"."ticket_scans" from "authenticated";

revoke references on table "public"."ticket_scans" from "authenticated";

revoke select on table "public"."ticket_scans" from "authenticated";

revoke trigger on table "public"."ticket_scans" from "authenticated";

revoke truncate on table "public"."ticket_scans" from "authenticated";

revoke update on table "public"."ticket_scans" from "authenticated";

revoke delete on table "public"."ticket_scans" from "service_role";

revoke insert on table "public"."ticket_scans" from "service_role";

revoke references on table "public"."ticket_scans" from "service_role";

revoke select on table "public"."ticket_scans" from "service_role";

revoke trigger on table "public"."ticket_scans" from "service_role";

revoke truncate on table "public"."ticket_scans" from "service_role";

revoke update on table "public"."ticket_scans" from "service_role";

revoke delete on table "public"."ticket_staff_links" from "anon";

revoke insert on table "public"."ticket_staff_links" from "anon";

revoke references on table "public"."ticket_staff_links" from "anon";

revoke select on table "public"."ticket_staff_links" from "anon";

revoke trigger on table "public"."ticket_staff_links" from "anon";

revoke truncate on table "public"."ticket_staff_links" from "anon";

revoke update on table "public"."ticket_staff_links" from "anon";

revoke delete on table "public"."ticket_staff_links" from "authenticated";

revoke insert on table "public"."ticket_staff_links" from "authenticated";

revoke references on table "public"."ticket_staff_links" from "authenticated";

revoke select on table "public"."ticket_staff_links" from "authenticated";

revoke trigger on table "public"."ticket_staff_links" from "authenticated";

revoke truncate on table "public"."ticket_staff_links" from "authenticated";

revoke update on table "public"."ticket_staff_links" from "authenticated";

revoke delete on table "public"."ticket_staff_links" from "service_role";

revoke insert on table "public"."ticket_staff_links" from "service_role";

revoke references on table "public"."ticket_staff_links" from "service_role";

revoke select on table "public"."ticket_staff_links" from "service_role";

revoke trigger on table "public"."ticket_staff_links" from "service_role";

revoke truncate on table "public"."ticket_staff_links" from "service_role";

revoke update on table "public"."ticket_staff_links" from "service_role";

revoke delete on table "public"."ticket_types" from "anon";

revoke insert on table "public"."ticket_types" from "anon";

revoke references on table "public"."ticket_types" from "anon";

revoke select on table "public"."ticket_types" from "anon";

revoke trigger on table "public"."ticket_types" from "anon";

revoke truncate on table "public"."ticket_types" from "anon";

revoke update on table "public"."ticket_types" from "anon";

revoke delete on table "public"."ticket_types" from "authenticated";

revoke insert on table "public"."ticket_types" from "authenticated";

revoke references on table "public"."ticket_types" from "authenticated";

revoke select on table "public"."ticket_types" from "authenticated";

revoke trigger on table "public"."ticket_types" from "authenticated";

revoke truncate on table "public"."ticket_types" from "authenticated";

revoke update on table "public"."ticket_types" from "authenticated";

revoke delete on table "public"."ticket_types" from "service_role";

revoke insert on table "public"."ticket_types" from "service_role";

revoke references on table "public"."ticket_types" from "service_role";

revoke select on table "public"."ticket_types" from "service_role";

revoke trigger on table "public"."ticket_types" from "service_role";

revoke truncate on table "public"."ticket_types" from "service_role";

revoke update on table "public"."ticket_types" from "service_role";

revoke delete on table "public"."ticketed_events" from "anon";

revoke insert on table "public"."ticketed_events" from "anon";

revoke references on table "public"."ticketed_events" from "anon";

revoke select on table "public"."ticketed_events" from "anon";

revoke trigger on table "public"."ticketed_events" from "anon";

revoke truncate on table "public"."ticketed_events" from "anon";

revoke update on table "public"."ticketed_events" from "anon";

revoke delete on table "public"."ticketed_events" from "authenticated";

revoke insert on table "public"."ticketed_events" from "authenticated";

revoke references on table "public"."ticketed_events" from "authenticated";

revoke select on table "public"."ticketed_events" from "authenticated";

revoke trigger on table "public"."ticketed_events" from "authenticated";

revoke truncate on table "public"."ticketed_events" from "authenticated";

revoke update on table "public"."ticketed_events" from "authenticated";

revoke delete on table "public"."ticketed_events" from "service_role";

revoke insert on table "public"."ticketed_events" from "service_role";

revoke references on table "public"."ticketed_events" from "service_role";

revoke select on table "public"."ticketed_events" from "service_role";

revoke trigger on table "public"."ticketed_events" from "service_role";

revoke truncate on table "public"."ticketed_events" from "service_role";

revoke update on table "public"."ticketed_events" from "service_role";

revoke delete on table "public"."tickets" from "anon";

revoke insert on table "public"."tickets" from "anon";

revoke references on table "public"."tickets" from "anon";

revoke select on table "public"."tickets" from "anon";

revoke trigger on table "public"."tickets" from "anon";

revoke truncate on table "public"."tickets" from "anon";

revoke update on table "public"."tickets" from "anon";

revoke delete on table "public"."tickets" from "authenticated";

revoke insert on table "public"."tickets" from "authenticated";

revoke references on table "public"."tickets" from "authenticated";

revoke select on table "public"."tickets" from "authenticated";

revoke trigger on table "public"."tickets" from "authenticated";

revoke truncate on table "public"."tickets" from "authenticated";

revoke update on table "public"."tickets" from "authenticated";

revoke delete on table "public"."tickets" from "service_role";

revoke insert on table "public"."tickets" from "service_role";

revoke references on table "public"."tickets" from "service_role";

revoke select on table "public"."tickets" from "service_role";

revoke trigger on table "public"."tickets" from "service_role";

revoke truncate on table "public"."tickets" from "service_role";

revoke update on table "public"."tickets" from "service_role";

revoke delete on table "public"."tier_feature_assignments" from "anon";

revoke insert on table "public"."tier_feature_assignments" from "anon";

revoke references on table "public"."tier_feature_assignments" from "anon";

revoke select on table "public"."tier_feature_assignments" from "anon";

revoke trigger on table "public"."tier_feature_assignments" from "anon";

revoke truncate on table "public"."tier_feature_assignments" from "anon";

revoke update on table "public"."tier_feature_assignments" from "anon";

revoke delete on table "public"."tier_feature_assignments" from "authenticated";

revoke insert on table "public"."tier_feature_assignments" from "authenticated";

revoke references on table "public"."tier_feature_assignments" from "authenticated";

revoke select on table "public"."tier_feature_assignments" from "authenticated";

revoke trigger on table "public"."tier_feature_assignments" from "authenticated";

revoke truncate on table "public"."tier_feature_assignments" from "authenticated";

revoke update on table "public"."tier_feature_assignments" from "authenticated";

revoke delete on table "public"."tier_feature_assignments" from "service_role";

revoke insert on table "public"."tier_feature_assignments" from "service_role";

revoke references on table "public"."tier_feature_assignments" from "service_role";

revoke select on table "public"."tier_feature_assignments" from "service_role";

revoke trigger on table "public"."tier_feature_assignments" from "service_role";

revoke truncate on table "public"."tier_feature_assignments" from "service_role";

revoke update on table "public"."tier_feature_assignments" from "service_role";

revoke delete on table "public"."travel_plan_contacts" from "anon";

revoke insert on table "public"."travel_plan_contacts" from "anon";

revoke references on table "public"."travel_plan_contacts" from "anon";

revoke select on table "public"."travel_plan_contacts" from "anon";

revoke trigger on table "public"."travel_plan_contacts" from "anon";

revoke truncate on table "public"."travel_plan_contacts" from "anon";

revoke update on table "public"."travel_plan_contacts" from "anon";

revoke delete on table "public"."travel_plan_contacts" from "authenticated";

revoke insert on table "public"."travel_plan_contacts" from "authenticated";

revoke references on table "public"."travel_plan_contacts" from "authenticated";

revoke select on table "public"."travel_plan_contacts" from "authenticated";

revoke trigger on table "public"."travel_plan_contacts" from "authenticated";

revoke truncate on table "public"."travel_plan_contacts" from "authenticated";

revoke update on table "public"."travel_plan_contacts" from "authenticated";

revoke delete on table "public"."travel_plan_contacts" from "service_role";

revoke insert on table "public"."travel_plan_contacts" from "service_role";

revoke references on table "public"."travel_plan_contacts" from "service_role";

revoke select on table "public"."travel_plan_contacts" from "service_role";

revoke trigger on table "public"."travel_plan_contacts" from "service_role";

revoke truncate on table "public"."travel_plan_contacts" from "service_role";

revoke update on table "public"."travel_plan_contacts" from "service_role";

revoke delete on table "public"."travel_plans" from "anon";

revoke insert on table "public"."travel_plans" from "anon";

revoke references on table "public"."travel_plans" from "anon";

revoke select on table "public"."travel_plans" from "anon";

revoke trigger on table "public"."travel_plans" from "anon";

revoke truncate on table "public"."travel_plans" from "anon";

revoke update on table "public"."travel_plans" from "anon";

revoke delete on table "public"."travel_plans" from "authenticated";

revoke insert on table "public"."travel_plans" from "authenticated";

revoke references on table "public"."travel_plans" from "authenticated";

revoke select on table "public"."travel_plans" from "authenticated";

revoke trigger on table "public"."travel_plans" from "authenticated";

revoke truncate on table "public"."travel_plans" from "authenticated";

revoke update on table "public"."travel_plans" from "authenticated";

revoke delete on table "public"."travel_plans" from "service_role";

revoke insert on table "public"."travel_plans" from "service_role";

revoke references on table "public"."travel_plans" from "service_role";

revoke select on table "public"."travel_plans" from "service_role";

revoke trigger on table "public"."travel_plans" from "service_role";

revoke truncate on table "public"."travel_plans" from "service_role";

revoke update on table "public"."travel_plans" from "service_role";

revoke delete on table "public"."tryout_registration_documents" from "anon";

revoke insert on table "public"."tryout_registration_documents" from "anon";

revoke references on table "public"."tryout_registration_documents" from "anon";

revoke select on table "public"."tryout_registration_documents" from "anon";

revoke trigger on table "public"."tryout_registration_documents" from "anon";

revoke truncate on table "public"."tryout_registration_documents" from "anon";

revoke update on table "public"."tryout_registration_documents" from "anon";

revoke delete on table "public"."tryout_registration_documents" from "authenticated";

revoke insert on table "public"."tryout_registration_documents" from "authenticated";

revoke references on table "public"."tryout_registration_documents" from "authenticated";

revoke select on table "public"."tryout_registration_documents" from "authenticated";

revoke trigger on table "public"."tryout_registration_documents" from "authenticated";

revoke truncate on table "public"."tryout_registration_documents" from "authenticated";

revoke update on table "public"."tryout_registration_documents" from "authenticated";

revoke delete on table "public"."tryout_registration_documents" from "service_role";

revoke insert on table "public"."tryout_registration_documents" from "service_role";

revoke references on table "public"."tryout_registration_documents" from "service_role";

revoke select on table "public"."tryout_registration_documents" from "service_role";

revoke trigger on table "public"."tryout_registration_documents" from "service_role";

revoke truncate on table "public"."tryout_registration_documents" from "service_role";

revoke update on table "public"."tryout_registration_documents" from "service_role";

revoke delete on table "public"."tryout_registration_staff_notes" from "anon";

revoke insert on table "public"."tryout_registration_staff_notes" from "anon";

revoke references on table "public"."tryout_registration_staff_notes" from "anon";

revoke select on table "public"."tryout_registration_staff_notes" from "anon";

revoke trigger on table "public"."tryout_registration_staff_notes" from "anon";

revoke truncate on table "public"."tryout_registration_staff_notes" from "anon";

revoke update on table "public"."tryout_registration_staff_notes" from "anon";

revoke delete on table "public"."tryout_registration_staff_notes" from "authenticated";

revoke insert on table "public"."tryout_registration_staff_notes" from "authenticated";

revoke references on table "public"."tryout_registration_staff_notes" from "authenticated";

revoke select on table "public"."tryout_registration_staff_notes" from "authenticated";

revoke trigger on table "public"."tryout_registration_staff_notes" from "authenticated";

revoke truncate on table "public"."tryout_registration_staff_notes" from "authenticated";

revoke update on table "public"."tryout_registration_staff_notes" from "authenticated";

revoke delete on table "public"."tryout_registration_staff_notes" from "service_role";

revoke insert on table "public"."tryout_registration_staff_notes" from "service_role";

revoke references on table "public"."tryout_registration_staff_notes" from "service_role";

revoke select on table "public"."tryout_registration_staff_notes" from "service_role";

revoke trigger on table "public"."tryout_registration_staff_notes" from "service_role";

revoke truncate on table "public"."tryout_registration_staff_notes" from "service_role";

revoke update on table "public"."tryout_registration_staff_notes" from "service_role";

revoke delete on table "public"."tryout_registrations" from "anon";

revoke insert on table "public"."tryout_registrations" from "anon";

revoke references on table "public"."tryout_registrations" from "anon";

revoke select on table "public"."tryout_registrations" from "anon";

revoke trigger on table "public"."tryout_registrations" from "anon";

revoke truncate on table "public"."tryout_registrations" from "anon";

revoke update on table "public"."tryout_registrations" from "anon";

revoke delete on table "public"."tryout_registrations" from "authenticated";

revoke insert on table "public"."tryout_registrations" from "authenticated";

revoke references on table "public"."tryout_registrations" from "authenticated";

revoke select on table "public"."tryout_registrations" from "authenticated";

revoke trigger on table "public"."tryout_registrations" from "authenticated";

revoke truncate on table "public"."tryout_registrations" from "authenticated";

revoke update on table "public"."tryout_registrations" from "authenticated";

revoke delete on table "public"."tryout_registrations" from "service_role";

revoke insert on table "public"."tryout_registrations" from "service_role";

revoke references on table "public"."tryout_registrations" from "service_role";

revoke select on table "public"."tryout_registrations" from "service_role";

revoke trigger on table "public"."tryout_registrations" from "service_role";

revoke truncate on table "public"."tryout_registrations" from "service_role";

revoke update on table "public"."tryout_registrations" from "service_role";

revoke delete on table "public"."tryout_required_documents" from "anon";

revoke insert on table "public"."tryout_required_documents" from "anon";

revoke references on table "public"."tryout_required_documents" from "anon";

revoke select on table "public"."tryout_required_documents" from "anon";

revoke trigger on table "public"."tryout_required_documents" from "anon";

revoke truncate on table "public"."tryout_required_documents" from "anon";

revoke update on table "public"."tryout_required_documents" from "anon";

revoke delete on table "public"."tryout_required_documents" from "authenticated";

revoke insert on table "public"."tryout_required_documents" from "authenticated";

revoke references on table "public"."tryout_required_documents" from "authenticated";

revoke select on table "public"."tryout_required_documents" from "authenticated";

revoke trigger on table "public"."tryout_required_documents" from "authenticated";

revoke truncate on table "public"."tryout_required_documents" from "authenticated";

revoke update on table "public"."tryout_required_documents" from "authenticated";

revoke delete on table "public"."tryout_required_documents" from "service_role";

revoke insert on table "public"."tryout_required_documents" from "service_role";

revoke references on table "public"."tryout_required_documents" from "service_role";

revoke select on table "public"."tryout_required_documents" from "service_role";

revoke trigger on table "public"."tryout_required_documents" from "service_role";

revoke truncate on table "public"."tryout_required_documents" from "service_role";

revoke update on table "public"."tryout_required_documents" from "service_role";

revoke delete on table "public"."tryout_scores" from "anon";

revoke insert on table "public"."tryout_scores" from "anon";

revoke references on table "public"."tryout_scores" from "anon";

revoke select on table "public"."tryout_scores" from "anon";

revoke trigger on table "public"."tryout_scores" from "anon";

revoke truncate on table "public"."tryout_scores" from "anon";

revoke update on table "public"."tryout_scores" from "anon";

revoke delete on table "public"."tryout_scores" from "authenticated";

revoke insert on table "public"."tryout_scores" from "authenticated";

revoke references on table "public"."tryout_scores" from "authenticated";

revoke select on table "public"."tryout_scores" from "authenticated";

revoke trigger on table "public"."tryout_scores" from "authenticated";

revoke truncate on table "public"."tryout_scores" from "authenticated";

revoke update on table "public"."tryout_scores" from "authenticated";

revoke delete on table "public"."tryout_scores" from "service_role";

revoke insert on table "public"."tryout_scores" from "service_role";

revoke references on table "public"."tryout_scores" from "service_role";

revoke select on table "public"."tryout_scores" from "service_role";

revoke trigger on table "public"."tryout_scores" from "service_role";

revoke truncate on table "public"."tryout_scores" from "service_role";

revoke update on table "public"."tryout_scores" from "service_role";

revoke delete on table "public"."tryouts" from "anon";

revoke insert on table "public"."tryouts" from "anon";

revoke references on table "public"."tryouts" from "anon";

revoke select on table "public"."tryouts" from "anon";

revoke trigger on table "public"."tryouts" from "anon";

revoke truncate on table "public"."tryouts" from "anon";

revoke update on table "public"."tryouts" from "anon";

revoke delete on table "public"."tryouts" from "authenticated";

revoke insert on table "public"."tryouts" from "authenticated";

revoke references on table "public"."tryouts" from "authenticated";

revoke select on table "public"."tryouts" from "authenticated";

revoke trigger on table "public"."tryouts" from "authenticated";

revoke truncate on table "public"."tryouts" from "authenticated";

revoke update on table "public"."tryouts" from "authenticated";

revoke delete on table "public"."tryouts" from "service_role";

revoke insert on table "public"."tryouts" from "service_role";

revoke references on table "public"."tryouts" from "service_role";

revoke select on table "public"."tryouts" from "service_role";

revoke trigger on table "public"."tryouts" from "service_role";

revoke truncate on table "public"."tryouts" from "service_role";

revoke update on table "public"."tryouts" from "service_role";

revoke delete on table "public"."uniform_kit_items" from "anon";

revoke insert on table "public"."uniform_kit_items" from "anon";

revoke references on table "public"."uniform_kit_items" from "anon";

revoke select on table "public"."uniform_kit_items" from "anon";

revoke trigger on table "public"."uniform_kit_items" from "anon";

revoke truncate on table "public"."uniform_kit_items" from "anon";

revoke update on table "public"."uniform_kit_items" from "anon";

revoke delete on table "public"."uniform_kit_items" from "authenticated";

revoke insert on table "public"."uniform_kit_items" from "authenticated";

revoke references on table "public"."uniform_kit_items" from "authenticated";

revoke select on table "public"."uniform_kit_items" from "authenticated";

revoke trigger on table "public"."uniform_kit_items" from "authenticated";

revoke truncate on table "public"."uniform_kit_items" from "authenticated";

revoke update on table "public"."uniform_kit_items" from "authenticated";

revoke delete on table "public"."uniform_kit_items" from "service_role";

revoke insert on table "public"."uniform_kit_items" from "service_role";

revoke references on table "public"."uniform_kit_items" from "service_role";

revoke select on table "public"."uniform_kit_items" from "service_role";

revoke trigger on table "public"."uniform_kit_items" from "service_role";

revoke truncate on table "public"."uniform_kit_items" from "service_role";

revoke update on table "public"."uniform_kit_items" from "service_role";

revoke delete on table "public"."uniform_kits" from "anon";

revoke insert on table "public"."uniform_kits" from "anon";

revoke references on table "public"."uniform_kits" from "anon";

revoke select on table "public"."uniform_kits" from "anon";

revoke trigger on table "public"."uniform_kits" from "anon";

revoke truncate on table "public"."uniform_kits" from "anon";

revoke update on table "public"."uniform_kits" from "anon";

revoke delete on table "public"."uniform_kits" from "authenticated";

revoke insert on table "public"."uniform_kits" from "authenticated";

revoke references on table "public"."uniform_kits" from "authenticated";

revoke select on table "public"."uniform_kits" from "authenticated";

revoke trigger on table "public"."uniform_kits" from "authenticated";

revoke truncate on table "public"."uniform_kits" from "authenticated";

revoke update on table "public"."uniform_kits" from "authenticated";

revoke delete on table "public"."uniform_kits" from "service_role";

revoke insert on table "public"."uniform_kits" from "service_role";

revoke references on table "public"."uniform_kits" from "service_role";

revoke select on table "public"."uniform_kits" from "service_role";

revoke trigger on table "public"."uniform_kits" from "service_role";

revoke truncate on table "public"."uniform_kits" from "service_role";

revoke update on table "public"."uniform_kits" from "service_role";

revoke delete on table "public"."uniform_orders" from "anon";

revoke insert on table "public"."uniform_orders" from "anon";

revoke references on table "public"."uniform_orders" from "anon";

revoke select on table "public"."uniform_orders" from "anon";

revoke trigger on table "public"."uniform_orders" from "anon";

revoke truncate on table "public"."uniform_orders" from "anon";

revoke update on table "public"."uniform_orders" from "anon";

revoke delete on table "public"."uniform_orders" from "authenticated";

revoke insert on table "public"."uniform_orders" from "authenticated";

revoke references on table "public"."uniform_orders" from "authenticated";

revoke select on table "public"."uniform_orders" from "authenticated";

revoke trigger on table "public"."uniform_orders" from "authenticated";

revoke truncate on table "public"."uniform_orders" from "authenticated";

revoke update on table "public"."uniform_orders" from "authenticated";

revoke delete on table "public"."uniform_orders" from "service_role";

revoke insert on table "public"."uniform_orders" from "service_role";

revoke references on table "public"."uniform_orders" from "service_role";

revoke select on table "public"."uniform_orders" from "service_role";

revoke trigger on table "public"."uniform_orders" from "service_role";

revoke truncate on table "public"."uniform_orders" from "service_role";

revoke update on table "public"."uniform_orders" from "service_role";

revoke delete on table "public"."uniform_submission_items" from "anon";

revoke insert on table "public"."uniform_submission_items" from "anon";

revoke references on table "public"."uniform_submission_items" from "anon";

revoke select on table "public"."uniform_submission_items" from "anon";

revoke trigger on table "public"."uniform_submission_items" from "anon";

revoke truncate on table "public"."uniform_submission_items" from "anon";

revoke update on table "public"."uniform_submission_items" from "anon";

revoke delete on table "public"."uniform_submission_items" from "authenticated";

revoke insert on table "public"."uniform_submission_items" from "authenticated";

revoke references on table "public"."uniform_submission_items" from "authenticated";

revoke select on table "public"."uniform_submission_items" from "authenticated";

revoke trigger on table "public"."uniform_submission_items" from "authenticated";

revoke truncate on table "public"."uniform_submission_items" from "authenticated";

revoke update on table "public"."uniform_submission_items" from "authenticated";

revoke delete on table "public"."uniform_submission_items" from "service_role";

revoke insert on table "public"."uniform_submission_items" from "service_role";

revoke references on table "public"."uniform_submission_items" from "service_role";

revoke select on table "public"."uniform_submission_items" from "service_role";

revoke trigger on table "public"."uniform_submission_items" from "service_role";

revoke truncate on table "public"."uniform_submission_items" from "service_role";

revoke update on table "public"."uniform_submission_items" from "service_role";

revoke delete on table "public"."uniform_submissions" from "anon";

revoke insert on table "public"."uniform_submissions" from "anon";

revoke references on table "public"."uniform_submissions" from "anon";

revoke select on table "public"."uniform_submissions" from "anon";

revoke trigger on table "public"."uniform_submissions" from "anon";

revoke truncate on table "public"."uniform_submissions" from "anon";

revoke update on table "public"."uniform_submissions" from "anon";

revoke delete on table "public"."uniform_submissions" from "authenticated";

revoke insert on table "public"."uniform_submissions" from "authenticated";

revoke references on table "public"."uniform_submissions" from "authenticated";

revoke select on table "public"."uniform_submissions" from "authenticated";

revoke trigger on table "public"."uniform_submissions" from "authenticated";

revoke truncate on table "public"."uniform_submissions" from "authenticated";

revoke update on table "public"."uniform_submissions" from "authenticated";

revoke delete on table "public"."uniform_submissions" from "service_role";

revoke insert on table "public"."uniform_submissions" from "service_role";

revoke references on table "public"."uniform_submissions" from "service_role";

revoke select on table "public"."uniform_submissions" from "service_role";

revoke trigger on table "public"."uniform_submissions" from "service_role";

revoke truncate on table "public"."uniform_submissions" from "service_role";

revoke update on table "public"."uniform_submissions" from "service_role";

revoke delete on table "public"."user_notification_preferences" from "anon";

revoke insert on table "public"."user_notification_preferences" from "anon";

revoke references on table "public"."user_notification_preferences" from "anon";

revoke select on table "public"."user_notification_preferences" from "anon";

revoke trigger on table "public"."user_notification_preferences" from "anon";

revoke truncate on table "public"."user_notification_preferences" from "anon";

revoke update on table "public"."user_notification_preferences" from "anon";

revoke delete on table "public"."user_notification_preferences" from "authenticated";

revoke insert on table "public"."user_notification_preferences" from "authenticated";

revoke references on table "public"."user_notification_preferences" from "authenticated";

revoke select on table "public"."user_notification_preferences" from "authenticated";

revoke trigger on table "public"."user_notification_preferences" from "authenticated";

revoke truncate on table "public"."user_notification_preferences" from "authenticated";

revoke update on table "public"."user_notification_preferences" from "authenticated";

revoke delete on table "public"."user_notification_preferences" from "service_role";

revoke insert on table "public"."user_notification_preferences" from "service_role";

revoke references on table "public"."user_notification_preferences" from "service_role";

revoke select on table "public"."user_notification_preferences" from "service_role";

revoke trigger on table "public"."user_notification_preferences" from "service_role";

revoke truncate on table "public"."user_notification_preferences" from "service_role";

revoke update on table "public"."user_notification_preferences" from "service_role";

revoke delete on table "public"."user_notifications" from "authenticated";

revoke insert on table "public"."user_notifications" from "authenticated";

revoke references on table "public"."user_notifications" from "authenticated";

revoke select on table "public"."user_notifications" from "authenticated";

revoke update on table "public"."user_notifications" from "authenticated";

revoke delete on table "public"."user_notifications" from "service_role";

revoke insert on table "public"."user_notifications" from "service_role";

revoke references on table "public"."user_notifications" from "service_role";

revoke select on table "public"."user_notifications" from "service_role";

revoke trigger on table "public"."user_notifications" from "service_role";

revoke truncate on table "public"."user_notifications" from "service_role";

revoke update on table "public"."user_notifications" from "service_role";

revoke delete on table "public"."users" from "authenticated";

revoke insert on table "public"."users" from "authenticated";

revoke references on table "public"."users" from "authenticated";

revoke select on table "public"."users" from "authenticated";

revoke update on table "public"."users" from "authenticated";

revoke delete on table "public"."users" from "service_role";

revoke insert on table "public"."users" from "service_role";

revoke references on table "public"."users" from "service_role";

revoke select on table "public"."users" from "service_role";

revoke trigger on table "public"."users" from "service_role";

revoke truncate on table "public"."users" from "service_role";

revoke update on table "public"."users" from "service_role";

revoke delete on table "public"."valid_event_types" from "anon";

revoke insert on table "public"."valid_event_types" from "anon";

revoke references on table "public"."valid_event_types" from "anon";

revoke select on table "public"."valid_event_types" from "anon";

revoke trigger on table "public"."valid_event_types" from "anon";

revoke truncate on table "public"."valid_event_types" from "anon";

revoke update on table "public"."valid_event_types" from "anon";

revoke delete on table "public"."valid_event_types" from "authenticated";

revoke insert on table "public"."valid_event_types" from "authenticated";

revoke references on table "public"."valid_event_types" from "authenticated";

revoke select on table "public"."valid_event_types" from "authenticated";

revoke trigger on table "public"."valid_event_types" from "authenticated";

revoke truncate on table "public"."valid_event_types" from "authenticated";

revoke update on table "public"."valid_event_types" from "authenticated";

revoke delete on table "public"."valid_event_types" from "service_role";

revoke insert on table "public"."valid_event_types" from "service_role";

revoke references on table "public"."valid_event_types" from "service_role";

revoke select on table "public"."valid_event_types" from "service_role";

revoke trigger on table "public"."valid_event_types" from "service_role";

revoke truncate on table "public"."valid_event_types" from "service_role";

revoke update on table "public"."valid_event_types" from "service_role";

revoke delete on table "public"."venue_insights" from "anon";

revoke insert on table "public"."venue_insights" from "anon";

revoke references on table "public"."venue_insights" from "anon";

revoke select on table "public"."venue_insights" from "anon";

revoke trigger on table "public"."venue_insights" from "anon";

revoke truncate on table "public"."venue_insights" from "anon";

revoke update on table "public"."venue_insights" from "anon";

revoke delete on table "public"."venue_insights" from "authenticated";

revoke insert on table "public"."venue_insights" from "authenticated";

revoke references on table "public"."venue_insights" from "authenticated";

revoke select on table "public"."venue_insights" from "authenticated";

revoke trigger on table "public"."venue_insights" from "authenticated";

revoke truncate on table "public"."venue_insights" from "authenticated";

revoke update on table "public"."venue_insights" from "authenticated";

revoke delete on table "public"."venue_insights" from "service_role";

revoke insert on table "public"."venue_insights" from "service_role";

revoke references on table "public"."venue_insights" from "service_role";

revoke select on table "public"."venue_insights" from "service_role";

revoke trigger on table "public"."venue_insights" from "service_role";

revoke truncate on table "public"."venue_insights" from "service_role";

revoke update on table "public"."venue_insights" from "service_role";

revoke delete on table "public"."venue_nearby_amenities_summaries" from "anon";

revoke insert on table "public"."venue_nearby_amenities_summaries" from "anon";

revoke references on table "public"."venue_nearby_amenities_summaries" from "anon";

revoke select on table "public"."venue_nearby_amenities_summaries" from "anon";

revoke trigger on table "public"."venue_nearby_amenities_summaries" from "anon";

revoke truncate on table "public"."venue_nearby_amenities_summaries" from "anon";

revoke update on table "public"."venue_nearby_amenities_summaries" from "anon";

revoke delete on table "public"."venue_nearby_amenities_summaries" from "authenticated";

revoke insert on table "public"."venue_nearby_amenities_summaries" from "authenticated";

revoke references on table "public"."venue_nearby_amenities_summaries" from "authenticated";

revoke select on table "public"."venue_nearby_amenities_summaries" from "authenticated";

revoke trigger on table "public"."venue_nearby_amenities_summaries" from "authenticated";

revoke truncate on table "public"."venue_nearby_amenities_summaries" from "authenticated";

revoke update on table "public"."venue_nearby_amenities_summaries" from "authenticated";

revoke delete on table "public"."venue_nearby_amenities_summaries" from "service_role";

revoke insert on table "public"."venue_nearby_amenities_summaries" from "service_role";

revoke references on table "public"."venue_nearby_amenities_summaries" from "service_role";

revoke select on table "public"."venue_nearby_amenities_summaries" from "service_role";

revoke trigger on table "public"."venue_nearby_amenities_summaries" from "service_role";

revoke truncate on table "public"."venue_nearby_amenities_summaries" from "service_role";

revoke update on table "public"."venue_nearby_amenities_summaries" from "service_role";

revoke delete on table "public"."venue_nearby_places" from "anon";

revoke insert on table "public"."venue_nearby_places" from "anon";

revoke references on table "public"."venue_nearby_places" from "anon";

revoke select on table "public"."venue_nearby_places" from "anon";

revoke trigger on table "public"."venue_nearby_places" from "anon";

revoke truncate on table "public"."venue_nearby_places" from "anon";

revoke update on table "public"."venue_nearby_places" from "anon";

revoke delete on table "public"."venue_nearby_places" from "authenticated";

revoke insert on table "public"."venue_nearby_places" from "authenticated";

revoke references on table "public"."venue_nearby_places" from "authenticated";

revoke select on table "public"."venue_nearby_places" from "authenticated";

revoke trigger on table "public"."venue_nearby_places" from "authenticated";

revoke truncate on table "public"."venue_nearby_places" from "authenticated";

revoke update on table "public"."venue_nearby_places" from "authenticated";

revoke delete on table "public"."venue_nearby_places" from "service_role";

revoke insert on table "public"."venue_nearby_places" from "service_role";

revoke references on table "public"."venue_nearby_places" from "service_role";

revoke select on table "public"."venue_nearby_places" from "service_role";

revoke trigger on table "public"."venue_nearby_places" from "service_role";

revoke truncate on table "public"."venue_nearby_places" from "service_role";

revoke update on table "public"."venue_nearby_places" from "service_role";

revoke delete on table "public"."venues" from "anon";

revoke insert on table "public"."venues" from "anon";

revoke references on table "public"."venues" from "anon";

revoke select on table "public"."venues" from "anon";

revoke trigger on table "public"."venues" from "anon";

revoke truncate on table "public"."venues" from "anon";

revoke update on table "public"."venues" from "anon";

revoke delete on table "public"."venues" from "authenticated";

revoke insert on table "public"."venues" from "authenticated";

revoke references on table "public"."venues" from "authenticated";

revoke select on table "public"."venues" from "authenticated";

revoke trigger on table "public"."venues" from "authenticated";

revoke truncate on table "public"."venues" from "authenticated";

revoke update on table "public"."venues" from "authenticated";

revoke delete on table "public"."venues" from "service_role";

revoke insert on table "public"."venues" from "service_role";

revoke references on table "public"."venues" from "service_role";

revoke select on table "public"."venues" from "service_role";

revoke trigger on table "public"."venues" from "service_role";

revoke truncate on table "public"."venues" from "service_role";

revoke update on table "public"."venues" from "service_role";

revoke delete on table "public"."video_athlete_links" from "anon";

revoke insert on table "public"."video_athlete_links" from "anon";

revoke references on table "public"."video_athlete_links" from "anon";

revoke select on table "public"."video_athlete_links" from "anon";

revoke trigger on table "public"."video_athlete_links" from "anon";

revoke truncate on table "public"."video_athlete_links" from "anon";

revoke update on table "public"."video_athlete_links" from "anon";

revoke delete on table "public"."video_athlete_links" from "authenticated";

revoke insert on table "public"."video_athlete_links" from "authenticated";

revoke references on table "public"."video_athlete_links" from "authenticated";

revoke select on table "public"."video_athlete_links" from "authenticated";

revoke trigger on table "public"."video_athlete_links" from "authenticated";

revoke truncate on table "public"."video_athlete_links" from "authenticated";

revoke update on table "public"."video_athlete_links" from "authenticated";

revoke delete on table "public"."video_athlete_links" from "service_role";

revoke insert on table "public"."video_athlete_links" from "service_role";

revoke references on table "public"."video_athlete_links" from "service_role";

revoke select on table "public"."video_athlete_links" from "service_role";

revoke trigger on table "public"."video_athlete_links" from "service_role";

revoke truncate on table "public"."video_athlete_links" from "service_role";

revoke update on table "public"."video_athlete_links" from "service_role";

revoke delete on table "public"."video_bookmarks" from "anon";

revoke insert on table "public"."video_bookmarks" from "anon";

revoke references on table "public"."video_bookmarks" from "anon";

revoke select on table "public"."video_bookmarks" from "anon";

revoke trigger on table "public"."video_bookmarks" from "anon";

revoke truncate on table "public"."video_bookmarks" from "anon";

revoke update on table "public"."video_bookmarks" from "anon";

revoke delete on table "public"."video_bookmarks" from "authenticated";

revoke insert on table "public"."video_bookmarks" from "authenticated";

revoke references on table "public"."video_bookmarks" from "authenticated";

revoke select on table "public"."video_bookmarks" from "authenticated";

revoke trigger on table "public"."video_bookmarks" from "authenticated";

revoke truncate on table "public"."video_bookmarks" from "authenticated";

revoke update on table "public"."video_bookmarks" from "authenticated";

revoke delete on table "public"."video_bookmarks" from "service_role";

revoke insert on table "public"."video_bookmarks" from "service_role";

revoke references on table "public"."video_bookmarks" from "service_role";

revoke select on table "public"."video_bookmarks" from "service_role";

revoke trigger on table "public"."video_bookmarks" from "service_role";

revoke truncate on table "public"."video_bookmarks" from "service_role";

revoke update on table "public"."video_bookmarks" from "service_role";

revoke delete on table "public"."video_comments" from "anon";

revoke insert on table "public"."video_comments" from "anon";

revoke references on table "public"."video_comments" from "anon";

revoke select on table "public"."video_comments" from "anon";

revoke trigger on table "public"."video_comments" from "anon";

revoke truncate on table "public"."video_comments" from "anon";

revoke update on table "public"."video_comments" from "anon";

revoke delete on table "public"."video_comments" from "authenticated";

revoke insert on table "public"."video_comments" from "authenticated";

revoke references on table "public"."video_comments" from "authenticated";

revoke select on table "public"."video_comments" from "authenticated";

revoke trigger on table "public"."video_comments" from "authenticated";

revoke truncate on table "public"."video_comments" from "authenticated";

revoke update on table "public"."video_comments" from "authenticated";

revoke delete on table "public"."video_comments" from "service_role";

revoke insert on table "public"."video_comments" from "service_role";

revoke references on table "public"."video_comments" from "service_role";

revoke select on table "public"."video_comments" from "service_role";

revoke trigger on table "public"."video_comments" from "service_role";

revoke truncate on table "public"."video_comments" from "service_role";

revoke update on table "public"."video_comments" from "service_role";

revoke delete on table "public"."video_favorites" from "anon";

revoke insert on table "public"."video_favorites" from "anon";

revoke references on table "public"."video_favorites" from "anon";

revoke select on table "public"."video_favorites" from "anon";

revoke trigger on table "public"."video_favorites" from "anon";

revoke truncate on table "public"."video_favorites" from "anon";

revoke update on table "public"."video_favorites" from "anon";

revoke delete on table "public"."video_favorites" from "authenticated";

revoke insert on table "public"."video_favorites" from "authenticated";

revoke references on table "public"."video_favorites" from "authenticated";

revoke select on table "public"."video_favorites" from "authenticated";

revoke trigger on table "public"."video_favorites" from "authenticated";

revoke truncate on table "public"."video_favorites" from "authenticated";

revoke update on table "public"."video_favorites" from "authenticated";

revoke delete on table "public"."video_favorites" from "service_role";

revoke insert on table "public"."video_favorites" from "service_role";

revoke references on table "public"."video_favorites" from "service_role";

revoke select on table "public"."video_favorites" from "service_role";

revoke trigger on table "public"."video_favorites" from "service_role";

revoke truncate on table "public"."video_favorites" from "service_role";

revoke update on table "public"."video_favorites" from "service_role";

revoke delete on table "public"."video_note_targets" from "anon";

revoke insert on table "public"."video_note_targets" from "anon";

revoke references on table "public"."video_note_targets" from "anon";

revoke select on table "public"."video_note_targets" from "anon";

revoke trigger on table "public"."video_note_targets" from "anon";

revoke truncate on table "public"."video_note_targets" from "anon";

revoke update on table "public"."video_note_targets" from "anon";

revoke delete on table "public"."video_note_targets" from "authenticated";

revoke insert on table "public"."video_note_targets" from "authenticated";

revoke references on table "public"."video_note_targets" from "authenticated";

revoke select on table "public"."video_note_targets" from "authenticated";

revoke trigger on table "public"."video_note_targets" from "authenticated";

revoke truncate on table "public"."video_note_targets" from "authenticated";

revoke update on table "public"."video_note_targets" from "authenticated";

revoke delete on table "public"."video_note_targets" from "service_role";

revoke insert on table "public"."video_note_targets" from "service_role";

revoke references on table "public"."video_note_targets" from "service_role";

revoke select on table "public"."video_note_targets" from "service_role";

revoke trigger on table "public"."video_note_targets" from "service_role";

revoke truncate on table "public"."video_note_targets" from "service_role";

revoke update on table "public"."video_note_targets" from "service_role";

revoke delete on table "public"."video_notes" from "anon";

revoke insert on table "public"."video_notes" from "anon";

revoke references on table "public"."video_notes" from "anon";

revoke select on table "public"."video_notes" from "anon";

revoke trigger on table "public"."video_notes" from "anon";

revoke truncate on table "public"."video_notes" from "anon";

revoke update on table "public"."video_notes" from "anon";

revoke delete on table "public"."video_notes" from "authenticated";

revoke insert on table "public"."video_notes" from "authenticated";

revoke references on table "public"."video_notes" from "authenticated";

revoke select on table "public"."video_notes" from "authenticated";

revoke trigger on table "public"."video_notes" from "authenticated";

revoke truncate on table "public"."video_notes" from "authenticated";

revoke update on table "public"."video_notes" from "authenticated";

revoke delete on table "public"."video_notes" from "service_role";

revoke insert on table "public"."video_notes" from "service_role";

revoke references on table "public"."video_notes" from "service_role";

revoke select on table "public"."video_notes" from "service_role";

revoke trigger on table "public"."video_notes" from "service_role";

revoke truncate on table "public"."video_notes" from "service_role";

revoke update on table "public"."video_notes" from "service_role";

revoke delete on table "public"."video_reviews" from "anon";

revoke insert on table "public"."video_reviews" from "anon";

revoke references on table "public"."video_reviews" from "anon";

revoke select on table "public"."video_reviews" from "anon";

revoke trigger on table "public"."video_reviews" from "anon";

revoke truncate on table "public"."video_reviews" from "anon";

revoke update on table "public"."video_reviews" from "anon";

revoke delete on table "public"."video_reviews" from "authenticated";

revoke insert on table "public"."video_reviews" from "authenticated";

revoke references on table "public"."video_reviews" from "authenticated";

revoke select on table "public"."video_reviews" from "authenticated";

revoke trigger on table "public"."video_reviews" from "authenticated";

revoke truncate on table "public"."video_reviews" from "authenticated";

revoke update on table "public"."video_reviews" from "authenticated";

revoke delete on table "public"."video_reviews" from "service_role";

revoke insert on table "public"."video_reviews" from "service_role";

revoke references on table "public"."video_reviews" from "service_role";

revoke select on table "public"."video_reviews" from "service_role";

revoke trigger on table "public"."video_reviews" from "service_role";

revoke truncate on table "public"."video_reviews" from "service_role";

revoke update on table "public"."video_reviews" from "service_role";

revoke delete on table "public"."video_shares" from "anon";

revoke insert on table "public"."video_shares" from "anon";

revoke references on table "public"."video_shares" from "anon";

revoke select on table "public"."video_shares" from "anon";

revoke trigger on table "public"."video_shares" from "anon";

revoke truncate on table "public"."video_shares" from "anon";

revoke update on table "public"."video_shares" from "anon";

revoke delete on table "public"."video_shares" from "authenticated";

revoke insert on table "public"."video_shares" from "authenticated";

revoke references on table "public"."video_shares" from "authenticated";

revoke select on table "public"."video_shares" from "authenticated";

revoke trigger on table "public"."video_shares" from "authenticated";

revoke truncate on table "public"."video_shares" from "authenticated";

revoke update on table "public"."video_shares" from "authenticated";

revoke delete on table "public"."video_shares" from "service_role";

revoke insert on table "public"."video_shares" from "service_role";

revoke references on table "public"."video_shares" from "service_role";

revoke select on table "public"."video_shares" from "service_role";

revoke trigger on table "public"."video_shares" from "service_role";

revoke truncate on table "public"."video_shares" from "service_role";

revoke update on table "public"."video_shares" from "service_role";

revoke delete on table "public"."video_tag_links" from "anon";

revoke insert on table "public"."video_tag_links" from "anon";

revoke references on table "public"."video_tag_links" from "anon";

revoke select on table "public"."video_tag_links" from "anon";

revoke trigger on table "public"."video_tag_links" from "anon";

revoke truncate on table "public"."video_tag_links" from "anon";

revoke update on table "public"."video_tag_links" from "anon";

revoke delete on table "public"."video_tag_links" from "authenticated";

revoke insert on table "public"."video_tag_links" from "authenticated";

revoke references on table "public"."video_tag_links" from "authenticated";

revoke select on table "public"."video_tag_links" from "authenticated";

revoke trigger on table "public"."video_tag_links" from "authenticated";

revoke truncate on table "public"."video_tag_links" from "authenticated";

revoke update on table "public"."video_tag_links" from "authenticated";

revoke delete on table "public"."video_tag_links" from "service_role";

revoke insert on table "public"."video_tag_links" from "service_role";

revoke references on table "public"."video_tag_links" from "service_role";

revoke select on table "public"."video_tag_links" from "service_role";

revoke trigger on table "public"."video_tag_links" from "service_role";

revoke truncate on table "public"."video_tag_links" from "service_role";

revoke update on table "public"."video_tag_links" from "service_role";

revoke delete on table "public"."video_tags" from "anon";

revoke insert on table "public"."video_tags" from "anon";

revoke references on table "public"."video_tags" from "anon";

revoke select on table "public"."video_tags" from "anon";

revoke trigger on table "public"."video_tags" from "anon";

revoke truncate on table "public"."video_tags" from "anon";

revoke update on table "public"."video_tags" from "anon";

revoke delete on table "public"."video_tags" from "authenticated";

revoke insert on table "public"."video_tags" from "authenticated";

revoke references on table "public"."video_tags" from "authenticated";

revoke select on table "public"."video_tags" from "authenticated";

revoke trigger on table "public"."video_tags" from "authenticated";

revoke truncate on table "public"."video_tags" from "authenticated";

revoke update on table "public"."video_tags" from "authenticated";

revoke delete on table "public"."video_tags" from "service_role";

revoke insert on table "public"."video_tags" from "service_role";

revoke references on table "public"."video_tags" from "service_role";

revoke select on table "public"."video_tags" from "service_role";

revoke trigger on table "public"."video_tags" from "service_role";

revoke truncate on table "public"."video_tags" from "service_role";

revoke update on table "public"."video_tags" from "service_role";

revoke delete on table "public"."videos" from "anon";

revoke insert on table "public"."videos" from "anon";

revoke references on table "public"."videos" from "anon";

revoke select on table "public"."videos" from "anon";

revoke trigger on table "public"."videos" from "anon";

revoke truncate on table "public"."videos" from "anon";

revoke update on table "public"."videos" from "anon";

revoke delete on table "public"."videos" from "authenticated";

revoke insert on table "public"."videos" from "authenticated";

revoke references on table "public"."videos" from "authenticated";

revoke select on table "public"."videos" from "authenticated";

revoke trigger on table "public"."videos" from "authenticated";

revoke truncate on table "public"."videos" from "authenticated";

revoke update on table "public"."videos" from "authenticated";

revoke delete on table "public"."videos" from "service_role";

revoke insert on table "public"."videos" from "service_role";

revoke references on table "public"."videos" from "service_role";

revoke select on table "public"."videos" from "service_role";

revoke trigger on table "public"."videos" from "service_role";

revoke truncate on table "public"."videos" from "service_role";

revoke update on table "public"."videos" from "service_role";

revoke delete on table "public"."waivers" from "anon";

revoke insert on table "public"."waivers" from "anon";

revoke references on table "public"."waivers" from "anon";

revoke select on table "public"."waivers" from "anon";

revoke trigger on table "public"."waivers" from "anon";

revoke truncate on table "public"."waivers" from "anon";

revoke update on table "public"."waivers" from "anon";

revoke delete on table "public"."waivers" from "authenticated";

revoke insert on table "public"."waivers" from "authenticated";

revoke references on table "public"."waivers" from "authenticated";

revoke select on table "public"."waivers" from "authenticated";

revoke trigger on table "public"."waivers" from "authenticated";

revoke truncate on table "public"."waivers" from "authenticated";

revoke update on table "public"."waivers" from "authenticated";

revoke delete on table "public"."waivers" from "service_role";

revoke insert on table "public"."waivers" from "service_role";

revoke references on table "public"."waivers" from "service_role";

revoke select on table "public"."waivers" from "service_role";

revoke trigger on table "public"."waivers" from "service_role";

revoke truncate on table "public"."waivers" from "service_role";

revoke update on table "public"."waivers" from "service_role";

alter table "public"."athlete_guardians" drop constraint "athlete_guardians_athlete_id_fkey";

alter table "public"."athlete_medical_private" drop constraint "athlete_medical_private_athlete_id_fkey";

alter table "public"."athlete_sport_profiles" drop constraint "athlete_sport_profiles_athlete_id_fkey";

alter table "public"."athlete_sports" drop constraint "athlete_sports_athlete_id_fkey";

alter table "public"."athletes" drop constraint "athletes_org_id_fkey";

alter table "public"."attendance" drop constraint "attendance_child_id_fkey";

alter table "public"."child_claim_tokens" drop constraint "child_claim_tokens_child_id_fkey";

alter table "public"."event_attendance" drop constraint "event_attendance_child_id_fkey";

alter table "public"."event_rsvps" drop constraint "event_rsvps_athlete_id_fkey";

alter table "public"."events" drop constraint "events_org_id_fkey";

alter table "public"."fan_calendar_cache" drop constraint "fan_calendar_cache_user_id_fkey";

alter table "public"."fan_calendar_cache" drop constraint "fan_calendar_cache_user_id_key";

alter table "public"."fan_event_bookmarks" drop constraint "fan_event_bookmarks_event_id_fkey";

alter table "public"."fan_event_bookmarks" drop constraint "fan_event_bookmarks_user_id_event_id_key";

alter table "public"."fan_event_bookmarks" drop constraint "fan_event_bookmarks_user_id_fkey";

alter table "public"."fan_feed" drop constraint "fan_feed_content_type_check";

alter table "public"."fan_feed" drop constraint "fan_feed_fan_user_id_fkey";

alter table "public"."fan_feed" drop constraint "fan_feed_source_entity_type_check";

alter table "public"."fan_org_follows" drop constraint "fan_org_follows_org_id_fkey";

alter table "public"."fan_org_follows" drop constraint "fan_org_follows_source_check";

alter table "public"."fan_org_follows" drop constraint "fan_org_follows_user_id_fkey";

alter table "public"."fan_org_follows" drop constraint "fan_org_follows_user_id_org_id_key";

alter table "public"."feature_dependencies" drop constraint "feature_dependencies_dependency_type_check";

alter table "public"."feature_dependencies" drop constraint "feature_dependencies_depends_on_key_fkey";

alter table "public"."feature_dependencies" drop constraint "feature_dependencies_feature_key_fkey";

alter table "public"."feature_dependencies" drop constraint "feature_dependencies_no_self";

alter table "public"."feature_dependencies" drop constraint "feature_dependencies_unique";

alter table "public"."feature_entitlements" drop constraint "feature_entitlements_gate_action_valid";

alter table "public"."feature_entitlements" drop constraint "feature_entitlements_key_format";

alter table "public"."feature_entitlements" drop constraint "feature_entitlements_no_self_parent";

alter table "public"."feature_entitlements" drop constraint "feature_entitlements_parent_feature_key_fkey";

alter table "public"."feature_flags" drop constraint "feature_flags_type_check";

alter table "public"."fee_assignments" drop constraint "fee_assignments_athlete_id_fkey";

alter table "public"."galleries" drop constraint "galleries_cover_generation_status_check";

alter table "public"."gallery_photo_bookmarks" drop constraint "gallery_photo_bookmarks_photo_id_fkey";

alter table "public"."gallery_photo_bookmarks" drop constraint "gallery_photo_bookmarks_photo_id_user_id_key";

alter table "public"."gallery_photo_bookmarks" drop constraint "gallery_photo_bookmarks_user_id_fkey";

alter table "public"."gallery_photo_tags" drop constraint "gallery_photo_tags_athlete_id_fkey";

alter table "public"."gallery_zip_downloads" drop constraint "gallery_zip_downloads_gallery_id_fkey";

alter table "public"."gallery_zip_downloads" drop constraint "gallery_zip_downloads_user_id_fkey";

alter table "public"."guardian_attachment_requests" drop constraint "guardian_attachment_requests_athlete_id_fkey";

alter table "public"."join_requests" drop constraint "join_requests_child_id_fkey";

alter table "public"."offline_payments" drop constraint "offline_payments_child_id_fkey";

alter table "public"."org_user_audit_log" drop constraint "org_user_audit_log_action_check";

alter table "public"."org_user_audit_log" drop constraint "org_user_audit_log_changed_by_fkey";

alter table "public"."organization_members" drop constraint "organization_members_revoked_by_fkey";

alter table "public"."organizations" drop constraint "check_payouts_consistency";

alter table "public"."organizations" drop constraint "organizations_slug_key";

alter table "public"."organizations" drop constraint "organizations_slug_lowercase_check";

alter table "public"."parent_invites" drop constraint "parent_invites_child_id_fkey";

alter table "public"."purchases" drop constraint "purchases_event_id_fkey";

alter table "public"."purchases" drop constraint "purchases_org_id_fkey";

alter table "public"."purchases" drop constraint "purchases_status_check";

alter table "public"."purchases" drop constraint "purchases_user_id_fkey";

alter table "public"."seasons" drop constraint "seasons_org_id_fkey";

alter table "public"."seasons" drop constraint "seasons_program_id_fkey";

alter table "public"."seasons" drop constraint "seasons_sport_id_fkey";

alter table "public"."team_memberships" drop constraint "team_memberships_child_id_fkey";

alter table "public"."teams" drop constraint "check_teams_roster_size";

alter table "public"."teams" drop constraint "teams_invite_code_key";

alter table "public"."teams" drop constraint "teams_level_id_fkey";

alter table "public"."teams" drop constraint "teams_program_id_fkey";

alter table "public"."teams" drop constraint "teams_sport_id_fkey";

alter table "public"."ticket_reservations" drop constraint "ticket_reservations_event_id_fkey";

alter table "public"."ticket_reservations" drop constraint "ticket_reservations_quantity_check";

alter table "public"."ticket_reservations" drop constraint "ticket_reservations_status_check";

alter table "public"."ticket_reservations" drop constraint "ticket_reservations_user_id_fkey";

alter table "public"."ticketed_events" drop constraint "ticketed_events_program_id_fkey";

alter table "public"."ticketed_events" drop constraint "ticketed_events_season_id_fkey";

alter table "public"."ticketed_events" drop constraint "ticketed_events_venue_id_fkey";

alter table "public"."tickets" drop constraint "tickets_holder_user_id_fkey";

alter table "public"."tickets" drop constraint "tickets_purchase_id_fkey";

alter table "public"."tryout_registrations" drop constraint "tryout_registrations_child_id_fkey";

alter table "public"."uniform_orders" drop constraint "uniform_orders_child_id_fkey";

alter table "public"."uniform_submissions" drop constraint "uniform_submissions_child_id_fkey";

alter table "public"."user_notification_preferences" drop constraint "user_notification_preferences_announcements_channel_check";

alter table "public"."user_notification_preferences" drop constraint "user_notification_preferences_game_results_channel_check";

alter table "public"."user_notification_preferences" drop constraint "user_notification_preferences_photos_added_channel_check";

alter table "public"."user_notification_preferences" drop constraint "user_notification_preferences_schedule_changes_channel_check";

alter table "public"."user_notification_preferences" drop constraint "user_notification_preferences_ticket_updates_channel_check";

alter table "public"."user_notification_preferences" drop constraint "user_notification_preferences_user_id_fkey";

alter table "public"."user_notification_preferences" drop constraint "user_notification_preferences_user_id_key";

alter table "public"."users" drop constraint "users_first_name_length";

alter table "public"."users" drop constraint "users_home_zipcode_length";

alter table "public"."users" drop constraint "users_last_name_length";

alter table "public"."video_athlete_links" drop constraint "video_athlete_links_athlete_id_fkey";

alter table "public"."video_favorites" drop constraint "video_favorites_org_id_fkey";

alter table "public"."video_favorites" drop constraint "video_favorites_user_id_fkey";

alter table "public"."video_favorites" drop constraint "video_favorites_video_id_fkey";

alter table "public"."video_favorites" drop constraint "video_favorites_video_id_user_id_key";

alter table "public"."video_note_targets" drop constraint "video_note_targets_athlete_id_fkey";

alter table "public"."video_reviews" drop constraint "video_reviews_athlete_id_fkey";

alter table "public"."video_shares" drop constraint "video_shares_created_by_fkey";

alter table "public"."video_shares" drop constraint "video_shares_org_id_fkey";

alter table "public"."video_shares" drop constraint "video_shares_token_key";

alter table "public"."video_shares" drop constraint "video_shares_video_id_fkey";

drop index if exists "public"."idx_event_logs_recent_category";

drop index if exists "public"."idx_event_logs_recent_created_at";

drop index if exists "public"."idx_event_logs_recent_org_id";

drop function if exists "public"."add_org_role_with_permissions"(p_user_id uuid, p_org_id uuid, p_role public.org_member_role, p_permissions jsonb);

drop view if exists "public"."admin_entitlement_overrides_list";

drop view if exists "public"."admin_event_logs";

drop view if exists "public"."admin_feature_flag_overrides";

drop view if exists "public"."admin_feature_flags_list";

drop view if exists "public"."admin_license_metrics";

drop view if exists "public"."admin_license_tiers_list";

drop view if exists "public"."admin_organizations";

drop view if exists "public"."admin_payments";

drop view if exists "public"."admin_platform_health";

drop view if exists "public"."admin_structure";

drop view if exists "public"."admin_users";

drop function if exists "public"."auth_debug_uid"();

drop function if exists "public"."auto_create_athlete_gallery"();

drop function if exists "public"."auto_create_event_gallery"();

drop function if exists "public"."auto_create_org_gallery"();

drop function if exists "public"."auto_create_season_gallery"();

drop function if exists "public"."auto_create_team_gallery"();

drop function if exists "public"."auto_create_travel_plan_gallery"();

drop function if exists "public"."bookmark_event"(p_event_id uuid);

drop function if exists "public"."can_view_video_note"(p_note_id uuid, p_user_id uuid);

drop function if exists "public"."can_view_video_note_target"(p_target_note_id uuid, p_user_id uuid);

drop function if exists "public"."check_video_notes_insert_policy"(p_author_id uuid, p_video_id uuid);

drop function if exists "public"."cleanup_expired_fan_feed"();

drop function if exists "public"."cleanup_expired_reservations"();

drop function if exists "public"."create_athlete_gallery"();

drop function if exists "public"."create_event_gallery"();

drop function if exists "public"."create_program_gallery"();

drop function if exists "public"."create_team_gallery"();

drop function if exists "public"."create_travel_gallery"();

drop function if exists "public"."delete_athlete_gallery"();

drop function if exists "public"."delete_event_gallery"();

drop function if exists "public"."delete_org_gallery"();

drop function if exists "public"."delete_program_gallery"();

drop function if exists "public"."delete_season_gallery"();

drop function if exists "public"."delete_team_gallery"();

drop function if exists "public"."delete_travel_gallery"();

drop function if exists "public"."delete_travel_plan_gallery"();

drop function if exists "public"."ensure_entity_gallery"(p_entity_type public.gallery_type, p_entity_id uuid, p_org_id uuid, p_user_id uuid, p_name text);

drop materialized view if exists "public"."event_logs_recent";

drop function if exists "public"."follow_athlete"(p_athlete_id uuid, p_source character varying);

drop function if exists "public"."follow_org"(p_org_id uuid, p_source character varying);

drop function if exists "public"."follow_team"(p_team_id uuid, p_source character varying);

drop function if exists "public"."get_athlete_profile"(p_athlete_id uuid);

drop function if exists "public"."get_default_staff_permissions"();

drop function if exists "public"."get_fan_calendar"(p_start_date timestamp with time zone, p_end_date timestamp with time zone, p_org_ids uuid[], p_sources text[]);

drop function if exists "public"."get_feature_ancestors"(p_feature_key text, p_max_depth integer);

drop function if exists "public"."get_feature_children"(p_feature_key text, p_include_archived boolean);

drop function if exists "public"."get_gallery_photo_counts"(p_gallery_ids uuid[]);

drop function if exists "public"."get_or_create_static_gallery"(p_org_id uuid, p_entity_type public.gallery_type, p_entity_id uuid, p_user_id uuid);

drop function if exists "public"."get_org_profile"(p_org_id uuid);

drop function if exists "public"."get_org_slug_by_id"(p_org_id uuid);

drop function if exists "public"."get_org_staff"(p_org_id uuid);

drop function if exists "public"."get_related_galleries"(p_entity_type text, p_entity_id uuid);

drop function if exists "public"."get_team_profile"(p_team_id uuid);

drop function if exists "public"."get_video_notes_policies"();

drop function if exists "public"."increment_share_access"(p_token character varying);

drop function if exists "public"."populate_fan_feed_on_follow"();

drop function if exists "public"."prevent_system_gallery_delete"();

drop function if exists "public"."refresh_ticketed_event_program_name"();

drop type "public"."related_gallery_item";

drop function if exists "public"."remove_bookmark"(p_event_id uuid);

drop function if exists "public"."revoke_staff_access"(p_org_id uuid, p_user_id uuid, p_reason text);

drop function if exists "public"."search_entities"(p_query text, p_entity_types character varying[], p_limit integer);

drop function if exists "public"."slugify"(input text);

drop function if exists "public"."soft_delete_video"(p_video_id uuid);

drop view if exists "public"."team_seasons_view";

drop function if exists "public"."transfer_ticket"(p_ticket_id uuid, p_holder_email text, p_holder_name text);

drop function if exists "public"."unfollow_org"(p_org_id uuid);

drop function if exists "public"."update_org_storage_usage"(p_org_id uuid, p_bucket_id text, p_bytes_delta bigint);

drop function if exists "public"."update_staff_permissions"(p_org_id uuid, p_user_id uuid, p_permissions jsonb);

drop function if exists "public"."update_ticketed_events_search"();

drop function if exists "public"."update_video_bookmark_count"();

drop function if exists "public"."update_video_comment_count"();

drop function if exists "public"."update_video_share_count"();

drop function if exists "public"."validate_feature_dependencies"(p_feature_key text, p_action text);

drop function if exists "public"."validate_feature_parent_assignment"();

drop function if exists "public"."validate_video_share_token"(p_token character varying);

drop function if exists "public"."verify_video_share_password"(p_token text, p_password text);

drop function if exists "public"."videos_search_vector_update"();

drop view if exists "public"."admin_feature_entitlements_list";

drop view if exists "public"."admin_feature_flags";

drop view if exists "public"."admin_fees_status";

alter table "public"."athletes" drop constraint "children_pkey";

alter table "public"."fan_calendar_cache" drop constraint "fan_calendar_cache_pkey";

alter table "public"."fan_event_bookmarks" drop constraint "fan_event_bookmarks_pkey";

alter table "public"."fan_feed" drop constraint "fan_feed_pkey";

alter table "public"."fan_org_follows" drop constraint "fan_org_follows_pkey";

alter table "public"."feature_dependencies" drop constraint "feature_dependencies_pkey";

alter table "public"."gallery_photo_bookmarks" drop constraint "gallery_photo_bookmarks_pkey";

alter table "public"."gallery_zip_downloads" drop constraint "gallery_zip_downloads_pkey";

alter table "public"."org_user_audit_log" drop constraint "org_user_audit_log_pkey";

alter table "public"."purchases" drop constraint "purchases_pkey";

alter table "public"."ticket_reservations" drop constraint "ticket_reservations_pkey";

alter table "public"."user_notification_preferences" drop constraint "user_notification_preferences_pkey";

alter table "public"."venues" drop constraint "venues_pkey";

alter table "public"."video_favorites" drop constraint "video_favorites_pkey";

alter table "public"."video_shares" drop constraint "video_shares_pkey";

drop index if exists "public"."fan_calendar_cache_pkey";

drop index if exists "public"."fan_calendar_cache_user_id_key";

drop index if exists "public"."fan_event_bookmarks_pkey";

drop index if exists "public"."fan_event_bookmarks_user_id_event_id_key";

drop index if exists "public"."fan_feed_pkey";

drop index if exists "public"."fan_org_follows_pkey";

drop index if exists "public"."fan_org_follows_user_id_org_id_key";

drop index if exists "public"."feature_dependencies_pkey";

drop index if exists "public"."feature_dependencies_unique";

drop index if exists "public"."gallery_photo_bookmarks_photo_id_user_id_key";

drop index if exists "public"."gallery_photo_bookmarks_pkey";

drop index if exists "public"."gallery_zip_downloads_pkey";

drop index if exists "public"."idx_announcements_visible_to_fans";

drop index if exists "public"."idx_athletes_has_profile_photo";

drop index if exists "public"."idx_athletes_org_id";

drop index if exists "public"."idx_athletes_privacy";

drop index if exists "public"."idx_event_general_rsvps_event";

drop index if exists "public"."idx_event_rsvps_event_athlete";

drop index if exists "public"."idx_events_org_id";

drop index if exists "public"."idx_events_season_start_time";

drop index if exists "public"."idx_events_team_active";

drop index if exists "public"."idx_events_team_start_time";

drop index if exists "public"."idx_events_upcoming_active";

drop index if exists "public"."idx_events_visibility";

drop index if exists "public"."idx_fan_bookmarks_event";

drop index if exists "public"."idx_fan_bookmarks_user";

drop index if exists "public"."idx_fan_calendar_cache_expires";

drop index if exists "public"."idx_fan_feed_content";

drop index if exists "public"."idx_fan_feed_expires";

drop index if exists "public"."idx_fan_feed_source";

drop index if exists "public"."idx_fan_feed_user_created";

drop index if exists "public"."idx_fan_follows_org";

drop index if exists "public"."idx_fan_follows_user";

drop index if exists "public"."idx_feature_dependencies_depends_on";

drop index if exists "public"."idx_feature_entitlements_category_display_name";

drop index if exists "public"."idx_feature_entitlements_common_filters";

drop index if exists "public"."idx_feature_entitlements_gate_action";

drop index if exists "public"."idx_feature_entitlements_key";

drop index if exists "public"."idx_feature_entitlements_parent";

drop index if exists "public"."idx_feature_entitlements_parent_lookup";

drop index if exists "public"."idx_feature_entitlements_rollout_status";

drop index if exists "public"."idx_feature_entitlements_text_search";

drop index if exists "public"."idx_feature_integration_assignments_feature_id";

drop index if exists "public"."idx_galleries_cover_generation_status";

drop index if exists "public"."idx_galleries_cover_photo_id";

drop index if exists "public"."idx_galleries_fans_can_see";

drop index if exists "public"."idx_gallery_photo_bookmarks_photo_id";

drop index if exists "public"."idx_gallery_photo_bookmarks_user_id";

drop index if exists "public"."idx_gallery_zip_downloads_user_time";

drop index if exists "public"."idx_org_members_active";

drop index if exists "public"."idx_org_members_permissions";

drop index if exists "public"."idx_org_user_audit_log_changed_by";

drop index if exists "public"."idx_org_user_audit_log_org_user";

drop index if exists "public"."idx_organizations_billing_mode";

drop index if exists "public"."idx_organizations_org_type";

drop index if exists "public"."idx_organizations_payout_account_id";

drop index if exists "public"."idx_organizations_place_id";

drop index if exists "public"."idx_organizations_privacy";

drop index if exists "public"."idx_organizations_profile_visible";

drop index if exists "public"."idx_organizations_slug";

drop index if exists "public"."idx_organizations_status";

drop index if exists "public"."idx_programs_org_active";

drop index if exists "public"."idx_programs_org_slug";

drop index if exists "public"."idx_purchases_event";

drop index if exists "public"."idx_purchases_org";

drop index if exists "public"."idx_purchases_user";

drop index if exists "public"."idx_reservations_event";

drop index if exists "public"."idx_reservations_expires";

drop index if exists "public"."idx_reservations_user";

drop index if exists "public"."idx_seasons_is_active";

drop index if exists "public"."idx_seasons_org_active";

drop index if exists "public"."idx_seasons_org_id";

drop index if exists "public"."idx_seasons_org_slug";

drop index if exists "public"."idx_seasons_org_unique";

drop index if exists "public"."idx_seasons_program_id";

drop index if exists "public"."idx_seasons_sport_id";

drop index if exists "public"."idx_seasons_team_active";

drop index if exists "public"."idx_team_memberships_deleted_at";

drop index if exists "public"."idx_teams_invite_code";

drop index if exists "public"."idx_teams_is_active";

drop index if exists "public"."idx_teams_level_id";

drop index if exists "public"."idx_teams_privacy";

drop index if exists "public"."idx_teams_program_id";

drop index if exists "public"."idx_teams_sport_id";

drop index if exists "public"."idx_teams_visible_to_fans";

drop index if exists "public"."idx_ticketed_events_program";

drop index if exists "public"."idx_ticketed_events_search_vector";

drop index if exists "public"."idx_ticketed_events_season";

drop index if exists "public"."idx_ticketed_events_venue";

drop index if exists "public"."idx_ticketed_events_visibility";

drop index if exists "public"."idx_tickets_holder_email";

drop index if exists "public"."idx_tickets_holder_user";

drop index if exists "public"."idx_tickets_purchase";

drop index if exists "public"."idx_tickets_qr_hmac_key";

drop index if exists "public"."idx_tier_feature_assignments_feature_id_included";

drop index if exists "public"."idx_tier_feature_assignments_feature_id_roles";

drop index if exists "public"."idx_user_notification_prefs_user";

drop index if exists "public"."idx_users_active";

drop index if exists "public"."idx_users_first_name";

drop index if exists "public"."idx_users_first_name_lower";

drop index if exists "public"."idx_users_home_zipcode";

drop index if exists "public"."idx_users_last_name";

drop index if exists "public"."idx_users_last_name_lower";

drop index if exists "public"."idx_users_preferences";

drop index if exists "public"."idx_users_requires_org_setup";

drop index if exists "public"."idx_venues_name_search";

drop index if exists "public"."idx_venues_org";

drop index if exists "public"."idx_video_favorites_org_id";

drop index if exists "public"."idx_video_favorites_user_id";

drop index if exists "public"."idx_video_favorites_video_id";

drop index if exists "public"."idx_video_shares_created_by";

drop index if exists "public"."idx_video_shares_org_id";

drop index if exists "public"."idx_video_shares_token";

drop index if exists "public"."idx_video_shares_video_id";

drop index if exists "public"."idx_videos_fan_visible";

drop index if exists "public"."idx_videos_search_vector";

drop index if exists "public"."org_user_audit_log_pkey";

drop index if exists "public"."organizations_slug_key";

drop index if exists "public"."purchases_pkey";

drop index if exists "public"."teams_invite_code_key";

drop index if exists "public"."ticket_reservations_pkey";

drop index if exists "public"."user_notification_preferences_pkey";

drop index if exists "public"."user_notification_preferences_user_id_key";

drop index if exists "public"."venues_pkey";

drop index if exists "public"."video_favorites_pkey";

drop index if exists "public"."video_favorites_video_id_user_id_key";

drop index if exists "public"."video_shares_pkey";

drop index if exists "public"."video_shares_token_key";

drop index if exists "public"."children_pkey";

drop table "public"."fan_calendar_cache";

drop table "public"."fan_event_bookmarks";

drop table "public"."fan_feed";

drop table "public"."fan_org_follows";

drop table "public"."feature_dependencies";

drop table "public"."gallery_photo_bookmarks";

drop table "public"."gallery_zip_downloads";

drop table "public"."org_user_audit_log";

drop table "public"."purchases";

drop table "public"."ticket_reservations";

drop table "public"."user_notification_preferences";

drop table "public"."venues";

drop table "public"."video_favorites";

drop table "public"."video_shares";

alter table "public"."organization_invites" alter column "role" drop default;

alter table "public"."organization_members" alter column "role" drop default;

alter table "public"."tickets" alter column "status" drop default;

alter table "public"."users" alter column "role" drop default;

alter table "public"."videos" alter column "visibility" drop default;

alter type "public"."gallery_type" rename to "gallery_type__old_version_to_be_dropped";

create type "public"."gallery_type" as enum ('org', 'team', 'athlete', 'event', 'travel');

alter type "public"."org_member_role" rename to "org_member_role__old_version_to_be_dropped";

create type "public"."org_member_role" as enum ('parent', 'coach', 'org_admin');

alter type "public"."ticket_status" rename to "ticket_status__old_version_to_be_dropped";

create type "public"."ticket_status" as enum ('active', 'used', 'refunded', 'voided');

alter type "public"."user_role" rename to "user_role__old_version_to_be_dropped";

create type "public"."user_role" as enum ('parent', 'coach', 'admin');

alter type "public"."video_visibility" rename to "video_visibility__old_version_to_be_dropped";

create type "public"."video_visibility" as enum ('private', 'team', 'organization', 'guardians');


  create table "public"."children" (
    "id" uuid not null default gen_random_uuid(),
    "family_id" uuid not null,
    "first_name" text not null,
    "last_name" text not null,
    "birthdate" date,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."children" enable row level security;

alter table "public"."galleries" alter column gallery_type type "public"."gallery_type" using gallery_type::text::"public"."gallery_type";

alter table "public"."organization_invites" alter column role type "public"."org_member_role" using role::text::"public"."org_member_role";

alter table "public"."organization_members" alter column role type "public"."org_member_role" using role::text::"public"."org_member_role";

alter table "public"."tickets" alter column status type "public"."ticket_status" using status::text::"public"."ticket_status";

alter table "public"."users" alter column role type "public"."user_role" using role::text::"public"."user_role";

alter table "public"."videos" alter column visibility type "public"."video_visibility" using visibility::text::"public"."video_visibility";

alter table "public"."organization_invites" alter column "role" set default 'parent'::public.org_member_role;

alter table "public"."organization_members" alter column "role" set default 'parent'::public.org_member_role;

alter table "public"."tickets" alter column "status" set default 'active'::public.ticket_status;

alter table "public"."users" alter column "role" set default 'parent'::public.user_role;

alter table "public"."videos" alter column "visibility" set default 'team'::public.video_visibility;

drop type "public"."gallery_type__old_version_to_be_dropped";

drop type "public"."org_member_role__old_version_to_be_dropped";

drop type "public"."ticket_status__old_version_to_be_dropped";

drop type "public"."user_role__old_version_to_be_dropped";

drop type "public"."video_visibility__old_version_to_be_dropped";

alter table "public"."announcements" drop column "visible_to_fans";

alter table "public"."athletes" drop column "has_profile_photo";

alter table "public"."athletes" drop column "org_id";

alter table "public"."athletes" drop column "privacy_level";

alter table "public"."athletes" drop column "profile_photo_updated_at";

alter table "public"."events" drop column "org_id";

alter table "public"."events" drop column "visibility";

alter table "public"."feature_entitlements" drop column "owner_team";

alter table "public"."feature_entitlements" drop column "parent_feature_key";

alter table "public"."feature_entitlements" alter column "unavailable_gate_action" drop not null;

alter table "public"."feature_flags" alter column "enabled" set not null;

alter table "public"."feature_flags" alter column "feature_key" set not null;

alter table "public"."feature_flags" alter column "org_id" set not null;

alter table "public"."galleries" drop column "can_download";

alter table "public"."galleries" drop column "cover_generated_at";

alter table "public"."galleries" drop column "cover_generation_status";

alter table "public"."galleries" drop column "cover_thumbnails";

alter table "public"."galleries" drop column "fans_can_see";

alter table "public"."galleries" drop column "is_system_generated";

alter table "public"."gallery_photos" drop column "blurhash";

alter table "public"."gallery_photos" drop column "can_download";

alter table "public"."gallery_photos" drop column "thumbnail_lg_path";

alter table "public"."gallery_photos" drop column "thumbnail_md_path";

alter table "public"."gallery_photos" drop column "thumbnail_sm_path";

alter table "public"."gallery_photos" alter column "sort_order" set data type integer using "sort_order"::integer;

alter table "public"."organization_members" drop column "ended_at";

alter table "public"."organization_members" drop column "ended_reason";

alter table "public"."organization_members" drop column "is_active";

alter table "public"."organization_members" drop column "permissions";

alter table "public"."organization_members" drop column "revoked_by";

alter table "public"."organization_visibility_settings" drop column "fan_visibility_defaults";

alter table "public"."organizations" drop column "address";

alter table "public"."organizations" drop column "billing_mode";

alter table "public"."organizations" drop column "city";

alter table "public"."organizations" drop column "connect_link_created_at";

alter table "public"."organizations" drop column "contact_email";

alter table "public"."organizations" drop column "currency";

alter table "public"."organizations" drop column "default_ticket_fees_cents";

alter table "public"."organizations" drop column "description";

alter table "public"."organizations" drop column "email";

alter table "public"."organizations" drop column "latitude";

alter table "public"."organizations" drop column "license_cancel_at_period_end";

alter table "public"."organizations" drop column "license_current_period_end";

alter table "public"."organizations" drop column "license_current_period_start";

alter table "public"."organizations" drop column "license_grace_ends_at";

alter table "public"."organizations" drop column "license_plan";

alter table "public"."organizations" drop column "license_status";

alter table "public"."organizations" drop column "license_trial_ends_at";

alter table "public"."organizations" drop column "logo_url";

alter table "public"."organizations" drop column "longitude";

alter table "public"."organizations" drop column "org_type";

alter table "public"."organizations" drop column "payout_account_id";

alter table "public"."organizations" drop column "payout_descriptor";

alter table "public"."organizations" drop column "payout_onboarding_status";

alter table "public"."organizations" drop column "payouts_enabled";

alter table "public"."organizations" drop column "phone";

alter table "public"."organizations" drop column "place_id";

alter table "public"."organizations" drop column "primary_city";

alter table "public"."organizations" drop column "primary_region_radius_miles";

alter table "public"."organizations" drop column "primary_state";

alter table "public"."organizations" drop column "privacy_level";

alter table "public"."organizations" drop column "profile_visible_to_fans";

alter table "public"."organizations" drop column "refund_policy";

alter table "public"."organizations" drop column "slug";

alter table "public"."organizations" drop column "state";

alter table "public"."organizations" drop column "status";

alter table "public"."organizations" drop column "stripe_customer_id";

alter table "public"."organizations" drop column "stripe_payouts_disabled_reason";

alter table "public"."organizations" drop column "stripe_payouts_enabled";

alter table "public"."organizations" drop column "stripe_price_id";

alter table "public"."organizations" drop column "stripe_requirements_deadline";

alter table "public"."organizations" drop column "stripe_requirements_due";

alter table "public"."organizations" drop column "stripe_requirements_errors";

alter table "public"."organizations" drop column "stripe_status_updated_at";

alter table "public"."organizations" drop column "stripe_subscription_id";

alter table "public"."organizations" drop column "ticket_terms";

alter table "public"."organizations" drop column "ticketing_enabled";

alter table "public"."organizations" drop column "website";

alter table "public"."organizations" drop column "zip";

alter table "public"."programs" drop column "color";

alter table "public"."programs" drop column "is_active";

alter table "public"."programs" drop column "slug";

alter table "public"."programs" drop column "sport";

alter table "public"."seasons" drop column "is_active";

alter table "public"."seasons" drop column "org_id";

alter table "public"."seasons" drop column "program_id";

alter table "public"."seasons" drop column "slug";

alter table "public"."seasons" drop column "sport_id";

alter table "public"."seasons" alter column "team_id" set not null;

alter table "public"."team_memberships" drop column "deleted_at";

alter table "public"."teams" drop column "invite_code";

alter table "public"."teams" drop column "is_active";

alter table "public"."teams" drop column "level_id";

alter table "public"."teams" drop column "max_roster_size";

alter table "public"."teams" drop column "privacy_level";

alter table "public"."teams" drop column "program_id";

alter table "public"."teams" drop column "sport_id";

alter table "public"."teams" drop column "visible_to_fans";

alter table "public"."ticketed_events" drop column "is_home";

alter table "public"."ticketed_events" drop column "opponent";

alter table "public"."ticketed_events" drop column "program_id";

alter table "public"."ticketed_events" drop column "program_name_cached";

alter table "public"."ticketed_events" drop column "sale_status";

alter table "public"."ticketed_events" drop column "search_vector";

alter table "public"."ticketed_events" drop column "season_id";

alter table "public"."ticketed_events" drop column "venue_id";

alter table "public"."ticketed_events" drop column "visibility";

alter table "public"."tickets" drop column "holder_email";

alter table "public"."tickets" drop column "holder_name";

alter table "public"."tickets" drop column "holder_user_id";

alter table "public"."tickets" drop column "purchase_id";

alter table "public"."tickets" drop column "qr_hmac_key";

alter table "public"."tickets" drop column "qr_key_rotated_at";

alter table "public"."tickets" drop column "transferred_at";

alter table "public"."users" drop column "display_name";

alter table "public"."users" drop column "first_name";

alter table "public"."users" drop column "home_location";

alter table "public"."users" drop column "home_zipcode";

alter table "public"."users" drop column "is_active";

alter table "public"."users" drop column "last_name";

alter table "public"."users" drop column "permissions";

alter table "public"."users" drop column "preferences";

alter table "public"."users" drop column "preferred_timezone";

alter table "public"."users" drop column "requires_org_setup";

alter table "public"."users" alter column "phone" drop default;

alter table "public"."users" alter column "phone" drop not null;

alter table "public"."users" alter column "role" set not null;

alter table "public"."videos" drop column "bookmark_count";

alter table "public"."videos" drop column "comment_count";

alter table "public"."videos" drop column "fan_visible";

alter table "public"."videos" drop column "last_shared_at";

alter table "public"."videos" drop column "search_vector";

alter table "public"."videos" drop column "share_count";

alter table "public"."videos" drop column "thumbnail_timestamp";

drop type "public"."entity_privacy_level";

drop type "public"."event_visibility";

drop type "public"."ticket_sale_status";

CREATE INDEX idx_children_family_id ON public.children USING btree (family_id);

CREATE UNIQUE INDEX children_pkey ON public.children USING btree (id);

alter table "public"."children" add constraint "children_pkey" PRIMARY KEY using index "children_pkey";

alter table "public"."children" add constraint "children_family_id_fkey" FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE not valid;

alter table "public"."children" validate constraint "children_family_id_fkey";

set check_function_bodies = off;

create or replace view "public"."admin_feature_entitlements_list" as  SELECT id,
    feature_key,
    display_name,
    category,
    feature_type,
    description,
    rollout_status,
    created_at,
    updated_at,
    archived_at,
    is_toggleable,
    is_removable,
    lock_reason,
    is_system_feature,
    platform_admin_only,
    unavailable_gate_action,
    ( SELECT count(*) AS count
           FROM public.tier_feature_assignments tfa
          WHERE ((tfa.feature_entitlement_id = fe.id) AND (tfa.included = true))) AS tier_assignments_count,
    COALESCE(( SELECT array_agg(DISTINCT lt.tier_key) AS array_agg
           FROM (public.tier_feature_assignments tfa
             JOIN public.license_tiers lt ON ((lt.id = tfa.license_tier_id)))
          WHERE ((tfa.feature_entitlement_id = fe.id) AND (tfa.included = true) AND (lt.status = 'active'::text))), ARRAY[]::text[]) AS assigned_tier_keys,
    COALESCE(( SELECT bool_or(tfa.role_admin) AS bool_or
           FROM public.tier_feature_assignments tfa
          WHERE ((tfa.feature_entitlement_id = fe.id) AND (tfa.included = true))), false) AS visible_to_admin,
    COALESCE(( SELECT bool_or(tfa.role_coach) AS bool_or
           FROM public.tier_feature_assignments tfa
          WHERE ((tfa.feature_entitlement_id = fe.id) AND (tfa.included = true))), false) AS visible_to_coach,
    COALESCE(( SELECT bool_or(tfa.role_parent) AS bool_or
           FROM public.tier_feature_assignments tfa
          WHERE ((tfa.feature_entitlement_id = fe.id) AND (tfa.included = true))), false) AS visible_to_parent,
    COALESCE(( SELECT array_agg(DISTINCT fia.integration_name) AS array_agg
           FROM public.feature_integration_assignments fia
          WHERE (fia.feature_entitlement_id = fe.id)), ARRAY[]::text[]) AS integrations,
    COALESCE(( SELECT bool_or((tfa.limit_value IS NOT NULL)) AS bool_or
           FROM public.tier_feature_assignments tfa
          WHERE ((tfa.feature_entitlement_id = fe.id) AND (tfa.included = true))), false) AS is_quantifiable,
        CASE
            WHEN (EXISTS ( SELECT 1
               FROM public.feature_discovery_cache fdc
              WHERE (fdc.discovered_features @> jsonb_build_array(jsonb_build_object('featureKey', fe.feature_key))))) THEN 'auto-discovered'::text
            WHEN (created_at = updated_at) THEN 'manually-created'::text
            ELSE 'override-custom'::text
        END AS discovery_source,
    ( SELECT count(*) AS count
           FROM public.entitlement_overrides eo
          WHERE ((eo.feature_entitlement_id = fe.id) AND (eo.revoked_at IS NULL) AND ((eo.expires_at IS NULL) OR (eo.expires_at > now())))) AS active_overrides_count
   FROM public.feature_entitlements fe;


create or replace view "public"."admin_feature_flags" as  SELECT ff.id,
    ff.org_id,
    o.name AS organization_name,
    ff.feature_key,
    ff.enabled,
    ff.created_at,
    ff.updated_at
   FROM (public.feature_flags ff
     JOIN public.organizations o ON ((o.id = ff.org_id)))
  WHERE (EXISTS ( SELECT 1
           FROM public.platform_admins pa
          WHERE (pa.user_id = auth.uid())))
  ORDER BY o.name, ff.feature_key;


create or replace view "public"."admin_fees_status" as  SELECT f.id AS fee_id,
    f.title AS fee_name,
    f.amount_cents,
    f.currency,
    f.due_date,
    f.status AS fee_status,
    o.id AS org_id,
    o.name AS organization_name,
    ( SELECT count(*) AS count
           FROM public.fee_assignments fa
          WHERE (fa.fee_id = f.id)) AS assigned_count,
    ( SELECT count(*) AS count
           FROM public.fee_assignments fa
          WHERE ((fa.fee_id = f.id) AND (fa.status = 'paid'::public.fee_assignment_status))) AS paid_count,
    ( SELECT count(*) AS count
           FROM public.fee_assignments fa
          WHERE ((fa.fee_id = f.id) AND (fa.status = ANY (ARRAY['unpaid'::public.fee_assignment_status, 'partial'::public.fee_assignment_status])))) AS unpaid_count,
        CASE
            WHEN (( SELECT count(*) AS count
               FROM public.fee_assignments fa
              WHERE (fa.fee_id = f.id)) > 0) THEN round((((( SELECT count(*) AS count
               FROM public.fee_assignments fa
              WHERE ((fa.fee_id = f.id) AND (fa.status = 'paid'::public.fee_assignment_status))))::numeric / (( SELECT count(*) AS count
               FROM public.fee_assignments fa
              WHERE (fa.fee_id = f.id)))::numeric) * (100)::numeric), 1)
            ELSE (0)::numeric
        END AS payment_rate_percent
   FROM (public.fees f
     JOIN public.organizations o ON ((o.id = f.org_id)))
  WHERE (EXISTS ( SELECT 1
           FROM public.platform_admins pa
          WHERE (pa.user_id = auth.uid())));


CREATE OR REPLACE FUNCTION public.can_edit_video(p_video_id uuid, p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_video RECORD;
BEGIN
  -- Get video details
  SELECT v.*, v.org_id, v.uploaded_by
  INTO v_video
  FROM public.videos v
  WHERE v.id = p_video_id AND v.deleted_at IS NULL;
  
  IF v_video IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Uploader can edit
  IF v_video.uploaded_by = p_user_id THEN
    RETURN TRUE;
  END IF;
  
  -- Org admin can edit
  RETURN EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.org_id = v_video.org_id
      AND om.user_id = p_user_id
      AND om.role IN ('org_admin')
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.can_view_athlete(athlete_id_param uuid, user_id_param uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  athlete_org_id UUID;
BEGIN
  -- Try to get athlete's org_id via family
  SELECT f.org_id INTO athlete_org_id
  FROM athletes a
  JOIN families f ON f.id = a.family_id
  WHERE a.id = athlete_id_param;
  
  -- Check if user is org admin (if org known)
  IF athlete_org_id IS NOT NULL AND is_org_admin(athlete_org_id, user_id_param) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is parent/guardian (works even without org/family)
  IF is_parent_of_athlete(athlete_id_param, user_id_param) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is coach for any team the athlete is on
  RETURN EXISTS (
    SELECT 1
    FROM team_memberships tm
    JOIN teams t ON t.id = tm.team_id
    WHERE tm.athlete_id = athlete_id_param
      AND tm.deleted_at IS NULL
      AND t.deleted_at IS NULL
      AND is_coach_for_team(t.id, user_id_param)
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.can_view_gallery(gallery_id_param uuid, user_id_param uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_gallery RECORD;
  v_team_id UUID;
  v_athlete_id UUID;
  v_event_id UUID;
  v_travel_plan_id UUID;
BEGIN
  -- Get gallery details
  SELECT g.org_id, g.gallery_type, g.entity_id
  INTO v_gallery
  FROM galleries g
  WHERE g.id = gallery_id_param;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Org admins can view all galleries in their org
  IF is_org_admin(v_gallery.org_id, user_id_param) THEN
    RETURN TRUE;
  END IF;
  
  -- Check based on gallery type
  CASE v_gallery.gallery_type
    WHEN 'org' THEN
      -- Org galleries: org members can view
      RETURN is_org_member(v_gallery.org_id, user_id_param);
      
    WHEN 'team' THEN
      -- Team galleries: coaches of that team can view
      IF v_gallery.entity_id IS NOT NULL THEN
        RETURN is_coach_for_team(v_gallery.entity_id, user_id_param);
      END IF;
      RETURN FALSE;
      
    WHEN 'athlete' THEN
      -- Athlete galleries: parents of that athlete can view
      IF v_gallery.entity_id IS NOT NULL THEN
        RETURN is_parent_of_athlete(v_gallery.entity_id, user_id_param);
      END IF;
      RETURN FALSE;
      
    WHEN 'event' THEN
      -- Event galleries: members/coaches of the team linked to the event can view
      IF v_gallery.entity_id IS NOT NULL THEN
        SELECT team_id INTO v_team_id
        FROM events
        WHERE id = v_gallery.entity_id;
        
        IF v_team_id IS NOT NULL THEN
          -- Check if user is coach for the team
          IF is_coach_for_team(v_team_id, user_id_param) THEN
            RETURN TRUE;
          END IF;
          
          -- Check if user is parent of athlete on the team
          RETURN EXISTS (
            SELECT 1
            FROM team_memberships tm
            JOIN athlete_guardians ag ON ag.athlete_id = tm.athlete_id
            WHERE tm.team_id = v_team_id
              AND tm.deleted_at IS NULL
              AND ag.user_id = user_id_param
              AND ag.status = 'active'
          );
        END IF;
      END IF;
      RETURN FALSE;
      
    WHEN 'travel' THEN
      -- Travel galleries: members/coaches of the team linked to the travel plan can view
      IF v_gallery.entity_id IS NOT NULL THEN
        SELECT team_id INTO v_team_id
        FROM travel_plans
        WHERE id = v_gallery.entity_id;
        
        IF v_team_id IS NOT NULL THEN
          -- Check if user is coach for the team
          IF is_coach_for_team(v_team_id, user_id_param) THEN
            RETURN TRUE;
          END IF;
          
          -- Check if user is parent of athlete on the team
          RETURN EXISTS (
            SELECT 1
            FROM team_memberships tm
            JOIN athlete_guardians ag ON ag.athlete_id = tm.athlete_id
            WHERE tm.team_id = v_team_id
              AND tm.deleted_at IS NULL
              AND ag.user_id = user_id_param
              AND ag.status = 'active'
          );
        END IF;
      END IF;
      RETURN FALSE;
      
    ELSE
      RETURN FALSE;
  END CASE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.can_view_video(p_video_id uuid, p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_video RECORD;
  v_is_admin BOOLEAN;
  v_is_coach BOOLEAN;
  v_is_guardian_of_tagged BOOLEAN;
BEGIN
  -- Get video details
  SELECT v.*, v.org_id, v.team_id, v.visibility, v.uploaded_by
  INTO v_video
  FROM public.videos v
  WHERE v.id = p_video_id AND v.deleted_at IS NULL;
  
  IF v_video IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Uploader can always view
  IF v_video.uploaded_by = p_user_id THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is org admin
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.org_id = v_video.org_id
      AND om.user_id = p_user_id
      AND om.role IN ('org_admin')
  ) INTO v_is_admin;
  
  IF v_is_admin THEN
    RETURN TRUE;
  END IF;
  
  -- Check visibility rules
  CASE v_video.visibility
    WHEN 'private' THEN
      RETURN FALSE;
    
    WHEN 'organization' THEN
      -- Any org member can view
      RETURN EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.org_id = v_video.org_id AND om.user_id = p_user_id
      );
    
    WHEN 'team' THEN
      -- Team members (coaches or parents with athletes on team)
      RETURN EXISTS (
        SELECT 1 FROM public.team_memberships tm
        WHERE tm.team_id = v_video.team_id AND tm.user_id = p_user_id
      ) OR EXISTS (
        SELECT 1 FROM public.athlete_guardians ag
        JOIN public.athletes a ON a.id = ag.athlete_id
        WHERE ag.user_id = p_user_id
          AND ag.status = 'active'
          AND a.team_id = v_video.team_id
      );
    
    WHEN 'guardians' THEN
      -- Only guardians of tagged athletes
      RETURN EXISTS (
        SELECT 1 FROM public.video_athlete_links val
        JOIN public.athlete_guardians ag ON ag.athlete_id = val.athlete_id
        WHERE val.video_id = p_video_id
          AND ag.user_id = p_user_id
          AND ag.status = 'active'
      );
    
    ELSE
      RETURN FALSE;
  END CASE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.coach_has_medical_access(athlete_id_param uuid, user_id_param uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  athlete_org_id UUID;
  coach_medical_access_enabled BOOLEAN;
BEGIN
  -- Get athlete's org_id via family
  SELECT f.org_id INTO athlete_org_id
  FROM athletes a
  JOIN families f ON f.id = a.family_id
  WHERE a.id = athlete_id_param;
  
  IF athlete_org_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check org settings for coach medical access
  -- TODO: This should check a specific org setting once that table is created
  -- For now, default to FALSE (coaches cannot see medical by default)
  coach_medical_access_enabled := FALSE;
  
  IF NOT coach_medical_access_enabled THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user is coach for any team the athlete is on
  RETURN EXISTS (
    SELECT 1
    FROM team_memberships tm
    JOIN teams t ON t.id = tm.team_id
    WHERE tm.athlete_id = athlete_id_param
      AND tm.deleted_at IS NULL
      AND t.deleted_at IS NULL
      AND is_coach_for_team(t.id, user_id_param)
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_feature_gate(p_org_id uuid, p_user_id uuid, p_feature_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_result JSONB;
  v_feature_id UUID;
  v_feature feature_entitlements%ROWTYPE;
  v_tier_key TEXT;
  v_license_tier_id UUID;
  v_user_role TEXT := 'parent'; -- default
  v_is_platform_admin BOOLEAN := FALSE;
  v_tier_assignment tier_feature_assignments%ROWTYPE;
  v_org_override entitlement_overrides%ROWTYPE;
  v_user_override entitlement_overrides%ROWTYPE;
  v_allowed BOOLEAN := FALSE;
  v_gate_action TEXT;
  v_reason_code TEXT;
  v_limit_value INTEGER;
BEGIN
  -- Check if user is platform admin
  SELECT EXISTS (
    SELECT 1 FROM platform_admins WHERE user_id = p_user_id
  ) INTO v_is_platform_admin;

  -- Get feature details
  SELECT * INTO v_feature
  FROM feature_entitlements
  WHERE feature_key = p_feature_key
    AND archived_at IS NULL;

  -- Feature not found
  IF v_feature.id IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', FALSE,
      'gate_action', 'hide',
      'reason_code', 'not_found',
      'feature_key', p_feature_key
    );
  END IF;

  -- Platform admin only feature
  IF v_feature.platform_admin_only = TRUE THEN
    IF v_is_platform_admin THEN
      RETURN jsonb_build_object(
        'allowed', TRUE,
        'gate_action', NULL,
        'reason_code', 'platform_admin',
        'feature_key', p_feature_key
      );
    ELSE
      RETURN jsonb_build_object(
        'allowed', FALSE,
        'gate_action', COALESCE(v_feature.unavailable_gate_action, 'hide'),
        'reason_code', 'platform_admin_only',
        'feature_key', p_feature_key
      );
    END IF;
  END IF;

  -- System feature (always allowed)
  IF v_feature.is_system_feature = TRUE THEN
    RETURN jsonb_build_object(
      'allowed', TRUE,
      'gate_action', NULL,
      'reason_code', 'system_feature',
      'feature_key', p_feature_key
    );
  END IF;

  -- No org context - allow for platform admins browsing, deny for others
  IF p_org_id IS NULL THEN
    IF v_is_platform_admin THEN
      RETURN jsonb_build_object(
        'allowed', TRUE,
        'gate_action', NULL,
        'reason_code', 'platform_admin',
        'feature_key', p_feature_key
      );
    ELSE
      RETURN jsonb_build_object(
        'allowed', FALSE,
        'gate_action', COALESCE(v_feature.unavailable_gate_action, 'overlay'),
        'reason_code', 'no_organization',
        'feature_key', p_feature_key
      );
    END IF;
  END IF;

  -- Get org's license tier (normalize plan names to tier keys)
  SELECT 
    CASE o.license_plan::text
      WHEN 'starter' THEN 'basic'
      WHEN 'standard' THEN 'power'
      WHEN 'pro' THEN 'power'
      ELSE o.license_plan::text
    END INTO v_tier_key
  FROM organizations o
  WHERE o.id = p_org_id;

  IF v_tier_key IS NULL THEN
    -- Org not found or no license plan
    IF v_is_platform_admin THEN
      RETURN jsonb_build_object(
        'allowed', TRUE,
        'gate_action', NULL,
        'reason_code', 'platform_admin',
        'feature_key', p_feature_key
      );
    ELSE
      RETURN jsonb_build_object(
        'allowed', FALSE,
        'gate_action', COALESCE(v_feature.unavailable_gate_action, 'overlay'),
        'reason_code', 'no_organization',
        'feature_key', p_feature_key
      );
    END IF;
  END IF;

  -- Get license tier ID
  SELECT id INTO v_license_tier_id
  FROM license_tiers
  WHERE tier_key = v_tier_key AND status = 'active';

  -- =========================================================================
  -- FIX: Handle case where license tier record doesn't exist
  -- =========================================================================
  IF v_license_tier_id IS NULL THEN
    -- License tier not found in license_tiers table
    -- Platform admins can still access
    IF v_is_platform_admin THEN
      RETURN jsonb_build_object(
        'allowed', TRUE,
        'gate_action', NULL,
        'reason_code', 'platform_admin',
        'feature_key', p_feature_key
      );
    END IF;
    
    -- For regular users, fail with informative reason
    RETURN jsonb_build_object(
      'allowed', FALSE,
      'gate_action', COALESCE(v_feature.unavailable_gate_action, 'overlay'),
      'reason_code', 'license_tier_not_configured',
      'feature_key', p_feature_key,
      'tier_key', v_tier_key
    );
  END IF;

  -- Get user's role in org
  SELECT role INTO v_user_role
  FROM organization_members
  WHERE org_id = p_org_id AND user_id = p_user_id;

  -- Default to parent if no membership found
  IF v_user_role IS NULL THEN
    -- Platform admins can still access
    IF v_is_platform_admin THEN
      v_user_role := 'org_admin'; -- Treat as admin for gate purposes
    ELSE
      v_user_role := 'parent';
    END IF;
  END IF;

  -- Check user override first (highest priority)
  SELECT * INTO v_user_override
  FROM entitlement_overrides
  WHERE target_type = 'user'
    AND target_id = p_user_id
    AND feature_entitlement_id = v_feature.id
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > NOW());

  IF v_user_override.id IS NOT NULL THEN
    IF v_user_override.override_action = 'disable' THEN
      RETURN jsonb_build_object(
        'allowed', FALSE,
        'gate_action', COALESCE(v_feature.unavailable_gate_action, 'overlay'),
        'reason_code', 'disabled_by_override',
        'feature_key', p_feature_key
      );
    ELSIF v_user_override.override_action = 'enable' THEN
      RETURN jsonb_build_object(
        'allowed', TRUE,
        'gate_action', NULL,
        'reason_code', 'enabled_by_override',
        'feature_key', p_feature_key
      );
    ELSIF v_user_override.override_action = 'set_limit' THEN
      v_limit_value := v_user_override.limit_value;
      RETURN jsonb_build_object(
        'allowed', TRUE,
        'gate_action', NULL,
        'reason_code', 'limit_set_by_override',
        'feature_key', p_feature_key,
        'limit_value', v_limit_value
      );
    END IF;
  END IF;

  -- Check org override (second priority)
  SELECT * INTO v_org_override
  FROM entitlement_overrides
  WHERE target_type = 'organization'
    AND target_id = p_org_id
    AND feature_entitlement_id = v_feature.id
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > NOW());

  IF v_org_override.id IS NOT NULL THEN
    IF v_org_override.override_action = 'disable' THEN
      RETURN jsonb_build_object(
        'allowed', FALSE,
        'gate_action', COALESCE(v_feature.unavailable_gate_action, 'overlay'),
        'reason_code', 'disabled_by_override',
        'feature_key', p_feature_key
      );
    ELSIF v_org_override.override_action = 'enable' THEN
      RETURN jsonb_build_object(
        'allowed', TRUE,
        'gate_action', NULL,
        'reason_code', 'enabled_by_override',
        'feature_key', p_feature_key
      );
    ELSIF v_org_override.override_action = 'set_limit' THEN
      v_limit_value := v_org_override.limit_value;
      RETURN jsonb_build_object(
        'allowed', TRUE,
        'gate_action', NULL,
        'reason_code', 'limit_set_by_override',
        'feature_key', p_feature_key,
        'limit_value', v_limit_value
      );
    END IF;
  END IF;

  -- Check tier + role assignment
  SELECT * INTO v_tier_assignment
  FROM tier_feature_assignments
  WHERE license_tier_id = v_license_tier_id
    AND feature_entitlement_id = v_feature.id
    AND included = TRUE;

  IF v_tier_assignment.id IS NULL THEN
    -- Not in tier, but platform admins can still access
    IF v_is_platform_admin THEN
      RETURN jsonb_build_object(
        'allowed', TRUE,
        'gate_action', NULL,
        'reason_code', 'platform_admin',
        'feature_key', p_feature_key
      );
    END IF;
    
    RETURN jsonb_build_object(
      'allowed', FALSE,
      'gate_action', COALESCE(v_feature.unavailable_gate_action, 'overlay'),
      'reason_code', 'license_tier',
      'feature_key', p_feature_key
    );
  END IF;

  -- Check role permission within tier assignment
  v_allowed := CASE v_user_role
    WHEN 'org_admin' THEN COALESCE(v_tier_assignment.role_admin, TRUE)
    WHEN 'coach' THEN COALESCE(v_tier_assignment.role_coach, TRUE)
    WHEN 'parent' THEN COALESCE(v_tier_assignment.role_parent, FALSE)
    ELSE FALSE
  END;

  IF NOT v_allowed THEN
    -- Platform admins bypass role restrictions
    IF v_is_platform_admin THEN
      RETURN jsonb_build_object(
        'allowed', TRUE,
        'gate_action', NULL,
        'reason_code', 'platform_admin',
        'feature_key', p_feature_key
      );
    END IF;
    
    RETURN jsonb_build_object(
      'allowed', FALSE,
      'gate_action', COALESCE(v_feature.unavailable_gate_action, 'overlay'),
      'reason_code', 'role',
      'feature_key', p_feature_key,
      'user_role', v_user_role
    );
  END IF;

  -- Feature is allowed by tier + role
  RETURN jsonb_build_object(
    'allowed', TRUE,
    'gate_action', NULL,
    'reason_code', 'tier_assignment',
    'feature_key', p_feature_key,
    'limit_value', v_tier_assignment.limit_value
  );

EXCEPTION WHEN OTHERS THEN
  -- Fail open with overlay on any error for non-critical features
  -- Log the error for debugging
  RAISE WARNING 'get_feature_gate error for % : %', p_feature_key, SQLERRM;
  RETURN jsonb_build_object(
    'allowed', FALSE,
    'gate_action', 'overlay',
    'reason_code', 'error',
    'feature_key', p_feature_key,
    'error', SQLERRM
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_organizations(check_user_id uuid)
 RETURNS TABLE(org_id uuid, org_name text, roles public.org_member_role[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT
    om.org_id,
    o.name AS org_name,
    ARRAY_AGG(DISTINCT om.role ORDER BY om.role) AS roles
  FROM organization_members om
  JOIN organizations o ON o.id = om.org_id
  WHERE om.user_id = check_user_id
  GROUP BY om.org_id, o.name
  ORDER BY o.name;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.users (id, email, phone)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone
  );
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_org_admin(org_id_param uuid, user_id_param uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
BEGIN
  RETURN user_is_org_admin(org_id_param, user_id_param);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_org_member(org_id_param uuid, user_id_param uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
BEGIN
  RETURN user_has_org_access(org_id_param, user_id_param);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_feature_flag_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  old_val JSONB;
  new_val JSONB;
  scope_type_val TEXT;
  scope_id_val TEXT;
  action_val TEXT;
BEGIN
  -- Determine action type
  IF TG_OP = 'INSERT' THEN
    action_val := 'create';
  ELSIF TG_OP = 'UPDATE' THEN
    action_val := 'update';
  ELSIF TG_OP = 'DELETE' THEN
    action_val := 'delete';
  END IF;
  
  -- Determine scope
  IF TG_TABLE_NAME = 'feature_flag_platform_defaults' THEN
    scope_type_val := 'platform';
    scope_id_val := NULL;
  ELSIF TG_TABLE_NAME = 'feature_flag_org_overrides' THEN
    scope_type_val := 'organization';
    scope_id_val := COALESCE(NEW.org_id::TEXT, OLD.org_id::TEXT);
  ELSIF TG_TABLE_NAME = 'feature_flag_user_overrides' THEN
    scope_type_val := 'user';
    scope_id_val := COALESCE(NEW.user_id::TEXT, OLD.user_id::TEXT);
  ELSIF TG_TABLE_NAME = 'feature_flags' THEN
    scope_type_val := 'flag';
    scope_id_val := NULL;
  END IF;
  
  -- Build old and new value JSONB
  IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
    old_val := jsonb_build_object(
      'value_boolean', OLD.value_boolean,
      'value_integer', OLD.value_integer,
      'value_double', OLD.value_double,
      'version', OLD.version
    );
  END IF;
  
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    new_val := jsonb_build_object(
      'value_boolean', NEW.value_boolean,
      'value_integer', NEW.value_integer,
      'value_double', NEW.value_double,
      'version', NEW.version
    );
  END IF;
  
  -- For feature_flags table, capture different fields
  IF TG_TABLE_NAME = 'feature_flags' THEN
    IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
      old_val := jsonb_build_object(
        'key', OLD.key,
        'value_type', OLD.value_type,
        'description', OLD.description,
        'environment', OLD.environment,
        'deleted_at', OLD.deleted_at,
        'version', OLD.version
      );
    END IF;
    
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
      new_val := jsonb_build_object(
        'key', NEW.key,
        'value_type', NEW.value_type,
        'description', NEW.description,
        'environment', NEW.environment,
        'deleted_at', NEW.deleted_at,
        'version', NEW.version
      );
    END IF;
  END IF;
  
  -- Insert audit log entry
  INSERT INTO feature_flag_audit_log (
    actor_id,
    action,
    feature_flag_id,
    scope_type,
    scope_id,
    old_value,
    new_value,
    environment
  ) VALUES (
    auth.uid(),
    action_val,
    COALESCE(NEW.id, OLD.id),
    scope_type_val,
    scope_id_val,
    old_val,
    new_val,
    COALESCE(NEW.environment, OLD.environment)
  );
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;


  create policy "Users can create families during signup"
  on "public"."families"
  as permissive
  for insert
  to public
with check (true);



  create policy "Admins can manage org users"
  on "public"."users"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'admin'::public.user_role) AND (u.org_id = users.org_id)))));



  create policy "Admins can view org users"
  on "public"."users"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'admin'::public.user_role) AND (u.org_id = users.org_id)))));



  create policy "Allow user signup insert"
  on "public"."users"
  as permissive
  for insert
  to public
with check ((auth.uid() = id));



  create policy "Coaches can view org users"
  on "public"."users"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'coach'::public.user_role) AND (u.org_id = users.org_id)))));



  create policy "Users can update own profile"
  on "public"."users"
  as permissive
  for update
  to public
using ((auth.uid() = id));



  create policy "Users can view own profile"
  on "public"."users"
  as permissive
  for select
  to public
using ((auth.uid() = id));



  create policy "video_tag_links_delete_policy"
  on "public"."video_tag_links"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM public.videos v
  WHERE ((v.id = video_tag_links.video_id) AND public.can_edit_video(v.id, auth.uid())))));



  create policy "video_tag_links_insert_policy"
  on "public"."video_tag_links"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.videos v
  WHERE ((v.id = video_tag_links.video_id) AND public.can_edit_video(v.id, auth.uid())))));



  create policy "video_tag_links_select_policy"
  on "public"."video_tag_links"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.videos v
  WHERE ((v.id = video_tag_links.video_id) AND (v.deleted_at IS NULL) AND public.can_view_video(v.id, auth.uid())))));



  create policy "videos_delete_policy"
  on "public"."videos"
  as permissive
  for delete
  to public
using (public.can_edit_video(id, auth.uid()));



  create policy "videos_service_role_policy"
  on "public"."videos"
  as permissive
  for all
  to public
using (((auth.jwt() ->> 'role'::text) = 'service_role'::text))
with check (((auth.jwt() ->> 'role'::text) = 'service_role'::text));



  create policy "galleries_insert_policy"
  on "public"."galleries"
  as permissive
  for insert
  to public
with check ((public.is_org_admin(org_id, auth.uid()) OR ((gallery_type = 'team'::public.gallery_type) AND (entity_id IS NOT NULL) AND public.is_coach_for_team(entity_id, auth.uid()))));



  create policy "galleries_select_policy"
  on "public"."galleries"
  as permissive
  for select
  to public
using (public.can_view_gallery(id, auth.uid()));



  create policy "gallery_albums_select_policy"
  on "public"."gallery_albums"
  as permissive
  for select
  to public
using (public.can_view_gallery(gallery_id, auth.uid()));



  create policy "gallery_downloads_insert_policy"
  on "public"."gallery_downloads"
  as permissive
  for insert
  to public
with check (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.gallery_photos gp
  WHERE ((gp.id = gallery_downloads.photo_id) AND public.can_view_gallery(gp.gallery_id, auth.uid()) AND (gp.status = 'approved'::public.photo_status))))));



  create policy "gallery_photo_tags_select_policy"
  on "public"."gallery_photo_tags"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.gallery_photos gp
  WHERE ((gp.id = gallery_photo_tags.photo_id) AND public.can_view_gallery(gp.gallery_id, auth.uid())))));



  create policy "gallery_photos_select_policy"
  on "public"."gallery_photos"
  as permissive
  for select
  to public
using ((public.can_view_gallery(gallery_id, auth.uid()) AND ((status = 'approved'::public.photo_status) OR (uploaded_by_user_id = auth.uid()) OR public.can_moderate_gallery(gallery_id, auth.uid()))));



  create policy "video_note_targets_select_policy"
  on "public"."video_note_targets"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.video_notes vn
  WHERE ((vn.id = video_note_targets.note_id) AND (vn.deleted_at IS NULL)))));



  create policy "video_notes_insert_policy"
  on "public"."video_notes"
  as permissive
  for insert
  to public
with check (((author_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM (public.videos v
     JOIN public.organization_members om ON ((om.org_id = v.org_id)))
  WHERE ((v.id = video_notes.video_id) AND (om.user_id = auth.uid()) AND (om.role = ANY (ARRAY['org_admin'::public.org_member_role, 'coach'::public.org_member_role])))))));



  create policy "video_notes_select_policy"
  on "public"."video_notes"
  as permissive
  for select
  to public
using (((deleted_at IS NULL) AND (EXISTS ( SELECT 1
   FROM public.videos v
  WHERE ((v.id = video_notes.video_id) AND (v.deleted_at IS NULL) AND public.can_view_video(v.id, auth.uid())))) AND ((author_id = auth.uid()) OR (scope = 'all'::public.video_note_scope) OR ((scope = 'coaches'::public.video_note_scope) AND (EXISTS ( SELECT 1
   FROM (public.videos v
     JOIN public.organization_members om ON ((om.org_id = v.org_id)))
  WHERE ((v.id = video_notes.video_id) AND (om.user_id = auth.uid()) AND (om.role = ANY (ARRAY['org_admin'::public.org_member_role, 'coach'::public.org_member_role])))))) OR ((scope = 'guardians'::public.video_note_scope) AND (EXISTS ( SELECT 1
   FROM (public.video_note_targets vnt
     JOIN public.athlete_guardians ag ON ((ag.athlete_id = vnt.athlete_id)))
  WHERE ((vnt.note_id = video_notes.id) AND (ag.user_id = auth.uid()) AND (ag.status = 'active'::public.athlete_guardian_status))))))));



  create policy "videos_insert_policy"
  on "public"."videos"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE ((om.org_id = om.org_id) AND (om.user_id = auth.uid()) AND (om.role = ANY (ARRAY['org_admin'::public.org_member_role, 'coach'::public.org_member_role]))))));



  create policy "videos_update_policy"
  on "public"."videos"
  as permissive
  for update
  to public
using (public.can_edit_video(id, auth.uid()))
with check (public.can_edit_video(id, auth.uid()));


CREATE TRIGGER update_children_updated_at BEFORE UPDATE ON public.children FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_log_feature_flag_changes BEFORE INSERT OR DELETE OR UPDATE ON public.feature_flags FOR EACH ROW EXECUTE FUNCTION public.log_feature_flag_change();

drop trigger if exists "protect_buckets_delete" on "storage"."buckets";

drop trigger if exists "protect_objects_delete" on "storage"."objects";


  create policy "Org admins can delete org files"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'organization-assets'::text) AND public.user_is_org_admin(( SELECT ( SELECT auth.uid() AS uid) AS uid), ((storage.foldername(name))[1])::uuid)));



  create policy "Org admins can manage sport icons"
  on "storage"."objects"
  as permissive
  for all
  to public
using (((bucket_id = 'organization-assets'::text) AND ((storage.foldername(name))[1] = 'sports'::text) AND (EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE ((om.user_id = ( SELECT auth.uid() AS uid)) AND (om.role = 'org_admin'::public.org_member_role) AND ((storage.foldername(objects.name))[2] = (om.org_id)::text))))))
with check (((bucket_id = 'organization-assets'::text) AND ((storage.foldername(name))[1] = 'sports'::text) AND (EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE ((om.user_id = ( SELECT auth.uid() AS uid)) AND (om.role = 'org_admin'::public.org_member_role) AND ((storage.foldername(objects.name))[2] = (om.org_id)::text))))));



  create policy "Org admins can update org files"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'organization-assets'::text) AND public.user_is_org_admin(( SELECT ( SELECT auth.uid() AS uid) AS uid), ((storage.foldername(name))[1])::uuid)));



  create policy "Org admins can upload org files"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'organization-assets'::text) AND public.user_is_org_admin(( SELECT ( SELECT auth.uid() AS uid) AS uid), ((storage.foldername(name))[1])::uuid)));



  create policy "Public can read sport icons"
  on "storage"."objects"
  as permissive
  for select
  to public
using (((bucket_id = 'organization-assets'::text) AND ((storage.foldername(name))[1] = 'sports'::text)));



  create policy "Tryout docs: parents can delete own objects"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'tryout-documents'::text) AND (EXISTS ( SELECT 1
   FROM ((public.tryout_registration_documents d
     JOIN public.tryout_registrations r ON ((r.id = d.registration_id)))
     JOIN public.users u ON ((u.id = ( SELECT auth.uid() AS uid))))
  WHERE ((d.storage_path = objects.name) AND (u.role = 'parent'::public.user_role) AND (u.family_id = r.family_id))))));



  create policy "Tryout docs: parents can read own objects"
  on "storage"."objects"
  as permissive
  for select
  to public
using (((bucket_id = 'tryout-documents'::text) AND (EXISTS ( SELECT 1
   FROM ((public.tryout_registration_documents d
     JOIN public.tryout_registrations r ON ((r.id = d.registration_id)))
     JOIN public.users u ON ((u.id = ( SELECT auth.uid() AS uid))))
  WHERE ((d.storage_path = objects.name) AND (u.role = 'parent'::public.user_role) AND (u.family_id = r.family_id))))));



  create policy "Tryout docs: parents can update own objects"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'tryout-documents'::text) AND (EXISTS ( SELECT 1
   FROM ((public.tryout_registration_documents d
     JOIN public.tryout_registrations r ON ((r.id = d.registration_id)))
     JOIN public.users u ON ((u.id = ( SELECT auth.uid() AS uid))))
  WHERE ((d.storage_path = objects.name) AND (u.role = 'parent'::public.user_role) AND (u.family_id = r.family_id))))));



  create policy "Tryout docs: parents can upload own objects"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'tryout-documents'::text) AND (EXISTS ( SELECT 1
   FROM ((public.tryout_registration_documents d
     JOIN public.tryout_registrations r ON ((r.id = d.registration_id)))
     JOIN public.users u ON ((u.id = ( SELECT auth.uid() AS uid))))
  WHERE ((d.storage_path = objects.name) AND (u.role = 'parent'::public.user_role) AND (u.family_id = r.family_id))))));



  create policy "Tryout docs: staff can read org objects"
  on "storage"."objects"
  as permissive
  for select
  to public
using (((bucket_id = 'tryout-documents'::text) AND (EXISTS ( SELECT 1
   FROM ((public.tryout_registration_documents d
     JOIN public.tryout_registrations r ON ((r.id = d.registration_id)))
     JOIN public.tryouts t ON ((t.id = r.tryout_id)))
  WHERE ((d.storage_path = objects.name) AND (public.user_has_org_access(( SELECT auth.uid() AS uid), t.org_id) OR (EXISTS ( SELECT 1
           FROM public.users u
          WHERE ((u.id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::public.user_role, 'coach'::public.user_role])) AND (u.org_id = t.org_id))))))))));


CREATE TRIGGER objects_delete_delete_prefix AFTER DELETE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();

CREATE TRIGGER objects_insert_create_prefix BEFORE INSERT ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.objects_insert_prefix_trigger();

CREATE TRIGGER objects_update_create_prefix BEFORE UPDATE ON storage.objects FOR EACH ROW WHEN (((new.name <> old.name) OR (new.bucket_id <> old.bucket_id))) EXECUTE FUNCTION storage.objects_update_prefix_trigger();

CREATE TRIGGER prefixes_create_hierarchy BEFORE INSERT ON storage.prefixes FOR EACH ROW WHEN ((pg_trigger_depth() < 1)) EXECUTE FUNCTION storage.prefixes_insert_trigger();

CREATE TRIGGER prefixes_delete_hierarchy AFTER DELETE ON storage.prefixes FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();


