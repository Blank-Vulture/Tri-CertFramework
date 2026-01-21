#!/usr/bin/env python3
"""
mail.py - メールデータ管理CLIツール

Usage:
    python mail.py <description>           # 新規メール作成（インタラクティブ）
    python mail.py list [--session ID]     # メール一覧表示
    python mail.py show <filename>         # メール詳細表示
    python mail.py add --json '<json>'     # JSON形式で直接追加（非インタラクティブ）

Examples:
    python mail.py "hiraishi-feedback"     # 新規メール作成
    python mail.py list                    # 全メール一覧
    python mail.py list --session REV-001  # 特定セッションのメール

    # JSON形式で直接追加（Claude Code用）
    python mail.py add --json '{
        "description": "hiraishi-reply",
        "timestamp": "2026-01-21T09:30:00+09:00",
        "from": "平石 輝彦 先生（副査）",
        "to": "白石 鷹也",
        "subject": "Re: 修正について",
        "sessionId": "REV-001",
        "type": "received",
        "summary": "修正内容を確認、追加指摘あり",
        "interpretation": "第3章にも同様の改善が必要",
        "tags": ["フィードバック", "第3章"],
        "body": "## 確認結果\\n\\n修正ありがとうございます。..."
    }'
"""

import json

import os
import sys
import re
from datetime import datetime
from pathlib import Path

# パス設定
SCRIPT_DIR = Path(__file__).parent
EMAILS_DIR = SCRIPT_DIR.parent / "src" / "content" / "emails"

# 定義済みの送受信者（よく使うものをプリセット）
CONTACTS = {
    "1": ("白石 鷹也", "自分"),
    "2": ("土田 雅之 先生（主査）", "主査"),
    "3": ("平石 輝彦 先生（副査）", "副査"),
}

# メールタイプ
MAIL_TYPES = {
    "1": ("received", "受信"),
    "2": ("sent", "送信"),
    "3": ("internal", "内部メモ"),
}


def get_existing_sessions():
    """既存のセッションIDを取得"""
    sessions = set()
    if EMAILS_DIR.exists():
        for f in EMAILS_DIR.glob("*.md"):
            content = f.read_text(encoding="utf-8")
            match = re.search(r'sessionId:\s*["\']([^"\']+)["\']', content)
            if match:
                sessions.add(match.group(1))
    return sorted(sessions)


def prompt_choice(prompt, options, allow_custom=True):
    """選択肢を表示して選ばせる"""
    print(f"\n{prompt}")
    for key, (value, label) in options.items():
        print(f"  [{key}] {label}")
    if allow_custom:
        print(f"  [c] カスタム入力")

    while True:
        choice = input("\n選択 > ").strip()
        if choice in options:
            return options[choice][0]
        if allow_custom and choice.lower() == "c":
            return input("入力 > ").strip()
        print("無効な選択です。もう一度入力してください。")


def prompt_input(prompt, default=None, required=True):
    """入力を受け付ける"""
    if default:
        prompt = f"{prompt} [{default}]"
    value = input(f"{prompt} > ").strip()
    if not value and default:
        return default
    if required and not value:
        print("入力が必要です。")
        return prompt_input(prompt, default, required)
    return value


def prompt_multiline(prompt):
    """複数行入力を受け付ける"""
    print(f"\n{prompt}")
    print("(入力終了は空行を2回)")
    lines = []
    empty_count = 0
    while True:
        line = input()
        if line == "":
            empty_count += 1
            if empty_count >= 2:
                break
            lines.append("")
        else:
            empty_count = 0
            lines.append(line)
    # 末尾の空行を削除
    while lines and lines[-1] == "":
        lines.pop()
    return "\n".join(lines)


