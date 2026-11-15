import { useState } from 'react';
import { X } from 'lucide-react';
import { updateScheduledJob, type PublishMode, type ScheduledJob } from '../../lib/api';
import { defaultScheduleLocalValue, isFutureLocalDatetime, toDatetimeLocalValue } from '../../lib/datetime';
import JobMetaFields from '../../components/JobMetaFields';
import SimilarPostsCheck from '../../components/SimilarPostsCheck';
import PostPreview from '../../components/PostPreview';
import { CharCount } from './calendarUtils';

/** 予約の編集モーダル（カレンダーから分離。job ごとに key を付けて使う） */
export default function EditJobModal({
  job,
  onClose,
  onSaved,
}: {
  job: ScheduledJob;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [editDate, setEditDate] = useState(() => {
    const at = new Date(job.scheduledAt);
    return !Number.isNaN(at.getTime()) && at.getTime() > Date.now() ? toDatetimeLocalValue(at) : defaultScheduleLocalValue(2);
  });
  const [editMode, setEditMode] = useState<PublishMode>(job.publishMode);
  const [editTags, setEditTags] = useState<string[]>(job.tags ?? []);
  const [editTopic, setEditTopic] = useState(job.topic ?? '');
  const [editMedia, setEditMedia] = useState<string[]>(job.mediaUrls ?? []);
  const [editAi, setEditAi] = useState(job.aiGeneratedMedia === true);
  const [editContents, setEditContents] = useState<ScheduledJob['contents']>(() =>
    job.contents.map((c) => ({ ...c, carouselSlides: c.carouselSlides ? [...c.carouselSlides] : undefined })),
  );
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const handleSaveEdit = async () => {
    setEditError(null);
    if (!isFutureLocalDatetime(editDate)) {
      setEditError('過去の日時には予約できません。未来の日時を指定してください。');
      return;
    }
    if (editContents.some((c) => !c.content.trim())) {
      setEditError('本文が空のプラットフォームがあります');
      return;
    }
    setEditSaving(true);
    try {
      await updateScheduledJob(job.id, {
        scheduledAt: new Date(editDate).toISOString(),
        publishMode: editMode,
        contents: editContents,
        tags: editTags,
        topic: editTopic,
        mediaUrls: editMedia,
        aiGeneratedMedia: editAi,
      });
      onSaved();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : '更新に失敗しました');
    }
    setEditSaving(false);
  };

  return (
          <div
      className="buzz-modal-overlay"
      onClick={() => !editSaving && onClose()}
    >
      <div
        className="w-full max-w-lg max-h-[90dvh] overflow-y-auto border border-neutral-200 bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">予約を編集</h3>
          <button
            type="button"
            disabled={editSaving}
            onClick={onClose}
            className="p-1 text-neutral-600 hover:text-neutral-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <label className="mb-1 block text-xs text-neutral-600">投稿モード</label>
        <select
          value={editMode}
          onChange={(e) => setEditMode(e.target.value as PublishMode)}
          className="mb-4 w-full border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
        >
          <option value="notify">通知リマインダー</option>
          <option value="approval">承認後投稿</option>
          <option value="x_free">X API 自動投稿</option>
          <option value="meta">Meta 自動投稿</option>
          <option value="line">LINE ブロードキャスト</option>
          <option value="ayrshare">Ayrshare</option>
          <option value="gbp">Google Business Profile</option>
          <option value="auto">自動</option>
        </select>

        <label className="mb-1 block text-xs text-neutral-600">投稿日時</label>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {[
            { label: '今日 12時', hours: 0, at: 12 },
            { label: '今日 18時', hours: 0, at: 18 },
            { label: '明日 12時', hours: 24, at: 12 },
            { label: '明日 19時', hours: 24, at: 19 },
          ].map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                const d = new Date();
                d.setHours(d.getHours() + p.hours, 0, 0, 0);
                d.setHours(p.at, 0, 0, 0);
                if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
                setEditDate(toDatetimeLocalValue(d));
                setEditError(null);
              }}
              className="border border-neutral-200 px-2 py-1 text-[11px] hover:border-neutral-900"
            >
              {p.label}
            </button>
          ))}
        </div>
        <input
          type="datetime-local"
          value={editDate}
          min={toDatetimeLocalValue(new Date())}
          onChange={(e) => {
            setEditDate(e.target.value);
            setEditError(null);
          }}
          className="mb-4 w-full border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
        />

        <div className="mb-4 space-y-3">
          {editContents.map((item, idx) => (
            <label key={`${item.platform}-${idx}`} className="block">
              <span className="mb-1 flex items-center justify-between text-xs font-medium text-neutral-700">
                <span>{item.label}</span>
                <CharCount platform={item.platform} text={item.content} />
              </span>
              <textarea
                value={item.content}
                onChange={(e) => {
                  const next = [...editContents];
                  next[idx] = { ...next[idx], content: e.target.value };
                  setEditContents(next);
                }}
                rows={5}
                className="w-full resize-y border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
              />
              <details className="mt-1">
                <summary className="cursor-pointer text-xs text-neutral-500">見え方のプレビュー</summary>
                <div className="mt-1">
                  <PostPreview platform={item.platform as never} content={item.content} imageUrl={editMedia.find((u) => !/\.(mp4|mov|webm)(\?|$)/i.test(u))} label={item.label} />
                </div>
              </details>
            </label>
          ))}
        </div>

        <JobMetaFields
          tags={editTags}
          topic={editTopic}
          mediaUrls={editMedia}
          aiGeneratedMedia={editAi}
          onAiChange={setEditAi}
          onChange={(v) => {
            setEditTags(v.tags);
            setEditTopic(v.topic);
            setEditMedia(v.mediaUrls);
          }}
        />

        <SimilarPostsCheck
          text={editContents.map((c) => c.content).join('\n')}
          platform={editContents[0]?.platform}
          excludeId={job.id}
        />

        {editError && <p className="mb-3 text-sm text-red-700">{editError}</p>}

        <button
          type="button"
          disabled={editSaving || !isFutureLocalDatetime(editDate)}
          onClick={handleSaveEdit}
          className="buzz-btn-primary w-full disabled:opacity-70"
        >
          {editSaving ? '保存中...' : '変更を保存'}
        </button>
      </div>
    </div>
  );
}
