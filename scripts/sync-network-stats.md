# Daily copy of the network stats from Metricool to Supabase (shown on skroll.tv/stats)

Run by Claude (scheduled task "skroll-stats-reseaux", every morning). Brand: Metricool blogId 7137520, Supabase project riotdlbdywxuouvdgqpt.

1. Period: from 2026-11-01T00:00:00+01:00 to now (Europe/Paris).
2. Per-post metrics with `getAnalyticsDataByMetrics`:
   - Instagram reels: IGRE02 (date+time), IGRE06 (url), IGRE23 views, IGRE11 reach, IGRE10 likes, IGRE07 comments, IGRE21 shares, IGRE12 saves, IGRE25 total watch time (s)
   - Facebook reels: FBRE02, FBRE06 (url), FBRE10 views, FBRE11 reach, FBRE08 likes, FBRE12 total time watched (s)
   - TikTok: TKPO02, TKPO03 (url), TKPO07 views, TKPO11 reach, TKPO08 likes, TKPO09 comments, TKPO10 shares, TKPO14 total time watched (s, often empty)
   - YouTube: YTVV01 date, YTVV05 (url), YTVV06 views (all videos connector; YTVP* = published in range)
3. Followers (aggregation LAST, one value per day): IGEV01, FBEV17, TKEV07, YTEV01.
4. Episode of each post: call `getScheduledPosts` (brandId 7137520, timezone Europe/Paris) over the publication days; each post lists, per network, `providers[].publicUrl` / `id` and its title (`facebookData.title` / `youtubeData.title` = "SKROLL #NN" = `broadcast_schedule.title`). Match the analytics url to that publicUrl/id → `broadcast_schedule` short row with that title → `pad_ids[0]`. Never guess by time or publication order (reels go out a minute apart). Report any provider with `status: ERROR` (e.g. TikTok 503/504) to the team.
5. Upsert into `network_posts` (network, url, published_at, pad_id, views, reach, likes, comments, shares, saves, watch_seconds, updated_at = now()) and `network_followers` (day, network, followers). Never delete rows.
6. Instagram stories (the reel reposted the next day; most reels are short enough to be seen whole there, so the team counts them as episode views): IGST02 (date+time), IGST06 (permalink), IGST17 impressions total → `views`, IGST15 total reach → `reach`, IGST11 replies → `comments`. Episode: in `getScheduledPosts` the story's `providers[].publicUrl` (instagram.com/stories/skroll_tv/…) and its Metricool `id`; the `broadcast_schedule` row with format 'story' whose `metricool_status` contains that id → `pad_ids[0]` (fallback: its `parent_id` row). Upsert into `network_posts` with network = 'instagram_story', url = permalink. If Metricool returns no story rows, say so in the summary (as of 2026-11-04 the stories connector came back empty).

YouTube watch time is not given by Metricool (YTVP07 stays empty): the team sends a YouTube Studio screenshot, typed into `network_watch_totals` (network 'youtube', views, watch_seconds, as_of). Keep existing values when Metricool returns null (coalesce).
