# Mise en ligne des publications demandées (planning → Metricool)

Instructions de la tâche programmée « skroll-mise-en-ligne » (toutes les 30 min, 8 h–23 h, sur le Mac de Bertrand avec l'app Claude ouverte).
L'équipe place un épisode sur la grille (/diffusion) et clique « Mettre en ligne via Claude » : la ligne de `broadcast_schedule` reçoit `publish_requested_at` / `publish_requested_by`.
Accord de Bertrand (10/11/2026) : ces demandes valent autorisation de publier. Ne rien publier d'autre.

Outils : Supabase (projet riotdlbdywxuouvdgqpt, execute_sql), Metricool (blogId 7137520, Europe/Paris).

1. `insert into agent_status (id, last_run, message) values ('metricool', now(), 'passage en cours') on conflict (id) do update set last_run = now(), message = 'passage en cours';`
2. Demandes :
   ```sql
   select b.id, b.day, b.post_time, b.format, b.networks, b.caption, b.final_url, b.pad_ids, b.publish_requested_by, p.number, p.title, p.vertical_url, p.tags
   from broadcast_schedule b left join pad_videos p on p.id = b.pad_ids[1]
   where b.publish_requested_at is not null and b.metricool_status is null order by b.day, b.post_time;
   ```
   Aucune → message « rien à envoyer », fin.
3. Pour chaque demande :
   - format 'short' seulement (sinon publish_error « format pas encore géré par Claude, à faire à la main ») ; vidéo = final_url sinon vertical_url (sinon publish_error « pas de version 9:16 : déposez-la sur la page Épisodes ») ; number non null.
   - Anti-doublon : getScheduledPosts sur la journée ; si un post a déjà le titre « SKROLL #NN » (facebookData/youtubeData), écrire `metricool_status = 'programmé <id>'`, effacer la demande, ne rien créer.
   - Date : day + post_time (Paris, défaut 18:00) ; si passée ou dans moins de 5 min → maintenant + 10 min.
   - **Depuis le 27/11 (essai Bertrand)** : titre = « SKROLL #NN – <Titre> » partout (FB, TK, YT, norme décidée le 27/11) ; la légende commence par ce même titre ; les `p.tags` de l'épisode s'ajoutent aux hashtags standards (sans accents ni espaces) et aux tags YouTube (tels quels).
   - **Facebook à part** : un 2e post Metricool, Facebook seul, `facebookData.type = POST`, vidéo = `p.file_url` (4:3, 1440×1080), même texte et titre, même heure. Le post principal ne contient alors que instagram/tiktok/youtube. `metricool_status = 'programmé <id> + <id FB>'`.
   - createScheduledPost : providers = b.networks (instagram, facebook, tiktok, youtube), media = [url 9:16], texte = b.caption (sinon la légende standard), toujours avec #cinemathequedebretagne ;
     instagramData REEL, showReelOnFeed, isAiGenerated false, collaborateurs bassetbertrand, sebcassen, p.e__________________________ (p.e + 26 tirets bas), stankfilms, cinematheque_de_bretagne ;
     facebookData REEL titre « SKROLL #NN » ; tiktokData PUBLIC_TO_EVERYONE titre « SKROLL #NN » ;
     youtubeData short public, titre « SKROLL #NN », tags [skroll, bretagne, archives, film amateur, humour, parodie, cinémathèque de bretagne], COMEDY, madeForKids false.
   - Succès : `metricool_status = 'programmé <id>', publish_requested_at = null, publish_error = null`. Échec : `publish_error = '<message court>'` (garder la demande).
3 bis. **Mises à jour** (depuis le 27/11) : une publication déjà programmée reste modifiable sur le planning (titre, texte, mots-clés de l'épisode) jusqu'à son heure ; chaque modification remet `publish_requested_at`.
   ```sql
   select b.id, b.day, b.post_time, b.title, b.caption, b.metricool_status, p.number, p.title as ptitle, p.tags, p.file_url, p.vertical_url, b.final_url
   from broadcast_schedule b left join pad_videos p on p.id = b.pad_ids[1]
   where b.publish_requested_at is not null and b.metricool_status like 'programmé %'
     and (b.day + coalesce(b.post_time, '18:00')::time) > (now() at time zone 'Europe/Paris') order by b.day;
   ```
   Pour chacune : retrouver ses posts Metricool (ids dans metricool_status ; sinon getScheduledPosts du jour, même titre « SKROLL #NN »), puis updateScheduledPost en gardant tout le reste (médias, réseaux, heure, collaborateurs) et en remplaçant seulement titre (FB/TK/YT), texte et tags YouTube recalculés comme ci-dessus. Écrire les nouveaux ids dans metricool_status, effacer publish_requested_at. Ne jamais passer un post en brouillon ni le supprimer.
4. agent_status.message = « X publication(s) programmée(s) » (+ erreurs), last_run = now().

Règles : ne jamais supprimer de post Metricool ni de ligne du planning, ne toucher aux posts déjà programmés que pour reporter une modification demandée depuis le planning (3 bis), jamais de story (faites à la main).
