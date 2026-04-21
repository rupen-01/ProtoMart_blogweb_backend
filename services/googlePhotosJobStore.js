const crypto = require("crypto");

const ACTIVE_STATUSES = new Set(["pending", "processing"]);
const TERMINAL_STATUSES = new Set(["completed", "failed"]);
const JOB_TTL_MS = 1000 * 60 * 60 * 6;

class GooglePhotosJobStore {
  constructor() {
    this.jobs = new Map();
    this.activeJobsByUser = new Map();

    const cleanupTimer = setInterval(() => {
      this.cleanupExpiredJobs();
    }, 1000 * 60 * 10);

    cleanupTimer.unref?.();
  }

  createJob({ userId, shareLink }) {
    const existingJob = this.getActiveJobForUser(userId);
    if (existingJob) {
      return { job: existingJob, reused: true };
    }

    const jobId = crypto.randomUUID();
    const job = {
      jobId,
      userId: userId.toString(),
      shareLink,
      status: "pending",
      progress: 0,
      totalImages: 0,
      processedImages: 0,
      error: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      results: {
        total: 0,
        uploaded: 0,
        skipped: 0,
        failed: 0,
        errors: [],
      },
    };

    this.jobs.set(jobId, job);
    this.activeJobsByUser.set(job.userId, jobId);

    return { job, reused: false };
  }

  getJob(jobId) {
    return this.jobs.get(jobId) || null;
  }

  getActiveJobForUser(userId) {
    const activeJobId = this.activeJobsByUser.get(userId.toString());
    if (!activeJobId) {
      return null;
    }

    const job = this.jobs.get(activeJobId);
    if (!job) {
      this.activeJobsByUser.delete(userId.toString());
      return null;
    }

    if (!ACTIVE_STATUSES.has(job.status)) {
      this.activeJobsByUser.delete(userId.toString());
      return null;
    }

    return job;
  }

  updateJob(jobId, updates) {
    const job = this.jobs.get(jobId);
    if (!job) {
      return null;
    }

    const nextUpdates =
      typeof updates === "function" ? updates({ ...job }) : updates;

    const mergedJob = {
      ...job,
      ...nextUpdates,
      results: {
        ...job.results,
        ...(nextUpdates?.results || {}),
      },
      updatedAt: new Date().toISOString(),
    };

    this.jobs.set(jobId, mergedJob);

    if (TERMINAL_STATUSES.has(mergedJob.status)) {
      const activeJobId = this.activeJobsByUser.get(mergedJob.userId);
      if (activeJobId === jobId) {
        this.activeJobsByUser.delete(mergedJob.userId);
      }
    }

    return mergedJob;
  }

  markFailed(jobId, error) {
    return this.updateJob(jobId, {
      status: "failed",
      progress: 100,
      error: error || "Unknown sync error",
    });
  }

  markCompleted(jobId, results) {
    return this.updateJob(jobId, {
      status: "completed",
      progress: 100,
      processedImages: results.total,
      totalImages: results.total,
      error: null,
      results,
    });
  }

  cleanupExpiredJobs() {
    const now = Date.now();

    for (const [jobId, job] of this.jobs.entries()) {
      if (!TERMINAL_STATUSES.has(job.status)) {
        continue;
      }

      const jobAgeMs = now - new Date(job.updatedAt).getTime();
      if (jobAgeMs > JOB_TTL_MS) {
        this.jobs.delete(jobId);
      }
    }
  }
}

module.exports = new GooglePhotosJobStore();
