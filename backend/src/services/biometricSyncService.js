import fetch from "node-fetch";
import BiometricTransaction from "../models/biometricTransactionModel.js";
import SyncState from "../models/syncStateModel.js";
import SyncHistory from "../models/syncHistoryModel.js";
import attendanceProcessor from "./attendanceProcessor.js";

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// BioCloud sends VerifyTime as a naive "YYYY-MM-DDTHH:mm:ss" string with no timezone
// offset (e.g. "2026-07-28T19:10:40"). `new Date(...)` on a string like that is parsed
// as LOCAL time of whatever machine/process runs this code - NOT the device's actual
// timezone (UAE, +04:00). If the server's own system timezone isn't also +04:00, the
// resulting instant is silently wrong by the difference (e.g. a server on +02:00 turns
// a real 19:10 UAE punch into 17:10 once re-displayed via toISOString()/UTC). Anchor
// explicitly to +04:00 so the stored instant is correct no matter what timezone the
// server process happens to run in.
export const parseBioCloudTimestamp = (verifyTime) => {
  if (!verifyTime) return null;
  const hasOffset = /[Zz]$|[+-]\d{2}:?\d{2}$/.test(verifyTime);
  return new Date(hasOffset ? verifyTime : `${verifyTime}+04:00`);
};

class BiometricSyncService {
  constructor() {
    this.isSyncing = false;
    this.syncQueue = [];
  }

  /**
   * Orchestrates the complete sync job, guarding against concurrency
   * by queuing overlapping requests.
   * @param {string} syncType "SCHEDULED" or "MANUAL"
   * @param {string} startDate Optional YYYY-MM-DD
   * @param {string} endDate Optional YYYY-MM-DD
   * @param {string} userId Optional user ObjectId triggering the sync
   * @returns {Promise<Object>} The sync result stats
   */
  async executeSyncJob(syncType = "SCHEDULED", startDate = null, endDate = null, userId = null) {
    if (this.isSyncing) {
      console.log(`[BiometricSyncService] Sync is currently active. Enqueuing ${syncType} sync job.`);
      return new Promise((resolve, reject) => {
        this.syncQueue.push({ syncType, startDate, endDate, userId, resolve, reject });
      });
    }

    this.isSyncing = true;
    let result;
    try {
      result = await this._runSync(syncType, startDate, endDate, userId);
    } finally {
      this.isSyncing = false;
      this._processNextInQueue();
    }
    return result;
  }

  /**
   * Processes the next sync job in the queue
   */
  async _processNextInQueue() {
    if (this.syncQueue.length === 0) return;
    const next = this.syncQueue.shift();
    try {
      console.log(`[BiometricSyncService] Dequeuing and executing next sync job.`);
      const result = await this.executeSyncJob(next.syncType, next.startDate, next.endDate, next.userId);
      next.resolve(result);
    } catch (error) {
      next.reject(error);
    }
  }

