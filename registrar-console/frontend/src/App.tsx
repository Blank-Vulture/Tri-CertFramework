import { createEffect, createMemo, createResource, createSignal, For, Show } from 'solid-js';
import type { Component } from 'solid-js';
import {
  DataRoot,
  ChooseDataRoot,
  ListIssuances,
  AddStudent,
  AddStudents,
  DeleteStudent,
  ParseCSV,
  ExportIssuancesTo,
  SelectExportDirectory,
  GetIssuer,
  SetIssuer,
} from '../wailsjs/go/main/App';
import type { registrar } from '../wailsjs/go/models';
import './styles.css';

type RegistrationOutcome = registrar.RegistrationResult;
type StudentInput = registrar.StudentInput;
type IssuanceEntry = registrar.IssuanceEntry;
type IssuerInfo = registrar.IssuerInfo;

const toDisplayIssuances = (entries: IssuanceEntry[] | undefined) => {
  if (!entries) return [];
  return entries.map((entry) => ({
    studentId: entry.student_id,
    studentIdHash: entry.student_id_hash,
    name: entry.name ?? '',
    birthdate: entry.birthdate,
    salt: entry.salt,
    activationHash: entry.activation_hash,
    createdAt: entry.created_at,
  }));
};

const App: Component = () => {
  let importInputRef: HTMLInputElement | undefined;

  const [statusMessage, setStatusMessage] = createSignal<string | null>(null);
  const [statusError, setStatusError] = createSignal<string | null>(null);
  const [searchTerm, setSearchTerm] = createSignal('');
  const [pendingRemovalIds, setPendingRemovalIds] = createSignal<string[]>([]);
  const [confirmDelete, setConfirmDelete] = createSignal<{
    studentId: string;
    onConfirm: () => void;
  } | null>(null);

  const [dataRoot, { refetch: refetchDataRoot }] = createResource(DataRoot);
  const [issuances, { refetch: refetchIssuances }] = createResource(ListIssuances);
  const [issuer, { refetch: refetchIssuer }] = createResource(GetIssuer);
  const [showIssuerSettings, setShowIssuerSettings] = createSignal(false);

  const mappedIssuances = createMemo(() => toDisplayIssuances(issuances()));

  const uniqueIssuances = createMemo(() => {
    const removalSet = new Set(pendingRemovalIds());
    const entries = mappedIssuances()
      .filter((entry) => !removalSet.has(entry.studentId))
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const seen = new Set<string>();
    const unique: ReturnType<typeof toDisplayIssuances> = [];
    for (const entry of entries) {
      if (seen.has(entry.studentId)) continue;
      seen.add(entry.studentId);
      unique.push(entry);
    }
    return unique;
  });

  const filteredIssuances = createMemo(() => {
    const term = searchTerm().trim().toLowerCase();
    const entries = uniqueIssuances();
    if (!term) return entries;
    return entries.filter((entry) => {
      const name = entry.name.toLowerCase();
      return entry.studentId.toLowerCase().includes(term) || name.includes(term);
    });
  });

  const clearAlerts = () => {
    setStatusMessage(null);
    setStatusError(null);
  };

  const handleChangeDataRoot = async () => {
    clearAlerts();
    try {
      const updated = await ChooseDataRoot();
      if (!updated) return;
      setStatusMessage(`データ出力先を更新しました: ${updated}`);
      await refetchDataRoot();
      await refetchIssuances();
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'データ出力先の変更に失敗しました');
    }
  };

  const handleExportCSV = async () => {
    clearAlerts();
    try {
      const targetDir = await SelectExportDirectory();
      if (!targetDir) {
        return;
      }
      const savedPath = await ExportIssuancesTo(targetDir);
      setStatusMessage(`発行履歴を "${savedPath}" にCSVとして保存しました。`);
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'CSVエクスポートに失敗しました');
    }
  };

  const handleImportCSV = () => {
    clearAlerts();
    if (importInputRef) {
      importInputRef.value = '';
      importInputRef.click();
    }
  };

  const handleImportFileSelected = async (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    clearAlerts();
    try {
      const content = await file.text();
      const parsed = await ParseCSV(content);
      if (parsed.length === 0) {
        setStatusError('CSVに有効な行がありません。');
        return;
      }
      const resolved: StudentInput[] = [];
      for (const row of parsed) {
        const existingIndex = resolved.findIndex((r) => r.studentId === row.studentId);
        if (existingIndex === -1) {
          resolved.push(row);
          continue;
        }
        const current = resolved[existingIndex];
        const keepNew = window.confirm(
          `学籍番号 ${row.studentId} が複数存在します。\n\n` +
            `現在の行: ${current.name} / ${current.birthdate} / ${current.activationHash || 'hashなし'}\n` +
            `新しい行: ${row.name} / ${row.birthdate} / ${row.activationHash || 'hashなし'}\n\n` +
            'OK: 新しい行を採用する / Cancel: 既存の行を維持する'
        );
        if (keepNew) {
          resolved[existingIndex] = row;
        }
      }

      const results = await AddStudents(resolved);
      setStatusMessage(`CSVから ${results.length} 件登録しました。`);
      await refetchIssuances();
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'CSVインポートに失敗しました');
    }
  };

  return (
    <div class="app-shell">
      <header class="app-header">
        <div class="header-top">
          <div class="title-block">
            <h1>Registrar Console</h1>
            <p>Salt付きアクティベーションハッシュを生成・管理するワークステーションです。</p>
          </div>
          <div class="header-actions">
            <button type="button" class="secondary" onClick={handleImportCSV}>
              CSVインポート
            </button>
            <button type="button" class="secondary" onClick={handleExportCSV}>
              CSVエクスポート
            </button>
            <button type="button" onClick={handleChangeDataRoot}>
              データ出力先の変更
            </button>
          </div>
        </div>
        <div class="header-meta">
          <span class="issuer-label">
            <span>認証機関:</span>{' '}
            <Show when={issuer()} fallback={<span class="mono">読み込み中...</span>}>
              {(info) => (
                <>
                  <span class="issuer-name">{info().name}</span>
                  <span class="mono issuer-id">({info().id})</span>
                </>
              )}
            </Show>
            <button
              type="button"
              class="secondary issuer-edit-btn"
              onClick={() => setShowIssuerSettings(true)}
            >
              編集
            </button>
          </span>
          <span class="root-label">
            <span>データ出力先:</span>{' '}
            <Show when={dataRoot()} fallback={<span class="mono">読み込み中...</span>}>
              {(root) => <span class="mono">{root()}</span>}
            </Show>
          </span>
        </div>
        <Show when={statusMessage()}>
          {(message) => <p class="status-message">{message()}</p>}
        </Show>
        <Show when={statusError()}>
          {(message) => <p class="status-error">{message()}</p>}
        </Show>
        <input
          ref={(el) => {
            importInputRef = el;
          }}
          type="file"
          accept=".csv,text/csv"
          class="hidden-input"
          onChange={handleImportFileSelected}
        />
      </header>

      <main class="stack-layout">
        <ManualRegistrationPanel
          onRegistered={async () => {
            await refetchIssuances();
            clearAlerts();
            setStatusMessage('手動登録が完了しました。');
          }}
        />

        <IssuanceTable
          entries={filteredIssuances()}
          totalCount={uniqueIssuances().length}
          loading={issuances.loading}
          error={issuances.error}
          searchTerm={searchTerm()}
          onSearchInput={setSearchTerm}
          pendingRemovalIds={pendingRemovalIds()}
          onDelete={(studentId) => {
            clearAlerts();
            setConfirmDelete({
              studentId,
              onConfirm: async () => {
                setPendingRemovalIds((ids) =>
                  ids.includes(studentId) ? ids : [...ids, studentId]
                );
                
                try {
                  await DeleteStudent(studentId);
                  setStatusMessage(`学籍番号 ${studentId} のデータを削除しました。`);
                  await refetchIssuances();
                } catch (err) {
                  setStatusError(err instanceof Error ? err.message : '削除に失敗しました');
                } finally {
                  setPendingRemovalIds((ids) => ids.filter((id) => id !== studentId));
                  setConfirmDelete(null);
                }
              },
            });
          }}
        />
      </main>
      
      <Show when={confirmDelete()}>
        {(dialog) => (
          <div class="modal-overlay" onClick={() => setConfirmDelete(null)}>
            <div class="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>削除の確認</h3>
              <p>学籍番号 <strong>{dialog().studentId}</strong> のデータを削除しますか？</p>
              <p class="warning">この操作は取り消せません。</p>
              <div class="modal-actions">
                <button
                  type="button"
                  class="secondary"
                  onClick={() => setConfirmDelete(null)}
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  class="danger"
                  onClick={() => dialog().onConfirm()}
                >
                  削除する
                </button>
              </div>
            </div>
          </div>
        )}
      </Show>

      <Show when={showIssuerSettings()}>
        <IssuerSettingsModal
          currentIssuer={issuer()}
          onClose={() => setShowIssuerSettings(false)}
          onSaved={async () => {
            await refetchIssuer();
            setShowIssuerSettings(false);
            clearAlerts();
            setStatusMessage('認証機関の設定を更新しました。');
          }}
        />
      </Show>
    </div>
  );
};

