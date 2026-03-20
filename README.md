# 🐀 Le Rat de Wall Street

## 🎮 Concept du jeu

**Le Rat de Wall Street** est un jeu multijoueur en temps réel jouable
sur téléphone avec un écran commun projeté.\
Chaque joueur incarne un trader qui doit acheter et vendre au bon moment
pour devenir le plus riche avant la fin de la partie.

Le jeu est pensé pour être joué en groupe (4 à 50+ joueurs) lors d'une
présentation, en amphi ou en soirée.

------------------------------------------------------------------------

# 🕹️ Règles du jeu

## Objectif

Accumuler le plus d'argent possible avant la fin du temps imparti.

## Déroulement d'une partie

1.  Chaque joueur rejoint la partie depuis son téléphone (QR code ou
    lien).
2.  Tous commencent avec une somme initiale (ex : 10 000€).
3.  Une ou plusieurs actions évoluent en direct sur l'écran principal.
4.  Les joueurs peuvent acheter ou vendre à tout moment.
5.  Des événements peuvent influencer le marché.
6.  À la fin du temps, le joueur le plus riche gagne.

------------------------------------------------------------------------

## Actions possibles

Chaque joueur peut : - Acheter une action - Vendre une action - Observer
l'évolution du marché - Réagir aux événements

------------------------------------------------------------------------

## Éléments dynamiques

Selon les versions du jeu :

### Marché

-   Le prix évolue automatiquement
-   Influencé par des événements aléatoires
-   Possibilité de krachs ou hausses soudaines

### Événements (optionnels)

-   Breaking news
-   Fake news
-   Crises économiques
-   Opportunités d'investissement

### Rôles spéciaux (évolutions futures)

-   Insider : voit les infos avant les autres
-   Manipulateur : influence le marché
-   Journaliste : peut déclencher des news

------------------------------------------------------------------------

# 🖥️ Architecture technique

## Vue globale

Le jeu fonctionne avec une architecture client-serveur en temps réel.

Téléphones des joueurs + écran projeté commun\
→ connectés à un serveur central\
→ synchronisation en direct

------------------------------------------------------------------------

## Composants

### 1. Serveur (Node.js)

Cerveau du jeu.

Responsabilités : - Gérer les connexions joueurs - Stocker les données
(argent, actions, prix) - Mettre à jour le marché en temps réel -
Recevoir les actions buy/sell - Envoyer mises à jour à tous - Gérer les
événements - Calculer le classement

Technologies : - Node.js - Express - Socket.io (temps réel)

------------------------------------------------------------------------

### 2. Interface joueur (téléphone)

Page web accessible depuis navigateur.

Fonctions : - Rejoindre la partie - Voir argent et prix - Acheter /
vendre - Recevoir événements - Voir classement

Technologies : - HTML - CSS - JavaScript - Socket.io client

------------------------------------------------------------------------

### 3. Écran principal (projecteur)

Affichage commun pour tous les joueurs.

Contenu : - Graphique du marché en direct - Classement - Événements -
Timer de partie - Messages globaux

Technologies : - HTML - CSS - JavaScript - Chart.js - Socket.io

------------------------------------------------------------------------

# 🌐 Communication temps réel

Utilisation de WebSocket via Socket.io.

Permet : - Synchronisation instantanée - Actions joueurs en direct -
Mise à jour simultanée - Faible latence - Support de 50+ joueurs

------------------------------------------------------------------------

# 📈 Évolutions possibles

-   Plusieurs actions simultanées
-   Rôles secrets
-   Pouvoirs spéciaux
-   Sons et animations
-   Historique des parties
-   Mode tournoi
-   Déploiement serveur public

------------------------------------------------------------------------

# Pour lancer le jeu sur réseau local :

Pour lancer le jeu sur réseau local :

 - Ouvrir le dossier "code" dans powershell (drag and drop le dossier dans le terminal avec un cd)
 - Télécharger node.js pour la première fois (pas besoin si déjà installé) :
 '''
 npm init -y
 npm install express socket.io
 '''
 - Lancer le serveur :
 '''
 node server.js
 '''
 - Trouver l'ip de son ordinateur 
 '''ipconfig''' dans powershell
 Cherchez la ligne "Adresse IPv4 . . . . . . . . . . : 192.168.X.X" --> C'est votre ip

 - sur navigateur : mettre '''ip:port''' Normalement, le port de base est 3000


