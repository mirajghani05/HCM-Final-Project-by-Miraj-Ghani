import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, RefreshCw, ScanFace, ShieldCheck } from 'lucide-react';
import API from '../services/api';
import { Badge, Button, Card, Skeleton } from './ui';
import FaceVerification from './FaceVerification';
import { formatDate, formatTime } from '../utils/format';

export default function FaceEnrollment() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await API.get('/face/status');
      setStatus(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load face enrollment status.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  return (
    <>
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <ScanFace className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Face verification</h3>
              <p className="text-[11px] text-muted">Secure camera attendance</p>
            </div>
          </div>
          {loading ? null : status?.enrolled ? (
            <Badge tone="emerald" dot>Enrolled</Badge>
          ) : (
            <Badge tone="amber" dot>Not enrolled</Badge>
          )}
        </div>

        {loading ? (
          <div className="mt-4 space-y-2">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
        ) : error ? (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-rose-50 px-3 py-2.5 text-[11px] text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
            {error}
            <Button size="sm" variant="ghost" icon={RefreshCw} onClick={loadStatus}>Retry</Button>
          </div>
        ) : (
          <>
            <p className="mt-3 text-xs leading-5 text-muted">
              {status?.enrolled
                ? 'Your face descriptor is enrolled. Camera check-in and check-out will compare against it.'
                : 'Enroll your face once to use camera check-in and check-out. Only the face descriptor is stored.'}
            </p>
            {status?.enrolled ? (
              <div className="mt-3 space-y-1.5 rounded-xl bg-slate-50 p-3 text-[11px] dark:bg-slate-950/40">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Enrolled {formatDate(status.enrolledAt)}
                </div>
                {status.lastVerifiedAt ? (
                  <p className="text-subtle">
                    Last verified {formatDate(status.lastVerifiedAt)} at {formatTime(status.lastVerifiedAt)}
                  </p>
                ) : (
                  <p className="text-subtle">No verified camera attendance yet.</p>
                )}
              </div>
            ) : null}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button size="sm" icon={ScanFace} onClick={() => setOpen(true)}>
                {status?.enrolled ? 'Re-enroll face' : 'Enroll face'}
              </Button>
              <span className="flex items-center gap-1.5 text-[10px] text-subtle">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                No photo is stored
              </span>
            </div>
          </>
        )}
      </Card>

      <FaceVerification
        open={open}
        mode="enroll"
        onClose={() => setOpen(false)}
        onSuccess={loadStatus}
      />
    </>
  );
}