const ManualRegistrationPanel: Component<{ onRegistered: () => Promise<void> }> = (props) => {
  const [studentId, setStudentId] = createSignal('');
  const [name, setName] = createSignal('');
  const [birthdate, setBirthdate] = createSignal('');
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [lastResult, setLastResult] = createSignal<RegistrationOutcome | null>(null);

  const resetForm = () => {
    setStudentId('');
    setName('');
    setBirthdate('');
  };

  const handleSubmit = async (event: Event) => {
    event.preventDefault();
    setError(null);

    if (isSubmitting()) return;
    setIsSubmitting(true);
    try {
      const payload: StudentInput = {
        studentId: studentId(),
        name: name(),
        birthdate: birthdate(),
      };
      const result = await AddStudent(payload);
      setLastResult(result);
      await props.onRegistered();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : '登録中にエラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section class="panel manual-panel">
      <h2>手動登録</h2>
      <p class="hint">学籍番号・氏名・生年月日を入力してsaltとアクティベーションハッシュを生成します。</p>
      <form class="form-grid compact" onSubmit={handleSubmit}>
        <label>
          学籍番号
          <input
            type="text"
            placeholder="12345"
            required
            value={studentId()}
            onInput={(event) => setStudentId(event.currentTarget.value)}
          />
        </label>
        <label>
          氏名
          <input
            type="text"
            placeholder="山田 太郎"
            required
            value={name()}
            onInput={(event) => setName(event.currentTarget.value)}
          />
        </label>
        <label>
          生年月日
          <input
            type="date"
            required
            value={birthdate()}
            onInput={(event) => setBirthdate(event.currentTarget.value)}
          />
        </label>
        <div class="action-cell">
          <button type="submit" disabled={isSubmitting()}>
            {isSubmitting() ? '生成中...' : 'saltとハッシュを生成'}
          </button>
        </div>
      </form>
      <Show when={error()}>
        {(message) => <p class="error">{message()}</p>}
      </Show>
      <Show when={lastResult()}>
        {(result) => (
          <div class="success-box">
            <p>
              <strong>学籍番号:</strong> {result().studentId}
            </p>
            <p class="mono">
              salt: {result().salt}
              <br />
              activation hash: {result().activationHash}
            </p>
          </div>
        )}
      </Show>
    </section>
  );
};

const IssuerSettingsModal: Component<{
  currentIssuer: IssuerInfo | undefined;
  onClose: () => void;
  onSaved: () => Promise<void>;
}> = (props) => {
  const [issuerId, setIssuerId] = createSignal('');
  const [issuerName, setIssuerName] = createSignal('');
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [initialized, setInitialized] = createSignal(false);

  // Sync signals with props when currentIssuer loads or changes
  // Only update if user hasn't started editing yet
  createEffect(() => {
    const issuer = props.currentIssuer;
    if (issuer && !initialized()) {
      setIssuerId(issuer.id || '');
      setIssuerName(issuer.name || '');
      setInitialized(true);
    }
  });

  const handleSubmit = async (event: Event) => {
    event.preventDefault();
    setError(null);

    const id = issuerId().trim();
    const name = issuerName().trim();

    if (!id) {
      setError('認証機関IDは必須です。');
      return;
    }
    if (!name) {
      setError('認証機関名は必須です。');
      return;
    }

    setIsSubmitting(true);
    try {
      await SetIssuer(id, name);
      await props.onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : '設定の保存に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div class="modal-overlay" onClick={props.onClose}>
      <div class="modal-content issuer-modal" onClick={(e) => e.stopPropagation()}>
        <h3>認証機関の設定</h3>
        <p class="hint">
          認証機関のIDと名前を設定します。この情報はallowlistに埋め込まれ、証明書の検証時に使用されます。
        </p>
        <form class="issuer-form" onSubmit={handleSubmit}>
          <label>
            認証機関ID
            <input
              type="text"
              placeholder="例: univ-tokyo-cs"
              value={issuerId()}
              onInput={(e) => setIssuerId(e.currentTarget.value)}
              disabled={isSubmitting()}
            />
            <span class="field-hint">英数字とハイフンを推奨（URLセーフな識別子）</span>
          </label>
          <label>
            認証機関名
            <input
              type="text"
              placeholder="例: 東京大学 情報理工学系研究科"
              value={issuerName()}
              onInput={(e) => setIssuerName(e.currentTarget.value)}
              disabled={isSubmitting()}
            />
            <span class="field-hint">証明書に表示される正式名称</span>
          </label>
          <Show when={error()}>
            {(message) => <p class="error">{message()}</p>}
          </Show>
          <div class="modal-actions">
            <button
              type="button"
              class="secondary"
              onClick={props.onClose}
              disabled={isSubmitting()}
            >
              キャンセル
            </button>
            <button type="submit" disabled={isSubmitting()}>
              {isSubmitting() ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const IssuanceTable: Component<{
  entries: ReturnType<typeof toDisplayIssuances>;
  totalCount: number;
  loading: boolean | undefined;
  error: unknown;
  searchTerm: string;
  onSearchInput: (value: string) => void;
  pendingRemovalIds: string[];
  onDelete: (studentId: string) => Promise<void> | void;
}> = (props) => (
  <section class="panel issuance-panel">
    <div class="issuance-header">
      <h2>発行一覧</h2>
      <span class="count">総件数: {props.totalCount}</span>
    </div>
    <div class="search-row">
      <input
        type="text"
        placeholder="名前 または 学籍番号で検索"
        value={props.searchTerm}
        onInput={(event) => props.onSearchInput(event.currentTarget.value)}
      />
      <button
        type="button"
        class="secondary"
        onClick={() => props.onSearchInput('')}
        disabled={!props.searchTerm}
      >
        クリア
      </button>
    </div>
    <Show when={props.error}>
      {(err) => <p class="status-error">{String(err())}</p>}
    </Show>
    <Show when={props.loading}>
      <p>発行履歴を読み込み中です...</p>
    </Show>
    <Show when={!props.loading}>
      <Show when={props.entries.length > 0} fallback={<p>該当する発行はありません。</p>}>
        <div class="issuance-table">
          <table>
            <thead>
              <tr>
                <th>発行日時</th>
                <th>学籍番号</th>
                <th>氏名</th>
                <th>生年月日</th>
                <th>salt</th>
                <th>Activation Hash</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <For each={props.entries}>
                {(entry) => (
                  <tr>
                    <td>{new Date(entry.createdAt).toLocaleString()}</td>
                    <td class="mono">{entry.studentId}</td>
                    <td>{entry.name || '-'}</td>
                    <td>{entry.birthdate}</td>
                    <td class="mono">{entry.salt}</td>
                    <td class="mono">{entry.activationHash.slice(0, 56)}…</td>
                    <td>
                      <button
                        type="button"
                        class="danger"
                        disabled={props.pendingRemovalIds.includes(entry.studentId)}
                        onClick={() => props.onDelete(entry.studentId)}
                      >
                        {props.pendingRemovalIds.includes(entry.studentId) ? '削除中...' : '削除'}
                      </button>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </Show>
    </Show>
  </section>
);

export default App;
