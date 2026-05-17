import { useRef, useState, useCallback } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../../firebase';
import { cn } from '@/src/lib/utils';

/**
 * 본문 콘텐츠 포맷: 일반 텍스트 + 마크다운 이미지 문법 `![](url)`이 혼합된 단일 문자열.
 * 원하는 위치에 이미지를 끼워 넣기 위해 textarea 커서 위치에 `![](url)` 토큰을 삽입한다.
 */

const IMAGE_TOKEN = /!\[[^\]]*\]\(([^)]+)\)/g;

/** 콘텐츠 내 이미지 URL을 모두 추출 (삭제 시 storage 정리용 등) */
export function extractImageUrls(content: string): string[] {
  const urls: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(IMAGE_TOKEN);
  while ((m = re.exec(content)) !== null) urls.push(m[1]);
  return urls;
}

interface RichContentEditorProps {
  value: string;
  onChange: (next: string) => void;
  /** Storage 업로드 경로 prefix. 예: `board/{uid}` 또는 `events` */
  storagePathPrefix: string;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
}

/**
 * 텍스트 + 이미지 혼합 작성 에디터. 이미지 버튼 클릭 → 파일 선택 →
 * Firebase Storage 업로드 → 현재 커서 위치에 `![](url)` 마크다운 삽입.
 */
export function RichContentEditor({
  value, onChange, storagePathPrefix, placeholder, rows = 12, disabled,
}: RichContentEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const insertAtCursor = useCallback((token: string) => {
    const el = textareaRef.current;
    if (!el) {
      onChange(value + token);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = value.slice(0, start) + token + value.slice(end);
    onChange(next);
    // 다음 틱에 커서를 삽입된 토큰 뒤로 이동
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  }, [value, onChange]);

  const handleFile = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setUploadError('이미지 파일만 업로드할 수 있습니다.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('5MB 이하 이미지만 업로드할 수 있습니다.');
      return;
    }
    setUploadError(null);
    setUploading(true);
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const path = `${storagePathPrefix.replace(/\/$/, '')}/${filename}`;
      const sref = storageRef(storage, path);
      await uploadBytes(sref, file, { contentType: file.type });
      const url = await getDownloadURL(sref);
      const token = `\n\n![](${url})\n\n`;
      insertAtCursor(token);
    } catch (err: any) {
      console.error('이미지 업로드 실패:', err);
      setUploadError(err?.message || '이미지 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        disabled={disabled || uploading}
        className="w-full rounded-xl border border-slate-200 p-4 text-sm leading-relaxed outline-none focus:border-blue-500 resize-y disabled:bg-slate-50"
      />

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors',
            uploading
              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
              : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:text-blue-700'
          )}
        >
          {uploading ? (
            <>
              <Loader2 size={14} className="animate-spin" /> 업로드 중...
            </>
          ) : (
            <>
              <ImagePlus size={14} /> 이미지 삽입
            </>
          )}
        </button>
        <p className="text-[10px] text-slate-400">
          본문 원하는 위치에 커서를 두고 버튼을 누르면 이미지가 삽입됩니다.
        </p>
      </div>

      {uploadError && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-xs text-red-700">
          <span className="flex-1">{uploadError}</span>
          <button onClick={() => setUploadError(null)} className="text-red-400 hover:text-red-600">
            <X size={14} />
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
    </div>
  );
}

interface RichContentViewProps {
  content: string;
  className?: string;
}

/**
 * `![](url)` 문법을 <img>로 렌더링하고 나머지는 줄바꿈을 보존한 텍스트로 표시.
 * 외부 마크다운 라이브러리 의존 없이 가장 단순한 파서를 사용한다.
 */
export function RichContentView({ content, className }: RichContentViewProps) {
  if (!content) return null;

  // ![alt](url) 토큰을 기준으로 split — 결과 배열을 텍스트/이미지 노드로 매핑
  const parts: Array<{ type: 'text' | 'image'; value: string; alt?: string }> = [];
  let lastIndex = 0;
  const re = new RegExp(IMAGE_TOKEN);
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    if (m.index > lastIndex) {
      parts.push({ type: 'text', value: content.slice(lastIndex, m.index) });
    }
    parts.push({ type: 'image', value: m[1], alt: m[0].slice(2, m[0].indexOf(']')) });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < content.length) {
    parts.push({ type: 'text', value: content.slice(lastIndex) });
  }

  return (
    <div className={cn('space-y-4 text-slate-700 leading-[1.8] text-[15px]', className)}>
      {parts.map((p, i) =>
        p.type === 'image' ? (
          <img
            key={i}
            src={p.value}
            alt={p.alt || ''}
            className="w-full max-w-full rounded-2xl border border-slate-100"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <p key={i} className="whitespace-pre-wrap">
            {p.value}
          </p>
        )
      )}
    </div>
  );
}

/** 이미지 토큰을 제외한 순수 텍스트만 추출 (목록 미리보기·검색용). */
export function plainTextPreview(content: string, maxLen = 140): string {
  const stripped = content.replace(IMAGE_TOKEN, ' ').replace(/\s+/g, ' ').trim();
  if (stripped.length <= maxLen) return stripped;
  return stripped.slice(0, maxLen).trimEnd() + '…';
}

/** Storage에서 이미지 삭제 (실패해도 throw하지 않음 — best-effort 정리) */
export async function deleteStorageImagesByUrl(urls: string[]): Promise<void> {
  await Promise.all(
    urls.map(async (url) => {
      try {
        const sref = storageRef(storage, url);
        await deleteObject(sref);
      } catch {
        // 이미 삭제되었거나 권한이 없는 경우 무시
      }
    })
  );
}
