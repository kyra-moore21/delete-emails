# iCloud Mail Email Deletion Script

This Node.js script connects to an iCloud Mail account via IMAP and allows batch deletion of emails before a specified date. It ensures safe and controlled deletion by implementing batch processing, user confirmation, and reconnection handling to mitigate connection issues.

## Features
- Connects to iCloud Mail via IMAP.
- Searches for emails before January 1, 2022.
- Confirms deletion with the user before proceeding.
- Deletes emails in controlled batches (default: 50 emails per batch).
- Implements a delay (default: 3 minutes) between batches to avoid server issues.
- Attempts to reconnect if the IMAP connection is lost.
- Verifies the number of emails remaining after each batch.

## Requirements
- Node.js (latest LTS recommended)
- `imap` package (`npm install imap`)
- `readline` package (included with Node.js)

## Installation
1. Clone this repository or download the script.
2. Install dependencies:
   ```sh
   npm install imap
   ```
3. Update the configuration in the script with your iCloud email credentials:
   ```js
   const config = {
       user: 'myemail@myemail.com',
       password: 'mypassword',
       host: 'imap.mail.me.com',
       port: 993,
       tls: true,
       tlsOptions: { rejectUnauthorized: true }
   };
   ```
   **Note:** For security reasons, do not hardcode your password. Consider using environment variables.

## Usage
1. Run the script:
   ```sh
   node script.js
   ```
2. The script will connect to iCloud Mail and search for emails before January 1, 2022.
3. It will prompt the user to confirm deletion:
   ```
   Found X emails to process
   Do you want to delete these emails? (yes/no):
   ```
4. If confirmed, emails will be deleted in batches with delays between them.
5. The script will verify the deletion after processing all batches.

## Configuration
Modify these constants in the script to adjust batch settings:
```js
const BATCH_SIZE = 50; // Number of emails per batch
const BATCH_DELAY = 180000; // 3-minute delay between batches (in ms)
const RECONNECT_DELAY = 60000; // 1-minute reconnect delay in case of failure
```

## Error Handling
- If the script encounters an error while deleting emails, it will attempt to reconnect and resume the process.
- If reconnection fails, it will retry with an increased delay.
- The script ensures that emails are only permanently deleted after marking them with the `\Deleted` flag and expunging them.

## Notes
- This script is designed specifically for iCloud Mail IMAP servers.
- Be cautious when running this script, as deleted emails cannot be recovered after expunging.
- Test with a small number of emails before using it on a large inbox.

## License
This script is provided as-is without any warranties. Use at your own risk.