def create_mail(description):
    """新規メールを作成"""
    print("=" * 50)
    print("📧 新規メールデータ作成")
    print("=" * 50)

    # タイムスタンプ
    now = datetime.now()
    default_timestamp = now.strftime("%Y-%m-%dT%H:%M:%S+09:00")
    timestamp_input = prompt_input(
        "タイムスタンプ (YYYY-MM-DDTHH:MM:SS+09:00)",
        default=default_timestamp
    )

    # タイプ
    mail_type = prompt_choice("メールタイプ:", MAIL_TYPES, allow_custom=False)

    # 送信者・受信者
    if mail_type == "received":
        from_addr = prompt_choice("送信者:", CONTACTS)
        to_addr = CONTACTS["1"][0]  # 自分
    elif mail_type == "sent":
        from_addr = CONTACTS["1"][0]  # 自分
        to_addr = prompt_choice("宛先:", CONTACTS)
    else:  # internal
        from_addr = CONTACTS["1"][0]
        to_addr = CONTACTS["1"][0]

    # 件名（オプション）
    subject = prompt_input("件名 (省略可)", required=False)

    # セッションID
    existing = get_existing_sessions()
    if existing:
        print(f"\n既存セッション: {', '.join(existing)}")
    session_id = prompt_input("セッションID", default=existing[-1] if existing else "REV-001")

    # 要約
    summary = prompt_input("1行要約 (タイムラインに表示)")

    # 解釈（オプション）
    interpretation = prompt_input("解釈・決定事項 (省略可)", required=False)

    # タグ
    tags_input = prompt_input("タグ (カンマ区切り、省略可)", required=False)
    tags = [t.strip() for t in tags_input.split(",") if t.strip()] if tags_input else []

    # 本文
    body = prompt_multiline("本文 (Markdown形式):")

    # ファイル生成
    file_timestamp = datetime.fromisoformat(timestamp_input.replace("+09:00", ""))
    filename = file_timestamp.strftime("%Y-%m-%d-%H%M") + f"-{description}.md"
    filepath = EMAILS_DIR / filename

    # YAML生成
    yaml_parts = [
        "---",
        f'timestamp: "{timestamp_input}"',
        f'from: "{from_addr}"',
        f'to: "{to_addr}"',
    ]
    if subject:
        yaml_parts.append(f'subject: "{subject}"')
    yaml_parts.extend([
        f'sessionId: "{session_id}"',
        f'type: "{mail_type}"',
        f'summary: "{summary}"',
    ])
    if interpretation:
        yaml_parts.append(f'interpretation: "{interpretation}"')
    if tags:
        yaml_parts.append(f'tags: {tags}')
    yaml_parts.append("---")

    content = "\n".join(yaml_parts) + "\n\n" + body + "\n"

    # 確認
    print("\n" + "=" * 50)
    print("📝 プレビュー")
    print("=" * 50)
    print(content)
    print("=" * 50)

    confirm = input("\nこの内容で保存しますか？ [Y/n] > ").strip().lower()
    if confirm in ("", "y", "yes"):
        EMAILS_DIR.mkdir(parents=True, exist_ok=True)
        filepath.write_text(content, encoding="utf-8")
        print(f"\n✅ 保存しました: {filepath.relative_to(SCRIPT_DIR.parent)}")
        return filepath
    else:
        print("❌ キャンセルしました")
        return None


def list_mails(session_id=None):
    """メール一覧を表示"""
    if not EMAILS_DIR.exists():
        print("メールがありません。")
        return

    mails = []
    for f in sorted(EMAILS_DIR.glob("*.md"), reverse=True):
        content = f.read_text(encoding="utf-8")

        # メタデータ抽出
        timestamp_match = re.search(r'timestamp:\s*["\']([^"\']+)["\']', content)
        from_match = re.search(r'from:\s*["\']([^"\']+)["\']', content)
        to_match = re.search(r'to:\s*["\']([^"\']+)["\']', content)
        session_match = re.search(r'sessionId:\s*["\']([^"\']+)["\']', content)
        type_match = re.search(r'type:\s*["\']([^"\']+)["\']', content)
        summary_match = re.search(r'summary:\s*["\']([^"\']+)["\']', content)

        mail_session = session_match.group(1) if session_match else ""

        # フィルタ
        if session_id and mail_session != session_id:
            continue

        mails.append({
            "filename": f.name,
            "timestamp": timestamp_match.group(1) if timestamp_match else "",
            "from": from_match.group(1) if from_match else "",
            "to": to_match.group(1) if to_match else "",
            "session": mail_session,
            "type": type_match.group(1) if type_match else "",
            "summary": summary_match.group(1) if summary_match else "",
        })

    if not mails:
        print("該当するメールがありません。")
        return

    # 表示
    type_icons = {"received": "📥", "sent": "📤", "internal": "📝"}

    print(f"\n{'='*60}")
    print(f"📧 メール一覧 ({len(mails)}件)")
    if session_id:
        print(f"   フィルタ: session={session_id}")
    print(f"{'='*60}\n")

    for m in mails:
        icon = type_icons.get(m["type"], "📧")
        ts = m["timestamp"][:16].replace("T", " ") if m["timestamp"] else "?"
        print(f"{icon} [{ts}] {m['session']}")
        print(f"   {m['from']} → {m['to']}")
        print(f"   {m['summary']}")
        print(f"   📄 {m['filename']}")
        print()


