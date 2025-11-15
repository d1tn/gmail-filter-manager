# Gmail Filter Manager
Gmail Filter Manager is a Chrome extension that lets you visually manage Gmail filters. It enables faster, more intuitive creation and editing than Gmail’s standard UI.

## What is this tool?
- A GUI-based tool to create and manage complex Gmail filters from the extension’s screen
- Reorder filter priority via drag and drop
- Export configured filters as an XML file and import it into Gmail to apply changes  
  - Filters are **not sent to external servers**; they are **stored and synchronized via your Google account through the browser’s sync feature**.
- Save your configurations in the browser

## How to Use
### Create a new filter
1. Click the “＋” button in the left pane of the filter management screen.
2. Configure the following in the right pane:
   - Filter name (set a clear name)
   - Conditions (From, To, Subject, Includes, Excludes, etc.)
   - Actions (Skip Inbox, Mark as read, Apply label, etc.)
   - Use “Duplicate this action” to create another filter with the same actions.
3. Use “+ AND” to add multiple conditions.
4. Use “+ OR” to add another condition set.
5. Changes are saved automatically.

### Change filter priority
1. In the left pane, drag the “≡≡” handle shown on each filter item.
2. Move it to the desired position.
3. Changes are saved automatically.

### Export filters
1. Click “Save filters” in the left pane.
2. An XML file will be downloaded.

### Apply filters in Gmail
1. Prepare the exported XML file.
2. Open Gmail → Settings (⚙) → See all settings.
3. Select the “Filters and Blocked Addresses” tab.
4. Click “Import filters”.
5. Choose the exported XML file and click “Open file”.
6. Select the filters to apply and click “Create filters”.

### Import filters
1. Click “Load filters” in the left pane.
2. Select the XML file to import.
3. Choose whether to merge with existing filters or replace them all.

## Notes
- Filters are saved in the browser and may be **stored/synced via your Google account** using the browser’s sync feature (chrome.storage.sync).
- Data is **not sent to developer-operated external servers**.
- If you manage many complex conditions, export regularly and keep backups.

## Troubleshooting
- **Q: Filters cannot be imported correctly.**  
  **A:** Check that the XML format is valid. Only Gmail-compatible XML is supported.

- **Q: My filter changes are not saved.**  
  **A:** Your browser storage may have reached its limit. Remove unnecessary data or export filters as a backup.

- **Q: Buttons do not appear in Gmail.**  
  **A:** Try reloading the page and make sure the extension is enabled.

## Feedback & Contributions
Please report bugs and feature requests via GitHub Issues or the contact form.  
- GitHub Issues: https://github.com/d1tn/gmail-filter-manager/issues

# Changelog
#### 2025
- **11.01 v1.3.2**
  - Changed storage from local storage to Google account sync (chrome.storage.sync)
  - Updated store description and Terms accordingly
- **09.15 v1.3.1**
  - Added Spanish, Simplified Chinese, French, German, and Russian
- **06.05 v1.3.0**
  - Added “Duplicate this action” (useful when creating another filter with the same actions but different conditions)
- **06.04 v1.2.2**
  - Moved the bottom-left menu into the top-right menu button
- **05.15 v1.2.0**
  - Added English (en)
  - Fixed issues with delete controls
  - **05.17 v1.2.1**
    - Added a tagline to the app name
- **05.10 v1.1.0**
  - Moved the delete-action setting to “Advanced settings”
  - Added single-filter export (“Export this filter”)
  - **05.10 v1.1.1**
    - Fixed an import issue
    - Fixed a delete issue
    - Updated the contact form
- **05.07 v1.0.0** Initial release
