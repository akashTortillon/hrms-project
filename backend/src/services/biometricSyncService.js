import fetch from "node-fetch";
import BiometricTransaction from "../models/biometricTransactionModel.js";
import SyncState from "../models/syncStateModel.js";
import SyncHistory from "../models/syncHistoryModel.js";
import attendanceProcessor from "./attendanceProcessor.js";
import { uaeDateStr } from "../utils/attendanceUtils.js";

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// BioCloud's `Status` field isn't limited to the two literal strings "Check-In" /
// "Check-Out" - it also sends variants like "Overtime-In" for a late/after-hours punch.
// The previous mapping (`txn.Status === "Check-In" ? "IN" : "OUT"`) only recognized the
// exact "Check-In" literal, so "Overtime-In" (and anything else that isn't that one exact
// string, including a missing/undefined Status) silently fell through to "OUT" - turning
// a real check-in into a checkout with no check-in recorded, which then produces a
// checkIn:null / checkOut:<time> Attendance row and status "Absent" for someone who
// actually showed up. Match on "in"/"out" appearing anywhere in the (case-insensitive)
// status text instead of requiring an exact match, and log anything that matches neither
// so a genuinely new BioCloud status vocabulary word doesn't silently misclassify again.
export const classifyPunchDirection = (rawStatus, transactionId) => {
  const normalized = String(rawStatus || "").trim().toLowerCase();
  if (normalized.includes("in")) return "IN";
  if (normalized.includes("out")) return "OUT";
  console.warn(`[BiometricSyncService] Unrecognized punch Status "${rawStatus}" (transaction ${transactionId}) - defaulting to OUT. Update classifyPunchDirection if BioCloud added a new status word.`);
  return "OUT";
};

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

// Works out the date window for a sync run. Dates are UAE calendar dates (BioCloud filters by the
// device's local date), never the server's own (UTC) date.
//   - Explicit startDate/endDate (API call, sweep or script): used as given, from IdFrom 0, and
//     attendance is rebuilt for every punch in the window.
//   - A MANUAL sync with no dates (the UI "Sync" button): starts at BIOCLOUD_SYNC_START_DATE
//     (YYYY-MM-DD) when that is set and not in the future (same rebuild), so the button can pull
//     history from a chosen date instead of only recent days.
//   - Anything else (the 10-minute scheduler, or Sync with nothing configured): yesterday + today,
//     from IdFrom 0. The saved Id cursor is not used as a floor: a device that uploads late gets
//     Ids below it and would be skipped until the next daily sweep. Stored punches are skipped by
//     their unique transactionId, so re-asking for two days is cheap.
// `ignoreCursor` = ask BioCloud from IdFrom 0. `rebuildAll` = also reprocess every punch BioCloud
// returned (not just new/unprocessed ones).
export const resolveSyncWindow = ({ syncType, startDate, endDate, configuredStart, todayStr, yesterdayStr }) => {
  const validConfigured = /^\d{4}-\d{2}-\d{2}$/.test(configuredStart || "") && configuredStart <= todayStr
    ? configuredStart
    : null;
  const effectiveStart = startDate || (syncType === "MANUAL" ? validConfigured : null);
  const rebuildAll = !!startDate || (!!effectiveStart && effectiveStart < todayStr);
  return {
    startDate: effectiveStart || yesterdayStr || todayStr,
    endDate: endDate || todayStr,
    ignoreCursor: true,
    rebuildAll
  };
};

