const Imap = require('imap');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const config = {
    user: 'myemail@myemail.com',
    password: 'mypassword',
    host: 'imap.mail.me.com',
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: true },
    connTimeout: 30000, // Connection timeout in ms
    authTimeout: 30000, // Auth timeout in ms
    keepalive: true 
};

const imap = new Imap(config);

// Configuration for batch deletion
const BATCH_SIZE = 50; // Reduced batch size for better reliability
const BATCH_DELAY = 180000; // 3 minutes between batches
const RECONNECT_DELAY = 60000;

// Function to verify the number of emails in the INBOX after deletion
// This function is used to verify that emails were deleted successfully
async function verifyDeletion() {
    return new Promise((resolve, reject) => {
        imap.openBox('INBOX', false, (err, box) => {
            if (err) {
                reject(err);
                return;
            }
            const currentCount = box.messages.total;
            console.log(`Current count: ${currentCount}`);
            resolve(currentCount);
        });
    });
}

function processEmails() {
    return new Promise((resolve, reject) => {
        
        imap.openBox('INBOX', false, async (err, box) => {
            if (err) {
                console.error('Error opening inbox:', err);
                reject(err);
                return;
            }

            let initialCount =  box.messages.total;
            console.log(`Initial messages in INBOX: ${initialCount}`);
            
            // Search for emails before January 1, 2022
            const searchCriteria = [['BEFORE', 'January 1, 2022']];

            imap.search(searchCriteria, (err, results) => {
                if (err) {
                    console.error('Error searching emails:', err);
                    reject(err);
                    return;
                }

                if (!results || results.length === 0) {
                    console.log('No emails found matching the criteria');
                    resolve([]);
                    return;
                }

                console.log(`Found ${results.length} emails to process`);

                rl.question('Do you want to delete these emails? (yes/no): ', async (answer) => {
                    if (answer.toLowerCase() !== 'yes') {
                        console.log('Operation cancelled by user');
                        resolve([]);
                        return;
                    }

                    // Create batches of emails
                    const batches = [];
                    for (let i = 0; i < results.length; i += BATCH_SIZE) {
                        batches.push(results.slice(i, i + BATCH_SIZE));
                    }

                    console.log(`Will delete emails in ${batches.length} batches of up to ${BATCH_SIZE} emails each`);
                    console.log(`Batches will be processed with a ${BATCH_DELAY/60000} minute delay between each batch`);
                    
                    try {
                        await processBatches(batches, 0);
                        // Verify deletion after all batches complete
                        const finalCount = await verifyDeletion();
                        resolve(finalCount);
                    } catch (error) {
                        reject(error);
                    }
                });
            });
        });
    });
}

async function processBatches(batches, batchIndex) {
    if (batchIndex >= batches.length) {
        console.log('All batches processed successfully');
        return;
    }

    const batch = batches[batchIndex];
    console.log(`Processing batch ${batchIndex + 1}/${batches.length} with ${batch.length} emails`);

    try {
        // Add error checking
            await new Promise((resolve, reject) => {
                imap.addFlags(batch, '\\Deleted', (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve();
                });
            });

        // Expunge after each batch
        await new Promise((resolve, reject) => {
            imap.expunge((err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });

        console.log(`Batch ${batchIndex + 1}: Messages permanently deleted`);
        console.log(`Waiting ${BATCH_DELAY/60000} minutes before processing next batch...`);
        
        // Add verification after each batch
        await verifyDeletion();
        
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
        return processBatches(batches, batchIndex + 1);
    } catch (error) {
        console.error(`Error in batch ${batchIndex + 1}:`, error);
        await new Promise(resolve => setTimeout(resolve, RECONNECT_DELAY));
        await reconnectAndContinue(batches, batchIndex);
    }
}

async function reconnectAndContinue(batches, batchIndex) {
    console.log('Attempting to reconnect to iCloud Mail...');
    
    try {
        imap.end();
    } catch (e) {
        console.error('Error ending the current connection:', e);
    }
    
    return new Promise((resolve, reject) => {
        const newImap = new Imap(config);
        
        newImap.once('ready', () => {
            console.log('Successfully reconnected to iCloud Mail');
            imap = newImap;
            processEmails()
                .then(resolve)
                .catch(reject);
        });
        
        newImap.once('error', async (err) => {
            console.error('Error reconnecting to iCloud Mail:', err);
            await new Promise(resolve => setTimeout(resolve, RECONNECT_DELAY * 2));
            await reconnectAndContinue(batches, batchIndex);
        });
        
        newImap.connect();
    });
}

// Main execution
console.log('Connecting to iCloud Mail...');

imap.once('ready', async () => {
    console.log('Connected to iCloud Mail');
    try {
        const finalCount = await processEmails();
        console.log(`Email processing completed. Final count: ${finalCount}`);
        imap.end();
        rl.close();
    } catch (error) {
        console.error('Error during email processing:', error);
        imap.end();
        rl.close();
    }
});

imap.once('error', (err) => {
    console.error('IMAP connection error:', err);
    rl.close();
});

imap.once('end', () => {
    console.log('IMAP connection terminated');
});

imap.connect();