def show_mail(filename):
    """メール詳細を表示"""
    filepath = EMAILS_DIR / filename
    if not filepath.exists():
        # 部分一致で検索
        matches = list(EMAILS_DIR.glob(f"*{filename}*"))
        if len(matches) == 1:
            filepath = matches[0]
        elif len(matches) > 1:
            print(f"複数のファイルが該当します:")
            for m in matches:
                print(f"  - {m.name}")
            return
        else:
            print(f"ファイルが見つかりません: {filename}")
            return

    print(filepath.read_text(encoding="utf-8"))


def create_mail_direct(data):
    """JSON形式で直接メールを作成（非インタラクティブ）

    Args:
        data: dict with keys:
            - description: ファイル名の説明部分（必須）
            - timestamp: ISO形式のタイムスタンプ（必須）
            - from: 送信者（必須）
            - to: 受信者（必須）
            - subject: 件名（オプション）
            - sessionId: セッションID（必須）
            - type: received/sent/internal（必須）
            - summary: 1行要約（必須）
            - interpretation: 解釈・決定事項（オプション）
            - tags: タグリスト（オプション）
            - body: 本文Markdown（必須）
    """
    required = ["description", "timestamp", "from", "to", "sessionId", "type", "summary", "body"]
    for key in required:
        if key not in data:
            print(f"❌ 必須フィールドがありません: {key}")
            return None

    # ファイル名生成
    file_timestamp = datetime.fromisoformat(data["timestamp"].replace("+09:00", ""))
    filename = file_timestamp.strftime("%Y-%m-%d-%H%M") + f"-{data['description']}.md"
    filepath = EMAILS_DIR / filename

    # YAML生成
    yaml_parts = [
        "---",
        f'timestamp: "{data["timestamp"]}"',
        f'from: "{data["from"]}"',
        f'to: "{data["to"]}"',
    ]
    if data.get("subject"):
        yaml_parts.append(f'subject: "{data["subject"]}"')
    yaml_parts.extend([
        f'sessionId: "{data["sessionId"]}"',
        f'type: "{data["type"]}"',
        f'summary: "{data["summary"]}"',
    ])
    if data.get("interpretation"):
        yaml_parts.append(f'interpretation: "{data["interpretation"]}"')
    if data.get("tags"):
        yaml_parts.append(f'tags: {data["tags"]}')
    yaml_parts.append("---")

    content = "\n".join(yaml_parts) + "\n\n" + data["body"] + "\n"

    # 保存
    EMAILS_DIR.mkdir(parents=True, exist_ok=True)
    filepath.write_text(content, encoding="utf-8")
    print(f"✅ 保存しました: {filepath.relative_to(SCRIPT_DIR.parent)}")
    return filepath


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return

    cmd = sys.argv[1]

    if cmd == "list":
        session_id = None
        if len(sys.argv) >= 4 and sys.argv[2] == "--session":
            session_id = sys.argv[3]
        list_mails(session_id)

    elif cmd == "show":
        if len(sys.argv) < 3:
            print("Usage: python mail.py show <filename>")
            return
        show_mail(sys.argv[2])

    elif cmd == "add":
        # 非インタラクティブモード
        if len(sys.argv) >= 4 and sys.argv[2] == "--json":
            try:
                data = json.loads(sys.argv[3])
                create_mail_direct(data)
            except json.JSONDecodeError as e:
                print(f"❌ JSONパースエラー: {e}")
        else:
            print("Usage: python mail.py add --json '<json>'")

    elif cmd in ("-h", "--help", "help"):
        print(__doc__)

    else:
        # description として扱う
        create_mail(cmd)


if __name__ == "__main__":
    main()
