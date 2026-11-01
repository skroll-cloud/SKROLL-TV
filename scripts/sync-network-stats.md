# Daily copy of the network stats from Metricool to Supabase (shown on skroll.tv/stats)

Run by Claude (scheduled task "skroll-stats-reseaux", every morning). Brand: Metricool blogId 7137520, Supabase project riotdlbdywxuouvdgqpt.

1. Period: from 2026-11-01T00:00:00+01:00 to now (Europe/Paris).
2. Per-post metrics with `getAnalyticsDataByMetrics`:
   - Instagram reels: IGRE02 (date+time), IGRE06 (url), IGRE23 views, IGRE11 reach, IGRE10 likes, IGRE07 comments, IGRE21 shares, IGRE12 saves
   - Facebook reels: FBRE02, FBRE06 (url), FBRE10 views, FBRE11 reach, FBRE08 likes
   - TikTok: TKPO02, TKPO03 (url), TKPO07 views, TKPO11 reach, TKPO08 likes, TKPO09 comments, TKPO10 shares
   - YouTube: YTVV01 date, YTVV05 (url), YTVV06 views (all videos connector; YTVP* = published in range)
3. Followers (aggregation LAST, one value per day): IGEV01, FBEV17, TKEV07, YTEV01.
4. Episode of each post: the `broadcast_schedule` row with format 'short' whose day + post_time (Paris) is within 3 minutes of the publication time → `pad_ids[0]`.
5. Upsert into `network_posts` (network, url, published_at, pad_id, views, reach, likes, comments, shares, saves, updated_at = now()) and `network_followers` (day, network, followers). Never delete rows.
6. Stories are not copied (IG stories expire; their numbers live in Metricool).
