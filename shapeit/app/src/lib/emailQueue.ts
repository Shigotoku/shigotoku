export interface EmailJob {
  id: string;
  createdAt: string;
  event: string;
  subject: string;
}

const KEY = "shapeit:email-jobs:v1";

export function listEmailJobs(): EmailJob[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as EmailJob[];
  } catch {
    return [];
  }
}