  /**
   * Internal method containing the sync business logic
   */
  async _runSync(syncType, startDate, endDate, userId) {
    const startTime = new Date();
    console.log(`[BiometricSyncService] Started ${syncType} sync at ${startTime.toISOString()}`);

    // Create a pending SyncHistory record
    const history = await SyncHistory.create({
      syncType,
      startTime,
      status: "FAILED",
      triggeredBy: userId
    });

    let lastSyncedTransactionId = 0;
    try {
      // 1. Get the last successfully synced transaction ID
      const syncState = await SyncState.findOne({ key: "biocloud_sync" });
      if (syncState) {
        lastSyncedTransactionId = syncState.lastSyncedTransactionId;
      } else {
        await SyncState.create({ key: "biocloud_sync", lastSyncedTransactionId: 0 });
      }

      // 2. Determine date range (default to current day for scheduled runs to keep it fast and precise)
      const formatYYYYMMDD = (d) => {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
      };
      
      const todayStr = formatYYYYMMDD(new Date());
      const finalStartDate = `${startDate || todayStr} 00:00:00`;
      const finalEndDate = `${endDate || todayStr} 23:59:59`;

      console.log(`[BiometricSyncService] Sync window: "${finalStartDate}" to "${finalEndDate}" | Starting from Transaction ID: ${lastSyncedTransactionId}`);

      // 3. Fetch from BioCloud API with retry logic
      const apiResponse = await this._fetchFromApiWithRetries(lastSyncedTransactionId, finalStartDate, finalEndDate);
      
      console.log(`[BiometricSyncService] Raw API response parsed. Type: ${typeof apiResponse}, IsArray: ${Array.isArray(apiResponse)}`);

      let transactions = null;
      if (Array.isArray(apiResponse)) {
        transactions = apiResponse;
      } else if (apiResponse && Array.isArray(apiResponse.data)) {
        transactions = apiResponse.data;
      } else if (apiResponse && Array.isArray(apiResponse.message)) {
        transactions = apiResponse.message;
      } else if (apiResponse && Array.isArray(apiResponse.transactions)) {
        transactions = apiResponse.transactions;
      }

      if (!transactions || !Array.isArray(transactions)) {
        throw new Error(`Could not find transactions array in BioCloud API response. Response received: ${JSON.stringify(apiResponse)}`);
      }

      const transactionsFetched = transactions.length;
      console.log(`[BiometricSyncService] Extracted ${transactionsFetched} transactions from BioCloud API response.`);

      let transactionsStored = 0;
      let highestTransactionId = lastSyncedTransactionId;
      const newTransactions = [];

      // 4. Save new transactions to the database, skipping duplicates.
      // The `exists` check is not race-safe (BioCloud can return the same transaction across
      // overlapping scheduled/manual syncs), so a duplicate-key error on the unique
      // `transactionId` index is expected and treated as "already synced" rather than a
      // fatal error that aborts the whole sync with a 500.
      for (const txn of transactions) {
        if (!txn.Id) continue;

        // Track highest ID
        if (txn.Id > highestTransactionId) {
          highestTransactionId = txn.Id;
        }

        const exists = await BiometricTransaction.findOne({ transactionId: txn.Id });
        if (exists) continue;

        try {
          // Map API fields to database schema
          // API uses: VerifyTime, Status, DeviceSerialNumber
          const storedTxn = await BiometricTransaction.create({
            transactionId: txn.Id,
            badgeNumber: txn.BadgeNumber,
            timestamp: parseBioCloudTimestamp(txn.VerifyTime),
            transactionType: txn.Status === "Check-In" ? "IN" : "OUT",  // Map Status to IN/OUT
            deviceId: txn.DeviceSerialNumber || null,  // Changed from txn.DeviceId
            rawData: txn
          });

          newTransactions.push(storedTxn);
          transactionsStored++;
        } catch (createError) {
          if (createError.code === 11000) {
            console.log(`[BiometricSyncService] Transaction ${txn.Id} already stored by a concurrent sync - skipping.`);
            continue;
          }
          throw createError;
        }
      }

      console.log(`[BiometricSyncService] Stored ${transactionsStored} new unique transactions in database.`);

      // 5. Process new transactions to generate attendance records
      const processingStats = await attendanceProcessor.processTransactions(newTransactions);

      // 6. Update transaction processed state
      for (const newTxn of newTransactions) {
        newTxn.processed = true;
        newTxn.processedAt = new Date();
        await newTxn.save();
      }

      // 7. Update Sync State atomically
      await SyncState.findOneAndUpdate(
        { key: "biocloud_sync" },
        {
          lastSyncedTransactionId: highestTransactionId,
          lastSyncTimestamp: new Date(),
          lastSuccessfulSync: new Date(),
          consecutiveFailures: 0
        },
        { upsert: true, new: true }
      );

      // 8. Log successful history run
      const hasUnmapped = processingStats.unmappedBadges.size > 0;
      history.endTime = new Date();
      history.status = hasUnmapped ? "PARTIAL_SUCCESS" : "SUCCESS";
      history.transactionsFetched = transactionsFetched;
      history.transactionsStored = transactionsStored;
      history.recordsCreated = processingStats.created;
      history.recordsUpdated = processingStats.updated;
      history.recordsSkipped = processingStats.skipped;
      history.unmappedBadges = Array.from(processingStats.unmappedBadges);  // Convert Set to Array
      await history.save();

      console.log(`[BiometricSyncService] Completed ${syncType} sync job successfully in ${history.endTime - startTime}ms.`);
      return {
        success: true,
        transactionsFetched,
        transactionsStored,
        recordsCreated: processingStats.created,
        recordsUpdated: processingStats.updated,
        recordsSkipped: processingStats.skipped,
        unmappedBadges: Array.from(processingStats.unmappedBadges),  // Convert Set to Array
        duration: history.endTime - startTime
      };

    } catch (error) {
      console.error(`[BiometricSyncService] Sync job encountered an error:`, error);
      
      // Update SyncState failure counts
      await SyncState.findOneAndUpdate(
        { key: "biocloud_sync" },
        {
          $inc: { consecutiveFailures: 1 },
          lastSyncTimestamp: new Date()
        },
        { upsert: true }
      );

      // Update history with failure details
      history.endTime = new Date();
      history.status = "FAILED";
      history.errorMessage = error.message;
      history.errorStack = error.stack;
      await history.save();

      throw error;
    }
  }