// How far back stored-but-unprocessed punches are retried each run (see step 5).
const RETRY_UNPROCESSED_DAYS = parseInt(process.env.BIOCLOUD_RETRY_UNPROCESSED_DAYS) || 3;

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

      // 2. Determine date range (UAE dates - see resolveSyncWindow)
      const todayStr = uaeDateStr(new Date());
      const yesterdayStr = uaeDateStr(new Date(Date.now() - 24 * 60 * 60 * 1000));
      const syncWindow = resolveSyncWindow({
        syncType,
        startDate,
        endDate,
        configuredStart: process.env.BIOCLOUD_SYNC_START_DATE,
        todayStr,
        yesterdayStr
      });
      const finalStartDate = `${syncWindow.startDate} 00:00:00`;
      const finalEndDate = `${syncWindow.endDate} 23:59:59`;

      // BioCloud ANDs the IdFrom cursor with the StartDate/EndDate window - it does not
      // treat an explicit date range as overriding the ID floor, so a backfill with the live
      // cursor as IdFrom silently returns nothing. And a device that uploads late gets Ids BELOW
      // the cursor, so using it as a floor skips those punches until the daily sweep. Every run
      // therefore asks from IdFrom 0 over a short date window instead (duplicates are dropped
      // below via the unique transactionId); the cursor is still saved for reference.
      const idFrom = syncWindow.ignoreCursor ? 0 : lastSyncedTransactionId;

      console.log(`[BiometricSyncService] Sync window: "${finalStartDate}" to "${finalEndDate}" | IdFrom: ${idFrom}${syncWindow.ignoreCursor ? " (ignoring live cursor)" : ""}${syncWindow.rebuildAll ? " | rebuilding all punches" : ""}`);

      // 3. Fetch from BioCloud API with retry logic
      const apiResponse = await this._fetchFromApiWithRetries(idFrom, finalStartDate, finalEndDate);
      
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
      const fetchedIds = transactions.filter((t) => t.Id).map((t) => t.Id);
      const alreadyStored = new Set(
        (await BiometricTransaction.find({ transactionId: { $in: fetchedIds } }).select("transactionId").lean())
          .map((t) => t.transactionId)
      );

      for (const txn of transactions) {
        if (!txn.Id) continue;

        // Track highest ID
        if (txn.Id > highestTransactionId) {
          highestTransactionId = txn.Id;
        }

        if (alreadyStored.has(txn.Id)) continue;

        try {
          // Map API fields to database schema
          // API uses: VerifyTime, Status, DeviceSerialNumber, EmployeeName, VerifyType, StatusId
          const storedTxn = await BiometricTransaction.create({
            transactionId: txn.Id,
            badgeNumber: txn.BadgeNumber,
            timestamp: parseBioCloudTimestamp(txn.VerifyTime),
            transactionType: classifyPunchDirection(txn.Status, txn.Id),
            deviceId: txn.DeviceSerialNumber || null,  // Changed from txn.DeviceId
            employeeName: txn.EmployeeName || null,
            verifyType: txn.VerifyType || null,
            statusId: txn.StatusId ?? null,
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

      // 5. Generate attendance records. A normal run processes the punches that are new PLUS any
      // stored punch from the last few days that was never processed - one whose employee did not
      // exist yet when it arrived (e.g. employees imported after the device already uploaded
      // punches) would otherwise stay without attendance until someone clicked Sync. A
      // historical/manual window must cover EVERY punch BioCloud returned, including ones already
      // stored - otherwise attendance that was cleared or never built is never rebuilt and the
      // sync reports 0 created. The processor is idempotent: unchanged rows are skipped, manual
      // edits are kept.
      let toProcess;
      if (syncWindow.rebuildAll) {
        toProcess = await BiometricTransaction.find({ transactionId: { $in: fetchedIds } });
      } else {
        const retryFrom = new Date(Date.now() - RETRY_UNPROCESSED_DAYS * 24 * 60 * 60 * 1000);
        const leftovers = await BiometricTransaction.find({ processed: false, timestamp: { $gte: retryFrom } });
        const byId = new Map(leftovers.map((t) => [String(t._id), t]));
        for (const t of newTransactions) byId.set(String(t._id), t);
        toProcess = [...byId.values()];
      }
      const processingStats = await attendanceProcessor.processTransactions(toProcess);
      const unmappedBadges = Array.from(processingStats.unmappedBadges || []);

      // 6. Mark punches processed - but not those of a badge with no employee yet, so they are
      // retried once the employee exists.
      const unmapped = new Set(unmappedBadges);
      const doneIds = toProcess.filter((t) => !unmapped.has((t.badgeNumber || "").trim())).map((t) => t._id);
      if (doneIds.length) {
        await BiometricTransaction.updateMany(
          { _id: { $in: doneIds }, processed: { $ne: true } },
          { $set: { processed: true, processedAt: new Date() } }
        );
      }

      // Shifts that ended without a check-out are only noticed when something re-processes them;
      // do it every run so "Incomplete" shows up right after the shift window closes.
      const finalized = await attendanceProcessor.finalizeOpenShifts();
      if (finalized) console.log(`[BiometricSyncService] Marked ${finalized} ended shift(s) without a check-out as Incomplete.`);

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
      const hasUnmapped = unmappedBadges.length > 0;
      history.endTime = new Date();
      history.status = hasUnmapped ? "PARTIAL_SUCCESS" : "SUCCESS";
      history.transactionsFetched = transactionsFetched;
      history.transactionsStored = transactionsStored;
      history.recordsCreated = processingStats.created;
      history.recordsUpdated = processingStats.updated;
      history.recordsSkipped = processingStats.skipped;
      history.unmappedBadges = unmappedBadges;
      await history.save();

      console.log(`[BiometricSyncService] Completed ${syncType} sync job successfully in ${history.endTime - startTime}ms.`);
      return {
        success: true,
        transactionsFetched,
        transactionsStored,
        recordsCreated: processingStats.created,
        recordsUpdated: processingStats.updated,
        recordsSkipped: processingStats.skipped,
        unmappedBadges,
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
    const apiUrl = process.env.BIOCLOUD_API_URL;
    const apiToken = process.env.BIOCLOUD_API_TOKEN;
    if (!apiUrl || !apiToken) {
      throw new Error("BIOCLOUD_API_URL and BIOCLOUD_API_TOKEN must be set in the environment.");
    }
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