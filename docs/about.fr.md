# Gmail Filter Manager
Gmail Filter Manager est une extension Chrome qui permet de gérer visuellement les filtres Gmail. Elle rend la création et la modification de filtres plus intuitives que l’interface standard de Gmail.

## Qu’est-ce que cet outil ?
- Un outil graphique pour créer et gérer des filtres Gmail complexes
- Réorganisation de la priorité des filtres par glisser-déposer
- Exportation des filtres configurés en fichier XML, importable dans Gmail  
  - Les filtres **ne sont pas envoyés à des serveurs externes** ; ils sont **stockés et synchronisés via votre compte Google grâce à la fonction de synchronisation du navigateur**
- Les paramètres sont enregistrés dans le navigateur

## Utilisation
### Créer un nouveau filtre
1. Cliquez sur le bouton “＋” dans le panneau gauche
2. Configurez dans le panneau droit :
   - Nom du filtre (nom explicite)
   - Conditions (De, À, Objet, Contient, Ne contient pas, etc.)
   - Actions (Ignorer la boîte de réception, Marquer comme lu, Ajouter un libellé, etc.)
   - Utilisez “Dupliquer cette action” pour créer un filtre identique
3. Cliquez sur “+ AND” pour ajouter plusieurs conditions
4. Cliquez sur “+ OR” pour ajouter un autre ensemble de conditions
5. Les modifications sont enregistrées automatiquement

### Modifier la priorité des filtres
1. Faites glisser le symbole “≡≡” d’un filtre dans le panneau gauche
2. Déplacez-le à la position souhaitée
3. Les changements sont enregistrés automatiquement

### Exporter des filtres
1. Cliquez sur “Enregistrer les filtres”
2. Un fichier XML sera téléchargé

### Appliquer les filtres dans Gmail
1. Préparez le fichier XML exporté
2. Ouvrez Gmail → Paramètres (⚙) → Voir tous les paramètres
3. Onglet “Filtres et adresses bloquées”
4. Cliquez sur “Importer les filtres”
5. Choisissez le fichier XML et cliquez sur “Ouvrir”
6. Sélectionnez les filtres et cliquez sur “Créer des filtres”

### Importer des filtres
1. Cliquez sur “Charger les filtres”
2. Sélectionnez le fichier XML
3. Choisissez de fusionner ou de remplacer les filtres existants

## Remarques
- Les filtres sont enregistrés dans le navigateur et peuvent **être synchronisés avec votre compte Google**
- Les données **ne sont pas envoyées à des serveurs externes**
- Pour les filtres complexes, exportez-les régulièrement pour éviter toute perte

## Dépannage
- **Q : L’importation échoue.**  
  **R :** Vérifiez que le fichier XML est conforme au format Gmail.

- **Q : Les filtres ne sont pas enregistrés.**  
  **R :** Le stockage du navigateur est peut-être plein. Supprimez des données ou exportez les filtres.

- **Q : Les boutons n’apparaissent pas dans Gmail.**  
  **R :** Rechargez la page et vérifiez que l’extension est activée.

## Retour et contributions
Signalez les bogues ou proposez des améliorations via GitHub Issues ou le formulaire de contact.  
- GitHub Issues : https://github.com/d1tn/gmail-filter-manager/issues