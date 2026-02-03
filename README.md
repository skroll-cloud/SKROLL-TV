# SKROLL.TV

Plateforme collaborative pour la gestion du projet Skroll.

## Installation locale (sur votre Mac)

1. **Télécharger le projet**
   - Téléchargez le fichier `skroll-tv.zip` que je vais vous donner
   - Décompressez-le sur votre Mac

2. **Ouvrir le Terminal**
   - Applications > Utilitaires > Terminal
   - Ou tapez "Terminal" dans Spotlight (Cmd+Espace)

3. **Aller dans le dossier**
   ```bash
   cd ~/Downloads/skroll-tv
   ```

4. **Installer les dépendances**
   ```bash
   npm install
   ```

5. **Lancer le site en local**
   ```bash
   npm run dev
   ```

6. **Ouvrir dans votre navigateur**
   - Allez sur : http://localhost:3000
   - Le site se met à jour automatiquement quand vous modifiez des fichiers

## Prochaines étapes

1. Créer un compte Vercel (gratuit)
2. Connecter le domaine skroll.tv
3. Activer Supabase pour la base de données

---

**Structure du projet :**
- `/app/page.tsx` - La page principale
- `/app/globals.css` - Les styles
- `/app/layout.tsx` - Le layout global