  /**
   * Helper: Performs API fetch with exponential backoff retries and error handling
   */
  async _fetchFromApiWithRetries(idFrom, startDate, endDate) {
    const apiUrl = process.env.BIOCLOUD_API_URL || "https://15.biocloud.me:8205";
    const apiToken = process.env.BIOCLOUD_API_TOKEN || "d168b9ea529a4b44a8419e499fe16f3e";
    const maxRetries = parseInt(process.env.BIOCLOUD_RETRY_ATTEMPTS) || 3;
    const backoffDelays = [5000, 15000, 45000]; // 5s, 15s, 45s

    const fullUrl = `${apiUrl}/api_gettransctions`;
    console.log(`[BiometricSyncService] Requesting BioCloud API (POST): ${fullUrl}`);
    console.log(`[BiometricSyncService] Payload: StartDate="${startDate}", EndDate="${endDate}", IdFrom=${idFrom}`);

    const payload = {
      BadgeNumber: null,
      StartDate: startDate,
      EndDate: endDate,
      IdFrom: idFrom
    };

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        const response = await fetch(fullUrl, {
          method: "POST",
          headers: {
            "token": apiToken,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        // Handle Rate Limiting (429)
        if (response.status === 429) {
          console.warn(`[BiometricSyncService] HTTP 429: Rate limit exceeded. Waiting 60 seconds before retry (Attempt ${attempt})...`);
          await sleep(60000);
          continue;
        }

        // Handle Authentication Errors (401/403)
        if (response.status === 401 || response.status === 403) {
          throw new Error(`Authentication failed with BioCloud API (HTTP ${response.status}). Check credentials.`);
        }

        // Handle Server Errors (500/503)
        if (response.status >= 500) {
          throw new Error(`Server returned error status HTTP ${response.status}.`);
        }

        if (!response.ok) {
          throw new Error(`API returned HTTP status ${response.status}.`);
        }

        // Parse Response JSON
        let data;
        try {
          data = await response.json();
        } catch (parseError) {
          throw new Error(`Malformed JSON response from BioCloud API: ${parseError.message}`);
        }

        return data;

      } catch (error) {
        console.error(`[BiometricSyncService] Request attempt ${attempt} failed: ${error.message}`);
        
        // If it was an authentication error, do not retry
        if (error.message.includes("Authentication failed")) {
          throw error;
        }

        // If we have exhausted all attempts, throw error
        if (attempt > maxRetries) {
          throw new Error(`Failed to fetch biometric transactions after ${maxRetries} retries: ${error.message}`);
        }

        // Exponential backoff delay
        const delay = backoffDelays[attempt - 1] || 45000;
        console.log(`[BiometricSyncService] Retrying in ${delay / 1000} seconds...`);
        await sleep(delay);
      }
    }
  }
}

export default new BiometricSyncService();
